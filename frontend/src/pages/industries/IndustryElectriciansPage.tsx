import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Zap, CheckCircle, ArrowRight, Phone } from 'lucide-react';

export function IndustryElectriciansPage() {
  useEffect(() => { document.title = 'Electricians AI Receptionist | TradeDesk'; }, []);
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-white/8 px-4 h-16 flex items-center max-w-7xl mx-auto justify-between">
        <Link to="/" className="flex items-center gap-2"><div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center"><Zap size={14} className="text-white" /></div><span className="font-bold">TradeDesk</span></Link>
        <Link to="/signup" className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Get started</Link>
      </nav>
      <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-16">
          <p className="text-5xl mb-4">⚡</p>
          <p className="text-orange-400 text-xs font-semibold uppercase tracking-widest mb-3">For Electricians</p>
          <h1 className="text-3xl sm:text-5xl font-black mb-5">The AI receptionist built for Australian electricians</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">Safety switch tripped? New circuit board? Your AI answers every call while you're in the switchboard.</p>
          <div className="mt-6 inline-flex items-center gap-2 glass border border-green-500/30 rounded-full px-4 py-2 text-sm text-green-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />4.1 extra jobs per week on average
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-10 mb-16">
          <div>
            <h2 className="text-2xl font-bold mb-6">What your AI handles</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3"><CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" /><span className="text-sm text-gray-300 leading-relaxed">Handles safety switch emergency calls — guides callers while alerting you</span></li>
              <li className="flex items-start gap-3"><CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" /><span className="text-sm text-gray-300 leading-relaxed">Books switchboard upgrades, EV charger installs, and rewires</span></li>
              <li className="flex items-start gap-3"><CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" /><span className="text-sm text-gray-300 leading-relaxed">Quotes standard jobs: safety inspection $180, GPO $120, LED $85</span></li>
              <li className="flex items-start gap-3"><CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" /><span className="text-sm text-gray-300 leading-relaxed">Detects life-safety emergencies and texts you immediately</span></li>
              <li className="flex items-start gap-3"><CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" /><span className="text-sm text-gray-300 leading-relaxed">Explains the process for RCD testing and compliance certificates</span></li>
            </ul>
            <div className="mt-8 glass rounded-xl p-5 border border-orange-500/20">
              <p className="text-xs text-gray-500 mb-1">Average job value</p>
              <p className="text-3xl font-extrabold text-orange-400">$240</p>
              <p className="text-sm text-gray-500 mt-1">Per lead captured — TradeDesk pays for itself in days</p>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-6">Sample calls your AI handles</h2>
            <div className="space-y-4">
              <div className="glass rounded-xl p-4 border border-white/8">
                <p className="text-xs text-orange-400 font-semibold mb-2 flex items-center gap-1.5"><Phone size={11} /> Safety switch tripped</p>
                <p className="text-sm text-gray-300 leading-relaxed">&quot;Safety switch trip? I'll walk you through resetting it safely. If it trips again, that's a $180 inspection job — we can come tomorrow morning. Name and address?&quot;</p>
              </div>
              <div className="glass rounded-xl p-4 border border-white/8">
                <p className="text-xs text-orange-400 font-semibold mb-2 flex items-center gap-1.5"><Phone size={11} /> EV charger quote</p>
                <p className="text-sm text-gray-300 leading-relaxed">&quot;A Level 2 EV charger install runs $800–$1,400 depending on your board. We include the inspection certificate. Want a site visit booked?&quot;</p>
              </div>
              <div className="glass rounded-xl p-4 border border-white/8">
                <p className="text-xs text-orange-400 font-semibold mb-2 flex items-center gap-1.5"><Phone size={11} /> Power outage</p>
                <p className="text-sm text-gray-300 leading-relaxed">&quot;Power out to the whole house? Check your switchboard first — if the main switch is off, that's an urgent job. I'll flag this as priority for you.&quot;</p>
              </div>
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-8 sm:p-12 border border-orange-500/20 text-center">
          <h2 className="text-2xl sm:text-3xl font-black mb-4">Stop losing jobs to missed calls</h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-8 leading-relaxed">Join Electricians across Australia who never miss a lead. Live in 10 minutes, $199/month, 30-day money-back guarantee.</p>
          <Link to="/signup" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-8 py-4 rounded-xl transition-all text-lg">
            Start your 7-day trial <ArrowRight size={18} />
          </Link>
          <p className="text-xs text-gray-600 mt-3">No credit card · Cancel any time</p>
        </div>
      </div>
    </div>
  );
}
