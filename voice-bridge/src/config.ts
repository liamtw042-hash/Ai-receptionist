import 'dotenv/config';

// ─────────────────────────────────────────────────────────────────────────────
// Every quality-affecting knob is here and env-overridable, so call quality can
// be tuned on a live deployment without a code change. Defaults are the values
// chosen for Australian tradie calls — see README.md for the reasoning and the
// alternatives behind each one.
// ─────────────────────────────────────────────────────────────────────────────

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    console.warn(`[config] ${name}="${raw}" is not a number — using ${fallback}`);
    return fallback;
  }
  return parsed;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return raw === '1' || raw.toLowerCase() === 'true';
}

function str<T extends string>(name: string, fallback: T, allowed?: readonly T[]): T {
  const raw = process.env[name] as T | undefined;
  if (!raw) return fallback;
  if (allowed && !allowed.includes(raw)) {
    console.warn(`[config] ${name}="${raw}" is not one of ${allowed.join('|')} — using ${fallback}`);
    return fallback;
  }
  return raw;
}

export type TurnDetectionMode = 'semantic_vad' | 'server_vad';
export type Eagerness = 'low' | 'medium' | 'high' | 'auto';
export type NoiseReduction = 'near_field' | 'far_field' | 'none';

export const config = {
  port: num('PORT', 8080),

  // ── Credentials ───────────────────────────────────────────────────────────
  openaiApiKey: required('OPENAI_API_KEY'),

  /** Base URL of the existing Vercel backend, e.g. https://x.vercel.app/api */
  backendApiUrl: required('BACKEND_API_URL').replace(/\/+$/, ''),
  /** Shared secret matching VOICE_BRIDGE_SECRET on the backend. */
  bridgeSecret: required('VOICE_BRIDGE_SECRET'),

  /** Public wss:// origin Twilio should dial for the media stream. */
  publicUrl: required('PUBLIC_URL').replace(/\/+$/, ''),

  // Twilio REST credentials — only needed for the mid-call failure path, which
  // redirects a live call away from a broken stream. The bridge still starts
  // without them; it just loses that recovery route (logged loudly at boot).
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  /** Validate that inbound webhooks genuinely came from Twilio. */
  validateTwilioSignature: bool('VALIDATE_TWILIO_SIGNATURE', true),

  // ── Model & voice ─────────────────────────────────────────────────────────
  /**
   * `gpt-realtime-2.1` is the current GA realtime model. `gpt-realtime-2.1-mini`
   * is ~3x cheaper and noticeably faster, but weaker at holding the
   * detail-capture task together — see README "The numbers".
   */
  model: process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1',
  /**
   * `marin` and `cedar` are OpenAI's own recommended voices and are markedly
   * more natural than the original eight. `marin` reads warmest for a
   * receptionist. Alternatives: cedar, alloy, ash, ballad, coral, echo, sage,
   * shimmer, verse.
   */
  voice: process.env.OPENAI_REALTIME_VOICE || 'marin',
  /** 1.0 is natural pace. Below ~0.9 sounds sedated; above ~1.15 sounds rushed. */
  speed: num('OPENAI_VOICE_SPEED', 1.0),

  // ── Turn detection ────────────────────────────────────────────────────────
  turnDetection: str<TurnDetectionMode>('TURN_DETECTION', 'semantic_vad', [
    'semantic_vad', 'server_vad',
  ]),
  /**
   * semantic_vad only. Max wait before forcing a turn: low 8s, medium 4s,
   * high 2s. `medium` keeps a thinking pause alive without dead air.
   */
  eagerness: str<Eagerness>('VAD_EAGERNESS', 'medium', ['low', 'medium', 'high', 'auto']),
  /** server_vad only. 0-1; higher = needs louder speech, better in noise. */
  vadThreshold: num('VAD_THRESHOLD', 0.6),
  /** server_vad only. Audio kept before detected speech onset (ms). */
  vadPrefixPaddingMs: num('VAD_PREFIX_PADDING_MS', 300),
  /** server_vad only. Silence before the turn is considered over (ms). */
  vadSilenceDurationMs: num('VAD_SILENCE_DURATION_MS', 700),
  /**
   * If the caller goes quiet this long after the AI finishes speaking, the model
   * re-prompts them ("Still there?") instead of both sides waiting. server_vad
   * only — OpenAI does not support idle timeout under semantic_vad.
   */
  idleTimeoutMs: num('VAD_IDLE_TIMEOUT_MS', 8000),

  /**
   * `near_field` suits a handset held to the face — the common case. Switch to
   * `far_field` if your callers are mostly on speakerphone in vehicles, or
   * `none` to disable if it's clipping quiet speech.
   */
  noiseReduction: str<NoiseReduction>('NOISE_REDUCTION', 'near_field', [
    'near_field', 'far_field', 'none',
  ]),

  // ── Cost & safety limits ──────────────────────────────────────────────────
  /**
   * Hard ceiling on a single call. OpenAI has no server-side session lifetime,
   * so without this a stuck or abandoned call bills until the carrier drops it.
   * At ~$0.11/min a forgotten open line is the main runaway-cost risk.
   */
  maxCallSeconds: num('MAX_CALL_SECONDS', 600),
  /** Warn the caller this many seconds before the hard cap. */
  maxCallWarningSeconds: num('MAX_CALL_WARNING_SECONDS', 60),
  /** Cap per model reply — stops a rambling answer running up output cost. */
  maxResponseOutputTokens: num('MAX_RESPONSE_OUTPUT_TOKENS', 1200),

  // ── Behaviour ─────────────────────────────────────────────────────────────
  /** Log per-call audio/event counters. Verbose; useful when tuning. */
  debugAudio: bool('DEBUG_AUDIO', false),
  /** Seconds to wait for the OpenAI socket before falling back. */
  openaiConnectTimeoutMs: num('OPENAI_CONNECT_TIMEOUT_MS', 5000),
} as const;

/** Non-fatal boot warnings — surfaced once so misconfiguration is visible. */
export function configWarnings(): string[] {
  const warnings: string[] = [];
  if (!config.twilioAccountSid || !config.twilioAuthToken) {
    warnings.push(
      'TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN not set — mid-call failure recovery ' +
      'and webhook signature validation are disabled.'
    );
  }
  if (config.turnDetection === 'semantic_vad' && process.env.VAD_IDLE_TIMEOUT_MS) {
    warnings.push(
      'VAD_IDLE_TIMEOUT_MS is set but TURN_DETECTION=semantic_vad, which does ' +
      'not support idle timeout. It will be ignored.'
    );
  }
  if (!config.publicUrl.startsWith('https://') && !config.publicUrl.startsWith('wss://')) {
    warnings.push(`PUBLIC_URL="${config.publicUrl}" should be an https:// origin.`);
  }
  return warnings;
}
