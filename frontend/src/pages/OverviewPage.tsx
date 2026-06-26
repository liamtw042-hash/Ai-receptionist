import { useEffect, useState, useRef } from 'react';
import { Phone, AlertTriangle, TrendingUp, Users, Calendar, BarChart2, CheckCircle2, Circle, DollarSign, PhoneCall, Table2, CalendarCheck, Link2 } from 'lucide-react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { OutcomeBadge } from '../components/ui/Badge';
import { SkeletonCard, SkeletonRow } from '../components/ui/Skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

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

// Animated counter hook
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

const CHECKLIST_ITEMS = [
  { key: 'hasBusinessDetails', label: 'Add your business details', hint: 'Go to Settings → Business Profile' },
  { key: 'hasForwardingSetup', label: 'Set up call forwarding', hint: 'Forward missed calls to your TradeDesk number' },
  { key: 'hasMadeTestCall', label: 'Make a test call', hint: 'Call your number and hear your AI in action' },
];

export function OverviewPage() {
  useEffect(() => { document.title = 'Overview | TradeDesk'; }, []);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);

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
    // Fetch Google status in background (non-blocking)
    api.get<GoogleStatus>('/google/status').then(setGoogleStatus).catch(() => null);
  }, []);

  const toggleCheck = (key: string) => {
    setChecklist(c => ({ ...c, [key]: !c[key] }));
  };

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <div className="h-7 w-32 skeleton rounded-lg" />
        <div className="h-4 w-48 skeleton rounded-md" />
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
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-gray-500 text-sm mt-0.5">Today's activity at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <GlowStatCard icon={Phone} label="Calls today" value={stats?.callsToday ?? 0} color="blue" />
        <GlowStatCard icon={Calendar} label="Jobs booked" value={stats?.bookedToday ?? 0} color="green" />
        <GlowStatCard icon={TrendingUp} label="Leads this week" value={stats?.leadsThisWeek ?? 0} color="purple" />
        <GlowStatCard icon={Users} label="Total contacts" value={stats?.totalContacts ?? 0} color="gray" />
      </div>

      {(stats?.emergenciesToday ?? 0) > 0 && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">
            <strong>{stats!.emergenciesToday} emergency call{stats!.emergenciesToday > 1 ? 's' : ''}</strong> — make sure you've followed up!
          </p>
        </div>
      )}

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
              {CHECKLIST_ITEMS.map(({ key, label, hint }) => {
                const done = !!checklist[key];
                return (
                  <li key={key}>
                    <button
                      onClick={() => toggleCheck(key)}
                      className="flex items-start gap-3 w-full text-left group"
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                        done
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-600 group-hover:border-blue-400'
                      }`}>
                        {done && <CheckCircle2 size={12} className="text-white" />}
                      </div>
                      <div>
                        <p className={`text-sm font-medium transition-all duration-200 ${done ? 'text-gray-500 line-through' : 'text-white'}`}>{label}</p>
                        {!done && <p className="text-xs text-gray-600 mt-0.5">{hint}</p>}
                      </div>
                    </button>
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

      {/* Integrations status */}
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

      {/* Recent calls */}
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
              className="inline-flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200">
              Set up call forwarding
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

const colorMap: Record<string, { icon: string; glow: string; border: string; bg: string }> = {
  blue:   { icon: 'text-blue-400',   glow: 'rgba(59,130,246,0.2)',   border: 'rgba(59,130,246,0.5)',   bg: 'bg-blue-500/15' },
  green:  { icon: 'text-green-400',  glow: 'rgba(34,197,94,0.2)',    border: 'rgba(34,197,94,0.5)',    bg: 'bg-green-500/15' },
  purple: { icon: 'text-purple-400', glow: 'rgba(168,85,247,0.2)',   border: 'rgba(168,85,247,0.5)',   bg: 'bg-purple-500/15' },
  gray:   { icon: 'text-gray-400',   glow: 'rgba(156,163,175,0.1)',  border: 'rgba(156,163,175,0.3)',  bg: 'bg-gray-500/15' },
};

function GlowStatCard({ icon: Icon, label, value, color }: { icon: typeof Phone; label: string; value: number; color: string }) {
  const c = colorMap[color];
  const display = useCountUp(value);
  return (
    <div className="glass rounded-xl p-5 relative overflow-hidden transition-all duration-200 hover:scale-[1.02]"
      style={{ borderTop: `2px solid ${c.border}` }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-12 blur-2xl pointer-events-none"
        style={{ background: c.glow }} />
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${c.bg} relative`}>
        <Icon size={17} className={c.icon} />
      </div>
      <div className="text-2xl font-bold text-white tabular-nums">{display}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function formatPhone(num: string): string {
  if (!num) return 'Unknown';
  const clean = num.replace(/\D/g, '');
  if (clean.startsWith('61') && clean.length === 11) return `0${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`;
  return num;
}
