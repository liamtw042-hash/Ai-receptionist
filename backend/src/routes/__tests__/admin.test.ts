/**
 * Verification for the owner-only admin analytics routes: requireAdmin
 * gating (401/403/200) and cross-customer aggregation correctness.
 * Run: npm run test:admin
 */
import Module from 'module';
import express from 'express';

const tokens: Record<string, { uid: string; email: string }> = {
  'admin-token': { uid: 'liam-uid', email: 'liamtw042@gmail.com' },
  'admin-token-caps': { uid: 'liam-uid', email: 'LiamTW042@Gmail.com' },
  'user-token': { uid: 'dave-uid', email: 'dave@smithsplumbing.com.au' },
};
const fakeAuth = {
  verifyIdToken: async (t: string) => { const d = tokens[t]; if (!d) throw new Error('bad'); return d; },
  listUsers: async () => ({ users: [
    { uid: 'dave-uid', email: 'dave@smithsplumbing.com.au', metadata: { creationTime: 'Wed, 01 Jul 2026 00:00:00 GMT' } },
    { uid: 'liam-uid', email: 'liamtw042@gmail.com', metadata: { creationTime: 'Mon, 01 Jun 2026 00:00:00 GMT' } },
  ] }),
};
function snap(rows: any[]) { return { docs: rows.map((r, i) => ({ id: r.__id ?? 'd' + i, data: () => r })) }; }
const collections: Record<string, any[]> = {
  settings: [{ __id: 'dave-uid', businessName: "Dave's Drains", traderName: 'Dave', tradeType: 'Plumber', onboardingComplete: true, hasForwardingSetup: true, updatedAt: '2026-07-03T00:00:00.000Z' }],
  billing: [{ __id: 'dave-uid', status: 'active', subscriptionStartedAt: '2026-07-02T00:00:00.000Z' }],
  calls: [{ userId: 'dave-uid', createdAt: '2026-07-03T04:00:00.000Z', outcome: 'job_booked' }],
  jobs: [{ userId: 'dave-uid', createdAt: '2026-07-03T05:00:00.000Z', status: 'booked' }],
};
const fakeDb = {
  collection: (name: string) => ({
    get: async () => snap(collections[name] || []),
    select: () => ({ get: async () => snap(collections[name] || []) }),
  }),
};
const orig = (Module as any)._load;
(Module as any)._load = function (req: string, p: any, m: boolean) {
  if (req.endsWith('lib/firebase') || req === './firebase') return { db: fakeDb, auth: fakeAuth, default: {} };
  return orig.apply(this, [req, p, m]);
};

const { adminRouter } = require('../admin');
const app = express();
app.use(express.json());
app.use('/api/admin', adminRouter);
const server = app.listen(3996);

(async () => {
  const hit = async (path: string, token?: string) => {
    const res = await fetch('http://localhost:3996' + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  let pass = true;
  const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) pass = false; };

  ok((await hit('/api/admin/overview')).status === 401, 'no token → 401');
  ok((await hit('/api/admin/overview', 'garbage')).status === 401, 'bad token → 401');
  ok((await hit('/api/admin/overview', 'user-token')).status === 403, 'NON-ADMIN user → 403');
  ok((await hit('/api/admin/customers', 'user-token')).status === 403, 'non-admin blocked on customers too');
  const over = await hit('/api/admin/overview', 'admin-token');
  ok(over.status === 200, 'admin → 200');
  ok(over.body.totalSignups === 2 && over.body.payingCustomers === 1 && over.body.mrr === 199, `aggregates correct (signups=${over.body.totalSignups} paying=${over.body.payingCustomers} mrr=${over.body.mrr})`);
  ok(over.body.totalCalls === 1 && over.body.totalJobs === 1, 'calls/jobs totals correct');
  const caps = await hit('/api/admin/overview', 'admin-token-caps');
  ok(caps.status === 200, 'admin email match is case-insensitive');
  const cust = await hit('/api/admin/customers', 'admin-token');
  const dave = cust.body.find((c: any) => c.uid === 'dave-uid');
  ok(dave?.subStatus === 'paying' && dave?.calls === 1 && dave?.hasMadeTestCall === true, 'customer row derived correctly');
  const liam = cust.body.find((c: any) => c.uid === 'liam-uid');
  ok(liam?.subStatus === 'free', 'old account without billing = free (not fake-trialing)');
  const detail = await hit('/api/admin/customers/dave-uid', 'admin-token');
  ok(detail.status === 200 && detail.body.callsPerWeek.length === 1, 'customer detail with real weekly series');
  const growth = await hit('/api/admin/growth', 'admin-token');
  ok(growth.body.signupsPerWeek.length >= 1 && growth.body.payingCumulative.length === 1, 'growth series from real dates');
  const act = await hit('/api/admin/activity', 'admin-token');
  ok(Array.isArray(act.body) && act.body[0].type && act.body.every((e: any) => e.at && e.who), 'activity feed merged + sorted');

  server.close();
  console.log(pass ? '\n✅ ADMIN API CHECKS PASSED' : '\n❌ FAILURES');
  process.exit(pass ? 0 : 1);
})();
