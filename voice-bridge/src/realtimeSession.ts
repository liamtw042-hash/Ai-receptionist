import { config } from './config';
import { PCMU_FORMAT } from './audio';
import type { BusinessSettings } from './backendClient';
import { buildRealtimeInstructions, transcriptionKeywords } from './prompt';

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI Realtime session configuration (GA schema).
//
// NOTE ON THE GA BREAKING CHANGE: in the beta API, audio formats were plain
// strings (`"g711_ulaw"`) at `session.input_audio_format`. In GA they are
// OBJECTS nested under `session.audio.{input,output}.format`, e.g.
// `{ "type": "audio/pcmu" }`, and the session object itself must carry
// `type: "realtime"`. Most tutorials and blog posts still show the beta shape;
// sending it now is silently ignored, leaving the session on its 24 kHz PCM
// default and producing garbled audio rather than an error. This module builds
// the GA shape.
//
// There is also no `OpenAI-Beta: realtime=v1` header in GA — just the bearer
// token.
// ─────────────────────────────────────────────────────────────────────────────

// OPENAI_REALTIME_URL_OVERRIDE exists so the offline simulator can point the
// bridge at a local mock realtime server. Never set it in production.
export const REALTIME_URL = process.env.OPENAI_REALTIME_URL_OVERRIDE
  ? `${process.env.OPENAI_REALTIME_URL_OVERRIDE}?model=${encodeURIComponent(config.model)}`
  : `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(config.model)}`;

export const REALTIME_HEADERS = {
  Authorization: `Bearer ${config.openaiApiKey}`,
};

/** Turn-detection block, built from the configured mode. */
function buildTurnDetection(): Record<string, unknown> {
  if (config.turnDetection === 'server_vad') {
    return {
      type: 'server_vad',
      // Higher threshold = louder speech required to trigger. Raised above the
      // 0.5 default because job-site background noise otherwise trips VAD and
      // makes the AI interrupt itself.
      threshold: config.vadThreshold,
      // Audio retained before detected onset, so the first syllable isn't
      // clipped — the usual cause of "it missed the start of what I said".
      prefix_padding_ms: config.vadPrefixPaddingMs,
      // Silence before the turn is considered finished. Longer than the 500 ms
      // default so a caller pausing to read a meter box or think about their
      // address doesn't get cut off mid-sentence.
      silence_duration_ms: config.vadSilenceDurationMs,
      // Nudge the caller if they go quiet after we finish speaking, rather than
      // both sides sitting in silence. server_vad only.
      idle_timeout_ms: config.idleTimeoutMs > 0 ? config.idleTimeoutMs : null,
      create_response: true,
      interrupt_response: true,
    };
  }

  return {
    type: 'semantic_vad',
    // The model decides whether the caller has actually finished a thought,
    // rather than timing raw silence. This is what stops "my address is...
    // hang on... 42 Wallace Street" being chopped in half.
    // Max wait: low 8s, medium 4s, high 2s.
    eagerness: config.eagerness,
    create_response: true,
    interrupt_response: true,
  };
}

/** The `session.update` payload sent immediately after the socket opens. */
export function buildSessionUpdate(
  settings: BusinessSettings,
  callerNumber: string
): Record<string, unknown> {
  const noiseReduction =
    config.noiseReduction === 'none' ? null : { type: config.noiseReduction };

  return {
    type: 'session.update',
    session: {
      // GA requires this discriminator.
      type: 'realtime',
      model: config.model,
      output_modalities: ['audio'],
      instructions: buildRealtimeInstructions(settings, callerNumber),
      max_output_tokens: config.maxResponseOutputTokens,
      audio: {
        input: {
          // Must match Twilio's wire format exactly — see audio.ts.
          format: PCMU_FORMAT,
          noise_reduction: noiseReduction,
          turn_detection: buildTurnDetection(),
          // A parallel ASR pass; the model itself hears the raw audio. This
          // transcript is what ends up in the tradie's SMS and the call log,
          // so it's worth biasing toward Australian trade vocabulary.
          transcription: {
            model: 'gpt-4o-mini-transcribe',
            language: 'en',
            keywords: transcriptionKeywords(settings),
          },
        },
        output: {
          format: PCMU_FORMAT,
          voice: config.voice,
          speed: config.speed,
        },
      },
    },
  };
}

/**
 * Ask the model to speak first. Twilio has already connected the caller by the
 * time the stream starts, so silence here reads as a dead line — the greeting
 * must be pushed, not waited for.
 */
export function buildGreetingTrigger(): Record<string, unknown> {
  return {
    type: 'response.create',
    response: {
      instructions:
        'Greet the caller now with your opening line, including the AI disclosure. ' +
        'Keep it to one short sentence and then stop and listen.',
    },
  };
}

/** Nudge used when we are about to hit the hard call-duration cap. */
export function buildWrapUpTrigger(secondsLeft: number): Record<string, unknown> {
  return {
    type: 'response.create',
    response: {
      instructions:
        `You have about ${secondsLeft} seconds left on this call. Wrap up now: ` +
        'confirm what you have, tell them someone will call back shortly, and say goodbye. Be brief.',
    },
  };
}
