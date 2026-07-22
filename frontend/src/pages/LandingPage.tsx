import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  Phone, MessageSquare, Clock, Zap, CheckCircle, XCircle, ArrowRight,
  Menu, X, ChevronDown, ArrowUp, Send, MessageCircle, Sparkles,
  PhoneIncoming, PhoneForwarded, CalendarCheck, FileText, MapPin,
  Users, User, Briefcase, Mail, Loader2,
} from 'lucide-react';
import { publicPost, publicGet } from '../lib/api';

/* ═══════════════════════════════════════════════════════════════════════════
   TRADEDESK LANDING — 2026 rebuild.

   Reference patterns borrowed (researched against training knowledge of the
   live sites — this sandbox's network policy blocks fetching them):

   · LINEAR   — near-black neutral surfaces (#0a0b0d family) with depth from
                1px borders, not tinted gradients; real product UI as the hero
                visual; sticky nav that only gains a border once you scroll.
   · VERCEL   — technical credibility through a working artefact (the live
                transcript cell in the bento), alternating dense/breathy
                section rhythm, monospace for machine facts (numbers, times).
   · NOTION   — one bold declarative hero line ("Never miss another job."),
                product screenshots that show an exact workflow per step of
                "How it works", quotes with concrete specifics over slogans.
   · BETTER STACK — cost-stacking argument (the revenue calculator), friction
                killers surfaced above the fold ("No card. Live in 10 min."),
                a single plan presented without tier theatre.
   · AMIE     — specific numbers in headline territory (the $350 problem
                line, "under 2 seconds"), the Day-0 journey compressed into
                three concrete steps with UI evidence.

   Honesty rules enforced here: no invented aggregate stats, no fake badges,
   early-user quotes framed as early access feedback (NOT "quoted with
   permission"), every link goes to a real route, the chat widget and
   newsletter are wired to real endpoints.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Scroll reveal (CSS-driven, respects reduced motion via index.css) ── */
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

/* ══════════════════════════════════════════════════════════════════════════
   HERO VISUAL — a faithful recreation of the actual dashboard call summary
   (Linear pattern: show the real product above the fold, not an abstract
   illustration). Data is tradie-realistic, matching the product's own UI:
   window chrome, call row, outcome badge, SMS-sent receipt.
   ══════════════════════════════════════════════════════════════════════ */
function DashboardCallCard() {
  return (
    <div className="relative w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
      {/* the one warm light source behind the product shot */}
      <div className="absolute -inset-10 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="relative rounded-2xl border border-white/10 bg-ink-900 shadow-2xl shadow-black/60 overflow-hidden">
        {/* window chrome — reads instantly as "this is the app" */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/6 bg-ink-950/80">
          <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <span className="ml-2 text-[10px] font-medium text-gray-600 tracking-wide">tradedesk — calls</span>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> AI live
          </span>
        </div>

        {/* the call your AI just caught */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/12 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
              <PhoneIncoming size={15} className="text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white">Sharon M.</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-red-400 bg-red-500/10 border border-red-500/25 px-1.5 py-0.5 rounded">Emergency</span>
              </div>
              <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin size={10} className="flex-shrink-0" /> Merewether NSW · 2:14 pm · 1 m 43 s
              </p>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-1 rounded-md flex-shrink-0">CAUGHT</span>
          </div>

          {/* AI summary — the product's actual output format */}
          <div className="mt-3.5 rounded-xl border border-white/7 bg-white/[0.02] p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-400/90 mb-2">AI summary</p>
            <p className="text-[13px] text-gray-300 leading-relaxed">
              Burst pipe under the kitchen sink, water shut off at the mains on my instruction.
              Quoted <span className="text-white font-semibold">$890</span> from your emergency call-out rate.
              Wants you there <span className="text-white font-semibold">today</span> — callback{' '}
              <span className="font-mono text-white">0412 087 336</span>.
            </p>
          </div>

          {/* transcript peek — two turns, speaker-coloured like the real app */}
          <div className="mt-3 space-y-1.5">
            <div className="flex gap-2 items-baseline">
              <span className="text-[10px] font-bold text-orange-400 w-12 flex-shrink-0 text-right">Your AI</span>
              <p className="text-xs text-gray-400 leading-relaxed">Sounds urgent — I've flagged it. Dave will ring you inside 30 minutes.</p>
            </div>
            <div className="flex gap-2 items-baseline">
              <span className="text-[10px] font-bold text-gray-600 w-12 flex-shrink-0 text-right">Sharon</span>
              <p className="text-xs text-gray-400 leading-relaxed">Beautiful, thank you. I'll keep the phone on me.</p>
            </div>
          </div>
        </div>

        {/* the payoff footer: SMS already in your pocket */}
        <div className="px-4 py-3 border-t border-white/6 bg-ink-950/60 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-xs text-gray-400">
            <MessageSquare size={13} className="text-orange-400 flex-shrink-0" />
            SMS summary sent to your phone
          </span>
          <span className="text-[10px] font-mono text-gray-600">14:16:02</span>
        </div>
      </div>

      {/* floating "while you were on the roof" chip — breaks the card's own box */}
      <div className="absolute -bottom-4 left-6 sm:left-10 rounded-xl border border-white/10 bg-ink-850 shadow-xl shadow-black/50 px-3.5 py-2 flex items-center gap-2">
        <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
        <span className="text-[11px] text-gray-300 font-medium">Handled while you were on the tools</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   HOW IT WORKS — three steps, each with a small UI vignette instead of an
   icon + paragraph (Notion pattern: show the exact workflow screen).
   ══════════════════════════════════════════════════════════════════════ */
function StepVignetteSetup() {
  return (
    <div className="rounded-xl border border-white/8 bg-ink-950/70 p-3.5 space-y-2.5" aria-hidden="true">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-gray-600">Settings · Business profile</p>
      {[['Business name', "Smith's Plumbing"], ['Trade', 'Plumber'], ['Emergency call-out', '$890 flat']].map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-3 rounded-lg border border-white/7 bg-white/[0.03] px-3 py-2">
          <span className="text-[10px] text-gray-500">{k}</span>
          <span className="text-[11px] text-white font-medium truncate">{v}</span>
        </div>
      ))}
    </div>
  );
}

function StepVignetteForward() {
  return (
    <div className="rounded-xl border border-white/8 bg-ink-950/70 p-3.5" aria-hidden="true">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-gray-600 mb-2.5">Your TradeDesk number</p>
      <div className="rounded-lg border border-orange-500/25 bg-orange-500/6 px-3 py-2.5 flex items-center gap-2.5">
        <PhoneForwarded size={14} className="text-orange-400 flex-shrink-0" />
        <span className="font-mono text-sm text-white tracking-wide">(02) 4062 xxxx</span>
      </div>
      <p className="text-[10px] text-gray-500 mt-2.5 leading-relaxed">
        Settings → Phone → Call forwarding → <span className="text-gray-300">when unanswered</span>. Your own number stays exactly as it is.
      </p>
    </div>
  );
}

function StepVignetteSms() {
  return (
    <div className="rounded-xl border border-white/8 bg-ink-950/70 p-3.5" aria-hidden="true">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-gray-600 mb-2.5">Text in your pocket</p>
      <div className="rounded-2xl rounded-tl-md border border-white/8 bg-white/[0.05] px-3 py-2.5">
        <p className="text-[11px] text-gray-300 leading-relaxed">
          <span className="text-white font-semibold">New lead:</span> Tom, Adamstown. Blocked stormwater drain,
          quoted $180–$250. Free after 3pm Thurs. 0438 xxx xxx
        </p>
      </div>
      <p className="text-[10px] text-gray-600 mt-2 font-mono">Delivered · 40 seconds after hang-up</p>
    </div>
  );
}

const STEPS = [
  {
    n: '01',
    title: 'Tell it your prices',
    desc: 'Business name, services, and your real pricing guide. Two minutes of typing — the AI quotes from this, never a made-up number.',
    vignette: <StepVignetteSetup />,
  },
  {
    n: '02',
    title: 'Forward missed calls',
    desc: 'We hand you a dedicated number. Point your missed calls at it — your own number never changes.',
    vignette: <StepVignetteForward />,
  },
  {
    n: '03',
    title: 'Read the text, ring back, win the job',
    desc: "Every call ends with an SMS in your pocket — who rang, what they need, what was quoted. You call back warm.",
    vignette: <StepVignetteSms />,
  },
];

/* ══════════════════════════════════════════════════════════════════════════
   LIVE TRANSCRIPT — the dominant bento cell (Vercel pattern: a working
   artefact beats a static claim). Scenario switcher + ticking call timer.
   ══════════════════════════════════════════════════════════════════════ */
const SCENARIOS = [
  {
    label: 'Burst pipe', caller: '0412 345 678',
    turns: [
      { role: 'ai' as const, text: "G'day, you've reached Smith's Plumbing — I'm their AI receptionist. What's going on?" },
      { role: 'caller' as const, text: "There's water pouring out from under my kitchen sink." },
      { role: 'ai' as const, text: "That's urgent — first, turn the water off at the mains. A burst pipe call-out runs $180–$320. Dave will ring you back within 30 minutes. What's your name and best number?" },
    ],
  },
  {
    label: 'Hot water', caller: '0438 901 234',
    turns: [
      { role: 'ai' as const, text: "G'day, Smith's Plumbing. How can I help?" },
      { role: 'caller' as const, text: "Hot water system carked it this morning. Probably need a new one." },
      { role: 'ai' as const, text: "For a 3-bed home on gas, a continuous-flow swap runs $950–$1,400 fitted. Want Dave to call you with an exact figure this afternoon?" },
    ],
  },
  {
    label: 'Booking', caller: '0455 678 901',
    turns: [
      { role: 'ai' as const, text: "Hi, Smith's Plumbing — Dave's on a job, but I can book you in." },
      { role: 'caller' as const, text: "No rush. Just a dripping tap in the laundry." },
      { role: 'ai' as const, text: "Easy — tap washer is $120–$180, about half an hour. Dave's got Tuesday 8am free. Lock it in?" },
    ],
  },
];

function LiveTranscript() {
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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" /> LIVE CALL
          </span>
          <span className="text-[11px] font-mono text-gray-600">{fmt(elapsed)}</span>
        </div>
        <div className="flex gap-1.5">
          {SCENARIOS.map((s, i) => (
            <button key={s.label} onClick={() => setActive(i)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border min-h-[32px] ${
                active === i
                  ? 'bg-orange-500 border-orange-500 text-black'
                  : 'bg-white/4 border-white/8 text-gray-500 hover:text-white hover:border-white/15'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-2.5">
        {scenario.turns.map((t, i) => (
          <div key={`${active}-${i}`} className="flex gap-2.5 items-baseline animate-fade-in" style={{ animationDelay: `${i * 90}ms` }}>
            <span className={`text-[10px] font-bold w-12 flex-shrink-0 text-right ${t.role === 'ai' ? 'text-orange-400' : 'text-gray-600'}`}>
              {t.role === 'ai' ? 'Your AI' : 'Caller'}
            </span>
            <p className={`text-[13px] leading-relaxed ${t.role === 'ai' ? 'text-gray-200' : 'text-gray-400'}`}>{t.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-white/6 flex items-center gap-2 text-xs text-gray-500">
        <MessageSquare size={12} className="text-orange-400 flex-shrink-0" />
        Then the summary lands on your phone — name, number, job, quote.
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   REVENUE CALCULATOR — Better Stack's cost-stacking argument, made personal.
   Pure client-side arithmetic; assumptions stated on the tin.
   ══════════════════════════════════════════════════════════════════════ */
function RevenueCalculator() {
  const [missedPerWeek, setMissedPerWeek] = useState(8);
  const [jobValue, setJobValue] = useState(450);
  // conservative: only a quarter of missed callers would have become jobs
  const monthlyLoss = Math.round((missedPerWeek * 4.33 * jobValue * 0.25) / 10) * 10;
  const yearlyLoss = monthlyLoss * 12;
  const paysBackDays = monthlyLoss > 0 ? Math.max(1, Math.ceil((199 / monthlyLoss) * 30)) : 0;

  const Slider = ({ label, val, set, min, max, step, fmt }: {
    label: string; val: number; set: (v: number) => void; min: number; max: number; step: number; fmt: (v: number) => string;
  }) => (
    <div>
      <div className="flex items-baseline justify-between mb-2.5">
        <label className="text-sm text-gray-400">{label}</label>
        <span className="text-xl font-bold text-white tabular-nums">{fmt(val)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={val} onChange={e => set(+e.target.value)}
        aria-label={label}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-orange-500"
        style={{ background: `linear-gradient(to right,#ff6b35 ${((val - min) / (max - min)) * 100}%,rgba(255,255,255,0.09) ${((val - min) / (max - min)) * 100}%)` }} />
      <div className="flex justify-between text-[10px] text-gray-600 mt-1.5"><span>{fmt(min)}</span><span>{fmt(max)}</span></div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-white/8 bg-ink-900 p-5 sm:p-7">
      <div className="space-y-6 mb-7">
        <Slider label="Calls you miss per week" val={missedPerWeek} set={setMissedPerWeek} min={1} max={40} step={1} fmt={v => `${v}`} />
        <Slider label="Your average job value" val={jobValue} set={setJobValue} min={100} max={2000} step={50} fmt={v => `$${v}`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Walking out the door</p>
          <p className="text-2xl font-black text-red-400 tabular-nums">${monthlyLoss.toLocaleString()}<span className="text-xs font-medium text-gray-600">/mo</span></p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Over a year</p>
          <p className="text-2xl font-black text-red-400 tabular-nums">${yearlyLoss.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-orange-500/25 bg-orange-500/[0.05] p-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">TradeDesk pays back in</p>
          <p className="text-2xl font-black text-orange-400 tabular-nums">{paysBackDays <= 1 ? '< 1 day' : `${paysBackDays} days`}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-[11px] text-gray-600 leading-relaxed max-w-[260px]">
          Assumes one in four missed callers would've booked — conservative for most trades.
        </p>
        <a href="#waitlist"
          className="btn-shimmer inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-black font-bold px-6 py-3.5 rounded-xl transition-all text-sm min-h-[50px] w-full sm:w-auto relative overflow-hidden flex-shrink-0"
          style={{ boxShadow: '0 0 24px rgba(255,107,53,0.3)' }}>
          Stop the leak — join the waitlist <ArrowRight size={15} />
        </a>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FAQ — the six objections that actually stall a signup.
   ══════════════════════════════════════════════════════════════════════ */
const FAQS = [
  { q: 'What happens if the AI books something wrong?', a: "Nothing goes in your calendar without you seeing it. Every call ends with an SMS to you and a full transcript in the dashboard — a bad booking is one tap to fix from the Jobs page, and the AI only offers times you've marked as available. It quotes only from the pricing guide you wrote." },
  { q: 'Do I need to change my number?', a: "No. Your number stays exactly as it is. You forward missed calls to the TradeDesk number we give you — so it only picks up the calls you were losing anyway. Turn it off any time from your phone settings." },
  { q: 'How fast is setup, honestly?', a: "About ten minutes. Sign up, type in your business details and price guide, then set call forwarding on your phone (two minutes, we show you the exact taps for iPhone and Android). No hardware, no technician." },
  { q: "Do callers know it's an AI?", a: "Yes — it introduces itself as your AI receptionist, then just gets on with helping. It sounds natural, answers instantly, and never puts anyone on hold, which beats a voicemail on every measure a caller cares about." },
  { q: 'What does it cost?', a: "$199/month flat. Unlimited calls, no per-call fees, no setup fee, no lock-in. If it doesn't pay for itself, there's a 30-day money-back guarantee — every cent back, no questions." },
  { q: 'What if a call is a real emergency?', a: "The AI detects urgency — burst pipe, gas leak, no power — tells the caller you'll ring back fast, and fires an URGENT SMS to your mobile immediately, separate from the normal summary." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-white/8 bg-ink-900 overflow-hidden hover:border-white/15 transition-colors">
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left min-h-[52px]">
        <span className="font-medium text-white text-sm leading-snug">{q}</span>
        <ChevronDown size={16} className={`text-gray-500 flex-shrink-0 mt-0.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${open ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'}`}>
        <p className="px-5 pb-4 pt-1 text-sm text-gray-400 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   NEWSLETTER — wired to POST /api/newsletter/subscribe.
   ══════════════════════════════════════════════════════════════════════ */
function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === 'loading') return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await publicPost<{ status: string }>('/newsletter/subscribe', { email });
      setStatus('done');
      setMessage(res.status === 'already-subscribed' ? "You're already on the list — nice one." : "You're in. Tips land monthly.");
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (status === 'done') {
    return <p className="text-sm text-emerald-400 flex items-center gap-2"><CheckCircle size={15} /> {message}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xs" noValidate>
      <div className="flex gap-2">
        <input type="email" value={email}
          onChange={e => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
          placeholder="your@email.com" required aria-label="Email address"
          disabled={status === 'loading'}
          className="flex-1 min-w-0 rounded-lg bg-white/4 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors min-h-[44px] disabled:opacity-60" />
        <button type="submit" disabled={status === 'loading' || !email}
          className="flex-shrink-0 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:hover:bg-orange-500 text-black font-semibold px-4 py-2.5 rounded-lg transition-all flex items-center gap-1.5 text-sm min-h-[44px]">
          {status === 'loading'
            ? <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" aria-hidden="true" />
            : <>Join <Send size={12} /></>}
        </button>
      </div>
      {status === 'error' && (
        <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5"><XCircle size={12} /> {message}</p>
      )}
    </form>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SUPPORT CHAT WIDGET — wired to POST /api/chat/widget (rate-limited).
   ══════════════════════════════════════════════════════════════════════ */
interface ChatMsg { role: 'user' | 'assistant'; content: string; }

const CHAT_SUGGESTIONS = ['How much does it cost?', 'How does it work?', 'How long to set up?'];

function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: "G'day! I'm the TradeDesk assistant. Ask me anything about how it works, pricing, or getting set up." },
  ]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, sending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || sending) return;
    setError('');
    const history = messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-6);
    setMessages(m => [...m, { role: 'user', content: q }]);
    setDraft('');
    setSending(true);
    try {
      const res = await publicPost<{ reply: string }>('/chat/widget', { message: q, history });
      setMessages(m => [...m, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Launcher — z-[60] sits above the cookie banner (z-50) so it's always tappable */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close chat' : 'Open TradeDesk chat assistant'}
        aria-expanded={open}
        className="fixed z-[60] right-4 bottom-24 md:bottom-6 w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-400 text-black flex items-center justify-center shadow-lg shadow-orange-500/30 transition-all"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="TradeDesk chat assistant"
          className="fixed z-[60] right-4 bottom-40 md:bottom-24 w-[calc(100vw-2rem)] max-w-sm h-[28rem] max-h-[calc(100vh-12rem)] flex flex-col rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in-scale bg-ink-850"
        >
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/8 flex-shrink-0 bg-ink-950/60">
            <div className="w-8 h-8 rounded-lg bg-orange-500/12 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
              <Sparkles size={15} className="text-orange-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-tight">TradeDesk Assistant</p>
              <p className="text-[11px] text-gray-500 leading-tight">Pricing, setup & features</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3.5 py-2 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-orange-500 text-black font-medium rounded-2xl rounded-br-md'
                    : 'text-gray-100 rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.05]'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.05] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
                </div>
              </div>
            )}
            {messages.length === 1 && !sending && (
              <div className="flex flex-wrap gap-2 pt-1">
                {CHAT_SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="text-xs text-gray-300 border border-white/12 hover:border-orange-500/40 hover:text-orange-300 rounded-full px-3 py-1.5 transition-colors min-h-[32px]">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1.5 pt-1"><XCircle size={12} /> {error}</p>
            )}
          </div>

          <form
            onSubmit={e => { e.preventDefault(); send(draft); }}
            className="flex-shrink-0 border-t border-white/8 p-3 flex items-end gap-2 bg-ink-950/50"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              maxLength={500}
              placeholder="Ask about TradeDesk…"
              aria-label="Type your question"
              className="flex-1 min-w-0 bg-white/6 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/40 transition-colors min-h-[44px]"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              aria-label="Send message"
              className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                draft.trim() && !sending
                  ? 'bg-orange-500 hover:bg-orange-400 text-black shadow-lg shadow-orange-500/30'
                  : 'bg-white/8 text-gray-600 cursor-not-allowed'
              }`}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════════════════
   WAITLIST — the pre-launch primary CTA. Short form (name, business, email,
   phone optional, trade), wired to POST /api/waitlist which stores to
   Firestore + sends a confirmation email. Success state replaces the form.
   ══════════════════════════════════════════════════════════════════════ */
const WAITLIST_TRADES = [
  { value: 'plumber', label: 'Plumber' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'builder', label: 'Builder' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'locksmith', label: 'Locksmith' },
  { value: 'other', label: 'Other trade' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function WaitlistForm() {
  const [form, setForm] = useState({ name: '', businessName: '', email: '', phone: '', tradeType: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'already' | 'error'>('idle');
  const [error, setError] = useState('');
  const set = (k: keyof typeof form, v: string) => { setForm(f => ({ ...f, [k]: v })); if (error) setError(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'loading') return;
    if (!form.name.trim()) { setError('Pop your name in.'); return; }
    if (!form.businessName.trim()) { setError('What\'s the business called?'); return; }
    if (!EMAIL_RE.test(form.email.trim())) { setError('That email doesn\'t look right.'); return; }
    if (!form.tradeType) { setError('Pick your trade.'); return; }
    setStatus('loading');
    try {
      const res = await publicPost<{ status: string }>('/waitlist', {
        name: form.name.trim(),
        businessName: form.businessName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        tradeType: form.tradeType,
      });
      setStatus(res.status === 'already-on-list' ? 'already' : 'done');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (status === 'done' || status === 'already') {
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.05] p-6 sm:p-8 text-center" role="status">
        <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={24} className="text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          {status === 'already' ? "You're already on the list" : "You're on the list!"}
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-sm mx-auto">
          {status === 'already'
            ? "No need to sign up twice — we've got you. Liam will email you the moment your early-access spot is ready."
            : "Nice one. Check your inbox for a quick note from Liam — we'll email you the moment TradeDesk is ready for you, with early access and founding-member pricing."}
        </p>
      </div>
    );
  }

  const inputCls = 'w-full rounded-xl bg-white/[0.04] border border-white/10 pl-10 pr-3 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all min-h-[48px]';

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="relative">
          <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name"
            aria-label="Your name" autoComplete="name" className={inputCls} />
        </div>
        <div className="relative">
          <Briefcase size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
          <input value={form.businessName} onChange={e => set('businessName', e.target.value)} placeholder="Business name"
            aria-label="Business name" className={inputCls} />
        </div>
      </div>
      <div className="relative">
        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com"
          aria-label="Email address" autoComplete="email" className={inputCls} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="relative">
          <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
          <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Phone (optional)"
            aria-label="Phone number (optional)" autoComplete="tel" className={inputCls} />
        </div>
        <div className="relative">
          <Zap size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none z-10" />
          <select value={form.tradeType} onChange={e => set('tradeType', e.target.value)}
            aria-label="Your trade"
            className={`${inputCls} appearance-none pr-9 cursor-pointer ${form.tradeType ? 'text-white' : 'text-gray-600'}`}>
            <option value="" disabled className="bg-ink-900 text-gray-500">Your trade</option>
            {WAITLIST_TRADES.map(t => <option key={t.value} value={t.value} className="bg-ink-900 text-white">{t.label}</option>)}
          </select>
          <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        </div>
      </div>

      {error && <p className="text-xs text-red-400 flex items-center gap-1.5"><XCircle size={12} className="flex-shrink-0" /> {error}</p>}

      <button type="submit" disabled={status === 'loading'}
        className="btn-shimmer w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-black font-bold py-4 rounded-xl transition-all min-h-[54px] relative overflow-hidden"
        style={{ boxShadow: '0 0 24px rgba(255,107,53,0.3)' }}>
        {status === 'loading'
          ? <Loader2 size={17} className="animate-spin" />
          : <>Join the waitlist <ArrowRight size={17} /></>}
      </button>
      <p className="text-center text-xs text-gray-600">Free to join · no card · we'll only email you about TradeDesk.</p>
    </form>
  );
}

// Honest social proof: shows "N tradies on the waitlist" ONLY when the server
// says the number has cleared its threshold. Renders nothing otherwise — never
// a fabricated or trivially-small number.
function WaitlistCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    publicGet<{ showPublicly: boolean; count: number | null }>('/waitlist/count')
      .then(r => { if (r.showPublicly && typeof r.count === 'number') setCount(r.count); })
      .catch(() => {});
  }, []);
  if (count === null) return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5">
      <Users size={13} className="text-orange-400" />
      <span className="text-xs text-gray-300"><span className="font-bold text-white tabular-nums">{count.toLocaleString()}</span> tradies on the waitlist</span>
    </div>
  );
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showScrollCTA, setShowScrollCTA] = useState(false);
  const [showBackTop, setShowBackTop] = useState(false);
  const [cookieDismissed, setCookieDismissed] = useState(() => localStorage.getItem('td_cookie') === '1');

  useReveal();
  useEffect(() => { document.title = 'TradeDesk — AI receptionist for Australian tradies'; }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      setShowScrollCTA(window.scrollY > 560);
      setShowBackTop(window.scrollY > 900);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    <div className="min-h-screen bg-ink-950 text-white font-sans overflow-x-hidden">
      <div className="noise-overlay" aria-hidden="true" />
      <a href="#main" className="sr-only focus:not-sr-only fixed top-2 left-2 z-[70] bg-orange-500 text-black text-sm font-semibold px-3 py-2 rounded-lg">Skip to main content</a>

      {/* ── NAV — Linear pattern: invisible until scroll, then a hairline. One
             primary CTA; login is deliberately quiet text. ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-ink-950/90 backdrop-blur-md border-b border-white/8' : ''}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Zap size={15} className="text-black" fill="currentColor" />
            </div>
            <span className="font-bold text-lg tracking-tight">TradeDesk</span>
          </Link>
          <div className="hidden md:flex items-center gap-7">
            {[['#how-it-works', 'How it works'], ['#calculator', 'The maths'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']].map(([href, label]) => (
              <a key={href} href={href} className="text-sm text-gray-500 hover:text-white transition-colors">{label}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-4">
            <Link to="/login" className="text-sm text-gray-500 hover:text-white transition-colors">Log in</Link>
            <a href="#waitlist"
              className="text-sm font-bold bg-orange-500 hover:bg-orange-400 text-black px-4 py-2 rounded-lg transition-all"
              style={{ boxShadow: '0 0 16px rgba(255,107,53,0.3)' }}>
              Join the waitlist
            </a>
          </div>
          <button className="md:hidden text-gray-400 hover:text-white p-2 -mr-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setMenuOpen(o => !o)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-96' : 'max-h-0'}`}>
          <div className="bg-ink-950/95 backdrop-blur-md border-b border-white/8 px-4 py-4 space-y-1">
            {[['#how-it-works', 'How it works'], ['#calculator', 'The maths'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']].map(([href, label]) => (
              <a key={href} href={href} className="block text-sm text-gray-300 hover:text-white py-3 border-b border-white/5 last:border-0 min-h-[44px] flex items-center" onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
            <div className="flex gap-3 pt-3">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center text-sm rounded-lg py-3 text-gray-300 border border-white/10 min-h-[44px] flex items-center justify-center">Log in</Link>
              <a href="#waitlist" onClick={() => setMenuOpen(false)} className="flex-1 text-center text-sm bg-orange-500 text-black rounded-lg font-bold min-h-[44px] flex items-center justify-center">Join the waitlist</a>
            </div>
          </div>
        </div>
      </nav>

      <main id="main">
        {/* ── HERO — split layout (Notion: declarative < 8-word headline;
               Linear: the product itself is the visual; Amie: friction killers
               sit right under the CTA). ── */}
        <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute -top-40 left-1/2 -translate-x-[65%] w-[46rem] h-[46rem] bg-orange-500/[0.07] rounded-full blur-[140px]" />
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              <div className="lg:col-span-6">
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" /> Launching soon
                  </span>
                  <WaitlistCount />
                </div>
                {/* 23 characters. */}
                <h1 className="text-5xl sm:text-6xl lg:text-[4.6rem] font-black tracking-tight leading-[0.98]">
                  Never miss<br />another job.
                </h1>
                <p className="mt-6 text-lg sm:text-xl text-gray-400 leading-relaxed max-w-lg">
                  TradeDesk is the AI receptionist for Australian tradies — it answers the calls
                  you can't, works out what the customer needs, and texts you the details.
                  It's nearly ready. Get on the waitlist for first access.
                </p>

                <div className="mt-9 flex flex-col sm:flex-row gap-5 sm:items-center">
                  <a href="#waitlist"
                    className="btn-shimmer inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-black font-bold px-7 py-4 rounded-xl text-base transition-all min-h-[56px] relative overflow-hidden"
                    style={{ boxShadow: '0 0 28px rgba(255,107,53,0.35)' }}>
                    Join the waitlist <ArrowRight size={18} />
                  </a>
                  <a href="#bento" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-white transition-colors min-h-[44px]">
                    See how it works <ArrowRight size={14} className="text-orange-400" />
                  </a>
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-600">
                  <span className="flex items-center gap-1.5"><CheckCircle size={13} className="text-emerald-400" /> First access</span>
                  <span className="flex items-center gap-1.5"><CheckCircle size={13} className="text-emerald-400" /> Founding-member pricing</span>
                  <span className="flex items-center gap-1.5"><CheckCircle size={13} className="text-emerald-400" /> 30-day money-back guarantee</span>
                </div>
              </div>

              <div className="lg:col-span-6 lg:-mt-6">
                <DashboardCallCard />
              </div>
            </div>
          </div>
        </section>

        {/* ── WAITLIST — the primary pre-launch CTA. Prominent, its own band. ── */}
        <section id="waitlist" className="scroll-mt-20 py-16 sm:py-24 px-4 sm:px-6 border-y border-white/6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_0%,rgba(255,107,53,0.08),transparent_70%)] pointer-events-none" />
          <div className="relative max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div data-reveal>
              <p className="text-orange-400 text-xs font-semibold uppercase tracking-[0.2em] mb-3">Early access</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.08]">
                Get on the list before we open the doors.
              </h2>
              <p className="text-gray-400 mt-4 leading-relaxed">
                TradeDesk isn't live yet — we're putting the finishing touches on it. Join the
                waitlist and you're first in line when it opens.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  ['First access', 'Skip the queue — waitlisters get in before anyone else.'],
                  ['Founding-member pricing', "Lock in a better rate than we'll ever offer again."],
                  ['30-day money-back guarantee', "Try it on your real calls — if it's not for you, get a full refund."],
                ].map(([title, desc]) => (
                  <li key={title} className="flex items-start gap-3">
                    <CheckCircle size={17} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300"><span className="font-semibold text-white">{title}.</span> <span className="text-gray-400">{desc}</span></span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-orange-500/25 bg-ink-900 p-5 sm:p-7 shadow-2xl shadow-black/40" data-reveal data-reveal-delay="100">
              <div className="mb-5">
                <h3 className="text-lg font-bold text-white">Join the waitlist</h3>
                <p className="text-sm text-gray-500 mt-0.5">Takes 20 seconds. We'll email you the moment it's ready.</p>
              </div>
              <WaitlistForm />
            </div>
          </div>
        </section>

        {/* ── THE PROBLEM — one dense statement band. The $350 figure is
               deliberately a round illustrative number, not fake-precise
               "research". ── */}
        <section className="border-y border-white/6 bg-ink-900/40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center" data-reveal>
            <p className="text-2xl sm:text-4xl font-bold tracking-tight leading-snug text-gray-300">
              You're on the tools. The phone rings out.
              <br className="hidden sm:block" />{' '}
              <span className="text-white">That's a <span className="text-orange-400">$350 job</span> driving to the next tradie</span> —
              and callers don't leave voicemails anymore.
            </p>
          </div>
        </section>

        {/* ── HOW IT WORKS — 3 steps, each with UI evidence (Notion pattern).
               Numbered in mono like a build log (Vercel). ── */}
        <section id="how-it-works" className="py-20 sm:py-28 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-xl mb-12 sm:mb-16" data-reveal>
              <p className="text-orange-400 text-xs font-semibold uppercase tracking-[0.2em] mb-3">How it works</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.08]">Set up over smoko.<br />Answering by lunch.</h2>
              <p className="text-gray-500 mt-4 leading-relaxed">No hardware, no IT bloke, no new number. Three steps and the leak is plugged.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 lg:gap-5">
              {STEPS.map((s, i) => (
                <div key={s.n} className="rounded-2xl border border-white/8 bg-ink-900 p-5 sm:p-6 flex flex-col"
                  data-reveal data-reveal-delay={`${i * 100}` as never}>
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="font-mono text-sm font-bold text-orange-400">{s.n}</span>
                    <h3 className="text-lg font-bold text-white leading-tight">{s.title}</h3>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed mb-5">{s.desc}</p>
                  <div className="mt-auto">{s.vignette}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BENTO — asymmetric grid, dominant cell is the live transcript
               (Linear/Vercel: one interactive artefact outweighs six equal
               cards). ── */}
        <section id="bento" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/6">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-xl mb-10 sm:mb-14" data-reveal>
              <p className="text-orange-400 text-xs font-semibold uppercase tracking-[0.2em] mb-3">What it does</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.08]">The whole front desk, one flat fee.</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-reveal>
              {/* Dominant cell — live transcript, 2×2 */}
              <div className="md:col-span-2 md:row-span-2 rounded-2xl border border-orange-500/20 bg-ink-900 p-5 sm:p-6 min-h-[320px]"
                style={{ background: 'linear-gradient(160deg, rgba(255,107,53,0.05) 0%, #0f1114 45%)' }}>
                <LiveTranscript />
              </div>

              {/* SMS follow-up */}
              <div className="rounded-2xl border border-white/8 bg-ink-900 p-5 hover:border-white/15 transition-colors">
                <MessageSquare size={18} className="text-orange-400 mb-3" />
                <h3 className="font-bold text-white text-[15px] mb-1.5">A text the second they hang up</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed">Name, number, job and quote — in your pocket before they've reached the ute.</p>
              </div>

              {/* Missed-call text-back */}
              <div className="rounded-2xl border border-white/8 bg-ink-900 p-5 hover:border-white/15 transition-colors">
                <Clock size={18} className="text-orange-400 mb-3" />
                <h3 className="font-bold text-white text-[15px] mb-1.5">Missed-call text-back</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed">If a call slips through, the caller gets a friendly SMS within 60 seconds — before they ring your competitor.</p>
              </div>

              {/* Existing number */}
              <div className="rounded-2xl border border-white/8 bg-ink-900 p-5 hover:border-white/15 transition-colors">
                <PhoneForwarded size={18} className="text-orange-400 mb-3" />
                <h3 className="font-bold text-white text-[15px] mb-1.5">Keep your own number</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed">Forward missed calls only. Nothing on your van, your cards or your ads changes.</p>
              </div>

              {/* Per-trade quoting */}
              <div className="rounded-2xl border border-white/8 bg-ink-900 p-5 hover:border-white/15 transition-colors">
                <FileText size={18} className="text-orange-400 mb-3" />
                <h3 className="font-bold text-white text-[15px] mb-1.5">Quotes from your price list</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed">It reads your pricing guide — a blocked drain quote sounds like you gave it, because you did.</p>
              </div>

              {/* Jobs + calendar */}
              <div className="rounded-2xl border border-white/8 bg-ink-900 p-5 hover:border-white/15 transition-colors">
                <CalendarCheck size={18} className="text-orange-400 mb-3" />
                <h3 className="font-bold text-white text-[15px] mb-1.5">Bookings land in your calendar</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed">Booked jobs appear on your Jobs board, with Google Calendar and Sheets sync built in.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── REVENUE CALCULATOR — Better Stack cost-stacking. ── */}
        <section id="calculator" className="py-20 sm:py-28 px-4 sm:px-6 border-t border-white/6">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-10 lg:gap-14 items-start">
            <div className="lg:col-span-2 lg:sticky lg:top-28" data-reveal>
              <p className="text-orange-400 text-xs font-semibold uppercase tracking-[0.2em] mb-4">Do the maths</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.08]">The calls you miss aren't free.</h2>
              <p className="text-gray-500 mt-5 leading-relaxed">
                Most tradies have never put a number on it. Drag the sliders — it's usually the
                most expensive habit in the business.
              </p>
              <p className="text-sm text-gray-600 mt-5">
                TradeDesk is $199/month flat. It pays for itself the first time it saves one job.
              </p>
            </div>
            <div className="lg:col-span-3" data-reveal data-reveal-delay="100"><RevenueCalculator /></div>
          </div>
        </section>

        {/* ── EARLY USERS — one dominant pull quote + two offset notes.
               Honesty framing: early-access feedback, no permission theatre,
               no aggregate counts. ── */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/6">
          <div className="max-w-5xl mx-auto">
            <div className="mb-10 flex items-baseline gap-3 flex-wrap" data-reveal>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">From the first tradies on the line</h2>
              <span className="text-xs text-gray-600 border border-white/10 rounded-full px-2.5 py-1">Early access</span>
            </div>

            <div className="grid lg:grid-cols-5 gap-5 items-start">
              <figure className="lg:col-span-3 relative rounded-2xl border border-orange-500/20 p-7 sm:p-9 bg-ink-900"
                style={{ background: 'linear-gradient(160deg, rgba(255,107,53,0.05) 0%, #0f1114 55%)' }}
                data-reveal>
                <blockquote className="text-xl sm:text-2xl font-medium text-white leading-snug">
                  I was up a ladder when it rang. By the time I was down, there was a text with
                  the bloke's name, the job, and the price I'd have quoted anyway. That's a call
                  I'd normally have lost.
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 text-sm">
                  <span className="w-9 h-9 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center font-bold text-orange-300 flex-shrink-0">M</span>
                  <span><span className="text-white font-semibold">Marcus W.</span><span className="text-gray-600"> · Plumber, Merewether NSW</span></span>
                </figcaption>
              </figure>

              <div className="lg:col-span-2 flex flex-col gap-5">
                <figure className="rounded-2xl border border-white/8 bg-ink-900 p-6" data-reveal data-reveal-delay="100">
                  <blockquote className="text-sm text-gray-300 leading-relaxed">
                    Had it forwarding my calls before smoko. Now there's a proper list of who rang
                    and what they wanted, instead of six missed-call icons.
                  </blockquote>
                  <figcaption className="mt-4 text-xs text-gray-600">
                    <span className="text-white font-medium">Tanya K.</span> · Electrician, Sydney
                  </figcaption>
                </figure>
                <figure className="rounded-2xl border border-white/8 bg-ink-900 p-6" data-reveal data-reveal-delay="200">
                  <blockquote className="text-sm text-gray-300 leading-relaxed">
                    Reckon a couple of customers didn't even clock it wasn't a person. Straight
                    answers, and the reno enquiry came through to me warm.
                  </blockquote>
                  <figcaption className="mt-4 text-xs text-gray-600">
                    <span className="text-white font-medium">Brett S.</span> · Builder, Melbourne
                  </figcaption>
                </figure>
              </div>
            </div>
            <p className="mt-6 text-xs text-gray-600 max-w-xl" data-reveal>
              Feedback from our early-access group, lightly edited for length. TradeDesk is new —
              this is all of it, not a highlight reel.
            </p>
          </div>
        </section>

        {/* ── PRICING — one plan, zero tier theatre (Better Stack / Amie). ── */}
        <section id="pricing" className="py-20 sm:py-28 px-4 sm:px-6 border-t border-white/6 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_100%,rgba(255,107,53,0.06),transparent_70%)] pointer-events-none" />
          <div className="max-w-md mx-auto relative">
            <div className="text-center mb-10" data-reveal>
              <p className="text-orange-400 text-xs font-semibold uppercase tracking-[0.2em] mb-3">Pricing</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">One plan. No maths.</h2>
              <p className="text-sm text-gray-500 mt-3">This is the planned price at launch — waitlisters lock in founding-member rates.</p>
            </div>

            <div className="rounded-2xl border border-orange-500/25 bg-ink-900 p-6 sm:p-8 pricing-card-glow" data-reveal>
              <div className="flex items-end gap-1.5 mb-1">
                <span className="text-6xl font-black text-white tabular-nums">$199</span>
                <span className="text-gray-500 mb-2.5">/month AUD</span>
              </div>
              <p className="text-sm text-gray-500 mb-7">Unlimited calls · no per-call fees · no lock-in</p>

              <ul className="space-y-3 mb-8">
                {[
                  'Answers every call in under 2 seconds, 24/7',
                  'Australian voice, your business name',
                  'Quotes from your own pricing guide',
                  'SMS summary after every call',
                  'Emergency detection + urgent alerts',
                  'Missed-call text-back inside 60 seconds',
                  'Full transcripts, jobs board, contacts CRM',
                  'Gmail auto-reply + Google Calendar & Sheets',
                ].map(f => (
                  <li key={f} className="flex items-start gap-3 text-sm text-gray-300">
                    <CheckCircle size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <a href="#waitlist"
                className="btn-shimmer flex items-center justify-center gap-2 w-full bg-orange-500 hover:bg-orange-400 text-black font-bold py-4 rounded-xl transition-all min-h-[54px] relative overflow-hidden"
                style={{ boxShadow: '0 0 22px rgba(255,107,53,0.35)' }}>
                Join the waitlist <ArrowRight size={16} />
              </a>
              <p className="text-center text-xs text-gray-600 mt-3">Free to join · founding-member pricing when it launches</p>
            </div>

            <p className="mt-5 text-sm text-gray-500 leading-relaxed text-center" data-reveal>
              Waitlisters get early access at launch and a 30-day money-back guarantee.
              If it doesn't pay for itself, every cent back — no questions.
            </p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/6">
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
        <section className="py-24 sm:py-32 px-4 sm:px-6 relative overflow-hidden border-t border-white/6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,rgba(255,107,53,0.09),transparent_70%)] pointer-events-none" />
          <div className="max-w-3xl mx-auto text-center relative" data-reveal>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-6 leading-[1.02]">
              Be first in line when <span className="text-orange-400">TradeDesk opens.</span>
            </h2>
            <p className="text-gray-500 text-base sm:text-lg mb-10 max-w-xl mx-auto">
              We're nearly there. Join the waitlist and we'll email you the moment it's ready —
              with early access and founding-member pricing.
            </p>
            <a href="#waitlist"
              className="btn-shimmer inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-black font-bold px-8 py-4 rounded-xl text-base transition-all min-h-[54px] relative overflow-hidden"
              style={{ boxShadow: '0 0 26px rgba(255,107,53,0.4)' }}>
              Join the waitlist <ArrowRight size={18} />
            </a>
            <p className="text-sm text-gray-600 mt-4">Free to join · no card · first access at launch</p>
          </div>
        </section>
      </main>

      {/* ── FOOTER — honest: real routes only, no fake socials, no fake ABN. ── */}
      <footer className="border-t border-white/8 py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl border border-white/8 bg-ink-900 p-6 mb-10 flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
            <div>
              <p className="font-semibold text-white text-sm mb-1">Tradie tips, monthly</p>
              <p className="text-xs text-gray-600">Winning more jobs off the phone. No spam, unsubscribe any time.</p>
            </div>
            <div className="flex-shrink-0"><NewsletterSignup /></div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center"><Zap size={13} className="text-black" fill="currentColor" /></div>
                <span className="font-bold text-white">TradeDesk</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-3">The AI receptionist for Australian tradies.</p>
              <p className="text-xs text-gray-700">Made in Newcastle, NSW 🇦🇺</p>
              <a href="mailto:liamtw042@gmail.com" className="text-xs text-gray-600 hover:text-orange-400 transition-colors mt-2 block">liamtw042@gmail.com</a>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Product</p>
              <div className="space-y-2.5">
                <a href="#how-it-works" className="block text-sm text-gray-600 hover:text-white transition-colors">How it works</a>
                <a href="#pricing" className="block text-sm text-gray-600 hover:text-white transition-colors">Pricing</a>
                <Link to="/demo" className="block text-sm text-gray-600 hover:text-white transition-colors">Demo</Link>
                <a href="#calculator" className="block text-sm text-gray-600 hover:text-white transition-colors">Missed-call calculator</a>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">For your trade</p>
              <div className="space-y-2.5">
                <Link to="/industries/plumbers" className="block text-sm text-gray-600 hover:text-white transition-colors">Plumbers</Link>
                <Link to="/industries/electricians" className="block text-sm text-gray-600 hover:text-white transition-colors">Electricians</Link>
                <Link to="/industries/builders" className="block text-sm text-gray-600 hover:text-white transition-colors">Builders</Link>
                <Link to="/compare/talkmate" className="block text-sm text-gray-600 hover:text-white transition-colors">vs TalkMate</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Company</p>
              <div className="space-y-2.5">
                <Link to="/about" className="block text-sm text-gray-600 hover:text-white transition-colors">About</Link>
                <Link to="/blog" className="block text-sm text-gray-600 hover:text-white transition-colors">Blog</Link>
                <Link to="/contact" className="block text-sm text-gray-600 hover:text-white transition-colors">Contact</Link>
                <Link to="/privacy" className="block text-sm text-gray-600 hover:text-white transition-colors">Privacy</Link>
                <Link to="/terms" className="block text-sm text-gray-600 hover:text-white transition-colors">Terms</Link>
              </div>
            </div>
          </div>

          <div className="border-t border-white/6 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-700">© 2026 TradeDesk · Newcastle NSW</p>
            <div className="flex gap-4">
              <Link to="/login" className="text-xs text-gray-700 hover:text-white transition-colors">Log in</Link>
              <a href="#waitlist" className="text-xs text-orange-400/90 hover:text-orange-300 transition-colors font-medium">Join the waitlist →</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Sticky mobile CTA ── */}
      <div className={`fixed bottom-0 inset-x-0 z-40 md:hidden transition-all duration-300 ${showScrollCTA ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
        <div className="bg-ink-950/95 backdrop-blur-md border-t border-white/10 px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Launching soon</p>
            <p className="text-xs text-gray-600">Early access · founding-member pricing</p>
          </div>
          <a href="#waitlist" className="flex-shrink-0 bg-orange-500 hover:bg-orange-400 text-black font-bold px-5 py-3 rounded-xl text-sm transition-all min-h-[44px] flex items-center">
            Join waitlist
          </a>
        </div>
      </div>

      {/* ── Back to top ── */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        className={`fixed bottom-[10.5rem] right-5 md:bottom-[5.75rem] z-40 w-11 h-11 rounded-full border border-white/12 bg-ink-850 flex items-center justify-center text-gray-500 hover:text-white hover:border-orange-500/40 transition-all duration-300 shadow-lg ${showBackTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <ArrowUp size={16} />
      </button>

      <SupportChatWidget />

      {/* ── Cookie banner ── */}
      {!cookieDismissed && (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-ink-950/95 backdrop-blur-md border-t border-white/10 px-4 py-4">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
            <p className="text-xs text-gray-500 flex-1">
              We use cookies to improve your experience. By continuing, you agree to our{' '}
              <Link to="/privacy" className="text-orange-400/90 hover:underline">Privacy Policy</Link>.
            </p>
            <div className="flex gap-3 flex-shrink-0 w-full sm:w-auto">
              <button onClick={dismissCookie} className="flex-1 sm:flex-none text-xs text-gray-500 hover:text-white transition-colors px-3 py-2 min-h-[44px]">Decline</button>
              <button onClick={dismissCookie} className="flex-1 sm:flex-none text-xs bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-lg transition-colors font-medium min-h-[44px]">Accept</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
