/**
 * Verification for the public newsletter subscribe route.
 * Run: npx tsx src/routes/__tests__/newsletter.test.ts
 */
import Module from 'module';

const store: Record<string, any> = {};
const fakeDb = {
  collection() {
    return {
      doc(id: string) {
        return {
          async get() { return { exists: id in store, data: () => store[id] }; },
          async set(data: any) { store[id] = data; },
        };
      },
    };
  },
};

const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request.endsWith('/lib/firebase') || request.endsWith('lib/firebase')) return { db: fakeDb, auth: {}, default: {} };
  return originalLoad.apply(this, [request, parent, isMain]);
};

let failures = 0;
function assert(c: boolean, m: string) { if (c) console.log(`  ✓ ${m}`); else { console.error(`  ✗ FAIL: ${m}`); failures++; } }

function dispatch(router: any, body: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const req: any = { method: 'POST', url: '/subscribe', headers: {}, body, on: () => {}, once: () => {} };
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
  const { newsletterRouter } = require('../newsletter');
  console.log('\n── Newsletter subscribe ──');

  const bad = await dispatch(newsletterRouter, { email: 'not-an-email' });
  assert(bad.status === 400 && bad.body.status === 'invalid', 'rejects an invalid email (400 invalid)');

  const missing = await dispatch(newsletterRouter, {});
  assert(missing.status === 400, 'rejects a missing email (400)');

  const ok = await dispatch(newsletterRouter, { email: 'Dave@Example.com' });
  assert(ok.status === 201 && ok.body.status === 'subscribed', 'accepts a new email (201 subscribed)');
  assert(!!store[encodeURIComponent('dave@example.com')], 'stored the email lowercased');

  const dup = await dispatch(newsletterRouter, { email: 'dave@example.com' });
  assert(dup.status === 200 && dup.body.status === 'already-subscribed', 'dedupes a repeat signup (already-subscribed)');

  const dupCase = await dispatch(newsletterRouter, { email: 'DAVE@EXAMPLE.COM' });
  assert(dupCase.body.status === 'already-subscribed', 'dedupe is case-insensitive');

  console.log(`\n${failures === 0 ? '✅ ALL ASSERTIONS PASSED' : `❌ ${failures} FAILED`}\n`);
  (Module as any)._load = originalLoad;
  process.exit(failures === 0 ? 0 : 1);
}
run().catch(e => { console.error(e); process.exit(1); });
