/**
 * Verification for the Realtime voice-bridge endpoints on the backend:
 * shared-secret auth, business-context lookup, and the transcript handoff that
 * feeds the EXISTING post-call pipeline (summary → SMS → Firestore → job →
 * Sheets/Calendar).
 *
 * These are the endpoints the voice-bridge simulator can only mock, so they
 * are covered here instead. Firebase, OpenAI, SMS and Google are all faked.
 * Run: npm run test:voice-bridge
 */
import Module from 'module';
import express from 'express';

process.env.VOICE_BRIDGE_SECRET = 'test-bridge-secret';

// ── Fakes ────────────────────────────────────────────────────────────────────
const settingsStore: Record<string, any> = {
  'user-1': {
    businessName: "Smith's Plumbing", traderName: 'Dave', tradeType: 'plumbing',
    suburb: 'Merewether', pricingGuide: 'Burst pipe $180-$320.',
    availability: 'Mon-Fri', mobileNumber: '+61400111222',
    services: ['burst pipes'], emergencyCallbackMinutes: 30,
  },
};
const callsAdded: any[] = [];
const smsToTradie: Array<{ to: string; summary: string; outcome: string }> = [];
let smsShouldFail = false;
const jobsCreated: any[] = [];
const contactsUpserted: any[] = [];

const fakeDb = {
  collection(name: string) {
    return {
      doc(id: string) {
        return {
          async get() {
            if (name === 'settings') return { exists: id in settingsStore, data: () => settingsStore[id] };
            // No Google tokens → Sheets/Calendar branches stay skipped.
            return { exists: false, data: () => undefined };
          },
          async set() { /* noop */ },
          async update() { /* noop */ },
        };
      },
      where() {
        return {
          limit() {
            return {
              async get() {
                // resolveTwilioUser: map any dialled number to user-1.
                return { empty: false, docs: [{ id: 'user-1', data: () => settingsStore['user-1'] }] };
              },
            };
          },
        };
      },
      async add(doc: any) { callsAdded.push(doc); return { id: `call-${callsAdded.length}` }; },
      limit() { return { async get() { return { empty: false, docs: [{ id: 'user-1' }] }; } }; },
    };
  },
};

const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request.endsWith('/lib/firebase') || request.endsWith('lib/firebase') || request === './firebase') {
    return { db: fakeDb, auth: {}, default: {} };
  }
  if (request.endsWith('/lib/openai') || request.endsWith('../lib/openai')) {
    return { getAIResponse: async () => '• Burst pipe in Merewether\n• Urgent\n• Dave to call back' };
  }
  // Modules inside services/ import each other relatively ('./smsService'), so
  // match the bare specifier too — matching only '/services/x' silently misses
  // them and lets the real Twilio client load.
  if (request.endsWith('/services/smsService') || request === './smsService') {
    return {
      sendCallSummaryToTradie: async (to: string, _from: string, summary: string, outcome: string) => {
        // Simulates a Twilio outage / rate limit / bad number on demand.
        if (smsShouldFail) throw new Error('Twilio is not configured — simulated outage');
        smsToTradie.push({ to, summary, outcome });
      },
      sendBookingConfirmationToCaller: async () => {},
      sendEmergencyAlertToTradie: async () => {},
      sendMissedCallWinback: async () => {},
      storeSMSMessage: async () => {},
    };
  }
  if (request.endsWith('/services/contactService') || request === './contactService') {
    return { upsertContact: async (uid: string, num: string) => { contactsUpserted.push({ uid, num }); } };
  }
  if (request.endsWith('/services/jobService') || request === './jobService') {
    return { createJobFromCall: async (uid: string, job: any) => { jobsCreated.push({ uid, ...job }); } };
  }
  if (request.endsWith('/lib/googleAuth') || request === '../lib/googleAuth') {
    return { appendToSheet: async () => {}, createCalendarEvent: async () => {} };
  }
  return originalLoad.apply(this, [request, parent, isMain]);
};

let failures = 0;
const assert = (c: boolean, m: string) => {
  if (c) console.log(`  ✓ ${m}`);
  else { console.error(`  ✗ FAIL: ${m}`); failures++; }
};

const { voiceRouter } = require('../voice');
const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use('/api/voice', voiceRouter);
const server = app.listen(3993);

const BASE = 'http://localhost:3993/api/voice';
const post = async (path: string, body: any, secret?: string) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret !== undefined) headers['x-bridge-secret'] = secret;
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await res.text();
  let parsed: any = {};
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  return { status: res.status, body: parsed };
};

(async () => {
  console.log('\n── Bridge auth (fails closed) ──');
  assert((await post('/bridge/context', { called: '+61249001234' })).status === 401,
    'no secret → 401');
  assert((await post('/bridge/context', { called: '+61249001234' }, 'wrong-secret')).status === 401,
    'wrong secret → 401');
  assert((await post('/bridge/context', { called: '+61249001234' }, 'test-bridge-secre')).status === 401,
    'shorter secret → 401 (no length-leak crash)');
  assert((await post('/bridge/complete', { callSid: 'x' }, 'nope')).status === 401,
    'complete also rejects a bad secret');

  console.log('\n── Bridge context ──');
  const ctx = await post('/bridge/context', { called: '+61249001234' }, 'test-bridge-secret');
  assert(ctx.status === 200, 'valid secret → 200');
  assert(ctx.body.userId === 'user-1', 'resolves the owning user');
  assert(ctx.body.settings?.businessName === "Smith's Plumbing", 'returns business settings');
  assert(ctx.body.settings?.pricingGuide?.includes('$180'), 'includes the pricing guide the persona needs');

  const noCalled = await post('/bridge/context', {}, 'test-bridge-secret');
  assert(noCalled.status === 400, 'missing `called` → 400');

  console.log('\n── Bridge complete → existing pipeline ──');
  const before = callsAdded.length;
  const done = await post('/bridge/complete', {
    callSid: 'CA_bridge_1',
    from: '+61412345678',
    called: '+61249001234',
    turns: [
      { role: 'assistant', content: "G'day, Smith's Plumbing — you're speaking with the AI assistant." },
      { role: 'user', content: "I've got a burst pipe under the kitchen sink." },
      { role: 'assistant', content: 'Righto, Dave will call you back within 30 minutes.' },
    ],
    outcome: 'emergency',
    durationSeconds: 92,
  }, 'test-bridge-secret');

  assert(done.status === 200 && done.body.status === 'ok', 'valid completion → 200 ok');
  assert(callsAdded.length === before + 1, 'call was logged to Firestore');

  const logged = callsAdded[callsAdded.length - 1];
  assert(logged?.callSid === 'CA_bridge_1', 'logged under the right CallSid');
  assert(logged?.turns?.length === 3, 'all three turns persisted');
  assert(logged?.outcome === 'emergency', 'bridge-supplied outcome is respected');
  assert(logged?.durationSeconds === 92, "Twilio's duration is used, not recomputed");
  assert(typeof logged?.summary === 'string' && logged.summary.length > 0, 'AI summary generated');

  assert(smsToTradie.length === 1, 'tradie got exactly one summary SMS');
  assert(smsToTradie[0]?.to === '+61400111222', 'SMS went to the tradie mobile from settings');
  assert(smsToTradie[0]?.outcome === 'EMERGENCY', 'SMS carries the urgency flag');
  assert(contactsUpserted.length > 0, 'caller upserted into contacts');

  console.log('\n── Idempotency / bad input ──');
  const dupBefore = callsAdded.length;
  await post('/bridge/complete', {
    callSid: 'CA_bridge_1', from: '+61412345678', called: '+61249001234',
    turns: [{ role: 'user', content: 'duplicate delivery' }],
  }, 'test-bridge-secret');
  const dupLogged = callsAdded[callsAdded.length - 1];
  assert(callsAdded.length === dupBefore + 1, 'a redelivery still completes (at-least-once webhook)');
  assert(dupLogged?.turns?.length === 1,
    'redelivery replaces the transcript rather than appending it twice');

  const badBody = await post('/bridge/complete', { callSid: 'x', from: 'y' }, 'test-bridge-secret');
  assert(badBody.status === 400, 'missing turns → 400');

  const junkTurns = await post('/bridge/complete', {
    callSid: 'CA_junk', from: '+61412345678', called: '+61249001234',
    turns: [{ role: 'user', content: 'ok' }, null, { role: 'weird', content: 123 }, { nope: true }],
  }, 'test-bridge-secret');
  assert(junkTurns.status === 200, 'malformed turn entries are filtered, not fatal');
  const junkLogged = callsAdded[callsAdded.length - 1];
  assert(junkLogged?.turns?.length === 1, 'only the valid turn survived filtering');

  console.log('\n── SMS outage must not destroy the rest of the pipeline ──');
  // Regression: sendCallSummaryToTradie used to be unguarded, so a Twilio
  // failure threw before the job/contact writes — taking out the in-app record
  // the tradie would otherwise fall back to when the SMS never arrived.
  smsShouldFail = true;
  const jobsBefore = jobsCreated.length;
  const contactsBefore = contactsUpserted.length;
  const callsBefore = callsAdded.length;

  const outage = await post('/bridge/complete', {
    callSid: 'CA_sms_outage',
    from: '+61433222111',
    called: '+61249001234',
    turns: [
      { role: 'user', content: 'Need a quote to book in a hot water swap please.' },
      { role: 'assistant', content: "No worries, I'll get that booked in for you." },
    ],
    outcome: 'job_booked',
    durationSeconds: 61,
  }, 'test-bridge-secret');

  assert(outage.status === 200, 'an SMS outage still returns 200 (call was saved)');
  assert(callsAdded.length === callsBefore + 1, 'call log still written despite SMS failure');
  assert(jobsCreated.length === jobsBefore + 1,
    'job STILL created when SMS fails (was previously skipped — the fallback record)');
  assert(contactsUpserted.length === contactsBefore + 1,
    'contact STILL upserted when SMS fails');
  assert(jobsCreated[jobsCreated.length - 1]?.callerNumber === '+61433222111',
    'the job carries the caller number so the tradie can ring back');
  smsShouldFail = false;

  console.log(`\n${failures === 0 ? '✅ All voice-bridge endpoint checks passed' : `❌ ${failures} check(s) failed`}\n`);
  server.close();
  process.exit(failures === 0 ? 0 : 1);
})();
