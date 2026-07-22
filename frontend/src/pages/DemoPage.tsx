import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Play, CheckCircle, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    title: 'A caller rings your number',
    desc: 'Your phone is busy or you\'re on the tools — TradeDesk picks up in under 2 seconds.',
    visual: '📞',
    detail: 'The AI answers with your business name and a natural Australian voice.',
  },
  {
    title: 'The AI handles the conversation',
    desc: 'It gives accurate quotes from your pricing guide, takes down their details, and handles emergencies.',
    visual: '🤖',
    detail: 'The conversation sounds natural — callers get the help they need immediately.',
  },
  {
    title: 'You get an SMS summary',
    desc: 'Within seconds of the call ending, you get a text with everything you need.',
    visual: '📱',
    detail: 'Name, number, what they need, what was quoted, urgency level.',
  },
  {
    title: 'It all appears in your dashboard',
    desc: 'Every call, transcript, contact and SMS is searchable in your TradeDesk dashboard.',
    visual: '📊',
    detail: 'See all your leads, transcripts and bookings in one place.',
  },
];

export function DemoPage() {
  useEffect(() => { document.title = 'See how it works | TradeDesk'; }, []);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setActive(a => (a + 1) % STEPS.length), 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-white/8 px-5 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center"><Zap size={13} className="text-white" /></div>
            <span className="font-bold text-white">TradeDesk</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Log in</Link>
            <Link to="/signup" className="text-sm bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors">Get started</Link>
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-5 py-16">
        <div className="text-center mb-16">
          <p className="text-orange-400 text-xs font-semibold uppercase tracking-widest mb-3">Product walkthrough</p>
          <h1 className="text-4xl font-bold text-white mb-4">See TradeDesk in action</h1>
          <p className="text-gray-500 max-w-xl mx-auto">From missed call to booked job in under 2 minutes. Here's exactly how it works.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          {/* Steps */}
          <div className="space-y-3">
            {STEPS.map((s, i) => (
              <button key={i} onClick={() => setActive(i)}
                className={`w-full text-left glass rounded-xl p-5 border transition-all duration-200 ${active === i ? 'border-orange-500/40 bg-orange-500/8' : 'border-white/8 hover:border-white/15'}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-all ${active === i ? 'bg-orange-500/20 scale-110' : 'bg-white/5'}`}>
                    {s.visual}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-orange-400 font-semibold">Step {i + 1}</span>
                      {active === i && <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded-full">Active</span>}
                    </div>
                    <p className="font-semibold text-white text-sm">{s.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                    {active === i && <p className="text-xs text-orange-300 mt-2 animate-fade-in">{s.detail}</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Visual */}
          <div className="glass rounded-2xl border border-white/10 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/8 bg-white/[0.02]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-xs text-gray-500 ml-2">TradeDesk Demo</span>
            </div>
            <div className="p-8 flex flex-col items-center justify-center min-h-64">
              <div className="text-6xl mb-4">{STEPS[active].visual}</div>
              <h3 className="text-lg font-bold text-white text-center mb-2">{STEPS[active].title}</h3>
              <p className="text-sm text-gray-400 text-center max-w-xs">{STEPS[active].detail}</p>
              <div className="flex gap-1.5 mt-6">
                {STEPS.map((_, i) => (
                  <button key={i} onClick={() => setActive(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${active === i ? 'w-8 bg-orange-500' : 'w-3 bg-white/20'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Features checklist */}
        <div className="glass rounded-2xl p-8 border border-white/8 mb-12">
          <h2 className="text-xl font-bold text-white mb-6 text-center">Everything you get for $199/mo</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              'AI answers unlimited calls, 24/7', 'Australian English voice', 'SMS summary after every call',
              'Emergency detection + urgent alert', 'Missed call text-back in 60 seconds', 'Full call transcripts',
              'Gmail email auto-reply', 'Two-way SMS inbox', 'Auto CRM from callers',
              'Weekly leads summary', 'No per-call fees. Ever.', '30-day money-back guarantee',
            ].map(f => (
              <div key={f} className="flex items-center gap-3 text-sm text-gray-300">
                <CheckCircle size={15} className="text-green-400 flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <Link to="/signup"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-8 py-4 rounded-xl text-base transition-all"
            style={{ boxShadow: '0 0 24px rgba(59,130,246,0.35)' }}>
            Start 7-day trial <ArrowRight size={18} />
          </Link>
          <p className="text-sm text-gray-600 mt-3">No credit card · cancel any time</p>
        </div>
      </main>
    </div>
  );
}
