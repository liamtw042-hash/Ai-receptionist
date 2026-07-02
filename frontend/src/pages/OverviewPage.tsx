import { useEffect, useState, useRef } from 'react';
import {
  Phone, AlertTriangle, TrendingUp, Users, Calendar,
  CheckCircle2, DollarSign, PhoneCall, Table2, CalendarCheck, Link2,
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

/* ── Premium Stat Card ─────────────────────────────────────────────────────
   Deliberately shows the REAL count only (animated up on first load). No
   fabricated trend sparklines or "+X% this week" indicators — there's no real
   historical series behind them, so we don't imply one. */
type CardColor = 'blue' | 'green' | 'purple' | 'amber';
const COLOR_MAP: Record<CardColor, {
  iconBg: string; iconText: string; border: string; glow: string; bar: string;
}> = {
  blue:   { iconBg: 'bg-blue-500/15',   iconText: 'text-blue-400',   border: 'rgba(59,130,246,0.28)', glow: 'rgba(59,130,246,0.07)',  bar: 'linear-gradient(90deg,#60a5fa,#3b82f6)' },
  green:  { iconBg: 'bg-green-500/15',  iconText: 'text-green-400',  border: 'rgba(34,197,94,0.28)',  glow: 'rgba(34,197,94,0.07)',   bar: 'linear-gradient(90deg,#4ade80,#22c55e)' },
  purple: { iconBg: 'bg-purple-500/15', iconText: 'text-purple-400', border: 'rgba(168,85,247,0.28)', glow: 'rgba(168,85,247,0.07)',  bar: 'linear-gradient(90deg,#c084fc,#a855f7)' },
  amber:  { iconBg: 'bg-amber-500/15',  iconText: 'text-amber-400',  border: 'rgba(245,158,11,0.30)', glow: 'rgba(245,158,11,0.08)',  bar: 'linear-gradient(90deg,#fbbf24,#f59e0b)' },
};

function StatCard({
  icon: Icon, label, value, color, hint, suffix = '',
}: {
  icon: typeof Phone; label: string; value: number; color: CardColor;
  hint?: string; suffix?: string;
}) {
  const c = COLOR_MAP[color];
  const display = useCountUp(value);
  const empty = value === 0;
  const reduce = useReducedMotion();

  return (
    <motion.div variants={reduce ? instantItem : staggerItem}
      className="group relative rounded-2xl p-4 sm:p-5 overflow-hidden cursor-default transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
      style={{
        background: 'linear-gradient(135deg,rgba(13,20,38,0.9) 0%,rgba(8,12,20,0.9) 100%)',
        border: `1px solid ${c.border}`,
        boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px ${c.glow}`,
      }}>
      {/* Corner glow */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }} />
      {/* Top accent line */}
      <div className="absolute top-0 left-4 right-4 h-px opacity-60" style={{ background: c.bar }} />

      <div className="relative flex items-start justify-between gap-2 mb-3">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 ${c.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon size={15} className={c.iconText} />
        </div>
      </div>

      <div className="relative">
        <div className={`text-3xl font-black tabular-nums tracking-tight ${empty ? 'text-gray-600' : 'text-white'}`}>
          {display}{suffix}
        </div>
        <p className="text-[11px] text-gray-600 mt-1 truncate">{empty ? (hint ?? '—') : hint}</p>
      </div>
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
  { key: 'hasBusinessDetails', label: 'Add business details', hint: 'Settings → Business profile', action: '/dashboard/settings' },
  { key: 'hasForwardingSetup', label: 'Set up call forwarding', hint: 'Forward missed calls to your TradeDesk number', action: '/dashboard/settings' },
  { key: 'hasMadeTestCall', label: 'Make a test call', hint: 'Call your number and hear your AI', action: '/dashboard/settings' },
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

  const toggleCheck = (key: string) => setChecklist(c => ({ ...c, [key]: !c[key] }));
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
  const estRevenue = jobsThisWeek * 350;
  // A genuinely brand-new account: nothing has happened yet AND setup isn't done.
  const freshUser =
    !allDone &&
    (stats?.callsToday ?? 0) === 0 &&
    (stats?.totalContacts ?? 0) === 0 &&
    recentCalls.length === 0;

  return (
    <div className="space-y-5 animate-slide-up">

      {/* ── AI Status Banner ── */}
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

      {/* ── Greeting row ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <GreetIcon size={20} className="text-blue-400 flex-shrink-0" />
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">{greeting.text}, {firstName}</h1>
            <p className="text-xs text-gray-600 mt-0.5">{format(new Date(), 'EEEE d MMMM')}</p>
          </div>
        </div>
        <div className="hidden sm:block text-right flex-shrink-0">
          <p className="text-lg font-mono font-semibold text-white tabular-nums">{format(clock, 'HH:mm:ss')}</p>
        </div>
      </div>

      {/* ── First-run welcome (brand-new account) ── */}
      {freshUser && (
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 p-5 sm:p-6"
          style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.10) 0%,rgba(13,20,38,0.6) 55%,rgba(8,12,20,0.6) 100%)' }}>
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle,rgba(245,158,11,0.10) 0%,transparent 70%)' }} />
          <div className="relative flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center flex-shrink-0">
              <Sparkles size={20} className="text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white tracking-tight">Let's get your AI answering calls</h2>
              <p className="text-sm text-gray-400 mt-1 leading-relaxed max-w-xl">
                You're a few minutes from never missing a job again. Finish these{' '}
                {CHECKLIST_ITEMS.length - doneCount} step{CHECKLIST_ITEMS.length - doneCount > 1 ? 's' : ''} and your
                first calls, leads and bookings will start landing right here.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mt-4">
                <Link to="/dashboard/settings"
                  className="inline-flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-500/20">
                  Finish setup <ArrowRight size={14} />
                </Link>
                <span className="text-xs text-gray-600">Takes about 10 minutes · no hardware needed</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Stat cards ── */}
      <motion.div className="grid grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4"
        variants={reduceMotion ? instantContainer : staggerContainer(0.06)}
        initial="hidden" animate="show">
        <StatCard icon={Phone} label="Calls today" value={stats?.callsToday ?? 0} color="blue" hint="Answered by your AI" />
        <StatCard icon={Calendar} label="Jobs booked" value={stats?.bookedToday ?? 0} color="green" hint="Today" />
        <StatCard icon={TrendingUp} label="Leads this week" value={stats?.leadsThisWeek ?? 0} color="purple" hint="New enquiries" />
        <StatCard icon={Users} label="Total contacts" value={stats?.totalContacts ?? 0} color="amber" hint="In your CRM" />
      </motion.div>

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

      {/* ── Quick actions ── */}
      <div className="flex gap-2 flex-wrap">
        {[
          { to: '/dashboard/sms', icon: MessageSquare, label: 'Send test SMS', color: 'text-blue-400' },
          { to: '/dashboard/calls', icon: Phone, label: 'View last call', color: 'text-purple-400' },
          { to: '/dashboard/settings', icon: Settings, label: 'AI settings', color: 'text-green-400' },
        ].map(({ to, icon: Icon, label, color }) => (
          <Link key={to} to={to}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-400 hover:text-white transition-all border border-white/7 hover:border-white/15 bg-white/3 hover:bg-white/6 min-h-[38px]">
            <Icon size={12} className={color} />{label}
          </Link>
        ))}
      </div>

      {/* ── Two-column content ── */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* LEFT — Recent calls feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity size={14} className="text-blue-400" /> Recent calls
            </h2>
            <Link to="/dashboard/calls" className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>

          {recentCalls.length === 0 ? (
            <div className="rounded-2xl border border-white/7 py-10 text-center"
              style={{ background: 'rgba(13,20,38,0.5)' }}>
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <PhoneCall size={22} className="text-blue-400/40" />
              </div>
              <p className="text-sm font-semibold text-gray-400 mb-1">No calls yet</p>
              <p className="text-xs text-gray-600 max-w-[200px] mx-auto">Your AI's first call will appear here in real time.</p>
              <Link to="/dashboard/settings"
                className="inline-flex items-center gap-1.5 mt-4 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                Set up call forwarding <ArrowRight size={11} />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5 rounded-2xl overflow-hidden border border-white/7"
              style={{ background: 'rgba(13,20,38,0.5)' }}>
              {recentCalls.slice(0, 6).map(call => (
                <div key={call.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors cursor-pointer group"
                  onClick={() => navigate('/dashboard/calls')}>
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone size={13} className="text-blue-400" />
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
          {/* Getting started checklist */}
          {!allDone && (
            <div className="rounded-2xl border border-white/7 p-5"
              style={{ background: 'rgba(13,20,38,0.5)' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">Getting started</h2>
                <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/15 px-2 py-0.5 rounded-full">
                  {doneCount}/{CHECKLIST_ITEMS.length}
                </span>
              </div>
              <div className="h-1 bg-white/6 rounded-full mb-4 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                  style={{ width: `${(doneCount / CHECKLIST_ITEMS.length) * 100}%` }} />
              </div>
              <ul className="space-y-3">
                {CHECKLIST_ITEMS.map(({ key, label, hint, action }) => {
                  const done = !!checklist[key];
                  return (
                    <li key={key} className="flex items-start gap-3">
                      <button onClick={() => toggleCheck(key)}
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          done ? 'bg-green-500 border-green-500' : 'border-gray-600 hover:border-blue-400'
                        }`}>
                        {done && <CheckCircle2 size={12} className="text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium transition-all ${done ? 'text-gray-500 line-through' : 'text-white'}`}>{label}</p>
                        {!done && (
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-gray-600">{hint}</p>
                            <Link to={action} className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0">Go →</Link>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Weekly summary */}
          <div className="rounded-2xl border border-white/7 p-5"
            style={{ background: 'rgba(13,20,38,0.5)', borderLeft: '3px solid rgba(59,130,246,0.5)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">This week</h2>
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <span className="text-xs text-gray-600">Mon – today</span>
                <Link to="/dashboard/jobs" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">View jobs →</Link>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { icon: Phone, bg: 'bg-blue-500/12', color: 'text-blue-400', label: 'Calls handled', value: callsThisWeek },
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
              <div className="pt-2 border-t border-white/6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-emerald-500/12 rounded-lg flex items-center justify-center">
                      <DollarSign size={13} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Est. revenue saved</p>
                      <p className="text-[10px] text-gray-700">avg $350/job</p>
                    </div>
                  </div>
                  <span className="text-emerald-400 font-black text-lg tabular-nums">${estRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Integrations */}
          {googleStatus?.connected && (
            <div className="rounded-2xl border border-white/7 p-4"
              style={{ background: 'rgba(13,20,38,0.5)' }}>
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
