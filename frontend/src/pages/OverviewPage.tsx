import { useEffect, useState } from 'react';
import { Phone, AlertTriangle, TrendingUp, Users, Calendar, BarChart2 } from 'lucide-react';
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
}

interface RecentCall {
  id: string;
  callerNumber: string;
  outcome: string;
  summary: string;
  createdAt: string;
}

export function OverviewPage() {
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

      {stats?.emergenciesToday ? (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">
            <strong>{stats.emergenciesToday} emergency call{stats.emergenciesToday > 1 ? 's' : ''}</strong> today — make sure you've followed up!
          </p>
        </div>
      ) : null}

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
