import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Zap, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

const ROWS = [
  { feature: 'Monthly cost', td: '$199 flat — no surprises', tm: '$285+ plus per-call fees', winner: 'td' },
  { feature: 'Per-call fees', td: 'None — ever', tm: '$0.08–$0.15 per minute', winner: 'td' },
  { feature: 'Australian English', td: 'Native AU — slang, accents, casual tone', tm: 'US-trained, limited AU', winner: 'td' },
  { feature: 'Trade-specific knowledge', td: 'Quotes plumbing, electrical, building jobs', tm: 'Generic hospitality focus', winner: 'td' },
  { feature: 'Answer time', td: 'Under 2 seconds', tm: '3–5 seconds average', winner: 'td' },
  { feature: '24/7 availability', td: 'Always on — nights, weekends, public holidays', tm: 'Yes', winner: 'tie' },
  { feature: 'SMS summary after calls', td: 'After every call — instant', tm: 'Partial — add-on extra', winner: 'td' },
  { feature: 'Missed call text-back', td: 'Within 60 seconds', tm: 'Not included', winner: 'td' },
  { feature: 'Full call transcripts', td: 'Yes — searchable in dashboard', tm: 'Basic logs only', winner: 'td' },
  { feature: 'Emergency detection', td: 'Yes — urgent SMS alert', tm: 'No', winner: 'td' },
  { feature: 'Setup time', td: '10 minutes — forward your calls, done', tm: '30–60 minutes', winner: 'td' },
  { feature: 'Australian data storage', td: 'Yes — AU servers', tm: 'US servers only', winner: 'td' },
  { feature: 'Lock-in contracts', td: 'None — cancel any time', tm: '12-month minimum', winner: 'td' },
  { feature: 'Money-back guarantee', td: '30 days — no questions', tm: 'No guarantee', winner: 'td' },
];

export function CompareTalkmatePage() {
  useEffect(() => { document.title = 'TradeDesk vs TalkMate | TradeDesk'; }, []);
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-white/8 px-4 h-16 flex items-center max-w-7xl mx-auto justify-between">
        <Link to="/" className="flex items-center gap-2"><div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center"><Zap size={14} className="text-white" /></div><span className="font-bold">TradeDesk</span></Link>
        <Link to="/signup" className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Get started</Link>
      </nav>
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-12">
          <p className="text-orange-400 text-xs font-semibold uppercase tracking-widest mb-3">Comparison</p>
          <h1 className="text-3xl sm:text-4xl font-black mb-4">TradeDesk vs TalkMate</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">Same category. Very different product. Here's why Australian tradies choose TradeDesk.</p>
        </div>

        <div className="glass rounded-2xl overflow-hidden border border-white/10 mb-12">
          <div className="grid grid-cols-3 text-xs font-semibold border-b border-white/10 bg-white/[0.015]">
            <div className="py-4 px-4 text-gray-500 pl-6">Feature</div>
            <div className="py-4 px-4 bg-orange-500/10 border-x border-orange-500/20 text-orange-400 flex items-center justify-center gap-1"><Zap size={12} /> TradeDesk</div>
            <div className="py-4 px-4 text-gray-500 text-center">TalkMate</div>
          </div>
          {ROWS.map(({ feature, td, tm, winner }, i) => (
            <div key={feature} className={`grid grid-cols-3 border-b border-white/5 last:border-0 text-xs ${i % 2 !== 0 ? 'bg-white/[0.012]' : ''}`}>
              <div className="py-3.5 px-4 text-gray-400 pl-6 self-center">{feature}</div>
              <div className={`py-3.5 px-4 self-center bg-orange-500/5 border-x border-orange-500/10 flex items-center gap-1.5 ${winner === 'td' ? 'text-white font-medium' : 'text-gray-400'}`}>
                {winner === 'td' && <CheckCircle size={11} className="text-green-400 flex-shrink-0" />}
                <span className="leading-snug">{td}</span>
              </div>
              <div className={`py-3.5 px-4 self-center flex items-center gap-1.5 ${winner === 'td' ? 'text-gray-500' : 'text-gray-400'}`}>
                {winner === 'td' && <XCircle size={11} className="text-red-400/70 flex-shrink-0" />}
                <span className="leading-snug">{tm}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-8 border border-orange-500/20 text-center">
          <h2 className="text-2xl font-bold mb-3">The bottom line</h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-6 leading-relaxed">TalkMate was built for hospitality businesses in the US. TradeDesk was built specifically for Australian tradies — with trade-specific AI, AU pricing, and local support. It's not even a close comparison.</p>
          <Link to="/signup" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-8 py-4 rounded-xl transition-all">
            Switch to TradeDesk <ArrowRight size={16} />
          </Link>
          <p className="text-xs text-gray-600 mt-3">No credit card · 30-day money-back guarantee · Cancel any time</p>
        </div>
      </div>
    </div>
  );
}
