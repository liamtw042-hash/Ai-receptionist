import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Zap, Smartphone, Phone, PartyPopper, Copy, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';

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

const STEPS = ['Business Setup', 'Your Services', 'Go Live'];

export function OnboardingPage() {
  useEffect(() => { document.title = 'Set up TradeDesk | TradeDesk'; }, []);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const tradeskNumber = '+61 2 8320 5000';
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
    } catch {}
  }, []);

  // Auto-fill services/pricing when trade type changes
  useEffect(() => {
    if (form.tradeType && TRADE_SERVICES[form.tradeType]) {
      setForm(f => ({
        ...f,
        services: TRADE_SERVICES[f.tradeType] || '',
        pricingGuide: TRADE_PRICING[f.tradeType] || '',
      }));
    }
  }, [form.tradeType]);

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleFinish = async () => {
    setLoading(true);
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
    } catch {
      // Settings can be updated later in dashboard
    } finally {
      setLoading(false);
      setStep(3);
    }
  };

  const copyNumber = () => {
    navigator.clipboard.writeText(tradeskNumber.replace(/\s/g, '')).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const step1Valid = form.traderName && form.businessName && form.tradeType;
  const step2Valid = form.services;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center blue-glow">
            <Zap size={20} className="text-white" />
          </div>
          <h1 className="font-bold text-xl text-white">Set up TradeDesk</h1>
        </div>

        {/* Progress steps — only show for steps 0–2 */}
        {step < 3 && (
          <div className="flex items-center mb-8">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    i < step
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                      : i === step
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-white/5 text-gray-600 border border-white/10'
                  }`}>
                    {i < step ? <Check size={15} /> : i + 1}
                  </div>
                  <span className={`text-[10px] font-medium hidden sm:block transition-colors duration-300 whitespace-nowrap ${
                    i === step ? 'text-white' : i < step ? 'text-green-400' : 'text-gray-600'
                  }`}>{s}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-all duration-500 ${i < step ? 'bg-blue-500' : 'bg-white/8'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="glass rounded-2xl p-6 sm:p-8">

          {/* Step 0 — Business Setup */}
          {step === 0 && (
            <div className="space-y-4 animate-slide-in-right">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-white">Your business</h2>
                <p className="text-gray-500 text-sm mt-0.5">Let's personalise your AI receptionist</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Your name" value={form.traderName} onChange={e => update('traderName', e.target.value)} placeholder="Dave Smith" required />
                <Input label="Business name" value={form.businessName} onChange={e => update('businessName', e.target.value)} placeholder="Smith's Plumbing" required />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">Trade type</label>
                <div className="flex flex-wrap gap-2">
                  {TRADES.map(t => (
                    <button key={t} type="button" onClick={() => update('tradeType', t)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        form.tradeType === t
                          ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                          : 'glass text-gray-400 hover:text-white hover:border-white/20'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input label="Suburb / area" value={form.suburb} onChange={e => update('suburb', e.target.value)} placeholder="Bondi, Sydney" />
                <Input label="Mobile (for alerts)" type="tel" value={form.mobileNumber} onChange={e => update('mobileNumber', e.target.value)} placeholder="+61400000000" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">Working hours</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    <input type="time" value={form.hoursStart} onChange={e => update('hoursStart', e.target.value)}
                      className="glass w-full rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 transition-all bg-transparent" />
                  </div>
                  <span className="text-gray-500 text-sm flex-shrink-0">to</span>
                  <div className="flex-1 relative">
                    <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    <input type="time" value={form.hoursEnd} onChange={e => update('hoursEnd', e.target.value)}
                      className="glass w-full rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 transition-all bg-transparent" />
                  </div>
                </div>
                <p className="text-xs text-gray-500">The AI will mention this when callers ask about availability</p>
              </div>

              <Button onClick={() => setStep(1)} size="lg" className="w-full" disabled={!step1Valid}>
                Next: Your Services <ChevronRight size={16} />
              </Button>
            </div>
          )}

          {/* Step 1 — Services & Pricing */}
          {step === 1 && (
            <div className="space-y-4 animate-slide-in-right">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-white">Services & pricing</h2>
                <p className="text-gray-500 text-sm mt-0.5">
                  Pre-filled for {form.tradeType || 'your trade'} — edit to match your business
                </p>
              </div>

              <Textarea
                label="Services offered"
                value={form.services}
                onChange={e => update('services', e.target.value)}
                rows={4}
                hint="The AI uses this to tell callers what you do"
              />
              <Textarea
                label="Pricing guide"
                value={form.pricingGuide}
                onChange={e => update('pricingGuide', e.target.value)}
                rows={4}
                hint="The AI gives callers rough estimates based on this — you can be as detailed as you like"
              />

              <div className="glass rounded-xl p-4 border border-blue-500/20 bg-blue-500/5">
                <p className="text-xs text-gray-400">
                  <span className="text-blue-400 font-medium">💡 Tip:</span> The AI will always say prices are estimates and that they should confirm when you call back. You can update this any time in Settings.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="secondary" onClick={() => setStep(0)} size="lg" className="flex-1">Back</Button>
                <Button onClick={handleFinish} size="lg" loading={loading} className="flex-1" disabled={!step2Valid}>
                  Finish setup <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 — Go Live! */}
          {step === 3 && (
            <div className="space-y-6 animate-slide-in-right">
              {/* Hero icon */}
              <div className="text-center">
                <div className="relative mx-auto w-20 h-20 mb-4">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl" />
                  <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <PartyPopper size={36} className="text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">You're almost live! 🎉</h2>
                <p className="text-gray-400 text-sm max-w-sm mx-auto">
                  Forward your missed calls to your TradeDesk number below and you're set.
                </p>
              </div>

              {/* TradeDesk number */}
              <div className="glass rounded-xl p-5 border border-blue-500/30 bg-blue-500/5 text-center">
                <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-2">Your TradeDesk number</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl font-bold text-white tracking-wider">{tradeskNumber}</span>
                  <button onClick={copyNumber}
                    className="w-8 h-8 glass rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:border-blue-500/40 transition-all duration-200">
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Forward your missed calls to this number</p>
              </div>

              {/* Call forwarding instructions */}
              <div className="space-y-3">
                {/* iPhone */}
                <div className="glass rounded-xl p-4 border border-white/8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-gray-800 border border-white/10 rounded-xl flex items-center justify-center">
                      <Smartphone size={16} className="text-blue-400" />
                    </div>
                    <span className="font-semibold text-white text-sm">iPhone</span>
                  </div>
                  <ol className="space-y-1.5 text-sm text-gray-300">
                    <li className="flex gap-2.5"><span className="text-blue-400 font-bold w-4 flex-shrink-0">1.</span> <span>Go to <strong className="text-white">Settings → Phone → Call Forwarding</strong></span></li>
                    <li className="flex gap-2.5"><span className="text-blue-400 font-bold w-4 flex-shrink-0">2.</span> <span>Toggle <strong className="text-white">Call Forwarding ON</strong></span></li>
                    <li className="flex gap-2.5"><span className="text-blue-400 font-bold w-4 flex-shrink-0">3.</span> <span>Enter <strong className="text-white">{tradeskNumber.replace(/\s/g, '')}</strong> as the number</span></li>
                  </ol>
                </div>

                {/* Android */}
                <div className="glass rounded-xl p-4 border border-white/8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-gray-800 border border-white/10 rounded-xl flex items-center justify-center">
                      <Phone size={16} className="text-green-400" />
                    </div>
                    <span className="font-semibold text-white text-sm">Android</span>
                  </div>
                  <ol className="space-y-1.5 text-sm text-gray-300">
                    <li className="flex gap-2.5"><span className="text-blue-400 font-bold w-4 flex-shrink-0">1.</span> <span>Open Phone app → tap <strong className="text-white">⋮ → Settings → Supplementary services</strong></span></li>
                    <li className="flex gap-2.5"><span className="text-blue-400 font-bold w-4 flex-shrink-0">2.</span> <span>Tap <strong className="text-white">Call forwarding → Forward when unanswered</strong></span></li>
                    <li className="flex gap-2.5"><span className="text-blue-400 font-bold w-4 flex-shrink-0">3.</span> <span>Enter <strong className="text-white">{tradeskNumber.replace(/\s/g, '')}</strong> and confirm</span></li>
                  </ol>
                </div>
              </div>

              {/* What happens next */}
              <div className="space-y-2">
                {[
                  { dot: 'bg-blue-400', text: 'AI answers any missed calls in under 2 seconds' },
                  { dot: 'bg-green-400', text: "You'll get an SMS summary after every call" },
                  { dot: 'bg-purple-400', text: 'All calls and contacts appear in your dashboard' },
                ].map(({ dot, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${dot} flex-shrink-0`} />
                    <p className="text-sm text-gray-300">{text}</p>
                  </div>
                ))}
              </div>

              <Button onClick={() => navigate('/dashboard')} size="lg" className="w-full text-base">
                I'm live! Take me to my dashboard <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
