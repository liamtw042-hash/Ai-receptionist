/**
 * Verification for the public waitlist route: validation, dedupe, trade
 * coercion, and the honest public-count threshold. Firebase + email are mocked.
 * Run: npm run test:waitlist
 */
import Module from 'module';
import express from 'express';

const store: Record<string, any> = {};
let countValue = 0;
const emailsSent: Array<{ to: string; subject: string }> = [];

const fakeDb = {
  collection() {
    return {
      doc(id: string) {
        return {
          async get() { return { exists: id in store, data: () => store[id] }; },
          async set(data: any) { store[id] = data; },
        };
      },
      count() { return { async get() { return { data: () => ({ count: countValue }) }; } }; },
    };
  },
};

const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request.endsWith('/lib/firebase') || request.endsWith('lib/firebase') || request === './firebase') return { db: fakeDb, auth: {}, default: {} };
  if (request.endsWith('/services/adminNotify')) return {
    sendAdminEmail: async () => true,
    sendGmailFromAdmin: async (to: string, subject: string) => { emailsSent.push({ to, subject }); return true; },
  };
  return originalLoad.apply(this, [request, parent, isMain]);
};

let failures = 0;
const assert = (c: boolean, m: string) => { if (c) console.log(`  ✓ ${m}`); else { console.error(`  ✗ FAIL: ${m}`); failures++; } };

const { waitlistRouter } = require('../waitlist');
const app = express();
app.use(express.json());
app.use('/api/waitlist', waitlistRouter);
const server = app.listen(3995);

const post = async (body: any) => {
  const res = await fetch('http://localhost:3995/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
};
const getCount = async () => {
  const res = await fetch('http://localhost:3995/api/waitlist/count');
  return { status: res.status, body: await res.json() };
};

(async () => {
  console.log('\n── Waitlist validation ──');
  assert((await post({ businessName: 'X', email: 'a@b.com', tradeType: 'plumber' })).status === 400, 'missing name → 400');
  assert((await post({ name: 'Dave', email: 'a@b.com', tradeType: 'plumber' })).status === 400, 'missing business → 400');
  assert((await post({ name: 'Dave', businessName: 'X', email: 'not-an-email', tradeType: 'plumber' })).status === 400, 'bad email → 400');

  console.log('\n── Waitlist signup + dedupe ──');
  const ok = await post({ name: 'Dave Smith', businessName: "Dave's Drains", email: 'Dave@Example.com', phone: '0400123456', tradeType: 'plumber' });
  assert(ok.status === 201 && ok.body.status === 'joined', 'valid signup → 201 joined');
  assert(store['dave%40example.com']?.email === 'dave@example.com', 'stored with lowercased email as doc id');
  assert(store['dave%40example.com']?.createdAt instanceof Date, 'stored with a timestamp');
  assert(emailsSent.some(e => e.to === 'dave@example.com'), 'confirmation email sent to the signer');

  const dup = await post({ name: 'Dave Smith', businessName: "Dave's Drains", email: 'dave@example.com', tradeType: 'plumber' });
  assert(dup.status === 200 && dup.body.status === 'already-on-list', 're-submit same email → already-on-list (no dup)');

  console.log('\n── Trade coercion (anti-injection) ──');
  await post({ name: 'A', businessName: 'B', email: 'x@y.com', tradeType: '<script>alert(1)</script>' });
  assert(store['x%40y.com']?.tradeType === 'other', 'unknown/hostile trade coerced to "other"');
  await post({ name: 'C', businessName: 'D', email: 'z@y.com', tradeType: 'ELECTRICIAN' });
  assert(store['z%40y.com']?.tradeType === 'electrician', 'known trade normalised to lowercase');

  console.log('\n── Honest public count threshold ──');
  countValue = 4;
  let c = await getCount();
  assert(c.body.showPublicly === false && c.body.count === null, 'below 10 → hidden, count withheld (not exposed)');
  countValue = 10;
  c = await getCount();
  assert(c.body.showPublicly === true && c.body.count === 10, 'at/above 10 → shown with real count');

  server.close();
  console.log(`\n${failures === 0 ? '✅ ALL WAITLIST CHECKS PASSED' : `❌ ${failures} FAILED`}\n`);
  (Module as any)._load = originalLoad;
  process.exit(failures === 0 ? 0 : 1);
})();
