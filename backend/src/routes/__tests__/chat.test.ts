/**
 * Verification for the public chat-widget route's ABUSE PROTECTIONS.
 * Mocks firebase (rate-limit store) and openai, then drives the real router.
 * Run: npx tsx src/routes/__tests__/chat.test.ts
 */
import Module from 'module';

let openaiCalls = 0;
let nextAIError: { reason: string; status: number; upstreamStatus?: number; code?: string } | null = null;
const usageDocs: Record<string, { count: number }> = {};

const fakeDb = {
  collection() {
    return {
      doc(id: string) { return { __id: id }; },
    };
  },
  async runTransaction(fn: any) {
    return fn({
      async get(ref: any) {
        const d = usageDocs[ref.__id];
        return { exists: !!d, data: () => d };
      },
      set(ref: any, data: any) { usageDocs[ref.__id] = { count: data.count }; },
    });
  },
};

const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request.endsWith('/lib/firebase') || request.endsWith('lib/firebase') || request === './firebase') return { db: fakeDb, auth: {}, default: {} };
  // adminNotify (email alerts) pulls googleapis + googleAuth — stub it so the
  // route test stays hermetic and no notification is attempted.
  if (request.endsWith('/services/adminNotify')) return { sendAdminEmail: async () => true };
  if (request.endsWith('/lib/openai')) {
    // Real AIError class so the route's `instanceof AIError` classification
    // works; getAIResponse either returns a canned reply or throws a supplied
    // AIError so we can assert the safe error surfacing.
    class AIError extends Error {
      reason: string; status: number; upstreamStatus?: number; code?: string;
      constructor(message: string, opts: any) { super(message); this.name = 'AIError'; Object.assign(this, opts); }
    }
    return {
      AIError,
      getAIResponse: async () => {
        openaiCalls++;
        if (nextAIError) { const e = nextAIError; throw new AIError('boom', e); }
        return 'TradeDesk is $199/month AUD.';
      },
    };
  }
  return originalLoad.apply(this, [request, parent, isMain]);
};

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) console.log(`  ✓ ${msg}`); else { console.error(`  ✗ FAIL: ${msg}`); failures++; }
}

function dispatch(router: any, body: any, ip = '1.2.3.4'): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const req: any = { method: 'POST', url: '/widget', headers: { 'x-forwarded-for': ip }, body, socket: {}, on: () => {}, once: () => {} };
    let statusCode = 200;
    const res: any = {
      status(c: number) { statusCode = c; return res; },
      json(b: any) { resolve({ status: statusCode, body: b }); return res; },
      setHeader() {}, getHeader() {}, end() { resolve({ status: statusCode, body: undefined }); },
    };
    router.handle(req, res, () => resolve({ status: 404, body: 'no-route' }));
  });
}

async function run() {
  process.env.OPENAI_API_KEY = 'sk-test';
  process.env.CHAT_WIDGET_DAILY_LIMIT = '3';
  const { chatRouter } = require('../chat');

  console.log('\n── Chat widget abuse protections ──');
  const empty = await dispatch(chatRouter, { message: '' });
  assert(empty.status === 400, 'rejects empty message (400)');

  const tooLong = await dispatch(chatRouter, { message: 'x'.repeat(501) });
  assert(tooLong.status === 400, 'rejects over-long input >500 chars (400)');

  openaiCalls = 0;
  const ok1 = await dispatch(chatRouter, { message: 'How much does it cost?' }, '9.9.9.9');
  assert(ok1.status === 200 && typeof ok1.body.reply === 'string', 'accepts a valid question (200 with reply)');
  assert(openaiCalls === 1, 'calls OpenAI exactly once for a valid question');

  // Rate limit: cap is 3/day for this ip. We used 1 above from 9.9.9.9; use a
  // fresh ip and exhaust it.
  const ip = '5.5.5.5';
  const r1 = await dispatch(chatRouter, { message: 'a' }, ip);
  const r2 = await dispatch(chatRouter, { message: 'b' }, ip);
  const r3 = await dispatch(chatRouter, { message: 'c' }, ip);
  const r4 = await dispatch(chatRouter, { message: 'd' }, ip);
  assert(r1.status === 200 && r2.status === 200 && r3.status === 200, 'first 3 requests from an IP succeed');
  assert(r4.status === 429, '4th request from same IP is rate-limited (429)');

  console.log('\n── Safe error surfacing (production 500 diagnosis) ──');
  // Fresh IPs so the rate limiter doesn't interfere.
  nextAIError = { reason: 'auth', status: 503, upstreamStatus: 401, code: 'invalid_api_key' };
  const authErr = await dispatch(chatRouter, { message: 'hi' }, '10.0.0.1');
  assert(authErr.status === 503 && authErr.body.reason === 'auth' && authErr.body.code === 'invalid_api_key',
    'invalid key → 503 with reason=auth, code=invalid_api_key');
  assert(!JSON.stringify(authErr.body).includes('sk-'), 'error body leaks no API key');
  assert(typeof authErr.body.error === 'string' && authErr.body.error.length > 0, 'error body has a friendly user message');

  nextAIError = { reason: 'quota', status: 503, upstreamStatus: 429, code: 'insufficient_quota' };
  const quotaErr = await dispatch(chatRouter, { message: 'hi' }, '10.0.0.2');
  assert(quotaErr.status === 503 && quotaErr.body.reason === 'quota', 'quota exceeded → 503 with reason=quota');

  nextAIError = { reason: 'upstream', status: 502, upstreamStatus: 500, code: 'server_error' };
  const upErr = await dispatch(chatRouter, { message: 'hi' }, '10.0.0.3');
  assert(upErr.status === 502 && upErr.body.reason === 'upstream', 'OpenAI 5xx → 502 with reason=upstream');
  nextAIError = null;

  console.log(`\n${failures === 0 ? '✅ ALL ASSERTIONS PASSED' : `❌ ${failures} FAILED`}\n`);
  (Module as any)._load = originalLoad;
  process.exit(failures === 0 ? 0 : 1);
}
run().catch(e => { console.error(e); process.exit(1); });
