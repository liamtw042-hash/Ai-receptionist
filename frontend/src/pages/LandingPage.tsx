import { Link } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Phone, MessageSquare, Mail, Clock, FileText, Zap,
  CheckCircle, XCircle, ArrowRight, Menu, X, Star, AlertTriangle,
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

// Ripple on click
function useRipple(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const circle = document.createElement('span');
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      circle.className = 'ripple-circle pointer-events-none absolute rounded-full bg-white/20';
      circle.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px;`;
      el.appendChild(circle);
      circle.addEventListener('animationend', () => circle.remove());
    };
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [ref]);
}

/* ──────────────────────────────────────
   SCROLL PROGRESS BAR
   ────────────────────────────────────── */
function ScrollProgress() {
  useEffect(() => {
    const bar = document.getElementById('scroll-progress');
    const onScroll = () => {
      const h = document.documentElement;
      const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
      if (bar) bar.style.width = pct + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <div id="scroll-progress" />;
}

/* ──────────────────────────────────────
   PARTICLE CANVAS
   ────────────────────────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = canvas.width = canvas.offsetWidth;
    let H = canvas.height = canvas.offsetHeight;

    const COUNT = Math.min(55, Math.floor(W / 22));
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: 1.2 + Math.random() * 1.5,
    }));

    const LINK_DIST = 120;
    let raf: number;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99,179,237,0.5)';
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(99,179,237,${(1 - dist / LINK_DIST) * 0.18})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    const onResize = () => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-40" />;
}

/* ──────────────────────────────────────
   TYPEWRITER HEADLINE
   ────────────────────────────────────── */
const HEADLINE_LINES = [
  'Every missed call',
  'is a job they',
  'gave away.',
];

function TypewriterHeadline() {
  const [displayed, setDisplayed] = useState('');
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);
  const fullText = HEADLINE_LINES.join('\n');

  useEffect(() => {
    if (done) return;
    if (charIdx < fullText.length) {
      const t = setTimeout(() => setCharIdx(c => c + 1), 28);
      return () => clearTimeout(t);
    } else {
      setDone(true);
    }
  }, [charIdx, fullText, done]);

  useEffect(() => {
    setDisplayed(fullText.slice(0, charIdx));
  }, [charIdx, fullText]);

  return (
    <h1 className="text-4xl sm:text-5xl lg:text-[5.5rem] xl:text-[6.5rem] font-black tracking-tight leading-[1.03] mb-5 whitespace-pre-line">
      {displayed.split('\n').map((line, i) => (
        <span key={i} className={`block ${i === 2 ? 'text-gradient' : 'text-white'}`}>{line}</span>
      ))}
      {!done && <span className="typewriter-cursor" />}
    </h1>
  );
}

/* ──────────────────────────────────────
   LIVE ACTIVITY TICKER
   ────────────────────────────────────── */
const ACTIVITIES = [
  { trade: "Dave's Plumbing", city: 'Sydney', job: 'burst pipe job — $280' },
  { trade: "Spark Electric", city: 'Brisbane', job: 'safety switch install — $220' },
  { trade: "BuildRight Co", city: 'Melbourne', job: 'deck quote — $4,200' },
  { trade: "Kowalski Painting", city: 'Adelaide', job: 'exterior repaint — $3,800' },
  { trade: "ProRoof Solutions", city: 'Perth', job: 'leak repair — $450' },
  { trade: "GreenThumb Landscapes", city: 'Gold Coast', job: 'garden design — $1,200' },
  { trade: "FrostAir HVAC", city: 'Canberra', job: 'AC installation — $1,400' },
  { trade: "ClearPath Concreting", city: 'Hobart', job: 'driveway slab — $5,500' },
];

function LiveActivityTicker() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % ACTIVITIES.length);
        setVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const a = ACTIVITIES[idx];
  return (
    <div className="flex items-center gap-2.5 glass border border-green-500/20 rounded-full px-4 py-2 text-xs overflow-hidden max-w-full">
      <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0 animate-pulse" />
      <span
        className="text-gray-300 transition-all duration-400 truncate"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(-6px)' }}
      >
        <span className="text-white font-medium">{a.trade}</span> in {a.city} just booked a {a.job}
      </span>
    </div>
  );
}

/* ──────────────────────────────────────
   FLOATING CHAT WIDGET
   ────────────────────────────────────── */
function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <div className="chat-widget">
      {open && (
        <div className="mb-3 glass rounded-2xl border border-white/12 w-72 shadow-2xl overflow-hidden animate-slide-up exit-intent">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 bg-blue-500/10">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Zap size={14} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">TradeDesk Support</p>
              <p className="text-xs text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> Online</p>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto text-gray-500 hover:text-white"><X size={15} /></button>
          </div>
          <div className="px-4 py-4 min-h-[80px]">
            {sent ? (
              <p className="text-sm text-green-400 flex items-center gap-2"><CheckCircle size={15} /> Got it! We'll reply within 2 hours.</p>
            ) : (
              <p className="text-sm text-gray-400">G'day! Questions about TradeDesk? Ask away and we'll get back to you fast.</p>
            )}
          </div>
          {!sent && (
            <div className="px-3 pb-3 flex gap-2">
              <input
                value={msg}
                onChange={e => setMsg(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && msg.trim()) setSent(true); }}
                placeholder="Type a message…"
                className="flex-1 glass rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 min-h-[40px]"
              />
              <button
                onClick={() => { if (msg.trim()) setSent(true); }}
                className="bg-blue-500 hover:bg-blue-400 text-white rounded-lg px-3 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <Send size={14} />
              </button>
            </div>
          )}
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 bg-blue-500 hover:bg-blue-400 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/40 transition-all hover:scale-110 relative"
      >
        {open ? <X size={22} className="text-white" /> : <MessageSquare size={22} className="text-white" />}
        {!open && <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-black" />}
      </button>
    </div>
  );
}

/* ──────────────────────────────────────
   EXIT INTENT POPUP
   ────────────────────────────────────── */
function ExitIntentPopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
      <div className="exit-intent glass rounded-2xl border border-amber-500/30 max-w-sm w-full p-8 text-center relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-white" aria-label="Close"><X size={18} /></button>
        <div className="w-14 h-14 bg-amber-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Phone size={26} className="text-amber-400" />
        </div>
        <p className="text-xs text-amber-400 font-semibold uppercase tracking-widest mb-2">Before you go</p>
        <h3 className="text-2xl font-black text-white mb-3">How many jobs walked past today?</h3>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          Every missed call while you're on the tools is a job someone else picks up.
          Try TradeDesk free for 7 days — no card, cancel any time.
        </p>
        <Link to="/signup" onClick={onClose}
          className="btn-shimmer flex items-center justify-center gap-2 w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3.5 rounded-xl transition-all min-h-[52px]"
          style={{ boxShadow: '0 0 20px rgba(59,130,246,0.35)' }}>
          Start my free trial <ArrowRight size={16} />
        </Link>
        <button onClick={onClose} className="mt-3 text-xs text-gray-600 hover:text-gray-400 transition-colors">Not right now</button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   PHONE FRAME
   ────────────────────────────────────── */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto" style={{ width: 262 }}>
      {/* Glow behind */}
      <div className="absolute -inset-6 bg-blue-500/12 rounded-[60px] blur-3xl" />
      <div className="relative bg-gray-900 rounded-[40px] p-2.5 border-2 border-white/15 shadow-2xl shadow-black/60">
        {/* Notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10" />
        {/* Side buttons */}
        <div className="absolute left-[-3px] top-20 w-1 h-8 bg-gray-700 rounded-l-md" />
        <div className="absolute left-[-3px] top-32 w-1 h-8 bg-gray-700 rounded-l-md" />
        <div className="absolute right-[-3px] top-24 w-1 h-12 bg-gray-700 rounded-r-md" />
        <div className="relative bg-[#0a0f1e] rounded-[32px] overflow-hidden" style={{ height: 490 }}>
          <div className="flex items-center justify-between px-5 pt-9 pb-2 text-[10px] text-gray-400">
            <span>9:41</span>
            <span className="flex items-center gap-1 text-green-400 font-medium text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />LIVE
            </span>
          </div>
          <div className="px-3 pb-3 flex flex-col h-[calc(100%-40px)]">{children}</div>
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
          className="btn-shimmer inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold px-7 py-3.5 rounded-xl transition-all w-full sm:w-auto text-sm sm:text-base min-h-[52px] relative overflow-hidden"
          style={{ boxShadow: '0 0 20px rgba(59,130,246,0.35)' }}>
          Stop the bleeding — start free <ArrowRight size={16} />
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
const INDUSTRIES = [
  { icon: '🔧', label: 'Plumber', benefit: 'Quote burst pipes & hot water jobs instantly', href: '/industries/plumbers' },
  { icon: '⚡', label: 'Electrician', benefit: 'Handle safety switch calls 24/7', href: '/industries/electricians' },
  { icon: '🏗️', label: 'Builder', benefit: 'Capture renovation enquiries while on site', href: '/industries/builders' },
  { icon: '🪚', label: 'Carpenter', benefit: 'Book deck and cabinet consultations', href: '#' },
  { icon: '🎨', label: 'Painter', benefit: 'Give quote estimates without stopping work', href: '#' },
  { icon: '🌿', label: 'Landscaper', benefit: 'Book design consultations automatically', href: '#' },
  { icon: '🏠', label: 'Roofer', benefit: 'Handle urgent leak calls around the clock', href: '#' },
  { icon: '🔲', label: 'Tiler', benefit: 'Take bathroom job enquiries anytime', href: '#' },
  { icon: '🔑', label: 'Locksmith', benefit: 'Answer lockout emergencies in seconds', href: '#' },
  { icon: '❄️', label: 'HVAC', benefit: 'Book AC service calls in peak season', href: '#' },
  { icon: '🐜', label: 'Pest Control', benefit: 'Capture infestation calls before competitors', href: '#' },
  { icon: '🧱', label: 'Concreter', benefit: 'Quote driveway and slab jobs on the fly', href: '#' },
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
  const [exitIntent, setExitIntent] = useState(false);
  const [exitShown, setExitShown] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const primaryCTA = useRef<HTMLAnchorElement>(null);

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

  // Typing indicator
  useEffect(() => {
    const t = setTimeout(() => setShowTyping(true), 5000);
    return () => clearTimeout(t);
  }, []);

  // Exit intent
  useEffect(() => {
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 5 && !exitShown) {
        setExitIntent(true);
        setExitShown(true);
      }
    };
    document.addEventListener('mouseleave', onMouseLeave);
    return () => document.removeEventListener('mouseleave', onMouseLeave);
  }, [exitShown]);

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
      <ScrollProgress />
      <div className="noise-overlay" aria-hidden="true" />

      {/* ── Exit Intent ── */}
      {exitIntent && <ExitIntentPopup onClose={() => setExitIntent(false)} />}

      {/* ── Top border ── */}
      <div className="fixed top-0 inset-x-0 h-0.5 bg-gradient-to-r from-blue-600 via-blue-400 to-amber-400 z-[9997]" />

      {/* ── NAV ── */}
      <nav className={`fixed top-0.5 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/90 backdrop-blur-md border-b border-white/8 shadow-xl shadow-black/20' : ''}`}>
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
            <Link to="/signup" ref={primaryCTA as any}
              className="btn-shimmer text-sm font-semibold bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg transition-all relative overflow-hidden"
              style={{ boxShadow: '0 0 16px rgba(59,130,246,0.35)' }}>
              Try it free
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
              <Link to="/signup" onClick={() => setMenuOpen(false)} className="flex-1 text-center text-sm bg-blue-500 hover:bg-blue-400 rounded-lg font-semibold transition-colors min-h-[44px] flex items-center justify-center">Try it free</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <ParticleCanvas />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:60px_60px] opacity-20 sm:opacity-25" />
        <div className="hero-gradient-bg absolute inset-0 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-full max-w-2xl h-96 pointer-events-none" style={{ animation: 'hero-pulse 4s ease-in-out infinite' }}>
          <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-5 py-16 sm:py-20">
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="text-center lg:text-left order-1">
              <div className="inline-flex items-center gap-2 glass border border-blue-500/30 rounded-full px-3 sm:px-4 py-1.5 text-xs text-blue-400 font-medium mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                🇦🇺 Built for Australian tradies · Live in 10 minutes
              </div>

              {/* Live activity */}
              <div className="mb-5 flex justify-center lg:justify-start">
                <LiveActivityTicker />
              </div>

              <TypewriterHeadline />

              <p className="text-base sm:text-lg lg:text-xl text-gray-400 mb-4 leading-relaxed max-w-lg mx-auto lg:mx-0">
                TradeDesk answers in under 2 seconds, gives callers your actual quotes, books jobs — and texts you a summary. While you're on the tools.
              </p>
              <p className="inline-flex items-center gap-2 text-sm text-amber-300/90 mb-8 font-medium">
                <DollarSign size={14} className="text-amber-400 flex-shrink-0" />
                One recovered job usually covers the <strong className="text-amber-400">whole month.</strong>
              </p>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-center lg:justify-start">
                <Link to="/signup"
                  className="btn-shimmer inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-bold px-8 py-4 rounded-xl text-base lg:text-lg transition-all min-h-[56px] relative overflow-hidden"
                  style={{ boxShadow: '0 0 32px rgba(59,130,246,0.45)' }}>
                  Start 7-day free trial <ArrowRight size={18} />
                </Link>
                <a href="#calculator" className="flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group min-h-[44px] px-2">
                  <DollarSign size={15} className="text-blue-400" />
                  Calculate your losses first
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-7 text-xs text-gray-600 justify-center lg:justify-start">
                <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-400" /> No credit card</span>
                <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-400" /> Cancel any time</span>
                <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-400" /> 30-day money back</span>
              </div>
            </div>

            {/* Phone */}
            <div className="flex justify-center order-2 animate-fade-in w-full">
              <PhoneFrame>
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/8 flex-shrink-0">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Zap size={10} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold text-white">TradeDesk AI</p>
                    <p className="text-[9px] text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" /> Answering · 0412 345 678</p>
                  </div>
                </div>
                <div className="space-y-2 flex-1 overflow-hidden">
                  {[
                    { role: 'ai' as const, text: "G'day! You've reached Smith's Plumbing. Dave's on a job — I'm his AI receptionist. How can I help?" },
                    { role: 'caller' as const, text: "I've got a burst pipe in the kitchen. Water everywhere." },
                  ].map((b, i) => (
                    <div key={i} className={`flex ${b.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[88%] px-3 py-2 rounded-2xl text-[11px] leading-relaxed ${b.role === 'ai' ? 'bg-blue-500/25 text-blue-100 rounded-tl-sm border border-blue-500/20' : 'bg-white/10 text-gray-200 rounded-tr-sm'}`}>
                        <p className="text-[9px] opacity-50 mb-0.5">{b.role === 'ai' ? 'TradeDesk AI' : 'Caller'}</p>
                        {b.text}
                      </div>
                    </div>
                  ))}
                  {showTyping ? (
                    <div className="flex justify-start animate-fade-in">
                      <div className="bg-blue-500/25 text-blue-100 rounded-2xl rounded-tl-sm border border-blue-500/20 px-3 py-2 max-w-[88%] text-[11px]">
                        <p className="text-[9px] opacity-50 mb-0.5">TradeDesk AI</p>
                        Turn off your mains now. Burst pipe is $180–$320. Dave calls you back in 30 min — name and number?
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div className="bg-blue-500/25 rounded-2xl rounded-tl-sm border border-blue-500/20 px-3 py-2">
                        <p className="text-[9px] opacity-50 mb-1">TradeDesk AI</p>
                        <div className="flex items-center gap-1 py-0.5">
                          {[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" style={{ animation: `typing-dot 1.2s ${d}ms infinite` }} />)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </PhoneFrame>
            </div>
          </div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0 wave-divider pointer-events-none">
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-full h-10 sm:h-14">
            <path d="M0,30 C360,60 720,0 1080,30 C1260,45 1350,35 1440,30 L1440,60 L0,60 Z" fill="#080c14" opacity="0.6" />
          </svg>
        </div>
      </section>

      {/* ── SOCIAL PROOF NUMBERS ── */}
      <section className="py-8 border-b border-white/6 px-4" data-reveal>
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { stat: '24/7', label: 'Always answering' },
            { stat: '< 2 sec', label: 'Average answer time' },
            { stat: '$0', label: 'Per-call fees' },
            { stat: '10 min', label: 'Setup time' },
          ].map(({ stat, label }) => (
            <div key={stat}>
              <div className="text-xl sm:text-2xl font-extrabold text-white mb-0.5">{stat}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TRUSTED BY MARQUEE ── */}
      <section className="py-8 border-b border-white/6 overflow-hidden" data-reveal>
        <p className="text-center text-xs text-gray-600 font-semibold uppercase tracking-widest mb-6">Trusted by tradies across Australia</p>
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-16 z-10" style={{ background: 'linear-gradient(to right, black, transparent)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-16 z-10" style={{ background: 'linear-gradient(to left, black, transparent)' }} />
          <div className="flex whitespace-nowrap marquee-track">
            {[...INDUSTRIES, ...INDUSTRIES].map(({ icon, label }, i) => (
              <span key={`${label}-${i}`} className="inline-flex items-center gap-2.5 text-sm text-gray-500 mr-12 flex-shrink-0">
                <span className="text-lg">{icon}</span><span>{label}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── REVENUE CALCULATOR ── */}
      <section id="calculator" className="py-16 sm:py-24 px-4 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.06),transparent_70%)]" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-8 sm:mb-12" data-reveal>
            <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">Revenue Calculator</p>
            <h2 className="text-2xl sm:text-4xl font-bold">What are missed calls costing you?</h2>
            <p className="text-gray-500 mt-3 text-sm max-w-md mx-auto">Most tradies are shocked when they see the real number.</p>
          </div>
          <div data-reveal data-reveal-delay="100"><RevenueCalculator /></div>
        </div>
      </section>

      {/* ── MID-PAGE CTA ── */}
      <section className="py-10 px-4 border-y border-white/6" data-reveal>
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="font-bold text-white text-lg">Ready to stop missing jobs?</p>
            <p className="text-gray-500 text-sm">7-day free trial · No credit card · Live in 10 minutes</p>
          </div>
          <Link to="/signup"
            className="btn-shimmer flex-shrink-0 inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold px-6 py-3.5 rounded-xl transition-all min-h-[52px] relative overflow-hidden"
            style={{ boxShadow: '0 0 20px rgba(59,130,246,0.3)' }}>
            Start free trial <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── INDUSTRIES ── */}
      <section className="py-12 sm:py-16 px-4 border-b border-white/6" data-reveal>
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs text-gray-600 font-semibold uppercase tracking-widest mb-8">Built for every trade on the tools</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {INDUSTRIES.map(({ icon, label, benefit, href }, idx) => {
              const hasPage = href !== '#';
              const iconClass = `w-10 h-10 sm:w-12 sm:h-12 glass rounded-xl flex items-center justify-center text-xl sm:text-2xl transition-all duration-200 border border-white/8 ${hasPage ? 'group-hover:scale-110 group-hover:bg-blue-500/10' : ''}`;
              return (
                <div key={label}
                  className="group relative flex flex-col items-center gap-2 cursor-default"
                  data-reveal data-reveal-delay={`${Math.min((idx % 6) * 50, 300)}` as any}>
                  {hasPage
                    ? <Link to={href} className={iconClass}>{icon}</Link>
                    : <div className={iconClass}>{icon}</div>}
                  <span className="text-[10px] sm:text-xs text-gray-500 group-hover:text-gray-300 transition-colors text-center leading-tight">{label}</span>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 glass rounded-lg px-3 py-2 text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 border border-white/10 text-center hidden sm:block">
                    {benefit}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW THE CALL SOUNDS ── */}
      <section className="py-16 sm:py-24 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12" data-reveal>
            <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">Hear it in action</p>
            <h2 className="text-2xl sm:text-4xl font-bold">How the call actually sounds</h2>
            <p className="text-gray-500 mt-3 text-sm max-w-md mx-auto">Real scenarios your AI handles while you're on the tools.</p>
          </div>
          <div data-reveal data-reveal-delay="100"><CallTranscriptDemo /></div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-16 sm:py-24 px-4 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.04),transparent_70%)]" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-12 sm:mb-16" data-reveal>
            <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">Setup</p>
            <h2 className="text-2xl sm:text-4xl font-bold">Live in under 10 minutes</h2>
            <p className="text-gray-500 mt-3 text-sm">No hardware. No IT support. Just forward your missed calls.</p>
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
                { platform: '📱 iPhone', steps: ['Settings → Phone → Call Forwarding', 'Toggle Call Forwarding ON', 'Enter your TradeDesk number: 0400 000 000'] },
                { platform: '🤖 Android', steps: ['Phone app → ⋮ → Settings → Supplementary services', 'Call forwarding → Forward when unanswered', 'Enter your TradeDesk number: 0400 000 000'] },
              ].map(({ platform, steps }) => (
                <div key={platform} className="glass rounded-xl sm:rounded-2xl p-5 border border-white/8">
                  <h3 className="font-bold text-white mb-3 text-sm">{platform}</h3>
                  <ol className="space-y-2 text-xs sm:text-sm text-gray-300">
                    {steps.map((s, i) => (
                      <li key={i} className="flex gap-2"><span className="text-blue-400 font-bold w-4 flex-shrink-0">{i + 1}.</span><span>{s}</span></li>
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

      {/* ── TESTIMONIALS ── */}
      <section className="py-16 sm:py-24 px-4 relative">
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-10 sm:mb-12" data-reveal>
            <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">Real tradies</p>
            <h2 className="text-2xl sm:text-4xl font-bold">What they're saying</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {[
              { name: 'Marcus Webb', trade: 'Plumber', location: 'Brisbane, QLD', quote: "I was losing 3–4 jobs a week because I couldn't answer calls on the job. TradeDesk fixed that overnight. Paid for itself in the first 3 days.", stars: 5, detail: 'Saved 4 jobs in first week', verified: true },
              { name: 'Tanya Kowalski', trade: 'Electrician', location: 'Sydney, NSW', quote: "Set it up in 8 minutes. Now I check my phone at smoko and I've got a list of leads with their details and what they need. It's unreal.", stars: 5, detail: 'Set up in under 10 min', verified: true },
              { name: 'Brett Sullivan', trade: 'Builder', location: 'Melbourne, VIC', quote: "My clients have no idea they're not talking to a real receptionist. It's that good. I've closed $12k in extra work this month from calls I would've missed.", stars: 5, detail: '$12k extra this month', verified: true },
            ].map(({ name, trade, location, quote, stars, detail, verified }, idx) => (
              <div key={name} className="glass rounded-xl sm:rounded-2xl p-5 border border-white/8 hover:border-white/15 transition-all hover:-translate-y-0.5 duration-200 flex flex-col"
                data-reveal data-reveal-delay={`${idx * 100}` as any}>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex gap-0.5">{[...Array(stars)].map((_, i) => <Star key={i} size={13} className="text-yellow-400 fill-yellow-400" />)}</div>
                  <div className="flex items-center gap-1.5">
                    {verified && <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={9} /> Verified</span>}
                    <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">{detail}</span>
                  </div>
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

      {/* ── FEATURES (editorial bento) ── */}
      <section id="features" className="py-16 sm:py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05),transparent_70%)]" />
        <div className="max-w-6xl mx-auto relative">
          <div className="max-w-2xl mb-12 sm:mb-16" data-reveal>
            <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">Everything included</p>
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

            {/* SMS summaries — amber accent (the "you get paid attention" moment) */}
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 p-6 group hover:-translate-y-1 transition-transform duration-300"
              style={{ background: 'linear-gradient(150deg,rgba(245,158,11,0.07) 0%,rgba(8,12,20,0.6) 60%)' }}
              data-reveal data-reveal-delay="100">
              <div className="w-11 h-11 bg-amber-500/15 border border-amber-500/25 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageSquare size={19} className="text-amber-400" />
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
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-12" data-reveal>
            <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">Why TradeDesk</p>
            <h2 className="text-2xl sm:text-4xl font-bold">TradeDesk vs. every other option</h2>
            <p className="text-gray-500 mt-3 text-sm">Flat $199/mo vs per-call fees, sick days, and missed calls.</p>
            <div className="mt-4">
              <Link to="/compare/talkmate" className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                <ExternalLink size={12} /> See full comparison with TalkMate →
              </Link>
            </div>
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
            <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-2xl sm:text-4xl font-bold">One plan. No maths required.</h2>
            <p className="text-gray-500 mt-3 text-sm">Everything's included. No per-call charges, no setup fees, no lock-in.</p>
            <div className="inline-flex items-center gap-2 glass border border-amber-500/30 rounded-full px-4 py-2 text-sm text-amber-400 font-medium mt-4" style={{ background: 'rgba(245,158,11,0.04)' }}>
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
                  className="btn-shimmer flex items-center justify-center gap-2 w-full bg-blue-500 hover:bg-blue-400 text-white font-semibold py-4 rounded-xl transition-all min-h-[52px] relative overflow-hidden"
                  style={{ boxShadow: '0 0 20px rgba(59,130,246,0.3)' }}>
                  Start 7-day free trial <ArrowRight size={16} />
                </Link>
                <p className="text-center text-xs text-gray-600 mt-3">No credit card required · cancel any time</p>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-3 glass rounded-xl px-4 py-4 border border-amber-500/25" style={{ background: 'rgba(245,158,11,0.04)' }}>
              <CheckCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
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
          <div className="text-center mb-10 sm:mb-12" data-reveal>
            <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-2xl sm:text-4xl font-bold">Fair questions, straight answers</h2>
          </div>
          <div className="space-y-3" data-reveal>
            {FAQS.map(f => <FAQItem key={f.q} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-16 sm:py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08),transparent_70%)]" />
        <div className="max-w-3xl mx-auto text-center relative" data-reveal>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-5">
            Start today,<br /><span className="text-gradient">live by lunch.</span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg mb-10 max-w-xl mx-auto">
            Join tradies across Australia who never miss a job. Live in under 10 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
            <Link to="/signup"
              className="btn-shimmer inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold px-8 py-4 rounded-xl text-base transition-all min-h-[52px] relative overflow-hidden"
              style={{ boxShadow: '0 0 24px rgba(59,130,246,0.35)' }}>
              Get my AI answering <ArrowRight size={18} />
            </Link>
            <p className="text-sm text-gray-600 flex items-center justify-center">7-day free trial · No credit card</p>
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

      {/* ── Floating chat ── */}
      <ChatWidget />

      {/* ── Sticky mobile CTA ── */}
      <div className={`fixed bottom-0 inset-x-0 z-40 md:hidden transition-all duration-300 ${showScrollCTA ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        <div className="bg-[#080c14]/97 backdrop-blur-md border-t border-white/10 px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">7-day free trial</p>
            <p className="text-xs text-gray-500">No credit card needed</p>
          </div>
          <Link to="/signup" className="btn-shimmer flex-shrink-0 bg-blue-500 hover:bg-blue-400 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-all min-h-[44px] flex items-center relative overflow-hidden">
            Try it free
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
