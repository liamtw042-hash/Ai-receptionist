import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Phone, MessageSquare, Mail, Clock, FileText, Zap,
  CheckCircle, ArrowRight, Menu, X, Star, AlertTriangle,
} from 'lucide-react';

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTyping, setShowTyping] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Show typing indicator after a delay to simulate AI thinking
  useEffect(() => {
    const t = setTimeout(() => setShowTyping(true), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-sans">

      {/* ── NAV ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-black/90 backdrop-blur-md border-b border-white/8' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center blue-glow transition-transform duration-200 hover:scale-110">
              <Zap size={15} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">TradeDesk</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">How it works</a>
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Features</a>
            <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Pricing</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors duration-200 px-4 py-2 rounded-lg hover:bg-white/5">
              Log in
            </Link>
            <Link to="/signup" className="text-sm font-medium bg-blue-500 hover:bg-blue-600 active:scale-[0.97] text-white px-4 py-2 rounded-lg transition-all duration-200 blue-glow">
              Get Started
            </Link>
          </div>

          <button className="md:hidden text-gray-400 hover:text-white p-1" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-black/95 backdrop-blur-md border-b border-white/8 px-5 py-4 space-y-4 animate-fade-in">
            <a href="#how-it-works" className="block text-sm text-gray-300 hover:text-white py-1" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#features" className="block text-sm text-gray-300 hover:text-white py-1" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#pricing" className="block text-sm text-gray-300 hover:text-white py-1" onClick={() => setMenuOpen(false)}>Pricing</a>
            <div className="flex gap-3 pt-2">
              <Link to="/login" className="flex-1 text-center text-sm glass rounded-lg py-2.5 text-gray-300 hover:text-white transition-colors">Log in</Link>
              <Link to="/signup" className="flex-1 text-center text-sm bg-blue-500 hover:bg-blue-600 rounded-lg py-2.5 font-medium transition-colors">Get Started</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Full-bleed grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:60px_60px] opacity-40" />
        
        {/* Ambient glow orb — fills full width */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[700px] bg-blue-500/8 rounded-full blur-[140px] pointer-events-none" />
        
        {/* Radial glow directly behind headline */}
        <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] bg-blue-500/20 blur-[80px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-5 text-center py-20">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 glass border border-blue-500/30 rounded-full px-4 py-1.5 text-xs text-blue-400 font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            AI receptionist built for Australian tradies
          </div>

          {/* Headline — full width, no max-w constraint */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Every missed call is a job
            <br />
            <span className="text-gradient">going elsewhere.</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            TradeDesk answers your calls in under 2 seconds, gives callers accurate quotes, books jobs, and texts you a summary — while you're on the tools.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup"
              className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 active:scale-[0.97] text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-all duration-200 blue-glow">
              Get Started Free <ArrowRight size={18} />
            </Link>
            <a href="#how-it-works"
              className="inline-flex items-center gap-2 glass hover:bg-white/8 hover:border-blue-500/30 text-white font-medium px-7 py-3.5 rounded-xl text-base transition-all duration-200">
              See how it works
            </a>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-6 mt-12 flex-wrap">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />)}
              <span className="text-sm text-gray-400 ml-1">from tradies across Australia</span>
            </div>
            <div className="w-px h-4 bg-white/10 hidden sm:block" />
            <span className="text-sm text-gray-500">Live in under 10 minutes</span>
            <div className="w-px h-4 bg-white/10 hidden sm:block" />
            <span className="text-sm text-gray-500">No lock-in contract</span>
          </div>

          {/* Mock call UI */}
          <div className="mt-16 relative max-w-2xl mx-auto">
            <div className="absolute -inset-1 bg-blue-500/20 rounded-2xl blur-xl" />
            <div className="relative glass rounded-2xl overflow-hidden border border-white/10">
              <div className="bg-white/5 px-5 py-3 flex items-center gap-2 border-b border-white/8">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs text-gray-500 mx-auto">Incoming call · 0412 345 678</span>
              </div>
              <div className="p-5 space-y-3 text-left">
                <ChatBubble role="ai" text="Hi, thanks for calling Dave's Plumbing, I'm their AI assistant — how can I help you today?" />
                <ChatBubble role="caller" text="Yeah g'day, I've got a blocked drain in the kitchen, it's pretty bad." />
                <ChatBubble role="ai" text="No worries, we can definitely sort that out. Blocked drains are usually $180 to $350 depending on the blockage. Can I grab your address and arrange a time with Dave?" />
                <ChatBubble role="caller" text="Yeah it's 42 Miller St, Bondi. Can he come tomorrow morning?" />
                <ChatBubble role="ai" text="Perfect. I've noted that down — Dave will confirm tomorrow morning. You'll get an SMS shortly with the details. Legend, have a good one!" />
                
                {/* Typing indicator */}
                {showTyping && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-blue-500/20 border border-blue-500/20 rounded-2xl rounded-tl-sm px-4 py-3">
                      <span className="text-[10px] font-semibold opacity-50 block mb-1">TradeDesk AI</span>
                      <TypingIndicator />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-gray-500">SMS summary sent to Dave · Job logged</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Simple setup</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Works while you work</h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">Forward your missed calls to TradeDesk. That's it. The AI handles everything else.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-10 left-[33%] right-[33%] h-px bg-gradient-to-r from-blue-500/0 via-blue-500/40 to-blue-500/0" />

            {[
              {
                step: '01', icon: Phone, title: 'Customer calls you',
                desc: "A potential customer rings your mobile. You're on a job, on a roof, or in a trench — can't answer.",
                color: 'text-blue-400', bg: 'bg-blue-500/20',
              },
              {
                step: '02', icon: Zap, title: 'AI answers instantly',
                desc: "TradeDesk picks up in under 2 seconds with your business name. It answers questions, gives quotes, books the job.",
                color: 'text-purple-400', bg: 'bg-purple-500/20',
              },
              {
                step: '03', icon: MessageSquare, title: 'You get a summary',
                desc: "The moment the call ends, you get an SMS with the caller's number, what they wanted, and what was agreed.",
                color: 'text-green-400', bg: 'bg-green-500/20',
              },
            ].map(({ step, icon: Icon, title, desc, color, bg }) => (
              <div key={step} className="relative glass rounded-2xl p-7 flex flex-col items-start hover:border-white/15 transition-all duration-300">
                <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-5`}>
                  <Icon size={22} className={color} />
                </div>
                <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">{step}</div>
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-start gap-4 glass border border-red-500/20 rounded-2xl p-5">
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Emergency? We've got it covered.</p>
              <p className="text-sm text-gray-400">If a caller says it's an emergency, TradeDesk tells them someone will call back within 30 minutes and immediately texts you an urgent alert — so no emergency ever slips through.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section id="features" className="py-24 px-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05),transparent_70%)]" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Everything included</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Your business, covered 24/7</h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">One subscription. Every feature. No hidden fees.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Phone, title: 'AI answers calls 24/7', desc: 'Never miss a lead. Your AI picks up in under 2 seconds, any time of day or night, weekends included.', color: 'text-blue-400', bg: 'bg-blue-500/15' },
              { icon: MessageSquare, title: 'Instant SMS summaries', desc: 'After every call you get a text: caller number, what they needed, quotes given, and what was agreed.', color: 'text-green-400', bg: 'bg-green-500/15' },
              { icon: Mail, title: 'Email auto-reply', desc: 'Connect your Gmail and the AI replies to enquiry emails automatically with accurate pricing and availability.', color: 'text-purple-400', bg: 'bg-purple-500/15' },
              { icon: Clock, title: 'Missed call text-back', desc: 'If a call goes unanswered for any reason, the caller automatically gets a text within 60 seconds to re-engage them.', color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
              { icon: FileText, title: 'Full call transcripts', desc: 'Every conversation is recorded and searchable in your dashboard. Know exactly what was said on every call.', color: 'text-pink-400', bg: 'bg-pink-500/15' },
              { icon: Zap, title: 'Live in 10 minutes', desc: 'Sign up, enter your business details, forward your calls. No hardware, no technical setup. Done.', color: 'text-orange-400', bg: 'bg-orange-500/15' },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="glass glass-hover rounded-2xl p-6 transition-all duration-300 group cursor-default">
                <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={20} className={color} />
                </div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF TICKER ── */}
      <section className="py-12 overflow-hidden border-y border-white/6">
        <div className="flex whitespace-nowrap gap-12" style={{ animation: 'marquee 25s linear infinite' }}>
          {[...Array(4)].map((_, i) =>
            ['Plumber', 'Electrician', 'Builder', 'Carpenter', 'Painter', 'Roofer', 'Landscaper', 'Tiler', 'Locksmith', 'HVAC tech'].map(trade => (
              <span key={`${trade}-${i}`} className="text-sm text-gray-600 flex items-center gap-2 flex-shrink-0">
                <span className="w-1 h-1 rounded-full bg-blue-500/60" /> {trade}
              </span>
            ))
          )}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Simple. One plan. Everything included.</h2>
            <p className="text-gray-500 mt-4">No per-minute charges. No setup fees. Cancel any time.</p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="relative">
              <div className="absolute -inset-px bg-gradient-to-b from-blue-500/50 to-transparent rounded-2xl" />
              <div className="relative glass rounded-2xl p-8">
                <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">TradeDesk Pro</h3>
                    <p className="text-sm text-gray-400">Everything you need to never miss a job</p>
                  </div>
                  <div className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-500/30">
                    Most popular
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex items-end gap-1">
                    <span className="text-5xl font-extrabold text-white">$199</span>
                    <span className="text-gray-500 mb-2">/month</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Billed monthly · cancel any time</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {[
                    'AI answers unlimited calls, 24/7',
                    'Australian English voice (Polly.Nicole)',
                    'SMS summary after every call',
                    'Emergency detection + urgent alert',
                    'Missed call text-back (60 seconds)',
                    'Full call transcripts + dashboard',
                    'Gmail email auto-reply',
                    'Two-way SMS inbox',
                    'Auto contact creation from callers',
                    'Weekly leads summary',
                    'Setup support included',
                  ].map(feature => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-gray-300">
                      <CheckCircle size={16} className="text-blue-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link to="/signup"
                  className="flex items-center justify-center gap-2 w-full bg-blue-500 hover:bg-blue-600 active:scale-[0.98] text-white font-semibold py-3.5 rounded-xl transition-all duration-200 blue-glow">
                  Get Started Free <ArrowRight size={16} />
                </Link>
                <p className="text-center text-xs text-gray-600 mt-3">No credit card required to start</p>
              </div>
            </div>

            {/* 30-day money back badge */}
            <div className="mt-6 flex items-center justify-center gap-3 glass rounded-xl px-5 py-4 border border-green-500/20">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle size={16} className="text-green-400" />
              </div>
              <p className="text-sm text-gray-400 text-left">
                <span className="text-white font-semibold">30-day money-back guarantee.</span>{' '}
                If TradeDesk doesn't pay for itself, we'll refund you in full. No questions asked.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08),transparent_70%)]" />
        <div className="max-w-3xl mx-auto text-center relative">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-5">
            Start catching every job<br />from <span className="text-gradient">today.</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
            Join tradies across Australia who never miss a call. Live in under 10 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup"
              className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 active:scale-[0.98] text-white font-semibold px-8 py-4 rounded-xl text-base transition-all duration-200 blue-glow">
              Get Started Free <ArrowRight size={18} />
            </Link>
            <p className="text-sm text-gray-600">No credit card · Cancel any time</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/8 py-10 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
              <Zap size={13} className="text-white" />
            </div>
            <span className="font-bold text-white">TradeDesk</span>
          </div>
          <p className="text-sm text-gray-600">Made in Newcastle, NSW 🇦🇺 · © 2026 TradeDesk</p>
          <div className="flex items-center gap-6">
            <Link to="/login" className="text-sm text-gray-600 hover:text-white transition-colors duration-200">Log in</Link>
            <Link to="/signup" className="text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded-lg transition-all duration-200">Get Started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      {[0, 150, 300].map(delay => (
        <span
          key={delay}
          className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"
          style={{ animation: `typing-dot 1.2s ${delay}ms infinite` }}
        />
      ))}
    </div>
  );
}

function ChatBubble({ role, text }: { role: 'ai' | 'caller'; text: string }) {
  return (
    <div className={`flex ${role === 'ai' ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
        role === 'ai'
          ? 'bg-blue-500/20 text-blue-100 rounded-tl-sm border border-blue-500/20'
          : 'bg-white/10 text-gray-200 rounded-tr-sm'
      }`}>
        <span className="text-[10px] font-semibold opacity-50 block mb-0.5">{role === 'ai' ? 'TradeDesk AI' : 'Caller'}</span>
        {text}
      </div>
    </div>
  );
}
