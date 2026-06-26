import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Zap } from 'lucide-react';

const ENTRIES = [
  {
    version: '2.4.0',
    date: 'June 20, 2026',
    badge: 'Major',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    changes: [
      { type: 'new', text: 'Particle canvas animation on hero — dot network effect' },
      { type: 'new', text: 'Typewriter headline effect on landing page' },
      { type: 'new', text: 'Live activity ticker — real-time trade bookings from across Australia' },
      { type: 'new', text: 'Exit intent popup — discount offer on mouse leave' },
      { type: 'new', text: 'Floating chat widget with real-time support feel' },
      { type: 'new', text: 'Command palette (Cmd+K) in dashboard' },
      { type: 'new', text: 'Real-time clock in dashboard header' },
      { type: 'new', text: 'Sparkline mini-charts on stat cards' },
      { type: 'improved', text: 'Password field now has show/hide toggle on signup and login' },
      { type: 'improved', text: 'Password strength indicator on signup' },
    ],
  },
  {
    version: '2.3.0',
    date: 'May 28, 2026',
    badge: 'Feature',
    badgeColor: 'bg-green-500/20 text-green-400 border-green-500/30',
    changes: [
      { type: 'new', text: 'Google Calendar integration — AI books appointments directly' },
      { type: 'new', text: 'Google Sheets sync — every call logged automatically' },
      { type: 'new', text: 'Scroll reveal animations across all sections' },
      { type: 'new', text: 'Revenue calculator on landing page' },
      { type: 'improved', text: 'Mobile experience — full bottom-nav, touch targets audit' },
      { type: 'improved', text: 'FAQ section — smooth accordion animations' },
      { type: 'fixed', text: 'Call forwarding instructions updated for iOS 17+' },
    ],
  },
  {
    version: '2.2.0',
    date: 'April 15, 2026',
    badge: 'Feature',
    badgeColor: 'bg-green-500/20 text-green-400 border-green-500/30',
    changes: [
      { type: 'new', text: 'Welcome screen after signup — guided 3-step preview' },
      { type: 'new', text: 'Onboarding wizard with confetti on completion' },
      { type: 'new', text: 'Call transcript demo on landing page — 3 trade scenarios' },
      { type: 'improved', text: 'Sign up flow — now navigates to welcome instead of onboarding directly' },
      { type: 'improved', text: 'Dashboard stat cards — animated counter on load' },
    ],
  },
  {
    version: '2.1.0',
    date: 'March 3, 2026',
    badge: 'Improvement',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    changes: [
      { type: 'improved', text: 'Emergency detection — now flags flooding, live wires, fire keywords' },
      { type: 'improved', text: 'SMS summaries — now include quote given and next step' },
      { type: 'improved', text: 'Australian English model upgrade — regional accents improved' },
      { type: 'fixed', text: 'Missed call text-back now fires within 60 seconds (was 3 minutes)' },
      { type: 'fixed', text: 'Fixed bug where phone numbers with +61 prefix were double-formatted' },
    ],
  },
];

const TYPE_STYLES: Record<string, string> = {
  new: 'text-green-400 bg-green-500/10 border-green-500/20',
  improved: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  fixed: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
};

export function ChangelogPage() {
  useEffect(() => { document.title = 'Changelog | TradeDesk'; }, []);
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-white/8 px-4 h-16 flex items-center max-w-7xl mx-auto justify-between">
        <Link to="/" className="flex items-center gap-2"><div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center"><Zap size={14} className="text-white" /></div><span className="font-bold">TradeDesk</span></Link>
        <Link to="/signup" className="bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Get started</Link>
      </nav>
      <div className="max-w-2xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-12">
          <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">Changelog</p>
          <h1 className="text-4xl font-black mb-3">What's new</h1>
          <p className="text-gray-400">Every improvement, fix, and new feature — in plain English.</p>
        </div>
        <div className="space-y-8">
          {ENTRIES.map(entry => (
            <div key={entry.version} className="glass rounded-2xl p-6 border border-white/8">
              <div className="flex items-center gap-3 mb-5 flex-wrap">
                <span className="text-xl font-black text-white">v{entry.version}</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${entry.badgeColor}`}>{entry.badge}</span>
                <span className="text-xs text-gray-500 ml-auto">{entry.date}</span>
              </div>
              <ul className="space-y-2.5">
                {entry.changes.map((c, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border mt-0.5 uppercase tracking-wider flex-shrink-0 ${TYPE_STYLES[c.type]}`}>{c.type}</span>
                    <span className="text-sm text-gray-300 leading-relaxed">{c.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
