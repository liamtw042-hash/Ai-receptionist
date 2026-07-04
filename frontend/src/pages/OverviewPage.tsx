import { useEffect, useState, useRef } from 'react';
import {
  Phone, AlertTriangle, TrendingUp, Users, Calendar,
  CheckCircle2, PhoneCall, Table2, CalendarCheck, Link2,
  MessageSquare, Settings, ArrowRight, Activity, Sparkles,
  Sun, Sunset, Moon,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { api } from '../lib/api';
import { OutcomeBadge } from '../components/ui/Badge';
import { SkeletonCard, SkeletonRow } from '../components/ui/Skeleton';
import { staggerContainer, staggerItem, instantContainer, instantItem } from '../lib/motion';
import { formatDistanceToNow, format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Stats {
  callsToday: number;
  emergenciesToday: number;
  bookedToday: number;
  leadsThisWeek: number;
  totalContacts: number;
  callsThisWeek?: number;
  jobsThisWeek?: number;
  onboardingComplete?: boolean;
  hasBusinessDetails?: boolean;
  hasForwardingSetup?: boolean;
  hasMadeTestCall?: boolean;
}

interface GoogleStatus {
  connected: boolean;
  sheetsConnected: boolean;
  calendarConnected: boolean;
  email?: string;
  spreadsheetUrl?: string;
}

interface RecentCall {
  id: string;
  callerNumber: string;
  outcome: string;
  summary: string;
  createdAt: string;
}

/* ── Animated counter ─────────────────────────────── */
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

/* ── Real-time clock ──────────────────────────────── */
function useRealTimeClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

/* ── Stat displays ──────────────────────────────────────────────────────────
   Real counts only (animated up on first load). No fabricated trends / "+X%"
   indicators — there's no historical series behind them. Hierarchy comes from
   size, placement and weight, not colour: ONE dominant hero number (what a
   tradie checks first — calls their AI caught today) plus quieter supporting
   metrics. This kills the "four identical candy-coloured cards" template. */

// The hero metric: calls the AI answered today. Big, monospaced, unmissable.
function HeroMetric({ value, booked }: { value: number; booked: number }) {
  const calls = useCountUp(value);
  const jobs = useCountUp(booked);
  const empty = value === 0;
  const reduce = useReducedMotion();
  return (
    <motion.div variants={reduce ? instantItem : staggerItem}
      className="relative overflow-hidden rounded-2xl p-5 sm:p-6"
      style={{
        background: 'linear-gradient(135deg,rgba(38,22,8,0.55) 0%,rgba(15,17,20,0.9) 45%,rgba(10,11,13,0.92) 100%)',
        border: '1px solid rgba(249,115,22,0.28)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 8px 40px rgba(249,115,22,0.08)',
      }}>
      <div className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(249,115,22,0.12) 0%,transparent 70%)', transform: 'translate(30%,-35%)' }} />
      <div className="absolute top-0 left-5 right-5 h-px" style={{ background: 'linear-gradient(90deg,#fb923c,transparent)' }} />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
              <PhoneCall size={14} className="text-orange-400" />
            </span>
            <p className="text-[11px] font-bold text-orange-400/90 uppercase tracking-[0.14em]">Calls caught today</p>
          </div>
          <div className={`mt-3 font-black tabular-nums tracking-tighter leading-none text-5xl sm:text-6xl ${empty ? 'text-gray-600' : 'text-white'}`}>
            {calls}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {empty ? 'No calls yet today — your AI is standing by.' : 'Answered by your AI while you worked.'}
          </p>
        </div>

        {/* Jobs booked — the payoff, sits alongside as a strong secondary */}
        <div className="text-right flex-shrink-0 pl-4 border-l border-white/8 self-stretch flex flex-col justify-center min-w-[92px]">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Booked</p>
          <div className={`text-3xl font-black tabular-nums tracking-tight mt-1 ${booked === 0 ? 'text-gray-600' : 'text-green-400'}`}>{jobs}</div>
          <p className="text-[10px] text-gray-600 mt-0.5">jobs today</p>
        </div>
      </div>
    </motion.div>
  );
}

// Supporting metrics: quieter, monochrome, equal to each other but clearly
// subordinate to the hero. Value dominant, label small and grey.
function MiniStat({ icon: Icon, label, value, hint }: {
  icon: typeof Phone; label: string; value: number; hint: string;
}) {
  const display = useCountUp(value);
  const empty = value === 0;
  const reduce = useReducedMotion();
  return (
    <motion.div variants={reduce ? instantItem : staggerItem}
      className="group relative rounded-xl p-4 overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: 'rgba(15,17,20,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2 mb-2.5">
        <Icon size={13} className="text-gray-500 group-hover:text-orange-400/80 transition-colors flex-shrink-0" />
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider truncate">{label}</p>
      </div>
      <div className={`text-2xl font-black tabular-nums tracking-tight ${empty ? 'text-gray-600' : 'text-white'}`}>{display}</div>
      <p className="text-[10px] text-gray-600 mt-0.5 truncate">{hint}</p>
    </motion.div>
  );
}

/* ── Helpers ──────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', icon: Sun };
  if (h < 17) return { text: 'Good afternoon', icon: Sunset };
  return { text: 'Good evening', icon: Moon };
}

function formatPhone(num: string): string {
  if (!num) return 'Unknown';
  const clean = num.replace(/\D/g, '');
  if (clean.startsWith('61') && clean.length === 11) return `0${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`;
  return num;
}

const CHECKLIST_ITEMS = [
  {
    key: 'hasBusinessDetails',
    label: 'Add your business details',
    hint: 'Your name, trade and prices — everything the AI answers with',
    action: '/dashboard/settings',
    cta: 'Fill them in',
    manual: false, // derived server-side from the actual saved fields
  },
  {
    key: 'hasForwardingSetup',
    label: 'Forward your missed calls',
    hint: 'Three quick dial codes on your phone — instructions included',
    action: '/dashboard/settings#forwarding',
    cta: 'Show me the codes',
    manual: true, // the one step only the user can confirm
  },
  {
    key: 'hasMadeTestCall',
    label: 'Make a test call',
    hint: 'Ring your TradeDesk number and hear it answer as your business',
    action: '/dashboard/settings#test-call',
    cta: 'How to test it',
    manual: false, // ticks itself when the first real call lands
  },
];

/* ── Main ──────────────────────────────────────────── */
export function OverviewPage() {
  useEffect(() => { document.title = 'Overview | TradeDesk'; }, []);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const clock = useRealTimeClock();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    Promise.all([
      api.get<Stats>('/dashboard/stats'),
      api.get<RecentCall[]>('/dashboard/recent-calls'),
    ]).then(([s, c]) => {
      setStats(s);
      setRecentCalls(c);
      setChecklist({
        hasBusinessDetails: !!s.hasBusinessDetails,
        hasForwardingSetup: !!s.hasForwardingSetup,
        hasMadeTestCall: !!(s.hasMadeTestCall || s.callsToday > 0 || s.totalContacts > 0),
      });
    }).catch(console.error).finally(() => setLoading(false));
    api.get<GoogleStatus>('/google/status').then(setGoogleStatus).catch(() => null);
  }, []);

  const toggleCheck = (key: string) => {
    const item = CHECKLIST_ITEMS.find(i => i.key === key);
    if (!item?.manual) return; // derived steps complete themselves
    setChecklist(c => {
      const next = !c[key];
      // Persist — an un-saved tick that vanishes on reload reads as a bug.
      api.put('/settings', { hasForwardingSetup: next }).catch(() => {});
      return { ...c, [key]: next };
    });
  };
  const greeting = getGreeting();
  const GreetIcon = greeting.icon;
  const firstName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-7 w-48 skeleton rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
      </div>
    </div>
  );

  const doneCount = Object.values(checklist).filter(Boolean).length;
  const allDone = doneCount === CHECKLIST_ITEMS.length;
  const callsThisWeek = stats?.callsThisWeek ?? stats?.leadsThisWeek ?? 0;
  const jobsThisWeek = stats?.jobsThisWeek ?? stats?.bookedToday ?? 0;
  // A genuinely brand-new account: nothing has happened yet AND setup isn't done.
  const freshUser =
    !allDone &&
    (stats?.callsToday ?? 0) === 0 &&
    (stats?.totalContacts ?? 0) === 0 &&
    recentCalls.length === 0;

  return (
    <div className="space-y-5 animate-slide-up">

      {/* ── AI Status Banner (hidden for fresh users — the guided panel below
             carries the same message without the nag) ── */}
      {!freshUser && (
      <div className={`flex items-center gap-3 rounded-xl px-4 py-2.5 border text-sm font-medium transition-all ${
        allDone
          ? 'bg-green-500/6 border-green-500/20 text-green-400'
          : 'bg-amber-500/6 border-amber-500/20 text-amber-400'
      }`}>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 animate-pulse ${allDone ? 'bg-green-400' : 'bg-amber-400'}`} />
        <span className="flex-1">
          {allDone ? 'Your AI is live and answering calls' : `Setup incomplete — ${CHECKLIST_ITEMS.length - doneCount} step${CHECKLIST_ITEMS.length - doneCount > 1 ? 's' : ''} remaining`}
        </span>
        {!allDone && <Link to="/dashboard/settings" className="text-xs underline underline-offset-2 flex-shrink-0">Finish →</Link>}
      </div>
      )}

      {/* ── Greeting row ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <GreetIcon size={20} className="text-orange-400 flex-shrink-0" />
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight leading-none">{greeting.text}, {firstName}</h1>
            <p className="text-xs text-gray-500 mt-1">{format(new Date(), 'EEEE d MMMM')}</p>
          </div>
        </div>
        <div className="hidden sm:block text-right flex-shrink-0">
          <p className="text-lg font-mono font-semibold text-white tabular-nums">{format(clock, 'HH:mm:ss')}</p>
        </div>
      </div>

      {/* ── First-run experience (brand-new account) ──
             A guided do-this-first panel instead of empty stat cards: each step
             is numbered, state-aware, and links straight to where it happens. */}
      {freshUser && (
        <div className="relative overflow-hidden rounded-2xl border border-orange-500/25 p-5 sm:p-7"
          style={{ background: 'linear-gradient(135deg,rgba(249,115,22,0.10) 0%,rgba(15,17,20,0.7) 55%,rgba(10,11,13,0.7) 100%)' }}>
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle,rgba(249,115,22,0.13) 0%,transparent 70%)' }} />
          <div className="relative">
            <div className="flex items-center gap-3 mb-1.5">
              <Sparkles size={18} className="text-orange-400 flex-shrink-0" />
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Three steps and your AI is taking calls</h2>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xl mb-5">
              About ten minutes, all up. The moment a call comes through, this page fills with
              calls, leads and booked jobs — here's exactly what to do first.
            </p>

            <ol className="space-y-3 max-w-xl">
              {CHECKLIST_ITEMS.map(({ key, label, hint, action, cta }, i) => {
                const done = !!checklist[key];
                return (
                  <li key={key} className={`flex items-start gap-3.5 rounded-xl border px-4 py-3.5 transition-all ${
                    done ? 'border-emerald-500/25 bg-emerald-500/[0.04]' : 'border-white/8 bg-white/[0.03]'
                  }`}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      done ? 'bg-emerald-500 text-black' : 'bg-orange-500/15 border border-orange-500/30 text-orange-400'
                    }`}>
                      {done ? <CheckCircle2 size={14} /> : i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${done ? 'text-gray-500 line-through' : 'text-white'}`}>{label}</p>
                      {!done && (
                        <>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{hint}</p>
                          <Link to={action}
                            className="inline-flex items-center gap-1.5 mt-2 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold px-3 py-1.5 rounded-lg transition-all min-h-[32px]">
                            {cta} <ArrowRight size={12} />
                          </Link>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            <p className="text-xs text-gray-600 mt-4">
              Stuck on any step? Email{' '}
              <a href="mailto:hello@tradedesk.com.au" className="text-orange-400/90 hover:text-orange-300">hello@tradedesk.com.au</a>{' '}
              and a human will sort you out.
            </p>
          </div>
        </div>
      )}

      {/* ── Stats — deliberate hierarchy: one dominant hero, three quiet supports.
             Hidden for a brand-new account: a wall of zeros reads as "broken",
             the guided panel above is the first-run content instead. ── */}
      {!freshUser && (
      <motion.div className="grid gap-3 lg:gap-4 lg:grid-cols-[1.35fr_1fr]"
        variants={reduceMotion ? instantContainer : staggerContainer(0.06)}
        initial="hidden" animate="show">
        <HeroMetric value={stats?.callsToday ?? 0} booked={stats?.bookedToday ?? 0} />
        <div className="grid grid-cols-3 gap-3">
          <MiniStat icon={TrendingUp} label="Leads" value={stats?.leadsThisWeek ?? 0} hint="this week" />
          <MiniStat icon={Users} label="Contacts" value={stats?.totalContacts ?? 0} hint="in your CRM" />
          <MiniStat icon={Calendar} label="Jobs" value={jobsThisWeek} hint="this week" />
        </div>
      </motion.div>
      )}

      {/* ── Emergency alert ── */}
      {(stats?.emergenciesToday ?? 0) > 0 && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 border bg-red-500/6 border-red-500/25">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">
            <strong>{stats!.emergenciesToday} emergency call{stats!.emergenciesToday > 1 ? 's' : ''}</strong> flagged — check your phone.
          </p>
          <Link to="/dashboard/calls" className="ml-auto text-xs text-red-400 hover:text-red-300 flex-shrink-0">View →</Link>
        </div>
      )}

      {/* ── Quick actions (nothing to act on yet for a fresh account) ── */}
      {!freshUser && (
      <div className="flex gap-2 flex-wrap">
        {[
          { to: '/dashboard/sms', icon: MessageSquare, label: 'Send test SMS' },
          { to: '/dashboard/calls', icon: Phone, label: 'View last call' },
          { to: '/dashboard/settings', icon: Settings, label: 'AI settings' },
        ].map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to}
            className="group flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-400 hover:text-white transition-all border border-white/7 hover:border-orange-500/30 bg-white/3 hover:bg-white/6 min-h-[38px]">
            <Icon size={12} className="text-gray-500 group-hover:text-orange-400 transition-colors" />{label}
          </Link>
        ))}
      </div>
      )}

      {/* ── Two-column content ── */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* LEFT — Recent calls feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity size={14} className="text-orange-400" /> Recent calls
            </h2>
            <Link to="/dashboard/calls" className="text-xs font-medium text-gray-500 hover:text-orange-400 transition-colors flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>

          {recentCalls.length === 0 ? (
            <div className="rounded-2xl border border-white/7 py-10 text-center"
              style={{ background: 'rgba(15,17,20,0.5)' }}>
              <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <PhoneCall size={22} className="text-orange-400/50" />
              </div>
              <p className="text-sm font-semibold text-gray-300 mb-1">No calls yet — but you're covered</p>
              <p className="text-xs text-gray-600 max-w-[220px] mx-auto">The next call you can't pick up, your AI answers it. It'll show up here the second it happens.</p>
              <Link to="/dashboard/settings"
                className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors">
                Set up call forwarding <ArrowRight size={11} />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5 rounded-2xl overflow-hidden border border-white/7"
              style={{ background: 'rgba(15,17,20,0.5)' }}>
              {recentCalls.slice(0, 6).map(call => (
                <div key={call.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors cursor-pointer group"
                  onClick={() => navigate('/dashboard/calls')}>
                  <div className="w-8 h-8 bg-white/5 group-hover:bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                    <Phone size={13} className="text-gray-400 group-hover:text-orange-400 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-white">{formatPhone(call.callerNumber)}</span>
                      <OutcomeBadge outcome={call.outcome} />
                    </div>
                    <p className="text-xs text-gray-500 truncate">{call.summary || 'No summary'}</p>
                  </div>
                  <span className="text-xs text-gray-600 flex-shrink-0">
                    {call.createdAt ? formatDistanceToNow(new Date(call.createdAt), { addSuffix: true }) : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — Checklist + Weekly summary stacked */}
        <div className="space-y-3">
          {/* Getting started checklist (fresh users get the guided panel instead) */}
          {!allDone && !freshUser && (
            <div className="rounded-2xl border border-white/7 p-5"
              style={{ background: 'rgba(15,17,20,0.5)' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-white">Getting started</h2>
                <span className="text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full tabular-nums">
                  {doneCount}/{CHECKLIST_ITEMS.length}
                </span>
              </div>
              <div className="h-1 bg-white/6 rounded-full mb-4 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-500"
                  style={{ width: `${(doneCount / CHECKLIST_ITEMS.length) * 100}%` }} />
              </div>
              <ul className="space-y-3">
                {CHECKLIST_ITEMS.map(({ key, label, hint, action, cta, manual }) => {
                  const done = !!checklist[key];
                  return (
                    <li key={key} className="flex items-start gap-3">
                      {manual ? (
                        // The forwarding step is the user's own claim — togglable, persisted.
                        <button onClick={() => toggleCheck(key)}
                          aria-label={done ? `Mark "${label}" as not done` : `Mark "${label}" as done`}
                          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600 hover:border-orange-400'
                          }`}>
                          {done && <CheckCircle2 size={12} className="text-black" />}
                        </button>
                      ) : (
                        // Derived steps verify themselves — status, not a claim.
                        <span aria-hidden="true"
                          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-700 border-dashed'
                          }`}>
                          {done && <CheckCircle2 size={12} className="text-black" />}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium transition-all ${done ? 'text-gray-500 line-through' : 'text-white'}`}>{label}</p>
                        {!done && (
                          <>
                            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{hint}</p>
                            <Link to={action} className="inline-flex items-center gap-1 text-xs font-semibold text-orange-400 hover:text-orange-300 mt-1 min-h-[28px]">
                              {cta} <ArrowRight size={11} />
                            </Link>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="text-[11px] text-gray-700 mt-3.5 leading-relaxed">
                Steps 1 and 3 tick themselves off automatically — only the forwarding step needs your say-so.
              </p>
            </div>
          )}

          {/* Weekly summary (zeros hidden for fresh accounts) */}
          {!freshUser && (
          <div className="rounded-2xl border border-white/7 p-5"
            style={{ background: 'rgba(15,17,20,0.5)', borderLeft: '3px solid rgba(249,115,22,0.55)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white">This week</h2>
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <span className="text-xs text-gray-600">Mon – today</span>
                <Link to="/dashboard/jobs" className="text-xs font-medium text-gray-500 hover:text-orange-400 transition-colors">View jobs →</Link>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { icon: Phone, bg: 'bg-orange-500/12', color: 'text-orange-400', label: 'Calls handled', value: callsThisWeek },
                { icon: Calendar, bg: 'bg-green-500/12', color: 'text-green-400', label: 'Jobs booked', value: jobsThisWeek },
              ].map(({ icon: Icon, bg, color, label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 ${bg} rounded-lg flex items-center justify-center`}>
                      <Icon size={13} className={color} />
                    </div>
                    <span className="text-sm text-gray-400">{label}</span>
                  </div>
                  <span className="text-white font-bold tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          </div>
          )}
          {/* Integrations */}
          {googleStatus?.connected && (
            <div className="rounded-2xl border border-white/7 p-4"
              style={{ background: 'rgba(15,17,20,0.5)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Link2 size={13} className="text-emerald-400" />
                <h2 className="text-xs font-semibold text-white uppercase tracking-wider">Integrations</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { Icon: Table2, connected: googleStatus.sheetsConnected, label: 'Google Sheets', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                  { Icon: CalendarCheck, connected: googleStatus.calendarConnected, label: 'Google Calendar', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                ].map(({ Icon, connected, label, color, bg }) => (
                  <div key={label} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${connected ? bg : 'bg-white/3 border-white/8 text-gray-600'}`}>
                    <Icon size={11} className={connected ? color : 'text-gray-600'} />
                    <span className={connected ? color : 'text-gray-600'}>{label} {connected ? '· Active' : '· Off'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
