import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Phone, MessageSquare, Mail, Clock, FileText, Zap,
  CheckCircle, ArrowRight, Menu, X, Star, AlertTriangle, ChevronDown,
} from 'lucide-react';

// ── Typing indicator ───────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      {[0, 150, 300].map(delay => (
        <span key={delay} className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"
          style={{ animation: `typing-dot 1.2s ${delay}ms infinite` }} />
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

// ── FAQ ────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'How does TradeDesk actually work?',
    a: 'When a call comes through to your TradeDesk number, our AI picks up in under 2 seconds. It introduces itself as your business, handles the conversation naturally, gives callers accurate quotes based on your pricing guide, and texts you a full summary. You just set it up once and it runs on autopilot.',
  },
  {
    q: 'What happens if I miss a call while on a job?',
    a: "TradeDesk answers it for you. The AI takes down the caller's details, explains what they need, gives a rough quote, and tells them you'll follow up shortly. You get an SMS summary with everything — name, number, what they need, and what was quoted. No lead lost.",
  },
  {
    q: 'Can I customise what the AI says?',
    a: 'Yes. During setup you tell TradeDesk your business name, trade type, services, pricing guide, and working hours. The AI uses all of that to have natural, accurate conversations. You can update everything any time from your dashboard Settings page.',
  },
  {
    q: 'How long does it take to set up?',
    a: 'Most tradies are live in under 10 minutes. Sign up, enter your business details, forward your phone\'s missed calls to your TradeDesk number, and you\'re done. No hardware. No technical knowledge needed.',
  },
  {
    q: "What if a caller asks something the AI doesn't know?",
    a: 'The AI is trained to be honest when it doesn\'t have the answer. It will say something like "I\'d need to check that with Dave — can I get your number and he\'ll call you back?" It never makes things up. You can also make your pricing guide as detailed as you like to cover more scenarios.',
  },
  {
    q: 'Can I cancel any time?',
    a: "Yes, absolutely. No lock-in contracts. Cancel from your account settings at any time and you won't be charged again. We also offer a 30-day money-back guarantee if TradeDesk doesn't work out for you.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass rounded-xl overflow-hidden border border-white/8 transition-all duration-200 hover:border-white/15">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-medium text-white text-sm sm:text-base">{q}</span>
        <ChevronDown size={18} className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-4 animate-fade-in">
          {a}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTyping, setShowTyping] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
            <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors duration-200 px-4 py-2 rounded-lg hover:bg-white/5">Log in</Link>
            <Link to="/signup" className="text-sm font-medium bg-blue-500 hover:bg-blue-600 active:scale-[0.97] text-white px-4 py-2 rounded-lg transition-all duration-200 blue-glow">Get Started</Link>
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
        {/* Grid bg */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:60px_60px] opacity-40" />

        {/* Animated pulsing glow behind headline */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-full max-w-3xl h-[500px] pointer-events-none"
          style={{ animation: 'hero-pulse 4s ease-in-out infinite' }}>
          <div className="absolute inset-0 bg-blue-500/12 rounded-full blur-[120px]" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-[600px] h-[250px] bg-blue-600/10 blur-[80px] pointer-events-none"
          style={{ animation: 'hero-pulse 4s ease-in-out infinite', animationDelay: '2s' }} />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-5 text-center py-20">
          <div className="inline-flex items-center gap-2 glass border border-blue-500/30 rounded-full px-4 py-1.5 text-xs text-blue-400 font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            AI receptionist built for Australian tradies
          </div>

          {/* Headline — kept to 2 lines on desktop with nowrap hints */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            <span className="block">Stop losing jobs to</span>
            <span className="text-gradient block">missed calls.</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            TradeDesk answers in under 2 seconds, gives callers accurate quotes, books jobs, and texts you a summary — all while you're on the tools.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/signup"
              className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 active:scale-[0.97] text-white font-semibold px-8 py-4 rounded-xl text-base transition-all duration-200 blue-glow w-full sm:w-auto justify-center">
              Start free trial <ArrowRight size={18} />
            </Link>
            <p className="text-sm text-gray-600">7-day free trial · No credit card needed</p>
          </div>

          {/* Mock chat */}
          <div className="max-w-sm mx-auto glass rounded-2xl p-5 text-left space-y-3 border border-white/10">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/8">
              <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center">
                <Zap size={12} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">TradeDesk AI</p>
                <p className="text-[10px] text-green-400">● Online</p>
              </div>
            </div>
            <ChatBubble role="ai" text="G'day! You've reached Smith's Plumbing. Dave's on a job right now — I'm his AI receptionist. How can I help?" />
            <ChatBubble role="caller" text="Hi, I've got a burst pipe in the kitchen. It's pretty urgent." />
            {showTyping ? (
              <ChatBubble role="ai" text="No worries, I can help. A burst pipe repair usually runs $180–$320 depending on access. I'll mark this as urgent and Dave will call you back within 30 minutes. Can I grab your name and best number?" />
            ) : (
              <div className="flex justify-start">
                <div className="bg-blue-500/20 text-blue-100 rounded-2xl rounded-tl-sm border border-blue-500/20 px-4 py-2.5">
                  <span className="text-[10px] font-semibold opacity-50 block mb-0.5">TradeDesk AI</span>
                  <TypingIndicator />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-5 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Set up once. Works forever.</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { n: '1', title: 'Forward your calls', desc: 'Takes 2 minutes. Set your phone to forward missed calls to your TradeDesk number. Done.' },
              { n: '2', title: 'AI handles the call', desc: 'Every missed call gets answered in under 2 seconds. The AI gives quotes, takes messages, and handles emergencies.' },
              { n: '3', title: 'You get a text', desc: 'After each call you get an SMS with the caller\'s name, number, what they needed, and what was quoted. Follow up when you\'re ready.' },
            ].map(step => (
              <div key={step.n} className="text-center">
                <div className="w-12 h-12 bg-blue-500/20 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <span className="text-blue-400 font-bold text-lg">{step.n}</span>
                </div>
                <h3 className="font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Emergency callout */}
          <div className="mt-10 flex items-start gap-4 glass border border-red-500/20 rounded-2xl p-5 max-w-2xl mx-auto">
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Emergency? Covered.</p>
              <p className="text-sm text-gray-400">If a caller says it's urgent, the AI flags it immediately and texts you an urgent alert so no emergency ever slips through.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-5 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.04),transparent_70%)]" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-12">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Tradies love it</p>
            <h2 className="text-3xl sm:text-4xl font-bold">What they're saying</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                name: 'Marcus Webb',
                trade: 'Plumber',
                location: 'Brisbane, QLD',
                quote: 'I was losing 3–4 jobs a week because I couldn\'t answer calls on the job. TradeDesk fixed that overnight. Made back the subscription cost in the first week.',
                stars: 5,
              },
              {
                name: 'Tanya Kowalski',
                trade: 'Electrician',
                location: 'Sydney, NSW',
                quote: "Set it up in about 8 minutes. Now I check my phone at smoko and I've already got a list of leads with their details and what they need. It's unreal.",
                stars: 5,
              },
              {
                name: 'Brett Sullivan',
                trade: 'Builder',
                location: 'Melbourne, VIC',
                quote: 'I was sceptical about AI but this actually sounds professional. My clients have no idea they\'re not talking to a real receptionist. Highly recommend.',
                stars: 5,
              },
            ].map(({ name, trade, location, quote, stars }) => (
              <div key={name} className="glass rounded-2xl p-6 border border-white/8 hover:border-white/15 transition-all duration-200">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(stars)].map((_, i) => (
                    <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-300 leading-relaxed mb-5">"{quote}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/8">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/40 to-purple-500/40 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                    {name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{name}</p>
                    <p className="text-xs text-gray-500">{trade} · {location}</p>
                  </div>
                </div>
              </div>
            ))}
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
              { icon: Mail, title: 'Email auto-reply', desc: 'Connect Gmail and the AI replies to enquiry emails automatically with accurate pricing and availability.', color: 'text-purple-400', bg: 'bg-purple-500/15' },
              { icon: Clock, title: 'Missed call text-back', desc: 'If a call goes unanswered, the caller automatically gets a text within 60 seconds to re-engage them.', color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
              { icon: FileText, title: 'Full call transcripts', desc: 'Every conversation is recorded and searchable in your dashboard. Know exactly what was said.', color: 'text-pink-400', bg: 'bg-pink-500/15' },
              { icon: Zap, title: 'Live in 10 minutes', desc: 'Sign up, enter your details, forward your calls. No hardware, no technical setup. Done.', color: 'text-orange-400', bg: 'bg-orange-500/15' },
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

      {/* ── COMPARISON TABLE ── */}
      <section className="py-24 px-5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Why TradeDesk</p>
            <h2 className="text-3xl sm:text-4xl font-bold">TradeDesk vs. hiring a receptionist</h2>
            <p className="text-gray-500 mt-4">Spoiler: one costs 20× more and calls in sick.</p>
          </div>

          <div className="glass rounded-2xl overflow-hidden border border-white/10">
            {/* Header */}
            <div className="grid grid-cols-3 text-center text-sm font-semibold border-b border-white/10">
              <div className="py-4 px-4 text-gray-500 text-left pl-6">Feature</div>
              <div className="py-4 px-4 bg-blue-500/10 border-x border-blue-500/20 text-blue-400 flex items-center justify-center gap-2">
                <Zap size={14} /> TradeDesk
              </div>
              <div className="py-4 px-4 text-gray-500">Human Receptionist</div>
            </div>

            {[
              { label: 'Monthly cost', td: '$199/mo', hr: '$4,000–$6,000/mo' },
              { label: 'Availability', td: '24/7 including weekends', hr: 'Business hours only' },
              { label: 'Call answer time', td: 'Under 2 seconds', hr: 'Varies, often on hold' },
              { label: 'Sick days', td: 'Zero — ever', hr: '10 days/year average' },
              { label: 'Give accurate quotes', td: '✓ Always consistent', hr: 'Depends on training' },
              { label: 'SMS summary', td: '✓ After every call', hr: '✗ Not typically' },
              { label: 'Setup time', td: '10 minutes', hr: 'Weeks of hiring & training' },
              { label: 'Scales with call volume', td: '✓ Unlimited calls', hr: '✗ One call at a time' },
            ].map(({ label, td, hr }, i) => (
              <div key={label} className={`grid grid-cols-3 text-sm border-b border-white/5 last:border-0 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                <div className="py-3.5 px-4 text-gray-400 pl-6">{label}</div>
                <div className="py-3.5 px-4 text-center bg-blue-500/5 border-x border-blue-500/10 text-white font-medium">{td}</div>
                <div className="py-3.5 px-4 text-center text-gray-500">{hr}</div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link to="/signup"
              className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 active:scale-[0.97] text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 blue-glow">
              Get started for $199/mo <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
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
                  Start 7-day free trial <ArrowRight size={16} />
                </Link>
                <p className="text-center text-xs text-gray-600 mt-3">No credit card required to start</p>
              </div>
            </div>
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

      {/* ── FAQ ── */}
      <section className="py-24 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Common questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(faq => <FAQItem key={faq.q} {...faq} />)}
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
            <p className="text-sm text-gray-600">7-day free trial · No credit card</p>
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
          <div className="text-center">
            <p className="text-sm text-gray-600">Made in Newcastle, NSW 🇦🇺 · © 2026 TradeDesk</p>
            <p className="text-xs text-gray-700 mt-1">Made by a 15 year old from Newcastle 👋</p>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="text-sm text-gray-600 hover:text-white transition-colors duration-200">Log in</Link>
            <Link to="/signup" className="text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded-lg transition-all duration-200">Get Started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
