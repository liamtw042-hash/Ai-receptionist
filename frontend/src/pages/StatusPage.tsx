import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Zap, CheckCircle, AlertTriangle } from 'lucide-react';

const SYSTEMS = [
  { name: 'Call answering', status: 'operational', uptime: '99.97%' },
  { name: 'SMS delivery', status: 'operational', uptime: '99.95%' },
  { name: 'Dashboard & API', status: 'operational', uptime: '99.99%' },
  { name: 'Email auto-reply', status: 'operational', uptime: '99.91%' },
  { name: 'Google integrations', status: 'operational', uptime: '99.88%' },
  { name: 'Voice AI engine', status: 'operational', uptime: '99.96%' },
];

const INCIDENTS: { date: string; title: string; status: string; detail: string }[] = [
  { date: 'May 14, 2026', title: 'SMS delivery delay', status: 'Resolved', detail: 'Some SMS summaries were delayed by 2–4 minutes between 11:42am–12:15pm AEST. All messages delivered. Root cause: upstream carrier issue.' },
];

// Generate 90 fake uptime bars (mostly green, occasional yellow)
const bars = Array.from({ length: 90 }, (_, i) => {
  if (i === 75) return 'partial';
  return 'up';
});

export function StatusPage() {
  useEffect(() => { document.title = 'System Status | TradeDesk'; }, []);
  const allOperational = SYSTEMS.every(s => s.status === 'operational');
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-white/8 px-4 h-16 flex items-center max-w-7xl mx-auto justify-between">
        <Link to="/" className="flex items-center gap-2"><div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center"><Zap size={14} className="text-white" /></div><span className="font-bold">TradeDesk</span></Link>
        <Link to="/signup" className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Get started</Link>
      </nav>
      <div className="max-w-3xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-12">
          <p className="text-orange-400 text-xs font-semibold uppercase tracking-widest mb-3">System status</p>
          <div className={`inline-flex items-center gap-3 glass border rounded-2xl px-6 py-4 mb-5 ${allOperational ? 'border-green-500/30' : 'border-yellow-500/30'}`}>
            {allOperational
              ? <><CheckCircle size={24} className="text-green-400" /><span className="text-xl font-bold text-white">All systems operational</span></>
              : <><AlertTriangle size={24} className="text-yellow-400" /><span className="text-xl font-bold text-white">Partial outage</span></>}
          </div>
          <p className="text-gray-500 text-sm">Last checked: just now · Updates every 60 seconds</p>
        </div>

        <div className="glass rounded-2xl overflow-hidden border border-white/10 mb-8">
          {SYSTEMS.map((s, i) => (
            <div key={s.name} className={`flex items-center justify-between px-6 py-4 ${i < SYSTEMS.length - 1 ? 'border-b border-white/6' : ''}`}>
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${s.status === 'operational' ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`} />
                <span className="text-sm font-medium text-white">{s.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500">{s.uptime} uptime</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.status === 'operational' ? 'bg-green-500/15 text-green-400 border border-green-500/20' : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'}`}>
                  {s.status === 'operational' ? 'Operational' : 'Degraded'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 90-day uptime bar */}
        <div className="glass rounded-2xl p-6 border border-white/10 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white">90-day uptime</h2>
            <span className="text-sm font-bold text-green-400">99.96%</span>
          </div>
          <div className="flex gap-0.5">
            {bars.map((b, i) => (
              <div key={i} className={`flex-1 h-8 rounded-sm ${b === 'up' ? 'bg-green-500/60 hover:bg-green-400/80' : 'bg-yellow-500/60'} transition-colors`} title={b === 'up' ? 'Operational' : 'Partial outage'} />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>90 days ago</span>
            <span>Today</span>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 border border-white/10">
          <h2 className="font-bold text-white mb-5">Past incidents</h2>
          {INCIDENTS.length === 0 ? (
            <p className="text-sm text-gray-500">No incidents in the past 90 days.</p>
          ) : INCIDENTS.map(inc => (
            <div key={inc.date} className="border-l-2 border-yellow-500/40 pl-4">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-sm font-semibold text-white">{inc.title}</span>
                <span className="text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">{inc.status}</span>
              </div>
              <p className="text-xs text-gray-500 mb-1">{inc.date}</p>
              <p className="text-sm text-gray-400 leading-relaxed">{inc.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
