import { useEffect, useState } from 'react';
import { Phone, AlertTriangle, TrendingUp, Users, Calendar, BarChart2, CheckCircle2, Circle, DollarSign } from 'lucide-react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { OutcomeBadge } from '../components/ui/Badge';
import { SkeletonCard, SkeletonRow } from '../components/ui/Skeleton';
import { formatDistanceToNow } from 'date-fns';

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

interface RecentCall {
  id: string;
  callerNumber: string;
  outcome: string;
  summary: string;
  createdAt: string;
}

const CHECKLIST = [
  { key: 'hasBusinessDetails', label: 'Add your business details', hint: 'Go to Settings → Business Profile', link: '/dashboard/settings' },
  { key: 'hasForwardingSetup', label: 'Set up call forwarding', hint: 'Forward your missed calls to your TradeDesk number', link: '/dashboard/settings' },
  { key: 'hasMadeTestCall', label: 'Make a test call', hint: 'Call your TradeDesk number and hear your AI in action' },
];

export function OverviewPage() {
  useEffect(() => { document.title = 'Overview | TradeDesk'; }, []);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Stats>('/dashboard/stats'),
      api.get<RecentCall[]>('/dashboard/recent-calls'),
    ]).then(([s, c]) => {
      setStats(s);
      setRecentCalls(c);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

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

  // Derive checklist status from stats
  const checklistStatus: Record<string, boolean> = {
    hasBusinessDetails: !!(stats?.hasBusinessDetails),
    hasForwardingSetup: !!(stats?.hasForwardingSetup),
    hasMadeTestCall: !!(stats?.hasMadeTestCall || (stats?.callsToday ?? 0) > 0 || (stats?.totalContacts ?? 0) > 0),
  };
  const allDone = Object.values(checklistStatus).every(Boolean);
  const doneCount = Object.values(checklistStatus).filter(Boolean).length;
  const isNewUser = !stats?.onboardingComplete && recentCalls.length === 0;

  // Weekly summary
  const callsThisWeek = stats?.callsThisWeek ?? stats?.leadsThisWeek ?? 0;
  const jobsThisWeek = stats?.jobsThisWeek ?? stats?.bookedToday ?? 0;
  const estRevenue = jobsThisWeek * 350; // rough estimate $350 avg job

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Today's activity at a glance</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={Phone} label="Calls today" value={stats?.callsToday ?? 0} color="blue" />
        <StatCard icon={Calendar} label="Jobs booked" value={stats?.bookedToday ?? 0} color="green" />
        <StatCard icon={TrendingUp} label="Leads this week" value={stats?.leadsThisWeek ?? 0} color="purple" />
        <StatCard icon={Users} label="Total contacts" value={stats?.totalContacts ?? 0} color="gray" />
      </div>

      {/* Emergency alert */}
      {(stats?.emergenciesToday ?? 0) > 0 && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">
            <strong>{stats!.emergenciesToday} emergency call{stats!.emergenciesToday > 1 ? 's' : ''}</strong> today — make sure you've followed up!
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Getting started checklist (shown when new or incomplete) */}
        {(!allDone || isNewUser) && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Getting started</h2>
              <span className="text-xs text-blue-400 font-medium bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                {doneCount}/{CHECKLIST.length} done
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-white/8 rounded-full mb-4 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${(doneCount / CHECKLIST.length) * 100}%` }}
              />
            </div>
            <ul className="space-y-3">
              {CHECKLIST.map(({ key, label, hint }) => {
                const done = checklistStatus[key];
                return (
                  <li key={key} className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {done
                        ? <CheckCircle2 size={18} className="text-green-400" />
                        : <Circle size={18} className="text-gray-600" />
                      }
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${done ? 'text-gray-500 line-through' : 'text-white'}`}>{label}</p>
                      {!done && <p className="text-xs text-gray-600 mt-0.5">{hint}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {/* Weekly summary card */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">This week</h2>
            <span className="text-xs text-gray-600">Mon – today</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center">
                  <Phone size={14} className="text-blue-400" />
                </div>
                <span className="text-sm text-gray-300">Calls handled</span>
              </div>
              <span className="text-white font-bold">{callsThisWeek}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-green-500/15 rounded-lg flex items-center justify-center">
                  <Calendar size={14} className="text-green-400" />
                </div>
                <span className="text-sm text-gray-300">Jobs booked</span>
              </div>
              <span className="text-white font-bold">{jobsThisWeek}</span>
            </div>
            <div className="h-px bg-white/6" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-emerald-500/15 rounded-lg flex items-center justify-center">
                  <DollarSign size={14} className="text-emerald-400" />
                </div>
                <div>
                  <span className="text-sm text-gray-300">Est. revenue saved</span>
                  <p className="text-xs text-gray-600">Based on avg $350/job</p>
                </div>
              </div>
              <span className="text-emerald-400 font-bold">${estRevenue.toLocaleString()}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent calls */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Recent calls</h2>
        {recentCalls.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-gray-600">
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart2 size={24} className="text-blue-400 opacity-60" />
              </div>
              <p className="font-medium text-gray-400 mb-1">No calls yet</p>
              <p className="text-sm text-gray-600">Once callers ring in, you'll see a live feed here.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
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

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Phone; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    gray: 'bg-gray-500/20 text-gray-400',
  };
  return (
    <Card>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </Card>
  );
}

function formatPhone(num: string): string {
  if (!num) return 'Unknown';
  const clean = num.replace(/\D/g, '');
  if (clean.startsWith('61') && clean.length === 11) {
    return `0${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`;
  }
  return num;
}
