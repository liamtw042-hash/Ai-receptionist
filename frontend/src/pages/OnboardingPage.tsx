import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Zap, Smartphone, Phone, PartyPopper, Copy } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';

const TRADES = ['Plumber', 'Electrician', 'Builder', 'Carpenter', 'Painter', 'Tiler', 'Landscaper', 'Roofer', 'HVAC', 'Locksmith', 'Other'];

const STEPS = ['Your business', 'Services & pricing', 'Call forwarding', 'You\'re live!'];

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tradeskNumber] = useState('+61 2 8320 5000'); // Placeholder — real number from settings
  const [form, setForm] = useState({
    businessName: '',
    traderName: '',
    tradeType: '',
    suburb: '',
    mobileNumber: '',
    services: '',
    pricingGuide: '',
    availability: 'Mon–Fri 7am–5pm, Sat 8am–12pm',
  });
  const navigate = useNavigate();

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleFinish = async () => {
    setLoading(true);
    try {
      await api.put('/settings', {
        ...form,
        services: form.services.split(',').map(s => s.trim()).filter(Boolean),
        onboardingComplete: true,
      });
    } catch {
      // settings can be fixed later
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

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-slide-up">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center blue-glow">
            <Zap size={20} className="text-white" />
          </div>
          <h1 className="font-bold text-xl text-white">Set up TradeDesk</h1>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  i < step
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : i === step
                    ? 'bg-blue-500/20 text-blue-400 border-2 border-blue-500/60'
                    : 'bg-white/5 text-gray-600 border border-white/10'
                }`}>
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                <span className={`text-[10px] font-medium hidden sm:block transition-colors duration-300 whitespace-nowrap ${
                  i === step ? 'text-white' : i < step ? 'text-blue-400' : 'text-gray-600'
                }`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 transition-all duration-500 ${i < step ? 'bg-blue-500' : 'bg-white/8'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-6 sm:p-8">

          {/* Step 0 — Business details */}
          {step === 0 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-xl font-bold text-white mb-4">Your business</h2>
              <Input label="Business name" value={form.businessName} onChange={e => update('businessName', e.target.value)} placeholder="Smith's Plumbing" required />
              <Input label="Your name" value={form.traderName} onChange={e => update('traderName', e.target.value)} placeholder="Dave Smith" required />
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-1.5">Trade type</label>
                <div className="flex flex-wrap gap-2">
                  {TRADES.map(t => (
                    <button key={t} onClick={() => update('tradeType', t)}
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
              <Input label="Suburb / area" value={form.suburb} onChange={e => update('suburb', e.target.value)} placeholder="Bondi, Sydney" />
              <Input label="Your mobile (for SMS alerts)" type="tel" value={form.mobileNumber} onChange={e => update('mobileNumber', e.target.value)} placeholder="+61400000000" />
              <Button onClick={() => setStep(1)} size="lg" className="w-full" disabled={!form.businessName || !form.traderName || !form.tradeType}>
                Next <ChevronRight size={16} />
              </Button>
            </div>
          )}

          {/* Step 1 — Services & pricing */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-xl font-bold text-white mb-4">Services & pricing</h2>
              <Textarea
                label="Services offered"
                value={form.services}
                onChange={e => update('services', e.target.value)}
                placeholder="Hot water repairs, blocked drains, new installations, emergency callouts"
                rows={3}
                hint="Comma-separated list"
              />
              <Textarea
                label="Pricing guide"
                value={form.pricingGuide}
                onChange={e => update('pricingGuide', e.target.value)}
                placeholder="Service call: $120. Blocked drain: $180–$350. New hot water: $900–$1800. Emergency after-hours: $200 callout fee."
                rows={4}
                hint="The AI uses this to give rough quotes to callers"
              />
              <Input
                label="Availability"
                value={form.availability}
                onChange={e => update('availability', e.target.value)}
                placeholder="Mon–Fri 7am–5pm, Sat 8am–12pm"
              />
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={() => setStep(0)} size="lg" className="flex-1">Back</Button>
                <Button onClick={() => setStep(2)} size="lg" className="flex-1" disabled={!form.services}>
                  Next <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 — Call forwarding */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Set up call forwarding</h2>
                <p className="text-gray-400 text-sm">Forward missed calls to your TradeDesk number so the AI picks up automatically.</p>
              </div>

              <div className="space-y-3">
                {/* iPhone */}
                <div className="glass rounded-xl p-4 border border-white/8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-gray-900 border border-white/10 rounded-xl flex items-center justify-center">
                      <Smartphone size={16} className="text-blue-400" />
                    </div>
                    <span className="font-semibold text-white">iPhone</span>
                  </div>
                  <ol className="space-y-2 text-sm text-gray-300">
                    <li className="flex gap-2.5"><span className="text-blue-400 font-bold w-4 flex-shrink-0">1.</span> Go to <strong className="text-white">Settings → Phone → Call Forwarding</strong></li>
                    <li className="flex gap-2.5"><span className="text-blue-400 font-bold w-4 flex-shrink-0">2.</span> Toggle <strong className="text-white">Call Forwarding ON</strong></li>
                    <li className="flex gap-2.5"><span className="text-blue-400 font-bold w-4 flex-shrink-0">3.</span> Enter your TradeDesk number as the forwarding number</li>
                    <li className="flex gap-2.5"><span className="text-blue-400 font-bold w-4 flex-shrink-0">4.</span> ✅ Done — missed calls now go to your AI</li>
                  </ol>
                </div>

                {/* Android */}
                <div className="glass rounded-xl p-4 border border-white/8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-gray-900 border border-white/10 rounded-xl flex items-center justify-center">
                      <Phone size={16} className="text-green-400" />
                    </div>
                    <span className="font-semibold text-white">Android</span>
                  </div>
                  <ol className="space-y-2 text-sm text-gray-300">
                    <li className="flex gap-2.5"><span className="text-blue-400 font-bold w-4 flex-shrink-0">1.</span> Open Phone app → tap <strong className="text-white">⋮ → Settings</strong></li>
                    <li className="flex gap-2.5"><span className="text-blue-400 font-bold w-4 flex-shrink-0">2.</span> Go to <strong className="text-white">Supplementary services → Call forwarding</strong></li>
                    <li className="flex gap-2.5"><span className="text-blue-400 font-bold w-4 flex-shrink-0">3.</span> Select <strong className="text-white">"Forward when unanswered"</strong></li>
                    <li className="flex gap-2.5"><span className="text-blue-400 font-bold w-4 flex-shrink-0">4.</span> Enter your TradeDesk number and confirm</li>
                  </ol>
                </div>

                {/* USSD tip */}
                <div className="glass rounded-xl p-3.5 border border-blue-500/20 bg-blue-500/5">
                  <p className="text-xs text-gray-400">
                    <span className="text-blue-400 font-medium">💡 Tip:</span> Your TradeDesk number will be shown in <strong className="text-white">Settings → Phone number</strong> once active. You can also use USSD:{' '}
                    <code className="bg-black/50 px-1.5 py-0.5 rounded text-blue-300 text-xs">**61*[YOUR_NUMBER]#</code>
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="secondary" onClick={() => setStep(1)} size="lg" className="flex-1">Back</Button>
                <Button onClick={handleFinish} size="lg" loading={loading} className="flex-1">
                  Finish setup
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 — Success! */}
          {step === 3 && (
            <div className="text-center space-y-6 animate-fade-in py-2">
              {/* Party icon */}
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <PartyPopper size={36} className="text-white" />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-2">You're live! 🎉</h2>
                <p className="text-gray-400 text-sm max-w-sm mx-auto">
                  TradeDesk is set up and ready. Here's your forwarding number — add it to your phone's call forwarding now.
                </p>
              </div>

              {/* TradeDesk number display */}
              <div className="glass rounded-xl p-5 border border-blue-500/30 bg-blue-500/5">
                <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-2">Your TradeDesk number</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl font-bold text-white tracking-wider">{tradeskNumber}</span>
                  <button
                    onClick={copyNumber}
                    className="w-8 h-8 glass rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:border-blue-500/40 transition-all duration-200"
                  >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Forward your missed calls to this number</p>
              </div>

              {/* What happens next */}
              <div className="text-left space-y-2">
                {[
                  { dot: 'bg-blue-400', text: 'AI answers any missed calls in under 2 seconds' },
                  { dot: 'bg-green-400', text: 'You\'ll get an SMS summary after every call' },
                  { dot: 'bg-purple-400', text: 'All calls and contacts appear in your dashboard' },
                ].map(({ dot, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${dot} flex-shrink-0`} />
                    <p className="text-sm text-gray-300">{text}</p>
                  </div>
                ))}
              </div>

              <Button onClick={() => navigate('/dashboard')} size="lg" className="w-full">
                Go to dashboard <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
