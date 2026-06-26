import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Phone, AlertTriangle, TrendingUp, Users, Calendar, BarChart2,
  CheckCircle2, DollarSign, PhoneCall, Table2, CalendarCheck, Link2,
  MessageSquare, Settings, ArrowRight, Search, Zap, Sun, Sunset, Moon,
  Activity, X,
} from 'lucide-react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { OutcomeBadge } from '../components/ui/Badge';
import { SkeletonCard, SkeletonRow } from '../components/ui/Skeleton';
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

/* ── Animated counter ── */
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);
  return value;
}

/* ── Greeting ── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', icon: Sun };
  if (h < 17) return { text: 'Good afternoon', icon: Sunset };
  return { text: 'Good evening', icon: Moon };
}

/* ── Stat card with hover lift ── */
const colorMap: Record<string, { icon: string; glow: string; border: string; bg: string }> = {
  blue:   { icon: 'text-blue-400',   glow: 'rgba(59,130,246,0.2)',   border: 'rgba(59,130,246,0.5)',   bg: 'bg-blue-500/15' },
  green:  { icon: 'text-green-400',  glow: 'rgba(34,197,94,0.2)',    border: 'rgba(34,197,94,0.5)',    bg: 'bg-green-500/15' },
  purple: { icon: 'text-purple-400', glow: 'rgba(168,85,247,0.2)',   border: 'rgba(168,85,247,0.5)',   bg: 'bg-purple-500/15' },
  gray:   { icon: 'text-gray-400',   glow: 'rgba(156,163,175,0.1)',  border: 'rgba(156,163,175,0.3)',  bg: 'bg-gray-500/15' },
};

function GlowStatCard({ icon: Icon, label, value, color, trend }: { icon: typeof Phone; label: string; value: number; color: string; trend?: number[] }) {
  const c = colorMap[color];
  const display = useCountUp(value);
  return (
    <div
      className="glass rounded-xl p-5 relative overflow-hidden transition-all duration-200 hover:scale-[1.03] hover:-translate-y-0.5 cursor-default group"
      style={{ borderTop: `2px solid ${c.border}` }}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-12 blur-2xl pointer-events-none transition-opacity duration-200 group-hover:opacity-150"
        style={{ background: c.glow }} />
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${c.bg} relative`}>
        <Icon size={17} className={c.icon} />
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-2xl font-bold text-white tabular-nums">{display}</div>
          <div className="text-xs text-gray-500 mt-0.5">{label}</div>
        </div>
        {trend && <Sparkline data={trend} color={c.icon.includes('blue') ? '#60a5fa' : c.icon.includes('green') ? '#34d399' : c.icon.includes('purple') ? '#a78bfa' : '#9ca3af'} />}
      </div>
    </div>
  );
}

function WeekRow({ icon: Icon, iconClass, label, value }: { icon: typeof Phone; iconClass: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconClass}`}>
          <Icon size={14} />
        </div>
        <span className="text-sm text-gray-300">{label}</span>
      </div>
      <span className="text-white font-bold">{value}</span>
    </div>
  );
}

function formatPhone(num: string): string {
  if (!num) return 'Unknown';
  const clean = num.replace(/\D/g, '');
  if (clean.startsWith('61') && clean.length === 11) return `0${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`;
  return num;
}

const CHECKLIST_ITEMS = [
  { key: 'hasBusinessDetails', label: 'Add your business details', hint: 'Settings → Business Profile', action: '/dashboard/settings' },
  { key: 'hasForwardingSetup', label: 'Set up call forwarding', hint: 'Forward missed calls to your TradeDesk number', action: '/dashboard/settings' },
  { key: 'hasMadeTestCall', label: 'Make a test call', hint: 'Call your number and hear your AI in action', action: '/dashboard/settings' },
];


/* ── Real-time clock ── */
function useRealTimeClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

/* ── Mini sparkline SVG ── */
function Sparkline({ data, color = '#60a5fa' }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 60, H = 22;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="ml-auto opacity-70">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
      <circle cx={pts.split(' ').pop()!.split(',')[0]} cy={pts.split(' ').pop()!.split(',')[1]} r="2" fill={color} />
    </svg>
  );
}

/* ── Command palette ── */
const CMD_ITEMS = [
  { label: 'View calls', icon: Phone, href: '/dashboard/calls', description: 'All call transcripts' },
  { label: 'Send SMS', icon: MessageSquare, href: '/dashboard/sms', description: 'Two-way SMS inbox' },
  { label: 'Settings', icon: Settings, href: '/dashboard/settings', description: 'AI & business settings' },
  { label: 'Contacts', icon: Users, href: '/dashboard/contacts', description: 'Your caller contacts' },
];

function CommandPalette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = CMD_ITEMS.filter(i =>
    i.label.toLowerCase().includes(q.toLowerCase()) ||
    i.description.toLowerCase().includes(q.toLowerCase())
  );

  const go = (href: string) => { navigate(href); onClose(); };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-24 px-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="glass rounded-2xl border border-white/15 w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
          <Search size={16} className="text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && filtered[0]) go(filtered[0].href);
            }}
            placeholder="Search pages, actions…"
            className="flex-1 bg-transparent text-white placeholder-gray-600 text-sm focus:outline-none"
          />
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors"><X size={15} /></button>
        </div>
        <div className="py-1.5">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-600">No results for "{q}"</p>
          ) : filtered.map(item => (
            <button key={item.href} onClick={() => go(item.href)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/6 transition-colors text-left group">
              <div className="w-8 h-8 glass rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/15 transition-colors">
                <item.icon size={14} className="text-gray-400 group-hover:text-blue-400 transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-gray-600">{item.description}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="px-4 py-2.5 border-t border-white/8 flex items-center gap-4 text-[10px] text-gray-700">
          <span className="flex items-center gap-1"><kbd className="font-mono bg-white/8 px-1 py-0.5 rounded">↑↓</kbd> Navigate</span>
          <span className="flex items-center gap-1"><kbd className="font-mono bg-white/8 px-1 py-0.5 rounded">↵</kbd> Open</span>
          <span className="flex items-center gap-1"><kbd className="font-mono bg-white/8 px-1 py-0.5 rounded">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}

export function OverviewPage() {
  useEffect(() => { document.title = 'Overview | TradeDesk'; }, []);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [search, setSearch] = useState('');
  const [cmdOpen, setCmdOpen] = useState(false);
  const clock = useRealTimeClock();
  const [searchResults, setSearchResults] = useState<RecentCall[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    Promise.all([
      api.get<Stats>('/dashboard/stats'),
      api.get<RecentCall[]>('/dashboard/recent-calls'),
    ]).then(([s, c]) => {
      setStats(s);
      setRecentCalls(c);
      setChecklist({
        hasBusinessDetails: !!(s.hasBusinessDetails),
        hasForwardingSetup: !!(s.hasForwardingSetup),
        hasMadeTestCall: !!(s.hasMadeTestCall || s.callsToday > 0 || s.totalContacts > 0),
      });
    }).catch(console.error).finally(() => setLoading(false));
    api.get<GoogleStatus>('/google/status').then(setGoogleStatus).catch(() => null);
  }, []);

  // Debounced search across calls
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        const all = await api.get<RecentCall[]>('/calls');
        const q = search.toLowerCase();
        setSearchResults(
          all.filter(c =>
            c.callerNumber?.includes(q) ||
            c.summary?.toLowerCase().includes(q) ||
            c.outcome?.toLowerCase().includes(q)
          ).slice(0, 5)
        );
      } catch { setSearchResults([]); } finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(searchTimeout.current);
  }, [search]);

  // CMD+K command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(o => !o); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleCheck = (key: string) => setChecklist(c => ({ ...c, [key]: !c[key] }));

  const greeting = getGreeting();
  const GreetIcon = greeting.icon;
  const firstName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <div className="h-7 w-48 skeleton rounded-lg" />
        <div className="h-4 w-32 skeleton rounded-md" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
      </div>
    </div>
  );

  const doneCount = Object.values(checklist).filter(Boolean).length;
  const allDone = doneCount === CHECKLIST_ITEMS.length;
  const callsThisWeek = stats?.callsThisWeek ?? stats?.leadsThisWeek ?? 0;
  const jobsThisWeek = stats?.jobsThisWeek ?? stats?.bookedToday ?? 0;
  const estRevenue = jobsThisWeek * 350;

  return (
    <div className="space-y-5 animate-slide-up">
      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}

      {/* ── AI Status Banner ── */}
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all ${
        allDone
          ? 'bg-green-500/8 border-green-500/25 text-green-400'
          : 'bg-yellow-500/8 border-yellow-500/25 text-yellow-400'
      }`}>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${allDone ? 'bg-green-400 animate-pulse' : 'bg-yellow-400 animate-pulse'}`} />
        <p className="text-sm font-medium flex-1">
          {allDone
            ? 'Your AI is live and answering calls'
            : `Setup incomplete — ${CHECKLIST_ITEMS.length - doneCount} step${CHECKLIST_ITEMS.length - doneCount > 1 ? 's' : ''} remaining`}
        </p>
        {!allDone && (
          <Link to="/dashboard/settings" className="text-xs underline underline-offset-2 flex-shrink-0">Finish setup →</Link>
        )}
      </div>

      {/* ── Greeting ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GreetIcon size={22} className="text-blue-400" />
            {greeting.text}, {firstName}!
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Here's what's happening with your AI today</p>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1 self-end pb-0.5">
          <p className="text-sm font-mono text-white tabular-nums">{format(clock, "HH:mm:ss")}</p>
          <p className="text-xs text-gray-600">{format(clock, "EEEE d MMMM")}</p>
        </div>
      </div>

      {/* ── Global Search ── */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search calls, contacts, SMS… (⌘K for command palette)"
          className="glass w-full rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 transition-all"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white text-xs">✕</button>
        )}
        {/* Search results dropdown */}
        {search && (
          <div className="absolute top-full left-0 right-0 mt-1.5 glass rounded-xl border border-white/10 z-20 overflow-hidden shadow-xl">
            {searching ? (
              <div className="px-4 py-3 text-sm text-gray-500">Searching…</div>
            ) : searchResults.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">No results for "{search}"</div>
            ) : (
              <>
                <p className="px-4 py-2 text-xs text-gray-600 border-b border-white/8 font-semibold uppercase tracking-wider">Calls</p>
                {searchResults.map(r => (
                  <button key={r.id} onClick={() => { navigate('/dashboard/calls'); setSearch(''); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0">
                    <Phone size={13} className="text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">{formatPhone(r.callerNumber)}</p>
                      <p className="text-xs text-gray-500 truncate">{r.summary?.slice(0, 60) || 'No summary'}</p>
                    </div>
                    <OutcomeBadge outcome={r.outcome} />
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <GlowStatCard icon={Phone} label="Calls today" value={stats?.callsToday ?? 0} color="blue" trend={[1,3,2,5,4,7,stats?.callsToday ?? 0]} />
        <GlowStatCard icon={Calendar} label="Jobs booked" value={stats?.bookedToday ?? 0} color="green" trend={[0,1,1,2,1,3,stats?.bookedToday ?? 0]} />
        <GlowStatCard icon={TrendingUp} label="Leads this week" value={stats?.leadsThisWeek ?? 0} color="purple" trend={[2,4,3,6,5,8,stats?.leadsThisWeek ?? 0]} />
        <GlowStatCard icon={Users} label="Total contacts" value={stats?.totalContacts ?? 0} color="gray" />
      </div>

      {/* ── Emergency alert ── */}
      {(stats?.emergenciesToday ?? 0) > 0 && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">
            <strong>{stats!.emergenciesToday} emergency call{stats!.emergenciesToday > 1 ? 's' : ''}</strong> — make sure you've followed up!
          </p>
        </div>
      )}

      {/* ── Quick actions ── */}
      <div className="flex gap-2 flex-wrap">
        <Link to="/dashboard/sms"
          className="flex items-center gap-1.5 glass rounded-lg px-3.5 py-2.5 text-xs font-medium text-gray-300 hover:text-white hover:border-white/20 transition-all border border-white/8 min-h-[40px]">
          <MessageSquare size={13} className="text-blue-400" /> Send test SMS
        </Link>
        <Link to="/dashboard/calls"
          className="flex items-center gap-1.5 glass rounded-lg px-3.5 py-2.5 text-xs font-medium text-gray-300 hover:text-white hover:border-white/20 transition-all border border-white/8 min-h-[40px]">
          <Phone size={13} className="text-purple-400" /> View last call
        </Link>
        <Link to="/dashboard/settings"
          className="flex items-center gap-1.5 glass rounded-lg px-3.5 py-2.5 text-xs font-medium text-gray-300 hover:text-white hover:border-white/20 transition-all border border-white/8 min-h-[40px]">
          <Settings size={13} className="text-green-400" /> Edit AI settings
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Getting started checklist */}
        {!allDone && (
          <div className="glass rounded-xl p-5 border border-white/8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Getting started</h2>
              <span className="text-xs text-blue-400 font-medium bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                {doneCount}/{CHECKLIST_ITEMS.length} done
              </span>
            </div>
            <div className="h-1.5 bg-white/6 rounded-full mb-4 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${(doneCount / CHECKLIST_ITEMS.length) * 100}%` }} />
            </div>
            <ul className="space-y-3">
              {CHECKLIST_ITEMS.map(({ key, label, hint, action }) => {
                const done = !!checklist[key];
                return (
                  <li key={key} className="flex items-start gap-3">
                    <button onClick={() => toggleCheck(key)}
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                        done ? 'bg-green-500 border-green-500' : 'border-gray-600 hover:border-blue-400'
                      }`}>
                      {done && <CheckCircle2 size={12} className="text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium transition-all duration-200 ${done ? 'text-gray-500 line-through' : 'text-white'}`}>{label}</p>
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
        <div className="glass rounded-xl p-5 border-l-2 border-blue-500/50 border-t border-r border-b border-white/8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">This week</h2>
            <span className="text-xs text-gray-600">Mon – today</span>
          </div>
          <div className="space-y-4">
            <WeekRow icon={Phone} iconClass="bg-blue-500/15 text-blue-400" label="Calls handled" value={callsThisWeek} />
            <WeekRow icon={Calendar} iconClass="bg-green-500/15 text-green-400" label="Jobs booked" value={jobsThisWeek} />
            <div className="h-px bg-white/6" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500/15 rounded-lg flex items-center justify-center">
                  <DollarSign size={14} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-300">Est. revenue saved</p>
                  <p className="text-xs text-gray-600">Based on avg $350/job</p>
                </div>
              </div>
              <span className="text-emerald-400 font-bold text-lg">${estRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Integrations status ── */}
      {googleStatus?.connected && (
        <div className="glass rounded-xl p-4 border border-white/8">
          <div className="flex items-center gap-2 mb-3">
            <Link2 size={14} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Integrations</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${googleStatus.sheetsConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'glass text-gray-500'}`}>
              <Table2 size={11} />
              Google Sheets {googleStatus.sheetsConnected ? '· Active' : '· Not configured'}
            </div>
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${googleStatus.calendarConnected ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'glass text-gray-500'}`}>
              <CalendarCheck size={11} />
              Google Calendar {googleStatus.calendarConnected ? '· Active' : '· Not configured'}
            </div>
          </div>
          {googleStatus.sheetsConnected && googleStatus.spreadsheetUrl && (
            <a href={googleStatus.spreadsheetUrl} target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Open spreadsheet →
            </a>
          )}
        </div>
      )}

      {/* ── Recent activity feed ── */}
      {recentCalls.length > 0 && (
        <div className="glass rounded-xl p-5 border border-white/8">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={15} className="text-blue-400" />
            <h2 className="text-base font-semibold text-white">Recent activity</h2>
          </div>
          <div className="space-y-3">
            {recentCalls.slice(0, 5).map(call => (
              <div key={call.id} className="flex items-center gap-3 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300">
                    Call from <span className="text-white font-medium">{formatPhone(call.callerNumber)}</span>
                    {' '}<OutcomeBadge outcome={call.outcome} />
                  </p>
                </div>
                <span className="text-xs text-gray-600 flex-shrink-0">
                  {call.createdAt ? formatDistanceToNow(new Date(call.createdAt), { addSuffix: true }) : ''}
                </span>
              </div>
            ))}
          </div>
          <Link to="/dashboard/calls" className="mt-4 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
            View all calls <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* ── Recent calls ── */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Recent calls</h2>
        {recentCalls.length === 0 ? (
          <div className="glass rounded-xl p-10 border border-white/8 text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 bg-blue-500/10 rounded-2xl blur-xl" />
              <div className="relative w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <PhoneCall size={28} className="text-blue-400/60" />
              </div>
            </div>
            <p className="font-semibold text-gray-300 mb-1">No calls yet</p>
            <p className="text-sm text-gray-600 mb-5 max-w-xs mx-auto">
              Once your AI answers its first call, you'll see a live feed here with transcripts and summaries.
            </p>
            <Link to="/dashboard/settings"
              className="inline-flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 text-sm font-medium px-4 py-2.5 rounded-lg transition-all duration-200 min-h-[44px]">
              <Settings size={14} /> Set up call forwarding
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentCalls.map(call => (
              <Card key={call.id} hover className="animate-fade-in">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-white text-sm">{formatPhone(call.callerNumber)}</span>
                      <OutcomeBadge outcome={call.outcome} />
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2">{call.summary || 'No summary available'}</p>
                  </div>
                  <span className="text-xs text-gray-600 flex-shrink-0 mt-0.5">
                    {formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
