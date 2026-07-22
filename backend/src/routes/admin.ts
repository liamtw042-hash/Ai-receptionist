import { Router, Response } from 'express';
import { db, auth } from '../lib/firebase';
import { requireAdmin, AuthRequest } from '../middleware/authMiddleware';

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN ANALYTICS — owner-only aggregates across every customer.

   Every route is behind requireAdmin (verified Firebase token whose email/uid
   matches the hardcoded admin — a non-admin gets 403 regardless of what the
   frontend shows them).

   Efficiency: one shared loader fetches everything the five endpoints need in
   parallel — Firebase Auth's user list plus four collection reads. The calls
   and jobs reads use .select() so only the three fields we aggregate on come
   over the wire, not transcripts and job notes. Results are cached in-memory
   for 60s so clicking around the admin UI doesn't re-scan Firestore on every
   request (per-instance cache; serverless cold starts just re-read).
   ═══════════════════════════════════════════════════════════════════════ */

const router = Router();
router.use(requireAdmin);

const MRR_PER_CUSTOMER_AUD = 199;
const TRIAL_DAYS = 7;

interface SlimCall { userId: string; createdAt: string; outcome?: string }
interface SlimJob { userId: string; createdAt: string; status?: string }

interface Aggregate {
  fetchedAt: number;
  users: Array<{ uid: string; email?: string; createdAt: string }>;
  settings: Map<string, FirebaseFirestore.DocumentData>;
  billing: Map<string, FirebaseFirestore.DocumentData>;
  calls: SlimCall[];
  jobs: SlimJob[];
}

let cache: Aggregate | null = null;
const CACHE_MS = 60_000;

/** Firestore Timestamp | Date | ISO string → ISO string ('' if absent). */
function toIso(v: unknown): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString();
  if (typeof v === 'object' && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    try {
      const d = (v as { toDate: () => Date }).toDate();
      return isNaN(d.getTime()) ? '' : d.toISOString();
    } catch {
      return '';
    }
  }
  return '';
}

/** Firebase Auth metadata.creationTime → ISO string, never throwing.
 *  creationTime is a human-readable UTC string that is normally present, but a
 *  small number of accounts (imported users, certain provider records) can have
 *  it blank or unparseable. `new Date('').toISOString()` throws
 *  RangeError: Invalid time value — and because this runs inside the shared
 *  loader's .map(), one bad account would reject loadAggregate() and 500 EVERY
 *  admin endpoint. Fall back to epoch-0 ISO so the row still renders. */
function metaTimeToIso(raw: unknown): string {
  if (typeof raw === 'string' && raw) {
    const t = Date.parse(raw);
    if (!isNaN(t)) return new Date(t).toISOString();
  }
  return new Date(0).toISOString();
}

/** Run a labelled sub-query so that, if it rejects, the thrown error names the
 *  exact source (e.g. "auth.listUsers", "collection:calls") instead of a bare
 *  message — turning an opaque dashboard-wide 500 into something debuggable.
 *  The label is safe to surface: it's a fixed source name, never data. */
async function labelled<T>(label: string, p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`${label} failed: ${msg}`);
  }
}

/** Redact anything that looks like a credential/token/key before it can reach
 *  a response body, then send a diagnosable 500. We surface the real underlying
 *  message (and, from `labelled`, which sub-query failed) so a future regression
 *  is visible in the browser/network tab instead of a bare "Request failed". */
function sendServerError(res: Response, scope: string, err: unknown): void {
  const raw = err instanceof Error ? err.message : String(err);
  const detail = raw
    .replace(/(?:sk|pk|rk)_[A-Za-z0-9_-]{8,}/g, '[redacted]')
    .replace(/AIza[A-Za-z0-9_-]{10,}/g, '[redacted]')
    .replace(/-----BEGIN[\s\S]*?END[^-]*-----/g, '[redacted-key]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .slice(0, 500);
  console.error(`Admin ${scope} error:`, err);
  res.status(500).json({ error: `Failed to load ${scope}`, detail });
}

async function loadAggregate(): Promise<Aggregate> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) return cache;

  const [userList, settingsSnap, billingSnap, callsSnap, jobsSnap] = await Promise.all([
    labelled('auth.listUsers', auth.listUsers(1000)),
    labelled('collection:settings', db.collection('settings').get()),
    labelled('collection:billing', db.collection('billing').get()),
    labelled('collection:calls', db.collection('calls').select('userId', 'createdAt', 'outcome').get()),
    labelled('collection:jobs', db.collection('jobs').select('userId', 'createdAt', 'status').get()),
  ]);

  const settings = new Map<string, FirebaseFirestore.DocumentData>();
  settingsSnap.docs.forEach(d => settings.set(d.id, d.data()));
  const billing = new Map<string, FirebaseFirestore.DocumentData>();
  billingSnap.docs.forEach(d => billing.set(d.id, d.data()));

  cache = {
    fetchedAt: Date.now(),
    users: userList.users.map(u => ({
      uid: u.uid,
      email: u.email,
      createdAt: metaTimeToIso(u.metadata?.creationTime),
    })),
    settings,
    billing,
    calls: callsSnap.docs
      .map(d => {
        const data = d.data();
        return { userId: data.userId as string, createdAt: toIso(data.createdAt), outcome: data.outcome as string };
      })
      .filter(c => !!c.userId),
    jobs: jobsSnap.docs
      .map(d => {
        const data = d.data();
        return { userId: data.userId as string, createdAt: toIso(data.createdAt), status: data.status as string };
      })
      .filter(j => !!j.userId),
  };
  return cache;
}

type SubStatus = 'paying' | 'past_due' | 'trialing' | 'cancelled' | 'free';

/** Honest status derivation: Stripe record first; without one, an account
 *  younger than the trial window is "trialing", older is "free". */
function subStatusFor(billing: FirebaseFirestore.DocumentData | undefined, signupIso: string): SubStatus {
  const s = billing?.status as string | undefined;
  if (s === 'active') return 'paying';
  if (s === 'past_due' || s === 'unpaid') return 'past_due';
  if (s === 'trialing') return 'trialing';
  if (s === 'canceled') return 'cancelled';
  const ageDays = (Date.now() - new Date(signupIso).getTime()) / 86_400_000;
  return ageDays <= TRIAL_DAYS ? 'trialing' : 'free';
}

/** Monday of the ISO week containing the date, as YYYY-MM-DD. */
function weekStart(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - day);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function buildCustomerRows(agg: Aggregate) {
  const callsByUser = new Map<string, SlimCall[]>();
  agg.calls.forEach(c => {
    const arr = callsByUser.get(c.userId) || [];
    arr.push(c);
    callsByUser.set(c.userId, arr);
  });
  const jobsByUser = new Map<string, SlimJob[]>();
  agg.jobs.forEach(j => {
    const arr = jobsByUser.get(j.userId) || [];
    arr.push(j);
    jobsByUser.set(j.userId, arr);
  });

  return agg.users.map(u => {
    const s = agg.settings.get(u.uid) || {};
    const b = agg.billing.get(u.uid);
    const userCalls = callsByUser.get(u.uid) || [];
    const userJobs = (jobsByUser.get(u.uid) || []).filter(j => j.status !== 'cancelled');
    const lastCall = userCalls.reduce<string>((m, c) => (c.createdAt > m ? c.createdAt : m), '');
    const lastActive = [lastCall, toIso(s.updatedAt)].sort().pop() || '';
    return {
      uid: u.uid,
      email: u.email || '',
      businessName: (s.businessName as string) || '',
      traderName: (s.traderName as string) || '',
      tradeType: (s.tradeType as string) || '',
      signupDate: u.createdAt,
      subStatus: subStatusFor(b, u.createdAt),
      calls: userCalls.length,
      jobs: userJobs.length,
      lastActive,
      onboardingComplete: !!s.onboardingComplete,
      hasForwardingSetup: !!s.hasForwardingSetup,
      hasMadeTestCall: userCalls.length > 0,
    };
  });
}

// ── GET /api/admin/overview ───────────────────────────────────────────────────
router.get('/overview', async (_req: AuthRequest, res: Response) => {
  try {
    const agg = await loadAggregate();
    const rows = buildCustomerRows(agg);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

    const paying = rows.filter(r => r.subStatus === 'paying').length;
    res.json({
      totalSignups: rows.length,
      activeCustomers: rows.filter(r => r.lastActive >= sevenDaysAgo).length,
      payingCustomers: paying,
      trialsInProgress: rows.filter(r => r.subStatus === 'trialing').length,
      totalCalls: agg.calls.length,
      totalJobs: agg.jobs.filter(j => j.status !== 'cancelled').length,
      mrr: paying * MRR_PER_CUSTOMER_AUD,
    });
  } catch (err) {
    sendServerError(res, 'overview', err);
  }
});

// ── GET /api/admin/customers ──────────────────────────────────────────────────
router.get('/customers', async (_req: AuthRequest, res: Response) => {
  try {
    const agg = await loadAggregate();
    res.json(buildCustomerRows(agg));
  } catch (err) {
    sendServerError(res, 'customers', err);
  }
});

// ── GET /api/admin/customers/:uid ─────────────────────────────────────────────
router.get('/customers/:uid', async (req: AuthRequest, res: Response) => {
  try {
    const agg = await loadAggregate();
    const row = buildCustomerRows(agg).find(r => r.uid === req.params.uid);
    if (!row) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    const s = agg.settings.get(row.uid) || {};
    const b = agg.billing.get(row.uid) || {};

    // Real weekly call volume for this customer (empty array = honest "none").
    const byWeek = new Map<string, number>();
    agg.calls
      .filter(c => c.userId === row.uid && c.createdAt)
      .forEach(c => {
        const w = weekStart(c.createdAt);
        if (w) byWeek.set(w, (byWeek.get(w) || 0) + 1);
      });
    const callsPerWeek = [...byWeek.entries()]
      .sort(([a], [b2]) => a.localeCompare(b2))
      .map(([week, count]) => ({ week, count }));

    res.json({
      ...row,
      suburb: (s.suburb as string) || '',
      mobileNumber: (s.mobileNumber as string) || '',
      twilioNumber: (s.twilioNumber as string) || '',
      availability: (s.availability as string) || '',
      services: (s.services as string[]) || [],
      billing: {
        status: (b.status as string) || 'none',
        currentPeriodEnd: (b.currentPeriodEnd as string) || null,
        cancelAtPeriodEnd: !!b.cancelAtPeriodEnd,
        subscriptionStartedAt: (b.subscriptionStartedAt as string) || null,
      },
      callsPerWeek,
    });
  } catch (err) {
    sendServerError(res, 'customer', err);
  }
});

// ── GET /api/admin/growth ─────────────────────────────────────────────────────
router.get('/growth', async (_req: AuthRequest, res: Response) => {
  try {
    const agg = await loadAggregate();

    const signupWeeks = new Map<string, number>();
    agg.users.forEach(u => {
      const w = weekStart(u.createdAt);
      if (w) signupWeeks.set(w, (signupWeeks.get(w) || 0) + 1);
    });
    const signupsPerWeek = [...signupWeeks.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({ week, count }));

    // Paying-over-time needs real subscription start dates. We only started
    // recording subscriptionStartedAt recently, so older subs may lack it —
    // report only what's real and let the frontend show an honest gap.
    const startDates = [...agg.billing.values()]
      .filter(b => (b.status === 'active' || b.status === 'past_due') && b.subscriptionStartedAt)
      .map(b => b.subscriptionStartedAt as string)
      .sort();
    const payingCumulative = startDates.map((iso, i) => ({ week: weekStart(iso), count: i + 1 }));
    const payingNow = [...agg.billing.values()].filter(b => b.status === 'active').length;
    const payingWithoutStartDate = payingNow - startDates.filter(
      d => [...agg.billing.values()].some(b => b.status === 'active' && b.subscriptionStartedAt === d)
    ).length;

    res.json({ signupsPerWeek, payingCumulative, payingNow, payingWithoutStartDate });
  } catch (err) {
    sendServerError(res, 'growth', err);
  }
});

// ── GET /api/admin/activity ───────────────────────────────────────────────────
router.get('/activity', async (_req: AuthRequest, res: Response) => {
  try {
    const agg = await loadAggregate();
    const nameOf = (uid: string) =>
      (agg.settings.get(uid)?.businessName as string) ||
      agg.users.find(u => u.uid === uid)?.email ||
      'Unknown';

    const signups = [...agg.users]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8)
      .map(u => ({ type: 'signup' as const, at: u.createdAt, who: nameOf(u.uid), detail: u.email || '' }));

    const calls = [...agg.calls]
      .filter(c => c.createdAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8)
      .map(c => ({ type: 'call' as const, at: c.createdAt, who: nameOf(c.userId), detail: (c.outcome || '').replace(/_/g, ' ') }));

    const jobs = [...agg.jobs]
      .filter(j => j.createdAt && j.status !== 'cancelled')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8)
      .map(j => ({ type: 'job' as const, at: j.createdAt, who: nameOf(j.userId), detail: j.status || '' }));

    const merged = [...signups, ...calls, ...jobs]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 20);

    res.json(merged);
  } catch (err) {
    sendServerError(res, 'activity', err);
  }
});

// ── GET /api/admin/waitlist ───────────────────────────────────────────────────
// Every landing-page waitlist signup, newest first, plus a total. Read directly
// (not via the customer aggregate/cache) since the waitlist is its own thing.
router.get('/waitlist', async (_req: AuthRequest, res: Response) => {
  try {
    const snap = await db.collection('waitlist').get();
    const entries = snap.docs
      .map(d => {
        const data = d.data();
        return {
          name: (data.name as string) || '',
          businessName: (data.businessName as string) || '',
          tradeType: (data.tradeType as string) || '',
          email: (data.email as string) || '',
          phone: (data.phone as string) || '',
          createdAt: toIso(data.createdAt),
          // Delivery status of the signup confirmation email. Older docs written
          // before this field existed report 'unknown' rather than a false alarm.
          confirmationEmailStatus: (data.confirmationEmailStatus as string) || 'unknown',
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ total: entries.length, entries });
  } catch (err) {
    sendServerError(res, 'waitlist', err);
  }
});

export { router as adminRouter };
