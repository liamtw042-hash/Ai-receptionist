/**
 * Verification for the owner-only admin analytics routes: requireAdmin
 * gating (401/403/200), cross-customer aggregation correctness, and — the
 * regression this suite was expanded for — robustness against a near-empty
 * pre-launch app AND against a Firebase Auth record whose metadata.creationTime
 * is blank/unparseable (which used to throw RangeError: Invalid time value in
 * the shared loader and 500 EVERY admin endpoint → the "Request failed"
 * dashboard bug).
 *
 * Each scenario loads a FRESH instance of ../admin (require-cache busted) so the
 * route module's 60s in-memory aggregate cache can't leak one scenario's data
 * into the next.
 * Run: npm run test:admin
 */
import Module from 'module';
import express from 'express';
import type { Server } from 'http';

// ── Shared token table (email/uid the middleware verifies against) ──────────
const tokens: Record<string, { uid: string; email: string }> = {
  'admin-token': { uid: 'liam-uid', email: 'liamtw042@gmail.com' },
  'admin-token-caps': { uid: 'liam-uid', email: 'LiamTW042@Gmail.com' },
  'user-token': { uid: 'dave-uid', email: 'dave@smithsplumbing.com.au' },
};

function snap(rows: any[]) { return { docs: rows.map((r, i) => ({ id: r.__id ?? 'd' + i, data: () => r })) }; }

type Scenario = {
  users: Array<{ uid: string; email?: string; metadata: { creationTime: string } }>;
  collections: Record<string, any[]>;
};

// The require-cache key for the admin module (absolute, resolved once).
const ADMIN_MODULE = require.resolve('../admin');

/** Boot a fresh Express app wired to the real, unmodified admin router but with
 *  firebase mocked to the given scenario. Returns the app + a teardown. */
function bootApp(scn: Scenario): { server: Server; port: number } {
  const fakeAuth = {
    verifyIdToken: async (t: string) => { const d = tokens[t]; if (!d) throw new Error('bad'); return d; },
    listUsers: async () => ({ users: scn.users }),
  };
  const fakeDb = {
    collection: (name: string) => ({
      get: async () => snap(scn.collections[name] || []),
      select: () => ({ get: async () => snap(scn.collections[name] || []) }),
    }),
  };
  const orig = (Module as any)._load;
  (Module as any)._load = function (req: string, p: any, m: boolean) {
    if (req.endsWith('lib/firebase') || req === './firebase') return { db: fakeDb, auth: fakeAuth, default: {} };
    return orig.apply(this, [req, p, m]);
  };
  // Bust the admin module (and any cached copy) so its in-memory cache is fresh
  // and it re-requires our scenario's firebase mock.
  delete require.cache[ADMIN_MODULE];
  const { adminRouter } = require('../admin');
  (Module as any)._load = orig; // restore immediately after load

  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);
  const port = 3990 + Math.floor(Math.random() * 5);
  const server = app.listen(port);
  return { server, port };
}

let pass = true;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) pass = false; };

async function hit(port: number, p: string, token?: string) {
  const res = await fetch(`http://localhost:${port}${p}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return { status: res.status, body: await res.json().catch(() => null) };
}

(async () => {
  // ═══ SCENARIO 1 — seeded dataset (real aggregation correctness) ══════════
  {
    const scn: Scenario = {
      users: [
        { uid: 'dave-uid', email: 'dave@smithsplumbing.com.au', metadata: { creationTime: 'Wed, 01 Jul 2026 00:00:00 GMT' } },
        { uid: 'liam-uid', email: 'liamtw042@gmail.com', metadata: { creationTime: 'Mon, 01 Jun 2026 00:00:00 GMT' } },
      ],
      collections: {
        settings: [{ __id: 'dave-uid', businessName: "Dave's Drains", traderName: 'Dave', tradeType: 'Plumber', onboardingComplete: true, hasForwardingSetup: true, updatedAt: '2026-07-03T00:00:00.000Z' }],
        billing: [{ __id: 'dave-uid', status: 'active', subscriptionStartedAt: '2026-07-02T00:00:00.000Z' }],
        calls: [{ userId: 'dave-uid', createdAt: '2026-07-03T04:00:00.000Z', outcome: 'job_booked' }],
        jobs: [{ userId: 'dave-uid', createdAt: '2026-07-03T05:00:00.000Z', status: 'booked' }],
      },
    };
    const { server, port } = bootApp(scn);

    ok((await hit(port, '/api/admin/overview')).status === 401, 'no token → 401');
    ok((await hit(port, '/api/admin/overview', 'garbage')).status === 401, 'bad token → 401');
    ok((await hit(port, '/api/admin/overview', 'user-token')).status === 403, 'NON-ADMIN user → 403');
    ok((await hit(port, '/api/admin/customers', 'user-token')).status === 403, 'non-admin blocked on customers too');
    const over = await hit(port, '/api/admin/overview', 'admin-token');
    ok(over.status === 200, 'admin → 200');
    ok(over.body.totalSignups === 2 && over.body.payingCustomers === 1 && over.body.mrr === 199, `aggregates correct (signups=${over.body.totalSignups} paying=${over.body.payingCustomers} mrr=${over.body.mrr})`);
    ok(over.body.totalCalls === 1 && over.body.totalJobs === 1, 'calls/jobs totals correct');
    const caps = await hit(port, '/api/admin/overview', 'admin-token-caps');
    ok(caps.status === 200, 'admin email match is case-insensitive');
    const cust = await hit(port, '/api/admin/customers', 'admin-token');
    const dave = cust.body.find((c: any) => c.uid === 'dave-uid');
    ok(dave?.subStatus === 'paying' && dave?.calls === 1 && dave?.hasMadeTestCall === true, 'customer row derived correctly');
    const liam = cust.body.find((c: any) => c.uid === 'liam-uid');
    ok(liam?.subStatus === 'free', 'old account without billing = free (not fake-trialing)');
    const detail = await hit(port, '/api/admin/customers/dave-uid', 'admin-token');
    ok(detail.status === 200 && detail.body.callsPerWeek.length === 1, 'customer detail with real weekly series');
    const growth = await hit(port, '/api/admin/growth', 'admin-token');
    ok(growth.body.signupsPerWeek.length >= 1 && growth.body.payingCumulative.length === 1, 'growth series from real dates');
    const act = await hit(port, '/api/admin/activity', 'admin-token');
    ok(Array.isArray(act.body) && act.body[0].type && act.body.every((e: any) => e.at && e.who), 'activity feed merged + sorted');

    server.close();
  }

  // ═══ SCENARIO 2 — empty pre-launch app (only the owner, zero Firestore) ═══
  {
    const scn: Scenario = {
      users: [
        { uid: 'liam-uid', email: 'liamtw042@gmail.com', metadata: { creationTime: 'Mon, 01 Jun 2026 00:00:00 GMT' } },
      ],
      collections: { settings: [], billing: [], calls: [], jobs: [] },
    };
    const { server, port } = bootApp(scn);

    const over = await hit(port, '/api/admin/overview', 'admin-token');
    ok(over.status === 200, 'EMPTY: overview → 200 (not 500)');
    ok(
      over.body.totalSignups === 1 && over.body.activeCustomers === 0 && over.body.payingCustomers === 0 &&
      over.body.trialsInProgress === 0 && over.body.totalCalls === 0 && over.body.totalJobs === 0 && over.body.mrr === 0,
      'EMPTY: overview is well-formed zeros',
    );
    const cust = await hit(port, '/api/admin/customers', 'admin-token');
    ok(cust.status === 200 && Array.isArray(cust.body) && cust.body.length === 1 && cust.body[0].calls === 0 && cust.body[0].jobs === 0, 'EMPTY: customers → the lone owner with zero calls/jobs');
    const growth = await hit(port, '/api/admin/growth', 'admin-token');
    ok(growth.status === 200 && Array.isArray(growth.body.signupsPerWeek) && growth.body.payingCumulative.length === 0 && growth.body.payingNow === 0, 'EMPTY: growth → empty paying series, no crash');
    const act = await hit(port, '/api/admin/activity', 'admin-token');
    ok(act.status === 200 && Array.isArray(act.body), 'EMPTY: activity → 200 array (only the signup)');
    const detail = await hit(port, '/api/admin/customers/liam-uid', 'admin-token');
    ok(detail.status === 200 && detail.body.callsPerWeek.length === 0 && detail.body.services.length === 0, 'EMPTY: customer detail → empty series/services, no crash');
    // access check still enforced even in the empty app
    ok((await hit(port, '/api/admin/overview', 'user-token')).status === 403, 'EMPTY: non-admin still rejected (403)');

    server.close();
  }

  // ═══ SCENARIO 3 — regression: an Auth user with a BLANK creationTime ══════
  // This is the exact production trigger: new Date('').toISOString() threw and
  // 500'd every endpoint. Must now degrade gracefully to a 200.
  {
    const scn: Scenario = {
      users: [
        { uid: 'liam-uid', email: 'liamtw042@gmail.com', metadata: { creationTime: 'Mon, 01 Jun 2026 00:00:00 GMT' } },
        { uid: 'ghost-uid', email: 'ghost@example.com', metadata: { creationTime: '' } },       // blank
        { uid: 'weird-uid', email: 'weird@example.com', metadata: { creationTime: 'not-a-date' } }, // unparseable
      ],
      collections: { settings: [], billing: [], calls: [], jobs: [] },
    };
    const { server, port } = bootApp(scn);

    const over = await hit(port, '/api/admin/overview', 'admin-token');
    ok(over.status === 200 && over.body.totalSignups === 3, 'BAD DATE: overview → 200, all 3 users counted (did not throw)');
    const cust = await hit(port, '/api/admin/customers', 'admin-token');
    const ghost = cust.body?.find?.((c: any) => c.uid === 'ghost-uid');
    ok(cust.status === 200 && !!ghost && typeof ghost.signupDate === 'string' && !isNaN(new Date(ghost.signupDate).getTime()), 'BAD DATE: blank-creationTime user gets a valid fallback signupDate');
    const act = await hit(port, '/api/admin/activity', 'admin-token');
    ok(act.status === 200 && Array.isArray(act.body), 'BAD DATE: activity → 200 (no RangeError)');
    const growth = await hit(port, '/api/admin/growth', 'admin-token');
    ok(growth.status === 200, 'BAD DATE: growth → 200');

    server.close();
  }

  console.log(pass ? '\n✅ ADMIN API CHECKS PASSED' : '\n❌ FAILURES');
  process.exit(pass ? 0 : 1);
})();
