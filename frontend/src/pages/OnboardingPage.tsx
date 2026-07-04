import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, ChevronLeft, Zap, Phone, Clock, MessageSquare, Copy, PhoneCall } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { ForwardingGuide } from '../components/setup/ForwardingGuide';

/* ═══════════════════════════════════════════════════════════════════════════
   ONBOARDING — signup → first working AI call, with zero dead ends.

   Three steps: (1) business details, (2) services & pricing, (3) go live
   (forwarding). Every field says WHY the AI needs it; every validation error
   is shown inline next to its field; the final step shows the user's REAL
   TradeDesk number (fetched from settings — never a hardcoded placeholder)
   and only marks forwarding done when the user says they've done it.
   ═══════════════════════════════════════════════════════════════════════ */

const TRADES = ['Plumber', 'Electrician', 'Builder', 'Carpenter', 'Painter', 'Landscaper', 'Roofer', 'Tiler', 'Locksmith', 'HVAC', 'Pest Control', 'Concreter', 'Other'];

const TRADE_SERVICES: Record<string, string> = {
  Plumber: 'Hot water repairs, blocked drains, leak detection, pipe relining, new tap installation, toilet repairs, emergency callouts',
  Electrician: 'Power point installation, safety switch install, switchboard upgrades, lighting installation, fault finding, emergency electrical',
  Builder: 'Home renovations, extensions, decks and pergolas, bathroom renovations, kitchen renovations, structural repairs',
  Carpenter: 'Deck building, door and window installation, custom cabinetry, framing, timber flooring, fencing',
  Painter: 'Interior painting, exterior painting, roof painting, fence painting, pressure washing, surface preparation',
  Landscaper: 'Garden design, lawn mowing, garden cleanup, retaining walls, irrigation systems, turf laying',
  Roofer: 'Roof repairs, re-bedding and repointing, tile replacement, guttering, downpipes, roof inspections',
  Tiler: 'Bathroom tiling, floor tiling, wall tiling, waterproofing, grout repairs, pool tiling',
  Locksmith: 'Lockout service, lock replacement, deadbolt installation, key cutting, security upgrades',
  HVAC: 'Air conditioning installation, split system install, ducted AC, service and cleaning, emergency repairs',
  'Pest Control': 'General pest inspections, termite treatment, rodent control, cockroach treatment, spider control, pre-purchase pest inspections',
  Concreter: 'Concrete driveways, concrete slabs, exposed aggregate, footpaths, patios, concrete cutting and removal, decorative concrete',
  Other: 'General trade services — please contact for a full quote',
};

const TRADE_PRICING: Record<string, string> = {
  Plumber: 'Service call: $120. Blocked drain: $220–$380. Hot water system: $900–$1,800. New tap install: $150–$250. Emergency after-hours: $200 callout fee.',
  Electrician: 'Service call: $110. Power point install: $120–$180. Safety switch install: $200–$300. Switchboard upgrade: $800–$2,000. Emergency: $180 callout fee.',
  Builder: 'Consultation: $150/hr. Small renovations: $5,000–$30,000. Extensions: quote required. Decks: $3,000–$15,000.',
  Carpenter: 'Hourly rate: $80–$120/hr. Deck build: $3,000–$12,000. Door/window install: $200–$400. Custom cabinetry: quote required.',
  Painter: 'Bedroom: $400–$800. Full interior (3-bed house): $2,000–$6,000. Exterior repaint: $3,000–$8,000. Prep + 2 coats included.',
  Landscaper: 'Garden cleanup: $300–$600. Lawn mowing: $80–$150. Retaining wall: $2,000–$6,000. Full design and install: quote required.',
  Roofer: 'Roof inspection: $150. Re-bedding & repointing: $800–$2,000. Tile replacement: $50–$80 per tile. Full re-roof: $8,000–$20,000.',
  Tiler: 'Bathroom: $1,500–$4,000. Floor tiling: $50–$90 per m². Wall tiling: $60–$100 per m². Waterproofing included.',
  Locksmith: 'Lockout service: $100–$150. Lock replacement: $120–$250. Deadbolt install: $150–$300. Emergency: $150 callout fee.',
  HVAC: 'Service/clean: $150–$250. Split system install: $800–$1,500. Ducted system: $3,000–$8,000. Emergency repair: $180 callout fee.',
  'Pest Control': 'General inspection: $150–$250. Termite treatment: $800–$3,000. Rodent control: $200–$400. Annual pest maintenance: $350–$500.',
  Concreter: 'Concrete driveway: $3,000–$8,000. Shed slab: $1,500–$4,000. Exposed aggregate: $60–$90 per m². Footpath: $50–$80 per m².',
  Other: 'Service call: $120/hr. Please contact for a detailed quote.',
};

const STEPS = ['Your business', 'Services & pricing', 'Go live'];

const AU_MOBILE_RE = /^(\+?61|0)4\d{8}$/;

export function OnboardingPage() {
  useEffect(() => { document.title = 'Set up TradeDesk | TradeDesk'; }, []);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [copied, setCopied] = useState(false);
  const [twilioNumber, setTwilioNumber] = useState<string | null>(null);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    traderName: '',
    businessName: '',
    tradeType: '',
    suburb: '',
    mobileNumber: '',
    hoursStart: '07:00',
    hoursEnd: '17:00',
    services: '',
    pricingGuide: '',
  });

  // Pre-fill from signup localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('td_onboard');
      if (saved) {
        const { fullName, businessName, tradeType, phone } = JSON.parse(saved);
        setForm(f => ({
          ...f,
          traderName: fullName || '',
          businessName: businessName || '',
          tradeType: tradeType || '',
          mobileNumber: phone || '',
        }));
      }
    } catch { /* corrupted prefill is fine to ignore */ }
  }, []);

  // The REAL TradeDesk number for this account, if one has been assigned —
  // never show a hardcoded placeholder a tradie might actually forward to.
  useEffect(() => {
    api.get<{ twilioNumber?: string }>('/settings')
      .then(s => { if (s?.twilioNumber) setTwilioNumber(s.twilioNumber); })
      .catch(() => {});
  }, []);

  // Auto-fill services/pricing on trade change — but NEVER over the top of
  // text the user has already edited. "Untouched" = empty or still exactly
  // some trade's template.
  const isTemplate = (val: string, table: Record<string, string>) =>
    !val.trim() || Object.values(table).includes(val);

  useEffect(() => {
    if (!form.tradeType || !TRADE_SERVICES[form.tradeType]) return;
    setForm(f => ({
      ...f,
      services: isTemplate(f.services, TRADE_SERVICES) ? TRADE_SERVICES[f.tradeType] : f.services,
      pricingGuide: isTemplate(f.pricingGuide, TRADE_PRICING) ? TRADE_PRICING[f.tradeType] : f.pricingGuide,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tradeType]);

  const update = (key: string, val: string) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }));
  };

  const validateStep = (s: number) => {
    const errs: Record<string, string> = {};
    if (s === 0) {
      if (!form.traderName.trim()) errs.traderName = 'The AI says things like "Dave\'s on a job right now" — it needs your name.';
      if (!form.businessName.trim()) errs.businessName = 'This is how the AI answers your phone — it can\'t pick up without it.';
      if (!form.tradeType) errs.tradeType = 'Pick your trade so the AI talks about the right kind of jobs.';
      if (!form.mobileNumber.trim()) {
        errs.mobileNumber = 'This is where your SMS summaries and urgent alerts go — without it you\'ll never hear about a call.';
      } else if (!AU_MOBILE_RE.test(form.mobileNumber.replace(/[\s-]/g, ''))) {
        errs.mobileNumber = 'That doesn\'t look like an Australian mobile — use 04xx xxx xxx or +614xx xxx xxx.';
      }
    }
    if (s === 1) {
      if (!form.services.trim()) errs.services = 'List at least one service so the AI knows what jobs to say yes to.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (validateStep(step)) setStep(s => s + 1);
  };

  const handleFinish = async () => {
    if (!validateStep(1)) return;
    setLoading(true);
    setSaveError('');
    try {
      await api.put('/settings', {
        traderName: form.traderName,
        businessName: form.businessName,
        tradeType: form.tradeType,
        suburb: form.suburb,
        mobileNumber: form.mobileNumber,
        availability: `Mon–Fri ${form.hoursStart}–${form.hoursEnd}`,
        services: form.services.split(',').map(s => s.trim()).filter(Boolean),
        pricingGuide: form.pricingGuide,
        onboardingComplete: true,
      });
      localStorage.removeItem('td_onboard');
      setStep(2);
      window.scrollTo({ top: 0 });
    } catch (err: unknown) {
      // Don't advance on a failed save — the AI wouldn't actually have the
      // details it needs, and silently proceeding leaves a half-configured
      // account with no sign anything went wrong.
      setSaveError(err instanceof Error ? err.message : 'Failed to save your details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyNumber = () => {
    if (!twilioNumber) return;
    navigator.clipboard.writeText(twilioNumber.replace(/\s/g, '')).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Only mark forwarding done when the user SAYS they've dialled the codes —
  // "I'll do it later" leaves the dashboard checklist honest.
  const finishForwarded = () => {
    api.put('/settings', { hasForwardingSetup: true }).catch(() => {});
    navigate('/dashboard');
  };
  const finishLater = () => navigate('/dashboard');

  const fieldError = (key: string) => errors[key] || undefined;

  return (
    <div className="min-h-screen bg-ink-950 flex items-start sm:items-center justify-center p-4 py-8 sm:py-12">
      <div className="w-full max-w-xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-3 mb-7 justify-center">
          <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
            <Zap size={17} className="text-black" fill="currentColor" />
          </div>
          <h1 className="font-bold text-lg text-white tracking-tight">Set up your AI receptionist</h1>
        </div>

        {/* Progress */}
        <div className="flex items-center mb-7">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-initial">
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  i < step
                    ? 'bg-emerald-500 text-black'
                    : i === step
                    ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/25'
                    : 'bg-white/5 text-gray-600 border border-white/10'
                }`}>
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                <span className={`text-[10px] font-medium transition-colors duration-300 whitespace-nowrap ${
                  i === step ? 'text-white' : i < step ? 'text-emerald-400' : 'text-gray-600'
                }`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-2 mb-5 transition-all duration-500 ${i < step ? 'bg-emerald-500/60' : 'bg-white/8'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/8 bg-ink-900 p-5 sm:p-8">

          {/* ── Step 0 — Business details ── */}
          {step === 0 && (
            <div className="space-y-5 animate-slide-in-right">
              <div>
                <h2 className="text-xl font-bold text-white">Tell the AI who it works for</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Everything here goes straight into how it answers your calls — you can change any of it later in Settings.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-3">
                <Input label="Your name" value={form.traderName}
                  onChange={e => update('traderName', e.target.value)}
                  placeholder="Dave Smith" required error={fieldError('traderName')}
                  hint={!errors.traderName ? '"Dave\'s on a job — I can help."' : undefined} />
                <Input label="Business name" value={form.businessName}
                  onChange={e => update('businessName', e.target.value)}
                  placeholder="Smith's Plumbing" required error={fieldError('businessName')}
                  hint={!errors.businessName ? 'How the AI answers the phone.' : undefined} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">Your trade</label>
                <p className="text-xs text-gray-500 -mt-0.5 mb-1">Picks the right starter services and prices for the next step.</p>
                <div className="flex flex-wrap gap-2">
                  {TRADES.map(t => (
                    <button key={t} type="button" onClick={() => update('tradeType', t)}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-h-[44px] border ${
                        form.tradeType === t
                          ? 'bg-orange-500 border-orange-500 text-black font-semibold'
                          : 'bg-white/4 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
                {errors.tradeType && <p className="text-xs text-red-400">{errors.tradeType}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-3">
                <Input label="Suburb / area" value={form.suburb}
                  onChange={e => update('suburb', e.target.value)}
                  placeholder="Merewether, Newcastle"
                  hint="So the AI can tell callers what area you cover." />
                <Input label="Your mobile" type="tel" value={form.mobileNumber}
                  onChange={e => update('mobileNumber', e.target.value)}
                  placeholder="0400 000 000" required error={fieldError('mobileNumber')}
                  hint={!errors.mobileNumber ? 'Where SMS summaries + urgent alerts land.' : undefined} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">Working hours</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    <input type="time" value={form.hoursStart} onChange={e => update('hoursStart', e.target.value)}
                      aria-label="Working hours start"
                      className="glass w-full rounded-lg pl-9 pr-3 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all bg-transparent min-h-[48px]" />
                  </div>
                  <span className="text-gray-500 text-sm flex-shrink-0">to</span>
                  <div className="flex-1 relative">
                    <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    <input type="time" value={form.hoursEnd} onChange={e => update('hoursEnd', e.target.value)}
                      aria-label="Working hours end"
                      className="glass w-full rounded-lg pl-9 pr-3 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all bg-transparent min-h-[48px]" />
                  </div>
                </div>
                <p className="text-xs text-gray-500">The AI only offers bookings inside these hours — and tells after-hours callers when you open.</p>
              </div>

              <Button onClick={goNext} size="lg" className="w-full">
                Next: services & pricing <ChevronRight size={16} />
              </Button>
              <p className="text-center text-xs text-gray-600 -mt-1">Step 1 of 3 · about 2 minutes each</p>
            </div>
          )}

          {/* ── Step 1 — Services & pricing ── */}
          {step === 1 && (
            <div className="space-y-5 animate-slide-in-right">
              <div>
                <h2 className="text-xl font-bold text-white">What you do, and what it costs</h2>
                <p className="text-gray-500 text-sm mt-1">
                  We've pre-filled typical {form.tradeType || 'trade'} numbers — <span className="text-gray-300">edit them to match yours</span>, because the AI quotes callers straight from this.
                </p>
              </div>

              <Textarea
                label="Services you offer"
                value={form.services}
                onChange={e => update('services', e.target.value)}
                rows={4}
                error={fieldError('services')}
                hint={!errors.services ? 'The AI says yes to these jobs and takes a message for anything else.' : undefined}
              />
              <Textarea
                label="Your pricing guide"
                value={form.pricingGuide}
                onChange={e => update('pricingGuide', e.target.value)}
                rows={5}
                hint="The AI gives callers rough figures from this list — the more real your numbers, the better its quotes sound."
              />

              <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.04] px-4 py-3">
                <p className="text-xs text-gray-400 leading-relaxed">
                  <span className="text-orange-400 font-semibold">Worth knowing:</span> the AI always
                  calls these estimates and says you'll confirm the exact price when you ring back.
                  It never invents a number that isn't on this list.
                </p>
              </div>

              {saveError && (
                <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3">
                  <p className="text-sm text-red-400">{saveError}</p>
                  <p className="text-xs text-gray-500 mt-1">Your answers are still here — hit "Save & continue" to try again.</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button variant="secondary" onClick={() => setStep(0)} size="lg" className="flex-shrink-0">
                  <ChevronLeft size={15} /> Back
                </Button>
                <Button onClick={handleFinish} size="lg" loading={loading} className="flex-1">
                  Save & continue <ChevronRight size={16} />
                </Button>
              </div>
              <p className="text-center text-xs text-gray-600 -mt-1">Step 2 of 3 · one step left after this</p>
            </div>
          )}

          {/* ── Step 2 — Go live (forwarding) ── */}
          {step === 2 && (
            <div className="space-y-6 animate-slide-in-right">
              <div className="text-center">
                <div className="relative mx-auto w-16 h-16 mb-4">
                  <div className="absolute inset-0 bg-orange-500/25 rounded-2xl blur-xl" />
                  <div className="relative w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                    <PhoneCall size={28} className="text-black" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-1.5">Details saved. One thing left.</h2>
                <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
                  Point your missed calls at your TradeDesk number. Two minutes on your
                  phone's keypad — then you're live.
                </p>
              </div>

              {/* The user's REAL number (or an honest pending state) */}
              <div className="rounded-xl border border-orange-500/25 bg-orange-500/[0.05] p-5 text-center">
                <p className="text-[10px] text-orange-400 font-bold uppercase tracking-[0.14em] mb-2">Your TradeDesk number</p>
                {twilioNumber ? (
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl font-bold text-white tracking-wider font-mono">{twilioNumber}</span>
                    <button onClick={copyNumber} aria-label="Copy TradeDesk number"
                      className="w-9 h-9 rounded-lg border border-white/10 bg-white/4 flex items-center justify-center text-gray-400 hover:text-white hover:border-orange-500/40 transition-all">
                      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
                    Being assigned now — it'll appear in{' '}
                    <span className="text-white font-medium">Settings → Your TradeDesk Number</span>{' '}
                    within a few minutes. You can finish this step from the dashboard checklist any time.
                  </p>
                )}
              </div>

              <ForwardingGuide number={twilioNumber} />

              {/* What happens next — including the test call */}
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 mb-3">Then prove it works</p>
                <ol className="space-y-2.5">
                  {[
                    { icon: Phone, text: <>Ring <span className="text-white font-medium">your own mobile</span> from another phone (the missus', a mate's) and let it ring out.</> },
                    { icon: Zap, text: <>Your AI picks up: <span className="text-gray-300 italic">"Hi, thanks for calling {form.businessName || 'your business'}…"</span> — have a chat, ask for a quote.</> },
                    { icon: MessageSquare, text: <>Hang up. Within a minute there's an <span className="text-white font-medium">SMS summary on your phone</span> and the full call in your dashboard.</> },
                  ].map(({ icon: Icon, text }, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon size={12} className="text-orange-400" />
                      </div>
                      <p className="text-sm text-gray-400 leading-relaxed">{text}</p>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="space-y-2.5">
                <Button onClick={finishForwarded} size="lg" className="w-full text-base">
                  I've dialled the codes — I'm live <ChevronRight size={16} />
                </Button>
                <button onClick={finishLater}
                  className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors py-2.5 min-h-[44px]">
                  I'll set up forwarding later — take me to the dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {step < 2 && (
          <p className="text-center text-xs text-gray-700 mt-5">
            Nothing here is locked in — every answer can be changed in Settings later.
          </p>
        )}
      </div>
    </div>
  );
}
