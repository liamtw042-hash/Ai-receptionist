import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap, ArrowLeft, Users, Phone, Calendar, DollarSign, Activity,
  Search, ChevronDown, ChevronUp, X, CheckCircle2, XCircle, UserPlus,
  PhoneIncoming, Briefcase, TrendingUp,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import { clsx } from 'clsx';

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN ANALYTICS — owner-only view across every customer.

   The frontend gate (AdminRoute in App.tsx) is purely cosmetic; every number
   on this page comes from /api/admin/* endpoints that verify the Firebase
   token's email server-side and 403 anyone who isn't the admin.

   No fake data: every chart renders from real Firestore aggregates and shows
   an explicit "not enough data yet" state below two data points.
   ═══════════════════════════════════════════════════════════════════════ */

interface Overview {
  totalSignups: number;
  activeCustomers: number;
  payingCustomers: number;
  trialsInProgress: number;
  totalCalls: number;
  totalJobs: number;
  mrr: number;
}

interface CustomerRow {
  uid: string;
  email: string;
  businessName: string;
  traderName: string;
  tradeType: string;
  signupDate: string;
  subStatus: 'paying' | 'past_due' | 'trialing' | 'cancelled' | 'free';
  calls: number;
  jobs: number;
  lastActive: string;
  onboardingComplete: boolean;
  hasForwardingSetup: boolean;
  hasMadeTestCall: boolean;
}

interface CustomerDetail extends CustomerRow {
  suburb: string;
  mobileNumber: string;
  twilioNumber: string;
  availability: string;
  services: string[];
  billing: { status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; subscriptionStartedAt: string | null };
  callsPerWeek: Array<{ week: string; count: number }>;
}

interface Growth {
  signupsPerWeek: Array<{ week: string; count: number }>;
  payingCumulative: Array<{ week: string; count: number }>;
  payingNow: number;
  payingWithoutStartDate: number;
}

interface ActivityItem { type: 'signup' | 'call' | 'job'; at: string; who: string; detail: string }

const STATUS_META: Record<CustomerRow['subStatus'], { label: string; cls: string }> = {
  paying:    { label: 'Paying',    cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' },
  past_due:  { label: 'Past due',  cls: 'text-red-400 bg-red-500/10 border-red-500/25' },
  trialing:  { label: 'Trial',     cls: 'text-orange-400 bg-orange-500/10 border-orange-500/25' },
  cancelled: { label: 'Cancelled', cls: 'text-gray-500 bg-gray-500/10 border-gray-500/25' },
  free:      { label: 'Free',      cls: 'text-blue-400 bg-blue-500/10 border-blue-500/25' },
};

function ago(iso: string): string {
  if (!iso) return '—';
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }); } catch { return '—'; }
}

/* ── Simple real-data SVG bar chart ─────────────────────────────────────── */
function BarChart({ data, unit }: { data: Array<{ week: string; count: number }>; unit: string }) {
  if (data.length < 2) {
    return (
      <div className="h-40 flex flex-col items-center justify-center text-center">
        <TrendingUp size={20} className="text-gray-700 mb-2" />
        <p className="text-sm text-gray-500 font-medium">Not enough data yet</p>
        <p className="text-xs text-gray-700 mt-1 max-w-[240px]">
          This chart draws itself once there are at least two weeks of real {unit}.
        </p>
      </div>
    );
  }
  const max = Math.max(...data.map(d => d.count), 1);
  const W = 560, H = 150, pad = 4;
  const bw = (W - pad * 2) / data.length;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full min-w-[320px]" role="img" aria-label={`${unit} per week`}>
        {data.map((d, i) => {
          const h = Math.max(2, (d.count / max) * H);
          return (
            <g key={d.week}>
              <rect
                x={pad + i * bw + bw * 0.15}
                y={H - h}
                width={bw * 0.7}
                height={h}
                rx={3}
                fill="#ff6b35"
                opacity={0.35 + 0.65 * (d.count / max)}
              >
                <title>{`${format(new Date(d.week), 'd MMM')}: ${d.count} ${unit}`}</title>
              </rect>
              {/* Label sits above the bar, or just inside it when the bar
                  reaches the top of the viewBox (else it clips out of view). */}
              <text
                x={pad + i * bw + bw / 2}
                y={H - h - 5 < 10 ? H - h + 14 : H - h - 5}
                textAnchor="middle" fontSize="10" fontWeight="700"
                fill={H - h - 5 < 10 ? '#0a0b0d' : '#e5e7eb'}>
                {d.count}
              </text>
              {(data.length <= 10 || i % Math.ceil(data.length / 10) === 0) && (
                <text x={pad + i * bw + bw / 2} y={H + 15} textAnchor="middle" fontSize="9" fill="#6b7280">
                  {format(new Date(d.week), 'd MMM')}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Customer detail slide-over ─────────────────────────────────────────── */
function CustomerPanel({ uid, onClose }: { uid: string; onClose: () => void }) {
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setDetail(null);
    setError('');
    api.get<CustomerDetail>(`/admin/customers/${uid}`).then(setDetail).catch(e => setError(e.message));
  }, [uid]);

  const Fact = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-xs text-gray-200 text-right min-w-0">{value || '—'}</span>
    </div>
  );

  const OnbFlag = ({ done, label }: { done: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-xs">
      {done ? <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" /> : <XCircle size={13} className="text-gray-600 flex-shrink-0" />}
      <span className={done ? 'text-gray-300' : 'text-gray-600'}>{label}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:w-[420px] h-full bg-ink-900 border-l border-white/10 overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-white/8 bg-ink-900/95 backdrop-blur-sm z-10">
          <h2 className="text-sm font-bold text-white truncate">
            {detail?.businessName || detail?.email || 'Customer'}
          </h2>
          <button onClick={onClose} aria-label="Close customer detail"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/8 transition-all flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {error && <p className="p-5 text-sm text-red-400">{error}</p>}
        {!detail && !error && (
          <div className="p-5 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-9 skeleton rounded-lg" />)}</div>
        )}

        {detail && (
          <div className="p-5 space-y-6">
            {/* Status + headline numbers */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={clsx('text-[10px] font-bold uppercase tracking-wide border px-2 py-1 rounded-md', STATUS_META[detail.subStatus].cls)}>
                {STATUS_META[detail.subStatus].label}
              </span>
              {detail.tradeType && (
                <span className="text-[10px] font-semibold border border-white/10 bg-white/4 text-gray-400 px-2 py-1 rounded-md">{detail.tradeType}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Calls handled</p>
                <p className="text-2xl font-black text-white tabular-nums">{detail.calls}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Jobs booked</p>
                <p className="text-2xl font-black text-white tabular-nums">{detail.jobs}</p>
              </div>
            </div>

            {/* Weekly call volume — real series or honest empty */}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500 mb-2.5">Call volume by week</p>
              {detail.callsPerWeek.length === 0 ? (
                <p className="text-xs text-gray-600 border border-dashed border-white/10 rounded-xl px-4 py-5 text-center">
                  No calls yet for this customer.
                </p>
              ) : (
                <BarChart data={detail.callsPerWeek} unit="calls" />
              )}
            </div>

            {/* Onboarding progress */}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500 mb-2.5">Onboarding</p>
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-2.5">
                <OnbFlag done={detail.onboardingComplete} label="Completed onboarding wizard" />
                <OnbFlag done={detail.hasForwardingSetup} label="Call forwarding set up" />
                <OnbFlag done={detail.hasMadeTestCall} label="First call received" />
              </div>
            </div>

            {/* Business facts */}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500 mb-1.5">Details</p>
              <Fact label="Email" value={detail.email} />
              <Fact label="Owner" value={detail.traderName} />
              <Fact label="Suburb" value={detail.suburb} />
              <Fact label="Mobile" value={detail.mobileNumber && <span className="font-mono">{detail.mobileNumber}</span>} />
              <Fact label="TradeDesk number" value={detail.twilioNumber && <span className="font-mono">{detail.twilioNumber}</span>} />
              <Fact label="Hours" value={detail.availability} />
              <Fact label="Signed up" value={`${format(new Date(detail.signupDate), 'd MMM yyyy')} (${ago(detail.signupDate)})`} />
              <Fact label="Last active" value={ago(detail.lastActive)} />
            </div>

            {/* Billing */}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500 mb-1.5">Billing</p>
              <Fact label="Stripe status" value={detail.billing.status} />
              <Fact label="Subscribed since" value={detail.billing.subscriptionStartedAt ? format(new Date(detail.billing.subscriptionStartedAt), 'd MMM yyyy') : '—'} />
              <Fact label="Current period ends" value={detail.billing.currentPeriodEnd ? format(new Date(detail.billing.currentPeriodEnd), 'd MMM yyyy') : '—'} />
              {detail.billing.cancelAtPeriodEnd && <p className="text-xs text-amber-400 mt-2">Set to cancel at period end.</p>}
            </div>

            {detail.services.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500 mb-2">Services</p>
                <div className="flex flex-wrap gap-1.5">
                  {detail.services.map(s => (
                    <span key={s} className="text-[10px] text-gray-400 border border-white/8 bg-white/[0.03] rounded-full px-2 py-1">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────── */
type SortKey = 'businessName' | 'signupDate' | 'calls' | 'jobs' | 'lastActive';

export function AdminPage() {
  useEffect(() => { document.title = 'Owner analytics | TradeDesk'; }, []);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [customers, setCustomers] = useState<CustomerRow[] | null>(null);
  const [growth, setGrowth] = useState<Growth | null>(null);
  const [activity, setActivity] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('signupDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Overview>('/admin/overview'),
      api.get<CustomerRow[]>('/admin/customers'),
      api.get<Growth>('/admin/growth'),
      api.get<ActivityItem[]>('/admin/activity'),
    ]).then(([o, c, g, a]) => {
      setOverview(o); setCustomers(c); setGrowth(g); setActivity(a);
    }).catch(e => setError(e.message || 'Failed to load admin data'));
  }, []);

  const sorted = useMemo(() => {
    if (!customers) return [];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? customers.filter(c =>
          c.businessName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.traderName.toLowerCase().includes(q) ||
          c.tradeType.toLowerCase().includes(q))
      : customers;
    return [...filtered].sort((a, b) => {
      const va = a[sortKey] ?? '';
      const vb = b[sortKey] ?? '';
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [customers, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortHead = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <th className={clsx('py-2.5 px-3 font-semibold text-gray-500 whitespace-nowrap', className)}>
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-gray-300 transition-colors">
        {label}
        {sortKey === k && (sortDir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />)}
      </button>
    </th>
  );

  const METRICS: Array<{ label: string; value: number | string; icon: typeof Users; hint?: string }> = overview ? [
    { label: 'Signups', value: overview.totalSignups, icon: Users },
    { label: 'Active (7 days)', value: overview.activeCustomers, icon: Activity },
    { label: 'Paying', value: overview.payingCustomers, icon: DollarSign },
    { label: 'On trial', value: overview.trialsInProgress, icon: UserPlus },
    { label: 'Calls handled', value: overview.totalCalls, icon: Phone, hint: 'all customers, all time' },
    { label: 'Jobs booked', value: overview.totalJobs, icon: Calendar, hint: 'all customers, all time' },
    { label: 'MRR', value: `$${overview.mrr.toLocaleString()}`, icon: TrendingUp, hint: `${overview.payingCustomers} paying × $199` },
  ] : [];

  const ACTIVITY_META = {
    signup: { icon: UserPlus, cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', verb: 'signed up' },
    call:   { icon: PhoneIncoming, cls: 'text-orange-400 bg-orange-500/10 border-orange-500/20', verb: 'call handled' },
    job:    { icon: Briefcase, cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20', verb: 'job booked' },
  } as const;

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/8 bg-ink-950/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap size={13} className="text-black" fill="currentColor" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight leading-none">Owner analytics</h1>
            <p className="text-[10px] text-gray-600 mt-0.5">Private — only visible to you</p>
          </div>
          <Link to="/dashboard" className="ml-auto inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors min-h-[44px]">
            <ArrowLeft size={13} /> Back to dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {error && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400">
            {error.includes('Forbidden') ? 'This account is not the admin — access denied by the server.' : error}
          </div>
        )}

        {/* ── Top-level metrics ── */}
        <section aria-label="Business metrics">
          {!overview && !error ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[...Array(7)].map((_, i) => <div key={i} className="h-24 skeleton rounded-2xl" />)}</div>
          ) : overview && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              {METRICS.map(({ label, value, icon: Icon, hint }) => (
                <div key={label} className="rounded-2xl border border-white/8 bg-ink-900 p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon size={12} className="text-gray-600" />
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider truncate">{label}</p>
                  </div>
                  <p className={clsx('text-2xl font-black tabular-nums tracking-tight', value === 0 || value === '$0' ? 'text-gray-600' : 'text-white')}>{value}</p>
                  {hint && <p className="text-[9px] text-gray-700 mt-1 leading-tight">{hint}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Growth ── */}
        <section aria-label="Growth over time" className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/8 bg-ink-900 p-5">
            <h2 className="text-sm font-bold text-white mb-4">Signups per week</h2>
            {growth ? <BarChart data={growth.signupsPerWeek} unit="signups" /> : <div className="h-40 skeleton rounded-xl" />}
          </div>
          <div className="rounded-2xl border border-white/8 bg-ink-900 p-5">
            <h2 className="text-sm font-bold text-white mb-4">Paying customers (cumulative)</h2>
            {growth ? (
              <>
                <BarChart data={growth.payingCumulative} unit="paying customers" />
                {growth.payingWithoutStartDate > 0 && (
                  <p className="text-[10px] text-gray-600 mt-2 leading-relaxed">
                    {growth.payingWithoutStartDate} paying customer{growth.payingWithoutStartDate !== 1 ? 's' : ''} subscribed
                    before start dates were recorded — shown in the totals above but not on this chart.
                  </p>
                )}
              </>
            ) : <div className="h-40 skeleton rounded-xl" />}
          </div>
        </section>

        {/* ── Customers ── */}
        <section aria-label="Customers">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
            <h2 className="text-sm font-bold text-white flex-shrink-0">
              Customers {customers && <span className="text-gray-600 font-medium">· {customers.length}</span>}
            </h2>
            <div className="relative sm:ml-auto sm:w-72">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name, email, or trade…"
                className="w-full bg-white/4 border border-white/8 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/40 transition-colors min-h-[38px]" />
            </div>
          </div>

          {!customers && !error ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 skeleton rounded-xl" />)}</div>
          ) : customers && customers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center">
              <Users size={22} className="text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No customers yet — this fills up as people sign up.</p>
            </div>
          ) : customers && (
            <>
              {/* Desktop table */}
              <div className="hidden md:block rounded-2xl border border-white/8 bg-ink-900 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-white/8 text-left">
                    <tr>
                      <SortHead k="businessName" label="Business" className="pl-4" />
                      <th className="py-2.5 px-3 font-semibold text-gray-500">Trade</th>
                      <SortHead k="signupDate" label="Signed up" />
                      <th className="py-2.5 px-3 font-semibold text-gray-500">Status</th>
                      <SortHead k="calls" label="Calls" />
                      <SortHead k="jobs" label="Jobs" />
                      <SortHead k="lastActive" label="Last active" />
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(c => (
                      <tr key={c.uid} onClick={() => setSelected(c.uid)}
                        className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] cursor-pointer transition-colors">
                        <td className="py-3 px-3 pl-4">
                          <p className="font-semibold text-white">{c.businessName || <span className="text-gray-600 italic">No business name</span>}</p>
                          <p className="text-gray-600 truncate max-w-[200px]">{c.email}</p>
                        </td>
                        <td className="py-3 px-3 text-gray-400">{c.tradeType || '—'}</td>
                        <td className="py-3 px-3 text-gray-400 whitespace-nowrap">{format(new Date(c.signupDate), 'd MMM yy')}</td>
                        <td className="py-3 px-3">
                          <span className={clsx('text-[9px] font-bold uppercase tracking-wide border px-1.5 py-0.5 rounded', STATUS_META[c.subStatus].cls)}>
                            {STATUS_META[c.subStatus].label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-white font-semibold tabular-nums">{c.calls}</td>
                        <td className="py-3 px-3 text-white font-semibold tabular-nums">{c.jobs}</td>
                        <td className="py-3 px-3 text-gray-500 whitespace-nowrap">{ago(c.lastActive)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sorted.length === 0 && <p className="text-center text-xs text-gray-600 py-8">No customers match "{search}".</p>}
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {sorted.map(c => (
                  <button key={c.uid} onClick={() => setSelected(c.uid)}
                    className="w-full text-left rounded-xl border border-white/8 bg-ink-900 p-4 hover:border-white/15 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-white truncate">{c.businessName || c.email}</p>
                      <span className={clsx('text-[9px] font-bold uppercase tracking-wide border px-1.5 py-0.5 rounded flex-shrink-0', STATUS_META[c.subStatus].cls)}>
                        {STATUS_META[c.subStatus].label}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      {c.tradeType || 'No trade set'} · joined {format(new Date(c.signupDate), 'd MMM')} · {c.calls} calls · {c.jobs} jobs
                    </p>
                  </button>
                ))}
                {sorted.length === 0 && <p className="text-center text-xs text-gray-600 py-8">No customers match "{search}".</p>}
              </div>
            </>
          )}
        </section>

        {/* ── Activity feed ── */}
        <section aria-label="Recent activity">
          <h2 className="text-sm font-bold text-white mb-3">Recent activity</h2>
          {!activity && !error ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-11 skeleton rounded-xl" />)}</div>
          ) : activity && activity.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
              <Activity size={20} className="text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Nothing yet — signups, calls and bookings will stream in here.</p>
            </div>
          ) : activity && (
            <div className="rounded-2xl border border-white/8 bg-ink-900 divide-y divide-white/5">
              {activity.map((a, i) => {
                const meta = ACTIVITY_META[a.type];
                const Icon = meta.icon;
                return (
                  <div key={`${a.type}-${a.at}-${i}`} className="flex items-center gap-3 px-4 py-3">
                    <div className={clsx('w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0', meta.cls)}>
                      <Icon size={13} />
                    </div>
                    <p className="text-xs text-gray-400 flex-1 min-w-0 truncate">
                      <span className="text-white font-medium">{a.who}</span> — {meta.verb}
                      {a.detail && <span className="text-gray-600"> · {a.detail}</span>}
                    </p>
                    <span className="text-[10px] text-gray-600 whitespace-nowrap flex-shrink-0">{ago(a.at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {selected && <CustomerPanel uid={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
