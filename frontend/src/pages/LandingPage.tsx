import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  Phone, MessageSquare, Mail, Clock, FileText, Zap,
  CheckCircle, XCircle, ArrowRight, Menu, X, Star, AlertTriangle,
  ChevronDown, ArrowUp, DollarSign, Play, ChevronRight,
} from 'lucide-react';

/* ── Typing indicator ── */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      {[0, 150, 300].map(d => (
        <span key={d} className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"
          style={{ animation: `typing-dot 1.2s ${d}ms infinite` }} />
      ))}
    </div>
  );
}

function Bubble({ role, text }: { role: 'ai' | 'caller'; text: string }) {
  return (
    <div className={`flex ${role === 'ai' ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
        role === 'ai'
          ? 'bg-blue-500/25 text-blue-100 rounded-tl-sm border border-blue-500/20'
          : 'bg-gray-700/80 text-gray-200 rounded-tr-sm'
      }`}>
        <span className="text-[9px] font-semibold opacity-50 block mb-0.5">{role === 'ai' ? 'TradeDesk AI' : 'Caller'}</span>
        {text}
      </div>
    </div>
  );
}

/* ── Phone frame ── */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto" style={{ width: 280 }}>
      <div className="relative bg-gray-900 rounded-[36px] p-2.5 border-2 border-white/15 shadow-2xl shadow-black/60">
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10" />
        <div className="relative bg-[#0a0f1e] rounded-[28px] overflow-hidden" style={{ height: 500 }}>
          <div className="flex items-center justify-between px-6 pt-10 pb-2 text-[10px] text-gray-400">
            <span>9:41</span>
            <span className="flex gap-1">●●●</span>
          </div>
          <div className="px-3 pb-4 flex flex-col h-[calc(100%-48px)]">{children}</div>
        </div>
      </div>
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-40 h-16 bg-blue-500/20 blur-2xl rounded-full" />
    </div>
  );
}

/* ── FAQ ── */
const FAQS = [
  { q: 'How does TradeDesk actually work?', a: "When a call comes through to your TradeDesk number, our AI picks up in under 2 seconds. It introduces itself as your business, handles the conversation naturally, gives callers accurate quotes from your pricing guide, and texts you a full summary." },
  { q: 'What happens if I miss a call while on a job?', a: "TradeDesk answers it for you. The AI takes the caller's details, explains what they need, gives a rough quote, and tells them you'll follow up. You get an SMS summary — name, number, what they need, what was quoted. No lead lost." },
  { q: 'Can I customise what the AI says?', a: "Yes. During setup you tell TradeDesk your business name, trade, services, pricing guide, and working hours. The AI uses all of that. You can update everything any time from your Settings page." },
  { q: 'Do callers know they\'re talking to an AI?', a: "TradeDesk is transparent — it says it's an AI receptionist. But it sounds natural and professional, and most callers are happy to give their details once they know their query will be passed on quickly. In our experience, callers care more about being heard fast than who answers." },
  { q: 'How long does it take to set up?', a: "Most tradies are live in under 10 minutes. Sign up, enter your details, forward your missed calls to your TradeDesk number, and you're done. No hardware, no technical knowledge." },
  { q: 'Can I cancel any time?', a: "Yes, absolutely. No lock-in contracts. Cancel from your account settings any time and you won't be charged again. 30-day money-back guarantee included." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass rounded-xl overflow-hidden border border-white/8 hover:border-white/15 transition-colors">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left">
        <span className="font-medium text-white text-sm sm:text-base">{q}</span>
        <ChevronDown size={18} className={`text-gray-400 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${open ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-5 pb-4 text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-4">{a}</div>
      </div>
    </div>
  );
}

/* ── Revenue Calculator ── */
function RevenueCalculator() {
  const [missedCalls, setMissedCalls] = useState(3);
  const [jobValue, setJobValue] = useState(500);
  const conversionRate = 0.25;
  const monthlyLoss = Math.round(missedCalls * 30 * jobValue * conversionRate);
  const daysToROI = Math.max(1, Math.round((199 / monthlyLoss) * 30));
  const annualLoss = monthlyLoss * 12;

  return (
    <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-white mb-2">How much are missed calls costing you?</h3>
        <p className="text-gray-500 text-sm">Move the sliders to see your real numbers</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-8 mb-8">
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-300">Missed calls per day</label>
            <span className="text-2xl font-bold text-blue-400">{missedCalls}</span>
          </div>
          <input type="range" min={1} max={15} value={missedCalls} onChange={e => setMissedCalls(+e.target.value)}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, #3b82f6 ${(missedCalls/15)*100}%, rgba(255,255,255,0.1) ${(missedCalls/15)*100}%)` }}
          />
          <div className="flex justify-between text-xs text-gray-600 mt-1"><span>1</span><span>15</span></div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-300">Average job value</label>
            <span className="text-2xl font-bold text-blue-400">${jobValue}</span>
          </div>
          <input type="range" min={100} max={2000} step={50} value={jobValue} onChange={e => setJobValue(+e.target.value)}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, #3b82f6 ${((jobValue-100)/1900)*100}%, rgba(255,255,255,0.1) ${((jobValue-100)/1900)*100}%)` }}
          />
          <div className="flex justify-between text-xs text-gray-600 mt-1"><span>$100</span><span>$2,000</span></div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="glass rounded-xl p-4 border border-red-500/20 text-center">
          <div className="text-xs text-gray-500 mb-1">You're losing / month</div>
          <div className="text-2xl font-extrabold text-red-400">${monthlyLoss.toLocaleString()}</div>
        </div>
        <div className="glass rounded-xl p-4 border border-red-500/20 text-center">
          <div className="text-xs text-gray-500 mb-1">Annual revenue lost</div>
          <div className="text-2xl font-extrabold text-red-400">${annualLoss.toLocaleString()}</div>
        </div>
        <div className="glass rounded-xl p-4 border border-green-500/20 text-center">
          <div className="text-xs text-gray-500 mb-1">TradeDesk pays back in</div>
          <div className="text-2xl font-extrabold text-green-400">{daysToROI === 1 ? '< 1 day' : `${daysToROI} days`}</div>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-600 mb-4">Based on 25% conversion of missed calls to booked jobs — a conservative estimate for most trades.</p>
        <Link to="/signup"
          className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 active:scale-[0.97]"
          style={{ boxShadow: '0 0 20px rgba(59,130,246,0.35)' }}>
          Stop the bleeding — start free <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

/* ── Call Transcript demo ── */
const SCENARIOS = [
  {
    label: 'Burst pipe emergency',
    emoji: '🚨',
    turns: [
      { role: 'ai' as const, text: "G'day! You've reached Smith's Plumbing — I'm their AI receptionist. How can I help?" },
      { role: 'caller' as const, text: "Hi, I've got water pouring out from under my kitchen sink. It's everywhere." },
      { role: 'ai' as const, text: "That sounds urgent — let's get Dave on this fast. Can you turn off the water at the mains? It's usually under the sink or outside near the meter." },
      { role: 'caller' as const, text: "Yeah I found it, turned it off." },
      { role: 'ai' as const, text: "Perfect. A burst pipe repair is usually $180–$320 depending on access. I'm marking this as urgent — Dave will call you back within 30 minutes. What's your name and best number?" },
    ],
  },
  {
    label: 'Hot water quote',
    emoji: '🔥',
    turns: [
      { role: 'ai' as const, text: "G'day, Smith's Plumbing AI here. What can I do for you today?" },
      { role: 'caller' as const, text: "My hot water system died this morning. Need a new one — what's the cost?" },
      { role: 'ai' as const, text: "Sorry to hear that! A new hot water system supply and install is typically $900–$1,800 depending on the type and size. Are you after a gas, electric or heat pump system?" },
      { role: 'caller' as const, text: "We've got gas. It's a 3-bedroom house." },
      { role: 'ai' as const, text: "For a 3-bed home on gas, Dave would recommend a 135L or 170L continuous flow — those run $950–$1,400 all in. Want me to get Dave to call you back with an exact quote?" },
    ],
  },
  {
    label: 'Booking a job',
    emoji: '📅',
    turns: [
      { role: 'ai' as const, text: "Hi, Smith's Plumbing! Dave's on a job right now — I can help you book something in." },
      { role: 'caller' as const, text: "I just need someone to fix a dripping tap in my bathroom. It's not urgent." },
      { role: 'ai' as const, text: "Easy — a tap washer or cartridge replacement is usually $120–$180, takes about 30 minutes. Dave has availability next Tuesday from 8am. Does morning work for you?" },
      { role: 'caller' as const, text: "Tuesday morning is perfect." },
      { role: 'ai' as const, text: "Booked! I'll let Dave know — he'll confirm with you on Monday evening. Can I grab your name and address?" },
    ],
  },
];

function CallTranscriptDemo() {
  const [active, setActive] = useState(0);
  const scenario = SCENARIOS[active];
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {SCENARIOS.map((s, i) => (
          <button key={i} onClick={() => setActive(i)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
              active === i ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'glass border-white/10 text-gray-400 hover:text-white hover:border-white/20'
            }`}>
            <span>{s.emoji}</span>{s.label}
          </button>
        ))}
      </div>
      <div className="glass rounded-2xl border border-white/10 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8 bg-white/[0.02]">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Zap size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">TradeDesk AI · Live call</p>
            <p className="text-xs text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" /> Recording</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <div className="w-2 h-2 rounded-full bg-green-400" />
          </div>
        </div>
        <div className="p-5 space-y-3">
          {scenario.turns.map((t, i) => (
            <div key={`${active}-${i}`} className={`flex ${t.role === 'ai' ? 'justify-start' : 'justify-end'} animate-fade-in`} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                t.role === 'ai'
                  ? 'bg-blue-500/20 text-blue-100 rounded-tl-sm border border-blue-500/15'
                  : 'bg-white/10 text-gray-200 rounded-tr-sm border border-white/8'
              }`}>
                <p className="text-[10px] font-semibold opacity-50 mb-1">{t.role === 'ai' ? 'TradeDesk AI' : 'Caller'}</p>
                {t.text}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5">
          <div className="glass rounded-xl px-4 py-3 border border-green-500/20 flex items-start gap-3">
            <CheckCircle size={15} className="text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400"><span className="text-white font-medium">Dave gets an SMS instantly:</span> "New call from 0412 345 678. {scenario.label}. Quoted ${scenario === SCENARIOS[0] ? '180–320' : scenario === SCENARIOS[1] ? '950–1,400' : '120–180'}. Call back requested."</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Setup Timeline ── */
function SetupTimeline() {
  const steps = [
    { time: '0:00', label: 'Sign up', desc: 'Create your account — takes 60 seconds', icon: '✍️' },
    { time: '2:00', label: 'Enter your details', desc: 'Business name, trade, services and pricing guide', icon: '📋' },
    { time: '5:00', label: 'Get your number', desc: 'Your dedicated TradeDesk number is generated instantly', icon: '📞' },
    { time: '7:00', label: 'Forward your calls', desc: "Set missed call forwarding on your phone — takes 2 minutes", icon: '📲' },
    { time: '10:00', label: 'You\'re live', desc: "AI is answering calls. You'll get your first SMS summary within minutes", icon: '🚀' },
  ];
  return (
    <div className="max-w-2xl mx-auto">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-4 pb-6 last:pb-0 relative">
          {i < steps.length - 1 && (
            <div className="absolute left-8 top-10 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/50 to-transparent" />
          )}
          <div className="flex-shrink-0 flex flex-col items-center gap-1">
            <div className="w-10 h-10 glass rounded-xl flex items-center justify-center text-lg border border-white/10 relative z-10 bg-[#080c14]">
              {s.icon}
            </div>
            <span className="text-[10px] text-blue-400 font-mono font-bold">{s.time}</span>
          </div>
          <div className="flex-1 pt-1.5">
            <p className="font-semibold text-white text-sm">{s.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Industries ── */
const INDUSTRIES = [
  { icon: '🔧', label: 'Plumber', benefit: 'Quote burst pipes & hot water jobs instantly' },
  { icon: '⚡', label: 'Electrician', benefit: 'Handle safety switch calls 24/7' },
  { icon: '🏗️', label: 'Builder', benefit: 'Capture renovation enquiries while on site' },
  { icon: '🪚', label: 'Carpenter', benefit: 'Book deck and cabinet consultations' },
  { icon: '🎨', label: 'Painter', benefit: 'Give quote estimates without stopping work' },
  { icon: '🌿', label: 'Landscaper', benefit: 'Book design consultations automatically' },
  { icon: '🏠', label: 'Roofer', benefit: 'Handle urgent leak calls around the clock' },
  { icon: '🔲', label: 'Tiler', benefit: 'Take bathroom job enquiries anytime' },
  { icon: '🔑', label: 'Locksmith', benefit: 'Answer lockout emergencies in seconds' },
  { icon: '❄️', label: 'HVAC', benefit: 'Book AC service calls in peak season' },
  { icon: '🐜', label: 'Pest Control', benefit: 'Capture infestation calls before competitors' },
  { icon: '🧱', label: 'Concreter', benefit: 'Quote driveway and slab jobs on the fly' },
];

/* ── Main component ── */
export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [showScrollCTA, setShowScrollCTA] = useState(false);
  const [showBackTop, setShowBackTop] = useState(false);
  const [cookieDismissed, setCookieDismissed] = useState(() => localStorage.getItem('td_cookie') === '1');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      setShowScrollCTA(window.scrollY > 400);
      setShowBackTop(window.scrollY > 800);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowTyping(true), 1800);
    return () => clearTimeout(t);
  }, []);

  const dismissCookie = () => {
    localStorage.setItem('td_cookie', '1');
    setCookieDismissed(true);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/90 backdrop-blur-md border-b border-white/8' : ''}`}>
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center hover:scale-110 transition-transform"
              style={{ boxShadow: '0 0 16px rgba(59,130,246,0.4)' }}>
              <Zap size={15} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">TradeDesk</span>
          </div>
          <div className="hidden md:flex items-center gap-7">
            {[['#calculator', 'Calculator'], ['#how-it-works', 'How it works'], ['#features', 'Features'], ['#pricing', 'Pricing']].map(([href, label]) => (
              <a key={href} href={href} className="text-sm text-gray-400 hover:text-white transition-colors">{label}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5">Log in</Link>
            <Link to="/signup" className="text-sm font-semibold bg-blue-500 hover:bg-blue-400 active:scale-[0.97] text-white px-4 py-2 rounded-lg transition-all"
              style={{ boxShadow: '0 0 16px rgba(59,130,246,0.35)' }}>Get Started Free</Link>
          </div>
          <button className="md:hidden text-gray-400 hover:text-white p-1" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-black/95 backdrop-blur-md border-b border-white/8 px-5 py-4 space-y-3 animate-fade-in">
            {[['#calculator', '💰 Revenue Calculator'], ['#how-it-works', 'How it works'], ['#features', 'Features'], ['#pricing', 'Pricing']].map(([href, label]) => (
              <a key={href} href={href} className="block text-sm text-gray-300 hover:text-white py-1.5" onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
            <div className="flex gap-3 pt-2 border-t border-white/8">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center text-sm glass rounded-lg py-2.5 text-gray-300">Log in</Link>
              <Link to="/signup" onClick={() => setMenuOpen(false)} className="flex-1 text-center text-sm bg-blue-500 hover:bg-blue-400 rounded-lg py-2.5 font-semibold transition-colors">Get started</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f0f0f_1px,transparent_1px),linear-gradient(to_bottom,#0f0f0f_1px,transparent_1px)] bg-[size:60px_60px] opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-full max-w-3xl h-[500px] pointer-events-none"
          style={{ animation: 'hero-pulse 4s ease-in-out infinite' }}>
          <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 w-full max-w-6xl mx-auto px-5 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 glass border border-blue-500/30 rounded-full px-4 py-1.5 text-xs text-blue-400 font-medium mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                🇦🇺 Built for Australian tradies · Live in 10 minutes
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-[4.5rem] font-extrabold tracking-tight leading-[1.05] mb-6">
                <span className="block text-white">Every missed call</span>
                <span className="block text-white">is a job your</span>
                <span className="text-gradient block">competitor got.</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-400 mb-4 leading-relaxed max-w-lg">
                TradeDesk answers in under 2 seconds, gives callers your actual quotes, books jobs — and texts you a summary. All while you're on the tools.
              </p>
              <p className="text-sm text-blue-400/80 mb-10 font-medium">
                Average tradie recovers the subscription cost <strong className="text-blue-400">within 1 week.</strong>
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-center lg:items-start">
                <Link to="/signup"
                  className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 active:scale-[0.97] text-white font-semibold px-8 py-4 rounded-xl text-base transition-all w-full sm:w-auto justify-center"
                  style={{ boxShadow: '0 0 28px rgba(59,130,246,0.4)' }}>
                  Start 7-day free trial <ArrowRight size={18} />
                </Link>
                <a href="#calculator" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
                  <DollarSign size={16} className="text-blue-400" />
                  Calculate your losses first
                </a>
              </div>
              <div className="flex items-center gap-6 mt-8 text-xs text-gray-600">
                <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-400" /> No credit card needed</span>
                <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-400" /> Cancel any time</span>
                <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-400" /> 30-day money back</span>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end animate-fade-in">
              <PhoneFrame>
                <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-white/8 flex-shrink-0">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Zap size={10} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-white">TradeDesk AI</p>
                    <p className="text-[9px] text-green-400">● Answering now</p>
                  </div>
                </div>
                <div className="space-y-2 flex-1 overflow-hidden">
                  <Bubble role="ai" text="G'day! You've reached Smith's Plumbing. Dave's on a job — I'm his AI receptionist. How can I help?" />
                  <Bubble role="caller" text="I've got a burst pipe in the kitchen. Water everywhere." />
                  {showTyping ? (
                    <>
                      <Bubble role="ai" text="Turn off the mains now — usually under the sink or outside. A burst pipe is $180–$320. I'm marking this urgent — Dave calls back within 30 min. Name and number?" />
                      <div className="text-center py-1 animate-fade-in">
                        <span className="text-[10px] text-gray-600 flex items-center justify-center gap-1">
                          <CheckCircle size={10} className="text-green-400" />Dave gets SMS instantly
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-start">
                      <div className="bg-blue-500/25 text-blue-100 rounded-2xl rounded-tl-sm border border-blue-500/20 px-3.5 py-2.5">
                        <p className="text-[9px] font-semibold opacity-50 mb-0.5">TradeDesk AI</p>
                        <TypingIndicator />
                      </div>
                    </div>
                  )}
                </div>
              </PhoneFrame>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ── */}
      <section className="py-8 px-5 border-y border-white/6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-center">
            {[
              { stat: '< 2 sec', label: 'Average answer time' },
              { stat: '24/7', label: 'Always on, weekends included' },
              { stat: '$0', label: 'Per-call fees. Ever.' },
              { stat: '10 min', label: 'Average setup time' },
            ].map(({ stat, label }) => (
              <div key={stat} className="flex-1">
                <div className="text-2xl font-extrabold text-white mb-0.5">{stat}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REVENUE CALCULATOR ── */}
      <section id="calculator" className="py-24 px-5 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.06),transparent_70%)]" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-12">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Revenue Calculator</p>
            <h2 className="text-3xl sm:text-4xl font-bold">See what missed calls are actually costing you</h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">Most tradies are shocked when they see the real number. Drag the sliders.</p>
          </div>
          <RevenueCalculator />
        </div>
      </section>

      {/* ── TRUSTED INDUSTRIES ── */}
      <section className="py-16 px-5 border-y border-white/6">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs text-gray-600 font-semibold uppercase tracking-widest mb-10">Built for every trade on the tools</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {INDUSTRIES.map(({ icon, label, benefit }) => (
              <div key={label} className="group relative flex flex-col items-center gap-2 cursor-default">
                <div className="w-12 h-12 glass rounded-xl flex items-center justify-center text-2xl group-hover:border-white/20 group-hover:bg-white/5 group-hover:scale-110 transition-all duration-200">
                  {icon}
                </div>
                <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors text-center">{label}</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 glass rounded-lg px-3 py-2 text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 border border-white/10 text-center">
                  {benefit}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW THE CALL SOUNDS ── */}
      <section className="py-24 px-5 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Hear it in action</p>
            <h2 className="text-3xl sm:text-4xl font-bold">How the call actually sounds</h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">Real scenarios your AI handles — while you're on the tools. Click each to see the full conversation.</p>
          </div>
          <CallTranscriptDemo />
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-5 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.04),transparent_70%)]" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Setup</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Live in under 10 minutes</h2>
            <p className="text-gray-500 mt-4">No hardware. No IT support. No waiting. Just forward your missed calls and you're done.</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <SetupTimeline />
            <div className="space-y-4">
              <div className="glass rounded-2xl p-6 border border-white/8">
                <h3 className="font-bold text-white mb-3 flex items-center gap-2"><span className="text-xl">📱</span> iPhone</h3>
                <ol className="space-y-2 text-sm text-gray-300">
                  <li className="flex gap-2"><span className="text-blue-400 font-bold w-4">1.</span> Settings → Phone → Call Forwarding</li>
                  <li className="flex gap-2"><span className="text-blue-400 font-bold w-4">2.</span> Toggle Call Forwarding ON</li>
                  <li className="flex gap-2"><span className="text-blue-400 font-bold w-4">3.</span> Enter your TradeDesk number</li>
                </ol>
              </div>
              <div className="glass rounded-2xl p-6 border border-white/8">
                <h3 className="font-bold text-white mb-3 flex items-center gap-2"><span className="text-xl">🤖</span> Android</h3>
                <ol className="space-y-2 text-sm text-gray-300">
                  <li className="flex gap-2"><span className="text-blue-400 font-bold w-4">1.</span> Phone app → ⋮ → Settings → Supplementary services</li>
                  <li className="flex gap-2"><span className="text-blue-400 font-bold w-4">2.</span> Call forwarding → Forward when unanswered</li>
                  <li className="flex gap-2"><span className="text-blue-400 font-bold w-4">3.</span> Enter your TradeDesk number</li>
                </ol>
              </div>
              <div className="flex items-start gap-4 glass border border-red-500/20 rounded-2xl p-5">
                <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white mb-1 text-sm">Emergencies are handled first</p>
                  <p className="text-xs text-gray-400">If a caller says it's urgent, the AI flags it immediately and sends you an urgent SMS alert so nothing slips through.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-5 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.04),transparent_70%)]" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-12">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Real tradies</p>
            <h2 className="text-3xl sm:text-4xl font-bold">What they're saying</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { name: 'Marcus Webb', trade: 'Plumber', location: 'Brisbane, QLD', quote: "I was losing 3–4 jobs a week because I couldn't answer calls on the job. TradeDesk fixed that overnight. Paid for itself in the first 3 days.", stars: 5, detail: 'Saved 4 jobs in first week' },
              { name: 'Tanya Kowalski', trade: 'Electrician', location: 'Sydney, NSW', quote: "Set it up in 8 minutes. Now I check my phone at smoko and I've got a list of leads with their details and what they need. It's unreal.", stars: 5, detail: 'Set up in under 10 min' },
              { name: 'Brett Sullivan', trade: 'Builder', location: 'Melbourne, VIC', quote: "My clients have no idea they're not talking to a real receptionist. It's that good. I've closed $12k in extra work this month from calls I would've missed.", stars: 5, detail: '$12k extra revenue this month' },
            ].map(({ name, trade, location, quote, stars, detail }) => (
              <div key={name} className="glass rounded-2xl p-6 border border-white/8 hover:border-white/15 transition-all duration-200 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-0.5">
                    {[...Array(stars)].map((_, i) => <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />)}
                  </div>
                  <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">{detail}</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed mb-5 flex-1">"{quote}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/8">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/40 to-purple-500/40 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">{name[0]}</div>
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

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05),transparent_70%)]" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Everything included</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Your business, covered 24/7</h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">One flat monthly fee. No per-call charges. No setup fees. Everything included.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Phone, title: 'AI answers 24/7', desc: 'Picks up in under 2 seconds. Nights, weekends, Christmas — your business never closes.', color: 'text-blue-400', bg: 'bg-blue-500/15' },
              { icon: MessageSquare, title: 'SMS summaries', desc: 'After every call: caller name, number, what they need, and what was quoted. Instant.', color: 'text-green-400', bg: 'bg-green-500/15' },
              { icon: Mail, title: 'Email auto-reply', desc: 'Connect Gmail and the AI answers enquiry emails with pricing and availability.', color: 'text-purple-400', bg: 'bg-purple-500/15' },
              { icon: Clock, title: 'Missed call text-back', desc: "If a call goes completely unanswered, the caller gets a text within 60 seconds re-engaging them.", color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
              { icon: FileText, title: 'Full transcripts', desc: 'Every conversation recorded and searchable in your dashboard. Know exactly what was said.', color: 'text-pink-400', bg: 'bg-pink-500/15' },
              { icon: DollarSign, title: 'Accurate quotes', desc: 'The AI uses your real pricing guide to give callers spot-on estimates — no wrong numbers.', color: 'text-orange-400', bg: 'bg-orange-500/15' },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="glass rounded-2xl p-6 transition-all duration-300 group cursor-default hover:border-white/15 hover:bg-white/[0.03] border border-white/8">
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
            <h2 className="text-3xl sm:text-4xl font-bold">TradeDesk vs. every other option</h2>
            <p className="text-gray-500 mt-4">Flat $199/mo vs. per-call fees, sick days, and missed calls.</p>
          </div>
          <div className="glass rounded-2xl overflow-hidden border border-white/10">
            <div className="grid grid-cols-4 text-sm font-semibold border-b border-white/10">
              <div className="py-4 px-4 text-gray-500 pl-6">Feature</div>
              <div className="py-4 px-2 bg-blue-500/10 border-x border-blue-500/20 text-blue-400 flex items-center justify-center gap-1 text-center text-xs">
                <Zap size={12} /> TradeDesk
              </div>
              <div className="py-4 px-2 text-gray-500 text-center text-xs">Human receptionist</div>
              <div className="py-4 px-2 text-gray-500 text-center text-xs">AI competitors<br/><span className="text-[10px] text-gray-600">(Goodcall, Smith.ai)</span></div>
            </div>
            {[
              { label: 'Monthly cost', td: '$199 flat', hr: '$4,000–$6,000', comp: '$285+ plus per-call' },
              { label: 'Australian English', td: '✓ Native', hr: 'Varies', comp: '✗ US-focused' },
              { label: 'Trade-specific quotes', td: '✓ Always accurate', hr: 'Depends on training', comp: '✗ Generic only' },
              { label: 'Answer time', td: '< 2 seconds', hr: 'Varies, often hold', comp: '< 5 seconds' },
              { label: '24/7 availability', td: '✓ Always on', hr: '✗ Business hours', comp: '✓' },
              { label: 'SMS summary after calls', td: '✓ Every call', hr: '✗ Manual notes', comp: 'Partial' },
              { label: 'Per-call or per-minute fees', td: '✗ None ever', hr: 'N/A', comp: '✓ Yes — adds up' },
              { label: 'Australian data residency', td: '✓', hr: 'N/A', comp: '✗ US servers' },
              { label: 'Setup time', td: '10 minutes', hr: '2–4 weeks hiring', comp: '30–60 minutes' },
              { label: 'Sick days / downtime', td: 'Zero', hr: '10+ days/year', comp: 'Rare' },
            ].map(({ label, td, hr, comp }, i) => (
              <div key={label} className={`grid grid-cols-4 text-xs sm:text-sm border-b border-white/5 last:border-0 ${i % 2 !== 0 ? 'bg-white/[0.015]' : ''}`}>
                <div className="py-3.5 px-4 text-gray-400 pl-6 text-xs">{label}</div>
                <div className="py-3.5 px-2 bg-blue-500/5 border-x border-blue-500/10 flex items-center justify-center gap-1 text-white font-medium text-center text-xs">
                  {td.startsWith('✓') ? <CheckCircle size={13} className="text-green-400 flex-shrink-0" /> : td.startsWith('✗') ? <XCircle size={13} className="text-red-400/70 flex-shrink-0" /> : null}
                  <span>{td.replace('✓ ', '').replace('✗ ', '')}</span>
                </div>
                <div className="py-3.5 px-2 flex items-center justify-center gap-1 text-gray-500 text-center text-xs">
                  {hr.startsWith('✗') && <XCircle size={12} className="text-red-400/70 flex-shrink-0" />}
                  <span>{hr.replace('✗ ', '')}</span>
                </div>
                <div className="py-3.5 px-2 flex items-center justify-center gap-1 text-gray-500 text-center text-xs">
                  {comp.startsWith('✗') && <XCircle size={12} className="text-red-400/70 flex-shrink-0" />}
                  {comp.startsWith('✓') && <CheckCircle size={12} className="text-green-400/70 flex-shrink-0" />}
                  <span>{comp.replace('✗ ', '').replace('✓ ', '')}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/signup"
              className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 active:scale-[0.97] text-white font-semibold px-7 py-3.5 rounded-xl transition-all"
              style={{ boxShadow: '0 0 20px rgba(59,130,246,0.3)' }}>
              Get started for $199/mo <ArrowRight size={16} />
            </Link>
            <p className="text-xs text-gray-600 mt-3">No per-call fees. No surprise charges. Cancel any time.</p>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <section className="py-10 overflow-hidden border-y border-white/6">
        <div className="flex whitespace-nowrap gap-12" style={{ animation: 'marquee 25s linear infinite' }}>
          {[...Array(4)].map((_, i) =>
            INDUSTRIES.map(({ icon, label }) => (
              <span key={`${label}-${i}`} className="text-sm text-gray-600 flex items-center gap-2 flex-shrink-0">
                <span>{icon}</span> {label}
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
            <h2 className="text-3xl sm:text-4xl font-bold">One plan. Everything included.</h2>
            <p className="text-gray-500 mt-4">No per-call charges. No setup fees. Cancel any time.</p>
            <div className="inline-flex items-center gap-2 glass border border-green-500/30 rounded-full px-4 py-2 text-sm text-green-400 font-medium mt-4">
              <DollarSign size={14} /> Most businesses recover the cost in their first week
            </div>
          </div>
          <div className="max-w-md mx-auto">
            <div className="relative">
              <div className="absolute -inset-px bg-gradient-to-b from-blue-500/40 to-transparent rounded-2xl" />
              <div className="relative glass rounded-2xl p-8">
                <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">TradeDesk Pro</h3>
                    <p className="text-sm text-gray-400">Everything you need to never miss a job</p>
                  </div>
                  <div className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-500/30">
                    ⭐ Most popular
                  </div>
                </div>
                <div className="mb-2">
                  <div className="flex items-end gap-1">
                    <span className="text-5xl font-extrabold text-white">$199</span>
                    <span className="text-gray-500 mb-2">/month AUD</span>
                  </div>
                  <p className="text-sm text-gray-500">Billed monthly · cancel any time · no lock-in</p>
                </div>
                <div className="glass rounded-xl px-4 py-2.5 border border-green-500/20 mb-6">
                  <p className="text-xs text-gray-400">
                    <span className="text-green-400 font-semibold">Compare: </span>
                    Smith.ai charges $285+/mo <em>plus</em> $3.33 per call. At 10 calls/day that's $1,285+/mo. TradeDesk is flat $199.
                  </p>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    'AI answers unlimited calls, 24/7',
                    'Australian English voice — sounds local',
                    'SMS summary after every single call',
                    'Emergency detection + urgent SMS alert',
                    'Missed call text-back within 60 seconds',
                    'Full call transcripts + searchable dashboard',
                    'Gmail email auto-reply',
                    'Two-way SMS inbox',
                    'Auto CRM — contacts created from callers',
                    'Weekly leads summary email',
                    'Setup support from real humans',
                    'No per-call fees. Ever.',
                  ].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                      <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/signup"
                  className="flex items-center justify-center gap-2 w-full bg-blue-500 hover:bg-blue-400 active:scale-[0.98] text-white font-semibold py-3.5 rounded-xl transition-all"
                  style={{ boxShadow: '0 0 20px rgba(59,130,246,0.3)' }}>
                  Start 7-day free trial <ArrowRight size={16} />
                </Link>
                <p className="text-center text-xs text-gray-600 mt-3">No credit card required · cancel any time</p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3 glass rounded-xl px-5 py-4 border border-green-500/20">
              <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
              <p className="text-sm text-gray-400">
                <span className="text-white font-semibold">30-day money-back guarantee.</span>{' '}
                If TradeDesk doesn't pay for itself, full refund. No questions.
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
            {FAQS.map(f => <FAQItem key={f.q} {...f} />)}
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
              className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 active:scale-[0.98] text-white font-semibold px-8 py-4 rounded-xl text-base transition-all"
              style={{ boxShadow: '0 0 24px rgba(59,130,246,0.35)' }}>
              Get Started Free <ArrowRight size={18} />
            </Link>
            <p className="text-sm text-gray-600">7-day free trial · No credit card</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/8 py-12 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center"><Zap size={13} className="text-white" /></div>
                <span className="font-bold text-white">TradeDesk</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">AI receptionist built for Australian tradies. Never miss a lead again.</p>
              <p className="text-xs text-gray-700 mt-3">Made in Newcastle, NSW 🇦🇺<br />Built by a 15 year old tradie's kid 👋</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Product</p>
              <div className="space-y-2">
                {[['#features', 'Features'], ['#pricing', 'Pricing'], ['#calculator', 'Calculator'], ['/demo', 'Demo']].map(([href, label]) => (
                  <a key={href} href={href} className="block text-sm text-gray-600 hover:text-white transition-colors">{label}</a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Company</p>
              <div className="space-y-2">
                {[['/contact', 'Contact'], ['/privacy', 'Privacy Policy'], ['/terms', 'Terms of Service']].map(([href, label]) => (
                  <Link key={href} to={href} className="block text-sm text-gray-600 hover:text-white transition-colors">{label}</Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Get started</p>
              <div className="space-y-2">
                <Link to="/signup" className="block text-sm text-blue-400 hover:text-blue-300 transition-colors">Start free trial →</Link>
                <Link to="/login" className="block text-sm text-gray-600 hover:text-white transition-colors">Log in</Link>
                <a href="mailto:hello@tradedesk.com.au" className="block text-sm text-gray-600 hover:text-white transition-colors">hello@tradedesk.com.au</a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/6 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-700">© 2026 TradeDesk · ABN 00 000 000 000 · Newcastle NSW 2300</p>
            <div className="flex gap-4">
              <Link to="/privacy" className="text-xs text-gray-700 hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms" className="text-xs text-gray-700 hover:text-white transition-colors">Terms</Link>
              <Link to="/contact" className="text-xs text-gray-700 hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Sticky mobile CTA */}
      <div className={`fixed bottom-0 inset-x-0 z-40 md:hidden transition-all duration-300 ${showScrollCTA ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
        style={{ bottom: cookieDismissed ? 0 : 80 }}>
        <div className="bg-black/90 backdrop-blur-md border-t border-white/10 px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">Start your 7-day free trial</p>
            <p className="text-xs text-gray-500">No credit card needed</p>
          </div>
          <Link to="/signup" className="flex-shrink-0 bg-blue-500 hover:bg-blue-400 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all active:scale-[0.97]">
            Get started
          </Link>
        </div>
      </div>

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-20 right-5 z-40 w-10 h-10 glass rounded-full border border-white/15 flex items-center justify-center text-gray-400 hover:text-white hover:border-blue-500/40 transition-all duration-300 ${showBackTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <ArrowUp size={16} />
      </button>

      {/* Cookie banner */}
      {!cookieDismissed && (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-black/95 backdrop-blur-md border-t border-white/10 px-4 py-4">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <p className="text-xs text-gray-400 flex-1">
              We use cookies to improve your experience and analyse site traffic.
              By continuing, you agree to our <Link to="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link>.
            </p>
            <div className="flex gap-3 flex-shrink-0">
              <button onClick={dismissCookie} className="text-xs text-gray-500 hover:text-white transition-colors px-3 py-1.5">Decline</button>
              <button onClick={dismissCookie} className="text-xs bg-blue-500 hover:bg-blue-400 text-white px-4 py-1.5 rounded-lg transition-colors font-medium">Accept</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
