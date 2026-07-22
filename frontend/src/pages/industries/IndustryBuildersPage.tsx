import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Zap, CheckCircle, ArrowRight, Phone } from 'lucide-react';

export function IndustryBuildersPage() {
  useEffect(() => { document.title = 'Builders AI Receptionist | TradeDesk'; }, []);
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-white/8 px-4 h-16 flex items-center max-w-7xl mx-auto justify-between">
        <Link to="/" className="flex items-center gap-2"><div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center"><Zap size={14} className="text-white" /></div><span className="font-bold">TradeDesk</span></Link>
        <Link to="/signup" className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Get started</Link>
      </nav>
      <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-16">
          <p className="text-5xl mb-4">🏗️</p>
          <p className="text-orange-400 text-xs font-semibold uppercase tracking-widest mb-3">For Builders</p>
          <h1 className="text-3xl sm:text-5xl font-black mb-5">The AI receptionist for Australian builders</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">Capture every renovation lead, extension enquiry, and new build consultation — from site.</p>
          <div className="mt-6 inline-flex items-center gap-2 glass border border-green-500/30 rounded-full px-4 py-2 text-sm text-green-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />2.8 extra jobs per week on average
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-10 mb-16">
          <div>
            <h2 className="text-2xl font-bold mb-6">What your AI handles</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3"><CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" /><span className="text-sm text-gray-300 leading-relaxed">Books renovation consultation calls while you're on site</span></li>
              <li className="flex items-start gap-3"><CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" /><span className="text-sm text-gray-300 leading-relaxed">Captures extension and new build enquiries with key details</span></li>
              <li className="flex items-start gap-3"><CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" /><span className="text-sm text-gray-300 leading-relaxed">Gives ballpark ranges for decks, extensions, and granny flats</span></li>
              <li className="flex items-start gap-3"><CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" /><span className="text-sm text-gray-300 leading-relaxed">Follows up missed calls automatically via SMS</span></li>
              <li className="flex items-start gap-3"><CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" /><span className="text-sm text-gray-300 leading-relaxed">Handles "how long will it take?" and "how much does it cost?" questions</span></li>
            </ul>
            <div className="mt-8 glass rounded-xl p-5 border border-orange-500/20">
              <p className="text-xs text-gray-500 mb-1">Average job value</p>
              <p className="text-3xl font-extrabold text-orange-400">$8,400</p>
              <p className="text-sm text-gray-500 mt-1">Per lead captured — TradeDesk pays for itself in days</p>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-6">Sample calls your AI handles</h2>
            <div className="space-y-4">
              <div className="glass rounded-xl p-4 border border-white/8">
                <p className="text-xs text-orange-400 font-semibold mb-2 flex items-center gap-1.5"><Phone size={11} /> Deck build enquiry</p>
                <p className="text-sm text-gray-300 leading-relaxed">&quot;A 4x6m treated pine deck runs $12,000–$18,000 all in, depending on the site. Jake can call you for a free measure-and-quote. When suits?&quot;</p>
              </div>
              <div className="glass rounded-xl p-4 border border-white/8">
                <p className="text-xs text-orange-400 font-semibold mb-2 flex items-center gap-1.5"><Phone size={11} /> Granny flat quote</p>
                <p className="text-sm text-gray-300 leading-relaxed">&quot;A 60m² granny flat with kitchen and bathroom starts around $120,000. We handle planning and build. Want to book an initial consultation?&quot;</p>
              </div>
              <div className="glass rounded-xl p-4 border border-white/8">
                <p className="text-xs text-orange-400 font-semibold mb-2 flex items-center gap-1.5"><Phone size={11} /> Kitchen reno</p>
                <p className="text-sm text-gray-300 leading-relaxed">&quot;For a full kitchen reno, budget $20,000–$45,000 depending on fittings. Jake's next site visit is this Thursday — shall I lock that in?&quot;</p>
              </div>
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-8 sm:p-12 border border-orange-500/20 text-center">
          <h2 className="text-2xl sm:text-3xl font-black mb-4">Stop losing jobs to missed calls</h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-8 leading-relaxed">Join Builders across Australia who never miss a lead. Live in 10 minutes, $199/month, 30-day money-back guarantee.</p>
          <Link to="/signup" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-8 py-4 rounded-xl transition-all text-lg">
            Start your 7-day trial <ArrowRight size={18} />
          </Link>
          <p className="text-xs text-gray-600 mt-3">No credit card · Cancel any time</p>
        </div>
      </div>
    </div>
  );
}
