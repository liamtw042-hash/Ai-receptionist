import assert from 'node:assert';
import {
  MULAW_BYTES_PER_MS, TWILIO_FRAME_BYTES, mulawBytesToMs, msToMulawBytes,
  base64MulawDurationMs, validateMulawPayload, encodeMulaw, decodeMulaw,
  toneFrames, silenceFrame, linearToMulawSample, mulawToLinearSample,
} from '../audio';

// Audio maths is the part that fails *silently* — a wrong constant here shows
// up as garbled speech on a real call, not as an exception. So it gets tests.

let passed = 0;
function check(name: string, fn: () => void): void {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (err) { console.error(`  ✗ ${name}`); throw err; }
}

console.log('audio format maths');

check('G.711 is 8 bytes per millisecond', () => {
  assert.strictEqual(MULAW_BYTES_PER_MS, 8);
});

check("Twilio's 20ms frame is 160 bytes", () => {
  assert.strictEqual(TWILIO_FRAME_BYTES, 160);
});

check('byte/ms conversions round-trip', () => {
  assert.strictEqual(mulawBytesToMs(160), 20);
  assert.strictEqual(msToMulawBytes(20), 160);
  assert.strictEqual(mulawBytesToMs(msToMulawBytes(500)), 500);
});

check('base64 duration matches the real decoded length', () => {
  for (const ms of [20, 100, 340, 1000]) {
    const bytes = msToMulawBytes(ms);
    const b64 = Buffer.alloc(bytes, 0xff).toString('base64');
    // Must agree with actually decoding it, since this drives truncation timing.
    assert.strictEqual(Buffer.from(b64, 'base64').length, bytes);
    assert.strictEqual(base64MulawDurationMs(b64), ms);
  }
});

check('base64 duration handles both padding lengths', () => {
  // 1-byte and 2-byte padding cases ('==' and '=').
  assert.strictEqual(base64MulawDurationMs(Buffer.alloc(160).toString('base64')), 20);
  assert.strictEqual(base64MulawDurationMs(Buffer.alloc(161).toString('base64')), 161 / 8);
  assert.strictEqual(base64MulawDurationMs(Buffer.alloc(162).toString('base64')), 162 / 8);
});

check('payload validation accepts real frames and rejects junk', () => {
  assert.strictEqual(validateMulawPayload(silenceFrame()), null);
  assert.strictEqual(validateMulawPayload(toneFrames({ durationMs: 20 })[0]!), null);
  assert.ok(validateMulawPayload(''));
  assert.ok(validateMulawPayload('not base64!!'));
});

check('mu-law codec round-trips within quantisation error', () => {
  // mu-law is lossy by design; check the error stays small relative to full scale.
  const input = new Int16Array([0, 1000, -1000, 8000, -8000, 20000, -20000, 32000, -32000]);
  const decoded = decodeMulaw(encodeMulaw(input));
  for (let i = 0; i < input.length; i++) {
    const original = input[i]!;
    const error = Math.abs(decoded[i]! - original);
    assert.ok(error <= Math.max(200, Math.abs(original) * 0.08),
      `sample ${original} decoded to ${decoded[i]} (error ${error})`);
  }
});

check('mu-law encodes silence as 0xFF', () => {
  assert.strictEqual(linearToMulawSample(0), 0xff);
  assert.strictEqual(mulawToLinearSample(0xff), 0);
});

check('encoded frames are exactly one byte per sample', () => {
  const frames = toneFrames({ durationMs: 100, frameMs: 20 });
  assert.strictEqual(frames.length, 5);
  for (const f of frames) {
    assert.strictEqual(Buffer.from(f, 'base64').length, TWILIO_FRAME_BYTES);
  }
});

check('a tone is not silence (the pipeline would pass either)', () => {
  const tone = Buffer.from(toneFrames({ durationMs: 20 })[0]!, 'base64');
  const silent = Buffer.from(silenceFrame(), 'base64');
  assert.notDeepStrictEqual(tone, silent);
});

console.log(`\naudio: ${passed} checks passed\n`);
