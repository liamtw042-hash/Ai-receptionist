import './testEnv'; // must be first — populates env before ./config validates
import assert from 'node:assert';
import { buildSessionUpdate, REALTIME_URL, REALTIME_HEADERS } from '../realtimeSession';
import { buildFallbackTwiml } from '../twilioRest';
import { formatAuNumber } from '../prompt';
import type { BusinessSettings } from '../backendClient';

// These assertions encode the GA wire format. Getting any of them wrong does
// NOT raise an error at runtime — it produces silence or garbled noise on a
// live call — so they are pinned here.

let passed = 0;
function check(name: string, fn: () => void): void {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (err) { console.error(`  ✗ ${name}`); throw err; }
}

const settings: BusinessSettings = {
  businessName: "Smith's Plumbing",
  traderName: 'Dave',
  tradeType: 'plumbing',
  suburb: 'Merewether',
  pricingGuide: 'Burst pipe call-out $180-$320. Hot water swap $950-$1400.',
  availability: 'Mon-Fri 7am-4pm',
  mobileNumber: '+61400111222',
  services: ['burst pipes', 'hot water', 'blocked drains'],
  emergencyCallbackMinutes: 30,
};

console.log('realtime session payload (GA schema)');

const update = buildSessionUpdate(settings, '+61412345678') as any;

check('event type is session.update', () => {
  assert.strictEqual(update.type, 'session.update');
});

check('session carries the GA `type: "realtime"` discriminator', () => {
  assert.strictEqual(update.session.type, 'realtime');
});

check('audio formats are GA objects, not beta strings', () => {
  // Beta was session.input_audio_format = "g711_ulaw" (a string).
  // GA is session.audio.input.format = { type: "audio/pcmu" } (an object).
  assert.strictEqual(typeof update.session.audio.input.format, 'object');
  assert.strictEqual(typeof update.session.audio.output.format, 'object');
  assert.strictEqual(update.session.audio.input.format.type, 'audio/pcmu');
  assert.strictEqual(update.session.audio.output.format.type, 'audio/pcmu');
});

check('no legacy beta format keys leak into the payload', () => {
  assert.strictEqual(update.session.input_audio_format, undefined);
  assert.strictEqual(update.session.output_audio_format, undefined);
  assert.strictEqual(update.session.modalities, undefined); // GA: output_modalities
});

check('input and output formats match (mismatch = garbled audio)', () => {
  assert.strictEqual(
    update.session.audio.input.format.type,
    update.session.audio.output.format.type
  );
});

check('output modality is audio', () => {
  assert.deepStrictEqual(update.session.output_modalities, ['audio']);
});

check('turn detection is nested under audio.input (GA location)', () => {
  assert.ok(update.session.audio.input.turn_detection);
  assert.strictEqual(update.session.turn_detection, undefined);
  const td = update.session.audio.input.turn_detection;
  assert.ok(td.type === 'semantic_vad' || td.type === 'server_vad');
  assert.strictEqual(td.interrupt_response, true, 'barge-in requires interrupt_response');
  assert.strictEqual(td.create_response, true);
});

check('a spend cap is always set', () => {
  assert.ok(typeof update.session.max_output_tokens === 'number');
  assert.ok(update.session.max_output_tokens > 0);
});

console.log('\npersona');

check('greeting discloses the AI, conversationally', () => {
  const i: string = update.session.instructions;
  assert.match(i, /AI assistant/i);
  assert.match(i, /disclosure/i);
});

check('instructions forbid asking for the number we already have', () => {
  const i: string = update.session.instructions;
  assert.match(i, /Do NOT ask "what's your number\?"/);
  assert.ok(i.includes('0412 345 678'), 'formatted caller number should be embedded');
});

check("the tradie's real pricing guide is used", () => {
  assert.ok((update.session.instructions as string).includes('Burst pipe call-out $180-$320'));
});

check('transcription is biased with trade + business keywords', () => {
  const kw: string[] = update.session.audio.input.transcription.keywords;
  assert.ok(Array.isArray(kw));
  assert.ok(kw.includes("Smith's Plumbing"));
  assert.ok(kw.includes('burst pipe'));
  assert.ok(kw.length <= 100, 'keyword list must stay tight');
});

console.log('\nAU number formatting (read back to the caller)');

check('+61 mobile becomes 04xx xxx xxx', () => {
  assert.strictEqual(formatAuNumber('+61412345678'), '0412 345 678');
  assert.strictEqual(formatAuNumber('0412345678'), '0412 345 678');
});

check('landline formats sensibly', () => {
  assert.strictEqual(formatAuNumber('+61249001234'), '02 4900 1234');
});

check('unparseable input is passed through untouched', () => {
  assert.strictEqual(formatAuNumber('anonymous'), 'anonymous');
});

console.log('\nconnection');

check('realtime URL targets the GA endpoint with the model', () => {
  assert.ok(REALTIME_URL.startsWith('wss://api.openai.com/v1/realtime?model='));
});

check('auth is a bearer token with no beta header', () => {
  assert.match(REALTIME_HEADERS.Authorization, /^Bearer /);
  assert.strictEqual((REALTIME_HEADERS as Record<string, string>)['OpenAI-Beta'], undefined);
});

console.log('\nfailover TwiML');

const fallback = buildFallbackTwiml();

check('fallback apologises and records rather than hanging up silently', () => {
  assert.match(fallback, /<Say/);
  assert.match(fallback, /<Record/);
  assert.match(fallback, /line's playing up|line&apos;s playing up/);
});

check('fallback uses the same AU neural voice as the legacy route', () => {
  assert.match(fallback, /Polly\.Olivia-Neural/);
  assert.match(fallback, /en-AU/);
});

console.log(`\nprotocol: ${passed} checks passed\n`);
