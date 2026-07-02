import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  Phone, MessageSquare, Mail, Clock, FileText, Zap,
  CheckCircle, XCircle, ArrowRight, Menu, X, AlertTriangle,
  ChevronDown, ArrowUp, DollarSign, Send, ExternalLink,
} from 'lucide-react';

/* ──────────────────────────────────────
   HOOKS
   ────────────────────────────────────── */

// Scroll reveal
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target); } }),
      { threshold: 0.07, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ──────────────────────────────────────
   MISSED-CALL RECEIPT  (hero visual)
   A single dominant idea: the SMS a tradie gets the instant
   TradeDesk finishes a call. Deliberately styled like a docket /
   job slip, not a glossy phone mockup.
   ────────────────────────────────────── */
function MissedCallReceipt() {
  return (
    <div className="relative w-full max-w-sm mx-auto lg:mx-0">
      {/* soft clay glow — the one warm light source on the page */}
      <div className="absolute -inset-8 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="relative bg-[#0c1016] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* header — the call that just came in */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-dashed border-white/10">
          <div className="w-9 h-9 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
            <Phone size={16} className="text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight">Call you couldn't take</p>
            <p className="text-xs text-gray-500 font-mono">0412 087 336 · 2:14pm, on a roof</p>
          </div>
          <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/25 px-2 py-1 rounded-md">CAUGHT</span>
        </div>
        {/* the SMS you get 40 seconds later */}
        <div className="px-5 py-5 space-y-3">
          <p className="text-[11px] uppercase tracking-widest text-gray-600 font-semibold">Text in your pocket</p>
          <div className="space-y-2 text-sm leading-relaxed">
            <p className="text-gray-300"><span className="text-white font-semibold">Sharon, Merewether.</span> Hot water system died overnight, no hot water for the kids.</p>
            <p className="text-gray-300">Wants it looked at <span className="text-white">today</span>. Quoted <span className="text-orange-300 font-semibold">$950–$1,400</span> for a continuous-flow swap.</p>
            <p className="text-gray-300">Callback number: <span className="font-mono text-white">0412 087 336</span></p>
          </div>
        </div>
        {/* tear-off footer */}
        <div className="px-5 py-3.5 bg-white/[0.02] border-t border-dashed border-white/10 flex items-center justify-between">
          <span className="text-xs text-gray-500">Handled while you were up a ladder</span>
          <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
            <CheckCircle size={13} /> Job saved
          </span>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   FAQ
   ────────────────────────────────────── */
const FAQS = [
  { q: 'How does TradeDesk actually work?', a: "When a call comes in, our AI picks up in under 2 seconds, introduces itself as your business, handles the conversation naturally, gives callers accurate quotes from your pricing guide, and texts you a full summary instantly. No hold music, no voicemail." },
  { q: 'What happens if I miss a call while on a job?', a: "TradeDesk answers it for you. The AI takes the caller's name, number, what they need — gives a rough quote and tells them you'll follow up. You get an SMS straight away. No lead lost, no awkward follow-ups." },
  { q: 'Can I customise what the AI says?', a: "100%. During setup you tell TradeDesk your business name, trade, services, pricing guide, and working hours. The AI uses all of that in every call. Change it any time from your Settings page. Takes 2 minutes." },
  { q: "Do callers know they're talking to an AI?", a: "Yes — TradeDesk is upfront about it. But it sounds natural and professional, and most callers are happy once they know their query gets passed on quickly. Honesty builds trust." },
  { q: 'How long does it take to set up?', a: "Most tradies are live in under 10 minutes. Sign up, punch in your details, forward your missed calls to your TradeDesk number, and that's it. No hardware, no IT bloke, no drama." },
  { q: 'Can I cancel any time?', a: "Yep. No lock-in contracts. Cancel from your account any time. 30-day money-back guarantee too — if TradeDesk doesn't pay for itself, you get a full refund, no questions asked." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass rounded-xl overflow-hidden border border-white/8 hover:border-white/15 transition-colors">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left min-h-[52px]">
        <span className="font-medium text-white text-sm leading-snug">{q}</span>
        <ChevronDown size={16} className={`text-gray-400 flex-shrink-0 mt-0.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${open ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-5 pb-4 text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-3">{a}</div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   REVENUE CALCULATOR
   ────────────────────────────────────── */
function RevenueCalculator() {
  const [missedCalls, setMissedCalls] = useState(3);
  const [jobValue, setJobValue] = useState(500);
  const monthlyLoss = Math.round(missedCalls * 30 * jobValue * 0.25);
  const daysToROI = Math.max(1, Math.round((199 / monthlyLoss) * 30));

  return (
    <div className="glass rounded-2xl p-5 sm:p-8 border border-white/10 max-w-3xl mx-auto">
      <div className="text-center mb-6 sm:mb-8">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-1">How much are missed calls costing you?</h3>
        <p className="text-gray-500 text-xs sm:text-sm">Move the sliders — most tradies are shocked by the real number</p>
      </div>
      <div className="flex flex-col gap-6 mb-6 sm:mb-8">
        {[
          { label: 'Missed calls per day', val: missedCalls, set: setMissedCalls, min: 1, max: 15, step: 1, fmt: (v: number) => `${v}` },
          { label: 'Average job value', val: jobValue, set: setJobValue, min: 100, max: 2000, step: 50, fmt: (v: number) => `$${v}` },
        ].map(({ label, val, set, min, max, step, fmt }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">{label}</label>
              <span className="text-2xl font-bold text-blue-400 tabular-nums">{fmt(val)}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={val} onChange={e => set(+e.target.value)}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-blue-500"
              style={{ background: `linear-gradient(to right, #3b82f6 ${((val - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) ${((val - min) / (max - min)) * 100}%)` }}
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1"><span>{fmt(min)}</span><span>{fmt(max)}</span></div>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 mb-6 sm:mb-8">
        <div className="glass rounded-xl p-4 border border-red-500/20 text-center">
          <div className="text-xs text-gray-500 mb-1">Losing per month</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-red-400">${monthlyLoss.toLocaleString()}</div>
        </div>
        <div className="glass rounded-xl p-4 border border-red-500/20 text-center">
          <div className="text-xs text-gray-500 mb-1">Annual revenue lost</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-red-400">${(monthlyLoss * 12).toLocaleString()}</div>
        </div>
        <div className="glass rounded-xl p-4 border border-amber-500/25 text-center" style={{ background: 'rgba(245,158,11,0.04)' }}>
          <div className="text-xs text-gray-500 mb-1">TradeDesk pays back in</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">{daysToROI <= 1 ? '< 1 day' : `${daysToROI} days`}</div>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-600 mb-4">Based on 25% conversion — a conservative estimate for most trades.</p>
        <Link to="/signup"
          className="btn-shimmer inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-black font-bold px-7 py-3.5 rounded-xl transition-all w-full sm:w-auto text-sm sm:text-base min-h-[52px] relative overflow-hidden"
          style={{ boxShadow: '0 0 20px rgba(249,115,22,0.35)' }}>
          Claw that back — start free <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   CALL TRANSCRIPT DEMO
   ────────────────────────────────────── */
const SCENARIOS = [
  {
    label: 'Burst pipe', emoji: '🚨', caller: '0412 345 678',
    turns: [
      { role: 'ai' as const, text: "G'day! You've reached Smith's Plumbing — I'm their AI receptionist. How can I help?" },
      { role: 'caller' as const, text: "Hi, I've got water pouring out from under my kitchen sink." },
      { role: 'ai' as const, text: "Sounds urgent — turn off your water at the mains first. A burst pipe is $180–$320. Dave will call you back within 30 min. Your name and number?" },
    ],
  },
  {
    label: 'Hot water', emoji: '🔥', caller: '0438 901 234',
    turns: [
      { role: 'ai' as const, text: "G'day, Smith's Plumbing AI here. What can I do for you?" },
      { role: 'caller' as const, text: "My hot water system died this morning. Need a new one." },
      { role: 'ai' as const, text: "For a 3-bed home on gas, continuous flow runs $950–$1,400 all in. Want Dave to call with an exact quote?" },
    ],
  },
  {
    label: 'Booking', emoji: '📅', caller: '0455 678 901',
    turns: [
      { role: 'ai' as const, text: "Hi, Smith's Plumbing! Dave's on a job — I can help you book in." },
      { role: 'caller' as const, text: "I need a dripping tap fixed. Not urgent." },
      { role: 'ai' as const, text: "A tap washer is $120–$180, about 30 min. Dave has Tuesday 8am available. Shall I book that in?" },
    ],
  },
];

function CallTranscriptDemo() {
  const [active, setActive] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const scenario = SCENARIOS[active];

  useEffect(() => {
    setElapsed(0);
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [active]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex gap-2 mb-5 justify-center flex-wrap">
        {SCENARIOS.map((s, i) => (
          <button key={i} onClick={() => setActive(i)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all border min-h-[40px] ${active === i ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'glass border-white/10 text-gray-400 hover:text-white'}`}>
            <span>{s.emoji}</span>{s.label}
          </button>
        ))}
      </div>
      <div className="glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/30">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8 bg-white/[0.02]">
          <div className="relative">
            <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Zap size={14} className="text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0f1e]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white">TradeDesk AI · In call</p>
            <p className="text-[10px] text-gray-500 font-mono">{scenario.caller}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-400 bg-green-500/15 border border-green-500/30 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />LIVE
            </span>
            <span className="text-[10px] font-mono text-gray-500">{fmt(elapsed)}</span>
          </div>
        </div>
        <div className="p-4 space-y-3 min-h-[180px]">
          {scenario.turns.map((t, i) => (
            <div key={`${active}-${i}`} className={`flex ${t.role === 'ai' ? 'justify-start' : 'justify-end'} animate-fade-in`}>
              <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${t.role === 'ai' ? 'bg-blue-500/20 text-blue-100 rounded-tl-sm border border-blue-500/15' : 'bg-white/10 text-gray-200 rounded-tr-sm border border-white/8'}`}>
                <p className="text-[9px] font-semibold opacity-50 mb-0.5">{t.role === 'ai' ? 'TradeDesk AI' : `Caller · ${scenario.caller}`}</p>
                {t.text}
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4">
          <div className="glass rounded-xl px-3 py-2.5 border border-green-500/20 bg-green-500/5 flex items-start gap-2">
            <CheckCircle size={13} className="text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400">
              <span className="text-white font-medium">Dave gets an SMS instantly</span> — caller details, what was discussed, and the quote given.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   NEWSLETTER
   ────────────────────────────────────── */
function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (email) setDone(true); };
  return done ? (
    <p className="text-sm text-green-400 flex items-center gap-2"><CheckCircle size={15} /> You're in — tips incoming!</p>
  ) : (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-xs">
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required
        className="flex-1 min-w-0 glass rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 transition-all min-h-[44px]" />
      <button type="submit" className="flex-shrink-0 bg-blue-500 hover:bg-blue-400 text-white px-3.5 py-2.5 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium min-h-[44px]">
        <Send size={13} /> Sub
      </button>
    </form>
  );
}

/* ──────────────────────────────────────
   INDUSTRIES
   ────────────────────────────────────── */
// Only the trades that have their own written page get a card + a link.
const LEAD_INDUSTRIES = [
  { icon: '🔧', label: 'Plumber', benefit: 'Burst pipes at 2am, hot water quotes at smoko — the AI knows which is urgent and which can wait.', href: '/industries/plumbers' },
  { icon: '⚡', label: 'Electrician', benefit: 'Switchboard trips and safety-switch call-outs get triaged and quoted while your hands are full.', href: '/industries/electricians' },
  { icon: '🏗️', label: 'Builder', benefit: 'Reno and extension enquiries captured on site, with the details you need to call back a warm lead.', href: '/industries/builders' },
];

// Everyone else — honest, no fake links.
const OTHER_TRADES = [
  'carpenters', 'painters', 'landscapers', 'roofers', 'tilers',
  'locksmiths', 'HVAC techs', 'pest control', 'concreters',
];

/* ──────────────────────────────────────
   COMPARISON
   ────────────────────────────────────── */
const COMPARE_ROWS = [
  { label: 'Monthly cost', td: '✓ $199 flat', hr: '✗ $4,000–$6,000', comp: '✗ $285+ plus per-call' },
  { label: 'Australian English', td: '✓ Native', hr: 'Varies', comp: '✗ US-focused' },
  { label: 'Trade-specific quotes', td: '✓ Accurate', hr: 'Depends', comp: '✗ Generic' },
  { label: 'Answer time', td: '✓ < 2 seconds', hr: 'Varies / hold', comp: '< 5 seconds' },
  { label: '24/7 availability', td: '✓ Always on', hr: '✗ Business hours', comp: '✓' },
  { label: 'SMS after every call', td: '✓ Always', hr: '✗ Manual', comp: 'Partial' },
  { label: 'Per-call fees', td: '✓ None ever', hr: 'N/A', comp: '✗ Adds up fast' },
  { label: 'Australian data', td: '✓', hr: 'N/A', comp: '✗ US servers' },
  { label: 'Setup time', td: '✓ 10 minutes', hr: '✗ 2–4 weeks', comp: '30–60 min' },
];

/* ──────────────────────────────────────
   MAIN
   ────────────────────────────────────── */
export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showScrollCTA, setShowScrollCTA] = useState(false);
  const [showBackTop, setShowBackTop] = useState(false);
  const [cookieDismissed, setCookieDismissed] = useState(() => localStorage.getItem('td_cookie') === '1');

  useReveal();

  // Scroll events
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      setShowScrollCTA(window.scrollY > 500);
      setShowBackTop(window.scrollY > 800);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Smooth scroll
  useEffect(() => {
    const links = document.querySelectorAll('a[href^="#"]');
    const handler = (e: Event) => {
      const a = e.currentTarget as HTMLAnchorElement;
      const id = a.getAttribute('href')?.slice(1);
      if (id) {
        e.preventDefault();
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    links.forEach(l => l.addEventListener('click', handler));
    return () => links.forEach(l => l.removeEventListener('click', handler));
  }, []);

  const dismissCookie = () => { localStorage.setItem('td_cookie', '1'); setCookieDismissed(true); };

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
      <div className="noise-overlay" aria-hidden="true" />

      {/* ── NAV ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/90 backdrop-blur-md border-b border-white/8 shadow-xl shadow-black/20' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
              style={{ boxShadow: '0 0 16px rgba(59,130,246,0.4)' }}>
              <Zap size={15} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">TradeDesk</span>
          </Link>
          <div className="hidden md:flex items-center gap-7">
            {[['#calculator', 'Calculator'], ['#how-it-works', 'How it works'], ['#features', 'Features'], ['#pricing', 'Pricing']].map(([href, label]) => (
              <a key={href} href={href} className="text-sm text-gray-400 hover:text-white transition-colors relative group">
                {label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-blue-400 transition-all duration-200 group-hover:w-full" />
              </a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5">Log in</Link>
            <Link to="/signup"
              className="btn-shimmer text-sm font-bold bg-orange-500 hover:bg-orange-400 text-black px-4 py-2 rounded-lg transition-all relative overflow-hidden"
              style={{ boxShadow: '0 0 16px rgba(249,115,22,0.35)' }}>
              Try it on a call
            </Link>
          </div>
          <button className="md:hidden text-gray-400 hover:text-white p-2 -mr-1 min-h-[44px] min-w-[44px] flex items-center justify-center" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-96' : 'max-h-0'}`}>
          <div className="bg-black/95 backdrop-blur-md border-b border-white/8 px-4 py-4 space-y-1">
            {[['#calculator', '💰 Revenue Calculator'], ['#how-it-works', 'How it works'], ['#features', 'Features'], ['#pricing', 'Pricing']].map(([href, label]) => (
              <a key={href} href={href} className="block text-sm text-gray-300 hover:text-white py-3 border-b border-white/5 last:border-0 min-h-[44px] flex items-center" onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
            <div className="flex gap-3 pt-3">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center text-sm glass rounded-lg py-3 text-gray-300 min-h-[44px] flex items-center justify-center">Log in</Link>
              <Link to="/signup" onClick={() => setMenuOpen(false)} className="flex-1 text-center text-sm bg-orange-500 hover:bg-orange-400 text-black rounded-lg font-bold transition-colors min-h-[44px] flex items-center justify-center">Try it on a call</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ──
          One idea: the job you'd have lost, caught. Left-weighted editorial
          headline; the "text in your pocket" receipt is the single dominant
          visual. No particles, no typewriter, no fake live ticker. */}
      <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24">
        {/* single warm-to-cool wash, off-centre so the layout doesn't feel bilateral */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-32 -left-24 w-[42rem] h-[42rem] bg-blue-600/12 rounded-full blur-[130px]" />
          <div className="absolute top-24 right-[-8rem] w-[34rem] h-[34rem] bg-orange-500/8 rounded-full blur-[130px]" />
        </div>

        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Copy — 7 cols, deliberately wider than the visual */}
            <div className="lg:col-span-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400/90 mb-5">
                AI receptionist · built in Newcastle, for Australian tradies
              </p>
              <h1 className="text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-[4.75rem] lg:leading-[0.98] font-black tracking-tight">
                The call you can't
                <br className="hidden sm:block" /> take is the job
                <br className="hidden sm:block" /> <span className="text-orange-400">someone else takes.</span>
              </h1>
              <p className="mt-7 text-lg sm:text-xl text-gray-300 leading-relaxed max-w-xl">
                TradeDesk picks up while you're on the tools — answers as your business,
                quotes from your real prices, and texts you the lead before the caller's
                back in the car.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row gap-4 sm:items-center">
                <Link to="/signup"
                  className="btn-shimmer inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-black font-bold px-7 py-4 rounded-xl text-base transition-all min-h-[56px] relative overflow-hidden"
                  style={{ boxShadow: '0 0 30px rgba(249,115,22,0.35)' }}>
                  Put it on my line free for 7 days <ArrowRight size={18} />
                </Link>
                <a href="#calculator" className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors min-h-[44px]">
                  See what missed calls cost you
                  <ArrowRight size={14} className="text-orange-400" />
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><CheckCircle size={13} className="text-green-400" /> No card to start</span>
                <span className="flex items-center gap-1.5"><CheckCircle size={13} className="text-green-400" /> Live in 10 minutes</span>
                <span className="flex items-center gap-1.5"><CheckCircle size={13} className="text-green-400" /> Cancel any time</span>
              </div>
            </div>

            {/* Visual — 5 cols, offset upward so it breaks the centre line */}
            <div className="lg:col-span-5 lg:-mt-8">
              <MissedCallReceipt />
            </div>
          </div>
        </div>
      </section>

      {/* ── THE HONEST NUMBERS (what we can actually stand behind) ── */}
      <section className="border-y border-white/6 px-4" data-reveal>
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/6">
          {[
            { stat: '24/7', label: 'Answers, never sleeps' },
            { stat: 'Under 2s', label: 'To pick up a call' },
            { stat: '$0', label: 'Per-call fees, ever' },
            { stat: '~10 min', label: 'To go live' },
          ].map(({ stat, label }, i) => (
            <div key={stat} className={`py-7 text-center ${i === 0 ? '' : 'pl-4'} pr-4`}>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mb-1">{stat}</div>
              <div className="text-[11px] sm:text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── REVENUE CALCULATOR ──
          Asymmetric: a left-hand argument column beside the tool, not a
          centred eyebrow-headline-subhead stack like everything else. */}
      <section id="calculator" className="py-20 sm:py-28 px-4 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_30%_40%,rgba(59,130,246,0.06),transparent_70%)]" />
        <div className="max-w-6xl mx-auto relative grid lg:grid-cols-5 gap-10 lg:gap-14 items-start">
          <div className="lg:col-span-2 lg:sticky lg:top-28" data-reveal>
            <p className="text-orange-400 text-xs font-semibold uppercase tracking-[0.2em] mb-4">Do the maths</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.08]">
              The calls you miss<br />aren't free.
            </h2>
            <p className="text-gray-400 mt-5 leading-relaxed">
              Most tradies have never put a number on it. Drag the sliders — it's usually
              the most expensive habit on the job.
            </p>
            <p className="text-sm text-gray-500 mt-5">
              At $199/month flat, TradeDesk pays for itself the first time it saves one.
            </p>
          </div>
          <div className="lg:col-span-3" data-reveal data-reveal-delay="100"><RevenueCalculator /></div>
        </div>
      </section>

      {/* ── INDUSTRIES ──
          Hierarchy on purpose: the three trades we've written proper pages
          for are the loud cards (and the only links). Everyone else is an
          honest, non-linked run-on list — no dead "#" hrefs. */}
      <section className="py-16 sm:py-24 px-4 border-b border-white/6">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-xl mb-10" data-reveal>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Set up for the way your trade actually works</h2>
            <p className="text-gray-400 mt-3 leading-relaxed">
              The AI knows a burst pipe from a dripping tap, and a switchboard job from a
              new powerpoint — because you tell it your services and prices during setup.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4" data-reveal data-reveal-delay="100">
            {LEAD_INDUSTRIES.map(({ icon, label, benefit, href }) => (
              <Link key={label} to={href}
                className="group glass rounded-2xl p-6 border border-white/8 hover:border-orange-500/30 hover:bg-white/[0.03] transition-all duration-200 flex flex-col">
                <div className="text-3xl mb-4">{icon}</div>
                <h3 className="font-bold text-white text-lg mb-1.5">{label}</h3>
                <p className="text-sm text-gray-400 leading-relaxed flex-1">{benefit}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-orange-400 group-hover:gap-2.5 transition-all">
                  See how it works for {label.toLowerCase()}s <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-8 text-sm text-gray-500 leading-relaxed" data-reveal>
            <span className="text-gray-400">Also running on the line for</span>{' '}
            {OTHER_TRADES.join(', ')} — if you take calls and quote jobs, it fits.
          </p>
        </div>
      </section>

      {/* ── HOW THE CALL SOUNDS ── */}
      <section className="py-16 sm:py-20 px-4 relative">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 flex items-end justify-between gap-4 flex-wrap" data-reveal>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Don't take our word for it — read the call</h2>
              <p className="text-gray-500 mt-2 text-sm">Pick a job. This is what your caller actually hears.</p>
            </div>
          </div>
          <div data-reveal data-reveal-delay="100"><CallTranscriptDemo /></div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-16 sm:py-24 px-4 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.04),transparent_70%)]" />
        <div className="max-w-6xl mx-auto relative">
          <div className="max-w-lg mb-12 sm:mb-16" data-reveal>
            <p className="text-orange-400 text-xs font-semibold uppercase tracking-[0.2em] mb-3">Setup</p>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">On the tools by morning tea, live by lunch</h2>
            <p className="text-gray-400 mt-3 leading-relaxed">No hardware, no IT bloke. You forward your missed calls to a number we hand you — that's the hard part, and it takes two minutes.</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="space-y-0" data-reveal>
              {[
                { time: '0:00', label: 'Sign up', desc: 'Create your account — takes 60 seconds', icon: '✍️' },
                { time: '2:00', label: 'Enter your details', desc: 'Business name, trade, services and pricing guide', icon: '📋' },
                { time: '5:00', label: 'Get your number', desc: 'Your dedicated TradeDesk number is generated instantly', icon: '📞' },
                { time: '7:00', label: 'Forward your calls', desc: 'Set missed call forwarding on your phone — 2 minutes', icon: '📲' },
                { time: '10:00', label: "You're live!", desc: "AI is answering calls. First SMS summary within minutes", icon: '🚀' },
              ].map((s, i, arr) => (
                <div key={i} className="flex gap-4 pb-6 last:pb-0 relative">
                  {i < arr.length - 1 && <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/50 to-transparent" />}
                  <div className="flex-shrink-0 flex flex-col items-center gap-1">
                    <div className="w-10 h-10 glass rounded-xl flex items-center justify-center text-lg border border-white/10 relative z-10 bg-[#080c14]">{s.icon}</div>
                    <span className="text-[10px] text-blue-400 font-mono font-bold">{s.time}</span>
                  </div>
                  <div className="flex-1 pt-1.5 min-w-0">
                    <p className="font-semibold text-white text-sm">{s.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4" data-reveal data-reveal-delay="100">
              {[
                { platform: '📱 iPhone', steps: ['Settings → Phone → Call Forwarding', 'Toggle Call Forwarding ON', 'Enter the TradeDesk number from your dashboard'] },
                { platform: '🤖 Android', steps: ['Phone app → ⋮ → Settings → Supplementary services', 'Call forwarding → Forward when unanswered', 'Enter the TradeDesk number from your dashboard'] },
              ].map(({ platform, steps }) => (
                <div key={platform} className="glass rounded-xl sm:rounded-2xl p-5 border border-white/8">
                  <h3 className="font-bold text-white mb-3 text-sm">{platform}</h3>
                  <ol className="space-y-2 text-xs sm:text-sm text-gray-300">
                    {steps.map((s, i) => (
                      <li key={i} className="flex gap-2"><span className="text-orange-400 font-bold w-4 flex-shrink-0">{i + 1}.</span><span>{s}</span></li>
                    ))}
                  </ol>
                </div>
              ))}
              <div className="flex items-start gap-3 glass border border-red-500/20 rounded-xl sm:rounded-2xl p-4">
                <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white mb-1 text-sm">Emergencies handled first</p>
                  <p className="text-xs text-gray-400">Urgent calls get flagged immediately — you get an urgent SMS alert to your mobile, e.g. <span className="text-white font-mono">0412 345 678</span>.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── EARLY USERS ──
          Honest for a young product: named early users, no invented aggregate
          counts, no "verified" theatre, no five-star grid. One dominant
          pull-quote, offset, with two shorter notes stacked beside it. */}
      <section className="py-16 sm:py-24 px-4 relative">
        <div className="max-w-5xl mx-auto relative">
          <div className="mb-10 flex items-baseline gap-3 flex-wrap" data-reveal>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">From the first tradies on it</h2>
            <span className="text-xs text-gray-500 border border-white/10 rounded-full px-2.5 py-1">Early access · Newcastle & NSW</span>
          </div>

          <div className="grid lg:grid-cols-5 gap-5 lg:gap-6 items-start">
            {/* Featured pull-quote — spans 3 cols, larger type */}
            <figure className="lg:col-span-3 relative glass rounded-2xl border border-orange-500/20 p-7 sm:p-9"
              style={{ background: 'linear-gradient(160deg,rgba(249,115,22,0.06) 0%,rgba(8,12,20,0.5) 55%)' }}
              data-reveal>
              <span className="absolute top-5 right-6 text-6xl leading-none text-orange-500/25 font-serif select-none" aria-hidden="true">&rdquo;</span>
              <blockquote className="text-xl sm:text-2xl font-medium text-white leading-snug relative">
                I was up a ladder when it rang. By the time I was down, there was a text
                on my phone with the bloke's name, the job, and the price I'd have quoted
                anyway. That's a call I'd normally have lost.
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 text-sm">
                <span className="w-9 h-9 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center font-bold text-orange-300 flex-shrink-0">M</span>
                <span><span className="text-white font-semibold">Marcus W.</span><span className="text-gray-500"> · Plumber, Merewether NSW</span></span>
              </figcaption>
            </figure>

            {/* Two shorter notes stacked */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              <figure className="glass rounded-2xl border border-white/8 p-6" data-reveal data-reveal-delay="100">
                <blockquote className="text-sm text-gray-300 leading-relaxed">
                  Had it forwarding my calls before smoko. Now I check the phone between
                  jobs and there's a proper list of who rang and what they wanted.
                </blockquote>
                <figcaption className="mt-4 text-xs text-gray-500">
                  <span className="text-white font-medium">Tanya K.</span> · Electrician, Sydney
                </figcaption>
              </figure>
              <figure className="glass rounded-2xl border border-white/8 p-6" data-reveal data-reveal-delay="200">
                <blockquote className="text-sm text-gray-300 leading-relaxed">
                  Reckon a couple of customers didn't even clock it wasn't a person. It
                  gives a straight answer and passes the reno enquiry straight to me.
                </blockquote>
                <figcaption className="mt-4 text-xs text-gray-500">
                  <span className="text-white font-medium">Brett S.</span> · Builder, Melbourne
                </figcaption>
              </figure>
            </div>
          </div>
          <p className="mt-6 text-xs text-gray-600 max-w-xl" data-reveal>
            Early-access tradies, quoted with permission. TradeDesk is new — we'd rather show you a
            handful of real first weeks than a wall of numbers we can't stand behind yet.
          </p>
        </div>
      </section>

      {/* ── FEATURES (editorial bento) ── */}
      <section id="features" className="py-16 sm:py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05),transparent_70%)]" />
        <div className="max-w-6xl mx-auto relative">
          <div className="max-w-2xl mb-12 sm:mb-16" data-reveal>
            <p className="text-orange-400 text-xs font-semibold uppercase tracking-[0.2em] mb-3">Everything included</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.1]">One flat fee. The whole front desk.</h2>
            <p className="text-gray-400 mt-4 text-base leading-relaxed">No per-call charges. No setup fees. No surprises — just an AI that answers, quotes, books and follows up while you're on the tools.</p>
          </div>

          {/* Asymmetric bento grid — deliberately not six identical cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[minmax(0,auto)]">

            {/* Hero tile — spans 2 cols on desktop */}
            <div className="sm:col-span-2 lg:col-span-2 lg:row-span-2 relative overflow-hidden rounded-2xl border border-blue-500/20 p-6 sm:p-8 flex flex-col group"
              style={{ background: 'linear-gradient(150deg,rgba(59,130,246,0.10) 0%,rgba(10,15,30,0.6) 55%,rgba(8,12,20,0.6) 100%)' }}
              data-reveal>
              <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full pointer-events-none opacity-70"
                style={{ background: 'radial-gradient(circle,rgba(59,130,246,0.14) 0%,transparent 70%)' }} />
              <div className="relative flex items-center gap-2 text-[11px] font-semibold text-blue-400 uppercase tracking-widest mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> The core
              </div>
              <div className="relative w-12 h-12 bg-blue-500/15 border border-blue-500/25 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Phone size={22} className="text-blue-400" />
              </div>
              <h3 className="relative text-2xl font-bold text-white mb-2.5">Answers every call in under 2 seconds</h3>
              <p className="relative text-sm sm:text-base text-gray-400 leading-relaxed max-w-md">
                Nights, weekends, smoko, Christmas Day — your business never sends anyone to voicemail again.
                The AI greets callers as your business, handles the conversation naturally, and never puts anyone on hold.
              </p>
              <div className="relative flex flex-wrap gap-2 mt-6">
                {['Sounds local', 'Never sleeps', 'No hold music'].map(t => (
                  <span key={t} className="text-xs text-gray-300 bg-white/5 border border-white/10 rounded-full px-3 py-1">{t}</span>
                ))}
              </div>
            </div>

            {/* SMS summaries — the warm accent moment (the "you get the lead" payoff) */}
            <div className="relative overflow-hidden rounded-2xl border border-orange-500/25 p-6 group hover:-translate-y-1 transition-transform duration-300"
              style={{ background: 'linear-gradient(150deg,rgba(249,115,22,0.08) 0%,rgba(8,12,20,0.6) 60%)' }}
              data-reveal data-reveal-delay="100">
              <div className="w-11 h-11 bg-orange-500/15 border border-orange-500/25 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageSquare size={19} className="text-orange-400" />
              </div>
              <h3 className="font-bold text-white mb-2 text-base">A text the second they hang up</h3>
              <p className="text-sm text-gray-400 leading-relaxed">Caller's name, number, what they need and the quote given — in your pocket before they've walked back to their ute.</p>
            </div>

            {/* Accurate quotes */}
            <div className="glass rounded-2xl p-6 border border-white/8 hover:border-white/15 hover:bg-white/[0.03] hover:-translate-y-1 transition-all duration-300 group cursor-default"
              data-reveal data-reveal-delay="200">
              <div className="w-11 h-11 bg-blue-500/12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <DollarSign size={19} className="text-blue-400" />
              </div>
              <h3 className="font-bold text-white mb-2 text-base">Quotes from your real prices</h3>
              <p className="text-sm text-gray-400 leading-relaxed">The AI reads off your pricing guide — spot-on estimates, never a made-up number.</p>
            </div>

            {/* Bottom row: three lean tiles */}
            {[
              { icon: Clock, title: 'Missed-call text-back', desc: 'Unanswered call? The caller gets a friendly text within 60 seconds — before they ring the next bloke.' },
              { icon: Mail, title: 'Email auto-reply', desc: 'Connect Gmail and enquiry emails get answered with your pricing and availability, automatically.' },
              { icon: FileText, title: 'Every word, searchable', desc: 'Full transcripts of every call, saved and searchable in your dashboard. No more "what did they say again?"' },
            ].map(({ icon: Icon, title, desc }, idx) => (
              <div key={title}
                className="glass rounded-2xl p-6 border border-white/8 hover:border-white/15 hover:bg-white/[0.03] hover:-translate-y-1 transition-all duration-300 group cursor-default"
                data-reveal data-reveal-delay={`${((idx + 1) % 3) * 100}` as any}>
                <div className="w-11 h-11 bg-blue-500/12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon size={19} className="text-blue-400" />
                </div>
                <h3 className="font-bold text-white mb-2 text-base">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className="py-14 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3" data-reveal>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">The honest comparison</h2>
              <p className="text-gray-500 mt-2 text-sm">Flat $199/mo against a human's wage, sick days, and per-call rivals.</p>
            </div>
            <Link to="/compare/talkmate" className="inline-flex items-center gap-1.5 text-sm text-orange-400 hover:text-orange-300 transition-colors flex-shrink-0">
              <ExternalLink size={13} /> Full breakdown vs TalkMate
            </Link>
          </div>
          <div className="hidden sm:block glass rounded-2xl overflow-hidden border border-white/10" data-reveal>
            <div className="grid grid-cols-4 text-sm font-semibold border-b border-white/10">
              <div className="py-4 px-4 text-gray-500 pl-6">Feature</div>
              <div className="py-4 px-2 bg-blue-500/10 border-x border-blue-500/20 text-blue-400 flex items-center justify-center gap-1 text-xs"><Zap size={12} /> TradeDesk</div>
              <div className="py-4 px-2 text-gray-500 text-center text-xs">Human receptionist</div>
              <div className="py-4 px-2 text-gray-500 text-center text-xs">AI competitors</div>
            </div>
            {COMPARE_ROWS.map(({ label, td, hr, comp }, i) => (
              <div key={label} className={`grid grid-cols-4 text-xs border-b border-white/5 last:border-0 ${i % 2 !== 0 ? 'bg-white/[0.015]' : ''}`}>
                <div className="py-3.5 px-4 text-gray-400 pl-6">{label}</div>
                <div className="py-3.5 px-2 bg-blue-500/5 border-x border-blue-500/10 flex items-center justify-center gap-1 text-white font-medium text-center">
                  {td.startsWith('✓') && <CheckCircle size={12} className="text-green-400 flex-shrink-0" />}
                  <span>{td.replace('✓ ', '').replace('✗ ', '')}</span>
                </div>
                <div className="py-3.5 px-2 flex items-center justify-center gap-1 text-gray-500 text-center">
                  {hr.startsWith('✗') && <XCircle size={12} className="text-red-400/70 flex-shrink-0" />}
                  <span>{hr.replace('✗ ', '')}</span>
                </div>
                <div className="py-3.5 px-2 flex items-center justify-center gap-1 text-gray-500 text-center">
                  {comp.startsWith('✗') && <XCircle size={12} className="text-red-400/70 flex-shrink-0" />}
                  <span>{comp.replace('✗ ', '')}</span>
                </div>
              </div>
            ))}
          </div>
          {/* Mobile */}
          <div className="sm:hidden space-y-3" data-reveal>
            {COMPARE_ROWS.map(({ label, td, hr, comp }) => (
              <div key={label} className="glass rounded-xl p-4 border border-white/8">
                <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">{label}</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-blue-500/10 rounded-lg p-2.5 border border-blue-500/20 text-center">
                    <p className="text-[10px] text-blue-400 font-semibold mb-1">TradeDesk</p>
                    <p className="text-white font-medium leading-tight">{td.replace('✓ ', '').replace('✗ ', '')}</p>
                  </div>
                  <div className="bg-white/3 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-gray-500 font-semibold mb-1">Human</p>
                    <p className="text-gray-400 leading-tight">{hr.replace('✗ ', '').replace('✓ ', '')}</p>
                  </div>
                  <div className="bg-white/3 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-gray-500 font-semibold mb-1">Rivals</p>
                    <p className="text-gray-400 leading-tight">{comp.replace('✗ ', '').replace('✓ ', '')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-16 sm:py-24 px-4 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_100%,rgba(59,130,246,0.07),transparent_70%)]" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-10 sm:mb-16" data-reveal>
            <p className="text-orange-400 text-xs font-semibold uppercase tracking-[0.2em] mb-3">Pricing</p>
            <h2 className="text-2xl sm:text-4xl font-bold">One plan. No maths required.</h2>
            <p className="text-gray-500 mt-3 text-sm">Everything's included. No per-call charges, no setup fees, no lock-in.</p>
            <div className="inline-flex items-center gap-2 glass border border-orange-500/30 rounded-full px-4 py-2 text-sm text-orange-400 font-medium mt-4" style={{ background: 'rgba(249,115,22,0.05)' }}>
              <DollarSign size={14} /> Costs less than one job you'd have missed
            </div>
          </div>
          <div className="max-w-md mx-auto w-full" data-reveal>
            <div className="relative pricing-card-glow rounded-2xl">
              <div className="absolute -inset-px bg-gradient-to-b from-blue-500/50 via-blue-500/20 to-transparent rounded-2xl" />
              <div className="relative glass rounded-2xl p-6 sm:p-8">
                <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">TradeDesk Pro</h3>
                    <p className="text-sm text-gray-400">Everything you need, covered 24/7</p>
                  </div>
                  <div className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-500/30">Everything in one</div>
                </div>
                <div className="mb-5">
                  <div className="flex items-end gap-1">
                    <span className="text-5xl font-extrabold text-white">$199</span>
                    <span className="text-gray-500 mb-2">/month AUD</span>
                  </div>
                  <p className="text-sm text-gray-500">Billed monthly · cancel any time · no lock-in</p>
                </div>
                <ul className="space-y-3 mb-7">
                  {[
                    'AI answers unlimited calls, 24/7',
                    'Australian English voice — sounds local',
                    'SMS summary after every single call',
                    'Emergency detection + urgent SMS alert',
                    'Missed call text-back within 60 seconds',
                    'Full call transcripts + searchable dashboard',
                    'Gmail email auto-reply',
                    'Two-way SMS inbox',
                    'Auto CRM — contacts from callers',
                    'Google Sheets + Calendar integration',
                    'No per-call fees. Ever.',
                  ].map((f, i) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-gray-300 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                      <CheckCircle size={15} className="text-green-400 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/signup"
                  className="btn-shimmer flex items-center justify-center gap-2 w-full bg-orange-500 hover:bg-orange-400 text-black font-bold py-4 rounded-xl transition-all min-h-[52px] relative overflow-hidden"
                  style={{ boxShadow: '0 0 20px rgba(249,115,22,0.35)' }}>
                  Put it on my line free for 7 days <ArrowRight size={16} />
                </Link>
                <p className="text-center text-xs text-gray-600 mt-3">No credit card required · cancel any time</p>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-3 glass rounded-xl px-4 py-4 border border-orange-500/25" style={{ background: 'rgba(249,115,22,0.05)' }}>
              <CheckCircle size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-400 leading-relaxed">
                <span className="text-white font-semibold">The risk is on us.</span>{' '}
                7 days free, then a 30-day money-back guarantee. If TradeDesk doesn't pay for itself, you get every cent back — no questions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 sm:mb-10" data-reveal>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Fair questions, straight answers</h2>
          </div>
          <div className="space-y-3" data-reveal>
            {FAQS.map(f => <FAQItem key={f.q} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 sm:py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,rgba(249,115,22,0.10),transparent_70%)]" />
        <div className="max-w-3xl mx-auto text-center relative" data-reveal>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-5 leading-[1.05]">
            Next time it rings and you<br className="hidden sm:block" /> can't pick up,{' '}
            <span className="text-orange-400">it's handled.</span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg mb-10 max-w-xl mx-auto">
            Forward your calls this arvo and TradeDesk is answering by tonight. Under ten minutes to set up.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
            <Link to="/signup"
              className="btn-shimmer inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-black font-bold px-8 py-4 rounded-xl text-base transition-all min-h-[52px] relative overflow-hidden"
              style={{ boxShadow: '0 0 26px rgba(249,115,22,0.4)' }}>
              Put it on my line free for 7 days <ArrowRight size={18} />
            </Link>
            <p className="text-sm text-gray-600 flex items-center justify-center">No card · cancel any time</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/8 py-12 sm:py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="glass rounded-2xl p-6 border border-white/8 mb-10 flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
            <div>
              <p className="font-semibold text-white text-sm mb-1">💌 Tradie tips & updates</p>
              <p className="text-xs text-gray-500">Monthly tips on winning more jobs. No spam.</p>
            </div>
            <div className="flex-shrink-0"><NewsletterSignup /></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center"><Zap size={13} className="text-white" /></div>
                <span className="font-bold text-white">TradeDesk</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-3">AI receptionist for Australian tradies. Never miss a lead.</p>
              <p className="text-xs text-gray-700">Made in Newcastle, NSW 🇦🇺</p>
              <a href="mailto:hello@tradedesk.com.au" className="text-xs text-gray-600 hover:text-blue-400 transition-colors mt-2 block">hello@tradedesk.com.au</a>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Product</p>
              <div className="space-y-2.5">
                {[['#features', 'Features'], ['#pricing', 'Pricing'], ['/demo', 'Demo'], ['#calculator', 'Calculator']].map(([href, label]) => (
                  <a key={href} href={href} className="block text-sm text-gray-600 hover:text-white transition-colors">{label}</a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Company</p>
              <div className="space-y-2.5">
                <Link to="/about" className="block text-sm text-gray-600 hover:text-white transition-colors">About us</Link>
                <Link to="/blog" className="block text-sm text-gray-600 hover:text-white transition-colors">Blog</Link>
                <Link to="/compare/talkmate" className="block text-sm text-gray-600 hover:text-white transition-colors">vs TalkMate</Link>
                <Link to="/contact" className="block text-sm text-gray-600 hover:text-white transition-colors">Contact</Link>
                <span className="block text-sm text-gray-700">Newcastle NSW 2300</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Legal</p>
              <div className="space-y-2.5">
                <Link to="/privacy" className="block text-sm text-gray-600 hover:text-white transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="block text-sm text-gray-600 hover:text-white transition-colors">Terms of Service</Link>
                <Link to="/login" className="block text-sm text-gray-600 hover:text-white transition-colors">Log in</Link>
                <Link to="/signup" className="block text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium">Free trial →</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/6 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-700">© 2026 TradeDesk · Newcastle NSW 2300</p>
            <div className="flex gap-4">
              <Link to="/privacy" className="text-xs text-gray-700 hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms" className="text-xs text-gray-700 hover:text-white transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Sticky mobile CTA ── */}
      <div className={`fixed bottom-0 inset-x-0 z-40 md:hidden transition-all duration-300 ${showScrollCTA ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        <div className="bg-[#080c14]/97 backdrop-blur-md border-t border-white/10 px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">7 days free, no card</p>
            <p className="text-xs text-gray-500">Live on your line in 10 minutes</p>
          </div>
          <Link to="/signup" className="btn-shimmer flex-shrink-0 bg-orange-500 hover:bg-orange-400 text-black font-bold px-5 py-3 rounded-xl text-sm transition-all min-h-[44px] flex items-center relative overflow-hidden">
            Set it up
          </Link>
        </div>
      </div>

      {/* ── Back to top ── */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        className={`fixed bottom-24 right-4 md:bottom-6 z-40 w-11 h-11 glass rounded-full border border-white/15 flex items-center justify-center text-gray-400 hover:text-white hover:border-blue-500/40 hover:bg-blue-500/10 transition-all duration-300 shadow-lg ${showBackTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <ArrowUp size={16} />
      </button>

      {/* ── Cookie banner ── */}
      {!cookieDismissed && (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-[#080c14]/98 backdrop-blur-md border-t border-white/10 px-4 py-4">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
            <p className="text-xs text-gray-400 flex-1">
              We use cookies to improve your experience. By continuing, you agree to our{' '}
              <Link to="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link>.
            </p>
            <div className="flex gap-3 flex-shrink-0 w-full sm:w-auto">
              <button onClick={dismissCookie} className="flex-1 sm:flex-none text-xs text-gray-500 hover:text-white transition-colors px-3 py-2 min-h-[44px]">Decline</button>
              <button onClick={dismissCookie} className="flex-1 sm:flex-none text-xs bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors font-medium min-h-[44px]">Accept</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
