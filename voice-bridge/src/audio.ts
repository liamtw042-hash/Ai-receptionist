// ─────────────────────────────────────────────────────────────────────────────
// Audio format handling.
//
// THE IMPORTANT FACT: Twilio Media Streams and the OpenAI Realtime API can both
// speak G.711 μ-law at 8 kHz, mono, base64-encoded.
//
//   Twilio  `media.payload`                    = base64(μ-law 8 kHz mono)
//   OpenAI  audio.input.format  {type:'audio/pcmu'}  = μ-law 8 kHz mono
//   OpenAI  audio.output.format {type:'audio/pcmu'}  = μ-law 8 kHz mono
//
// So when the session is configured with `audio/pcmu` on BOTH input and output,
// the correct operation is a straight pass-through of the base64 string. No
// decoding, no resampling, no re-encoding. Every transcode we don't do is
// latency we don't add and a class of garbling we can't cause.
//
// The classic failure here is configuring `audio/pcm` (24 kHz PCM16, the
// default) on one side and shipping the bytes to the other anyway. That does
// not error — it produces fast, screeching noise, because 8 kHz μ-law bytes get
// read as 24 kHz linear PCM. If audio ever sounds like chipmunks or static,
// check the two `format.type` values first.
// ─────────────────────────────────────────────────────────────────────────────

/** G.711 is 8000 samples/sec, 1 byte per sample. */
export const MULAW_SAMPLE_RATE = 8000;
export const MULAW_BYTES_PER_MS = MULAW_SAMPLE_RATE / 1000; // 8

/** The OpenAI GA audio-format descriptor for G.711 μ-law. */
export const PCMU_FORMAT = { type: 'audio/pcmu' as const };

/** Twilio ships 20 ms frames — 160 μ-law bytes each. */
export const TWILIO_FRAME_MS = 20;
export const TWILIO_FRAME_BYTES = TWILIO_FRAME_MS * MULAW_BYTES_PER_MS; // 160

/** Duration in ms of a μ-law buffer of the given byte length. */
export function mulawBytesToMs(byteLength: number): number {
  return byteLength / MULAW_BYTES_PER_MS;
}

/** Byte length of `ms` of μ-law audio. */
export function msToMulawBytes(ms: number): number {
  return Math.round(ms * MULAW_BYTES_PER_MS);
}

/**
 * Duration in ms represented by a base64-encoded μ-law payload, without
 * allocating a Buffer. base64 encodes 3 bytes per 4 chars; trailing '=' pads.
 */
export function base64MulawDurationMs(b64: string): number {
  if (!b64) return 0;
  let padding = 0;
  if (b64.endsWith('==')) padding = 2;
  else if (b64.endsWith('=')) padding = 1;
  const bytes = (b64.length * 3) / 4 - padding;
  return mulawBytesToMs(bytes);
}

/**
 * Guard against the pass-through assumption silently breaking. A valid Twilio
 * media payload is non-empty, base64, and decodes to a whole number of samples.
 * Returns null when it looks fine, or a reason string when it doesn't.
 */
export function validateMulawPayload(b64: string): string | null {
  if (typeof b64 !== 'string' || b64.length === 0) return 'empty payload';
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return 'not valid base64';
  if (b64.length % 4 !== 0) return 'base64 length is not a multiple of 4';
  return null;
}

// ── μ-law codec ──────────────────────────────────────────────────────────────
// Only needed for offline testing (synthesising a spoken-frequency tone to push
// through the bridge without placing a real call) and for the silence frames
// used to flush Twilio's playback buffer. The live path never calls these.

const MULAW_BIAS = 0x84;
const MULAW_CLIP = 32635;

/** Encode one 16-bit PCM sample to a μ-law byte. */
export function linearToMulawSample(sample: number): number {
  let s = Math.max(-MULAW_CLIP, Math.min(MULAW_CLIP, sample));
  const sign = s < 0 ? 0x80 : 0x00;
  if (s < 0) s = -s;
  s += MULAW_BIAS;

  let exponent = 7;
  for (let mask = 0x4000; (s & mask) === 0 && exponent > 0; mask >>= 1) exponent--;

  const mantissa = (s >> (exponent + 3)) & 0x0f;
  return (~(sign | (exponent << 4) | mantissa)) & 0xff;
}

/** Decode one μ-law byte to a 16-bit PCM sample. */
export function mulawToLinearSample(mulaw: number): number {
  const u = ~mulaw & 0xff;
  const sign = u & 0x80;
  const exponent = (u >> 4) & 0x07;
  const mantissa = u & 0x0f;
  let sample = ((mantissa << 3) + MULAW_BIAS) << exponent;
  sample -= MULAW_BIAS;
  return sign ? -sample : sample;
}

export function encodeMulaw(pcm: Int16Array): Buffer {
  const out = Buffer.allocUnsafe(pcm.length);
  for (let i = 0; i < pcm.length; i++) out[i] = linearToMulawSample(pcm[i] ?? 0);
  return out;
}

export function decodeMulaw(mulaw: Buffer): Int16Array {
  const out = new Int16Array(mulaw.length);
  for (let i = 0; i < mulaw.length; i++) out[i] = mulawToLinearSample(mulaw[i] ?? 0);
  return out;
}

/** μ-law silence. 0xFF is the encoding of zero amplitude. */
export const MULAW_SILENCE_BYTE = 0xff;

export function silenceFrame(ms = TWILIO_FRAME_MS): string {
  return Buffer.alloc(msToMulawBytes(ms), MULAW_SILENCE_BYTE).toString('base64');
}

/**
 * Synthesise a sine tone as base64 μ-law frames — used by the local simulator
 * to prove the audio path end to end without a phone call.
 */
export function toneFrames(opts: {
  freqHz?: number; durationMs?: number; frameMs?: number; amplitude?: number;
} = {}): string[] {
  const { freqHz = 440, durationMs = 1000, frameMs = TWILIO_FRAME_MS, amplitude = 0.3 } = opts;
  const samplesPerFrame = msToMulawBytes(frameMs);
  const totalSamples = msToMulawBytes(durationMs);
  const frames: string[] = [];

  for (let start = 0; start < totalSamples; start += samplesPerFrame) {
    const n = Math.min(samplesPerFrame, totalSamples - start);
    const pcm = new Int16Array(n);
    for (let i = 0; i < n; i++) {
      const t = (start + i) / MULAW_SAMPLE_RATE;
      pcm[i] = Math.round(Math.sin(2 * Math.PI * freqHz * t) * 32767 * amplitude);
    }
    frames.push(encodeMulaw(pcm).toString('base64'));
  }
  return frames;
}
