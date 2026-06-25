import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Zap, Smartphone, Phone } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';

const TRADES = ['Plumber', 'Electrician', 'Builder', 'Carpenter', 'Painter', 'Tiler', 'Landscaper', 'Roofer', 'Hvac', 'Locksmith', 'Other'];

const steps = ['Business details', 'Services & pricing', 'Call forwarding'];

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
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

  const handleNext = () => setStep(s => s + 1);

  const handleFinish = async () => {
    setLoading(true);
    try {
      await api.put('/settings', {
        ...form,
        services: form.services.split(',').map(s => s.trim()).filter(Boolean),
        onboardingComplete: true,
      });
      navigate('/');
    } catch {
      // still navigate — settings can be fixed later
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center blue-glow">
            <Zap size={20} className="text-white" />
          </div>
          <h1 className="font-bold text-xl text-white">Let's set up TradeDesk</h1>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                i < step ? 'bg-blue-500 text-white' : i === step ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50' : 'bg-white/5 text-gray-600'
              }`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i === step ? 'text-white font-medium' : 'text-gray-600'}`}>{s}</span>
              {i < steps.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-blue-500' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-8">
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
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        form.tradeType === t ? 'bg-blue-500 text-white' : 'glass text-gray-400 hover:text-white'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <Input label="Suburb / area" value={form.suburb} onChange={e => update('suburb', e.target.value)} placeholder="Bondi, Sydney" />
              <Input label="Your mobile (for SMS alerts)" type="tel" value={form.mobileNumber} onChange={e => update('mobileNumber', e.target.value)} placeholder="+61400000000" />
              <Button onClick={handleNext} size="lg" className="w-full" disabled={!form.businessName || !form.traderName || !form.tradeType}>
                Next <ChevronRight size={16} />
              </Button>
            </div>
          )}

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
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(0)} size="lg" className="flex-1">Back</Button>
                <Button onClick={handleNext} size="lg" className="flex-1" disabled={!form.services}>
                  Next <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold text-white mb-2">Set up call forwarding</h2>
              <p className="text-gray-400 text-sm">Forward missed calls to your TradeDesk number so the AI picks up automatically.</p>

              <div className="space-y-4">
                <div className="glass rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center"><Smartphone size={16} className="text-blue-400" /></div>
                    <span className="font-semibold text-white">iPhone</span>
                  </div>
                  <ol className="space-y-2 text-sm text-gray-300">
                    <li className="flex gap-2"><span className="text-blue-400 font-bold">1.</span> Go to <strong>Settings → Phone → Call Forwarding</strong></li>
                    <li className="flex gap-2"><span className="text-blue-400 font-bold">2.</span> Toggle <strong>Call Forwarding ON</strong></li>
                    <li className="flex gap-2"><span className="text-blue-400 font-bold">3.</span> Enter your TradeDesk number as the forwarding number</li>
                    <li className="flex gap-2"><span className="text-blue-400 font-bold">4.</span> Done! Missed calls now go to your AI</li>
                  </ol>
                </div>

                <div className="glass rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center"><Phone size={16} className="text-green-400" /></div>
                    <span className="font-semibold text-white">Android</span>
                  </div>
                  <ol className="space-y-2 text-sm text-gray-300">
                    <li className="flex gap-2"><span className="text-blue-400 font-bold">1.</span> Open the Phone app → tap <strong>⋮ → Settings</strong></li>
                    <li className="flex gap-2"><span className="text-blue-400 font-bold">2.</span> Go to <strong>Supplementary services → Call forwarding</strong></li>
                    <li className="flex gap-2"><span className="text-blue-400 font-bold">3.</span> Select <strong>"Forward when unanswered"</strong></li>
                    <li className="flex gap-2"><span className="text-blue-400 font-bold">4.</span> Enter your TradeDesk number and confirm</li>
                  </ol>
                </div>

                <div className="glass rounded-xl p-4 border border-blue-500/30">
                  <p className="text-sm text-gray-400">
                    <span className="text-blue-400 font-medium">Your TradeDesk number</span> will be shown in{' '}
                    <strong className="text-white">Settings → Phone number</strong> once your account is active.
                    You can also use USSD code: <code className="bg-black/50 px-1.5 py-0.5 rounded text-blue-300">**61*[YOUR_NUMBER]#</code>
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(1)} size="lg" className="flex-1">Back</Button>
                <Button onClick={handleFinish} size="lg" loading={loading} className="flex-1">
                  Go to dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
