import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Check, CheckCircle, ArrowRight, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const TRADES = ['Plumber', 'Electrician', 'Builder', 'Carpenter', 'Painter', 'Landscaper', 'Roofer', 'Tiler', 'Locksmith', 'HVAC', 'Other'];

const FEATURES = [
  'AI answers calls 24/7 in under 2 seconds',
  'Australian English voice',
  'Gives accurate quotes to callers',
  'Books jobs and takes messages',
  'SMS summary after every call',
  'Emergency detection + urgent alerts',
  'Missed call text-back (60 seconds)',
  'Full call transcripts + dashboard',
  'Gmail auto-reply integration',
  'Two-way SMS inbox',
  'Setup support included',
];

export function SignupPage() {
  useEffect(() => { document.title = 'Start Free Trial | TradeDesk'; }, []);
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [tradeType, setTradeType] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Password strength
  const getPasswordStrength = (pw: string) => {
    if (!pw) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 2) return { score, label: 'Fair', color: 'bg-yellow-500' };
    if (score <= 3) return { score, label: 'Good', color: 'bg-blue-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
  };
  const pwStrength = getPasswordStrength(password);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!tradeType) { setError('Please select your trade type.'); return; }
    setLoading(true);
    try {
      await signUp(email, password);
      // Store pre-fill data for onboarding
      localStorage.setItem('td_onboard', JSON.stringify({ fullName, businessName, tradeType, phone }));
      navigate('/welcome');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('email-already-in-use')) {
        setError('An account with this email already exists.');
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Promo banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white text-center py-2.5 px-4 text-sm font-medium">
        <span className="opacity-80">🎉</span>{' '}
        <strong>Get your first month free</strong> — no credit card required to start.{' '}
        <span className="opacity-80">Use code <strong>FIRSTMONTH</strong> at checkout.</span>
      </div>

      <div className="min-h-[calc(100vh-40px)] flex items-center justify-center p-4 py-10">
        <div className="w-full max-w-5xl animate-slide-up">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center blue-glow">
              <Zap size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">TradeDesk</span>
          </div>

          <div className="grid lg:grid-cols-2 gap-0 glass rounded-2xl overflow-hidden border border-white/10">
            {/* LEFT — Plan */}
            <div className="hidden lg:flex bg-gradient-to-br from-blue-600/20 via-blue-500/10 to-transparent border-r border-white/8 p-8 lg:p-10 flex-col">
              {/* Trial badge */}
              <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold px-3 py-1.5 rounded-full w-fit mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                7-DAY FREE TRIAL
              </div>

              <h2 className="text-2xl font-bold text-white mb-1">TradeDesk Pro</h2>
              <p className="text-gray-400 text-sm mb-5">Everything you need to never miss a job again</p>

              <div className="mb-6">
                <div className="flex items-end gap-1.5">
                  <span className="text-4xl font-extrabold text-white">$199</span>
                  <span className="text-gray-400 mb-1">/month AUD</span>
                </div>
                <p className="text-xs text-blue-400 font-medium mt-1">First month free with code FIRSTMONTH</p>
              </div>

              <ul className="space-y-2.5 flex-1">
                {FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-3 text-sm text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={11} className="text-blue-400" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-8 pt-6 border-t border-white/8 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <CheckCircle size={13} className="text-green-400 flex-shrink-0" />
                  No credit card required to start trial
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <CheckCircle size={13} className="text-green-400 flex-shrink-0" />
                  Cancel any time — no lock-in contracts
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <CheckCircle size={13} className="text-green-400 flex-shrink-0" />
                  30-day money-back guarantee
                </div>
              </div>
            </div>

            {/* RIGHT — Form */}
            <div className="p-6 sm:p-8 lg:p-10">
              <h2 className="text-2xl font-bold text-white mb-1">Start your free trial</h2>
              <p className="text-gray-500 text-sm mb-6">Live in 10 minutes. No credit card needed.</p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-5">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Full name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Dave Smith"
                    required
                    autoComplete="name"
                  />
                  <Input
                    label="Business name"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="Smith's Plumbing"
                    required
                  />
                </div>

                {/* Trade type dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-300">Trade type</label>
                  <div className="relative">
                    <select
                      value={tradeType}
                      onChange={e => setTradeType(e.target.value)}
                      required
                      className="glass w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 transition-all duration-200 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 appearance-none pr-10 bg-transparent cursor-pointer"
                    >
                      <option value="" disabled className="bg-gray-900 text-gray-400">Select your trade…</option>
                      {TRADES.map(t => (
                        <option key={t} value={t} className="bg-gray-900 text-white">{t}</option>
                      ))}
                    </select>
                    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                </div>

                <Input
                  label="Mobile number"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+61 400 000 000"
                  required
                  autoComplete="tel"
                  hint="For SMS alerts when calls come in"
                />
                <Input
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="dave@smithsplumbing.com.au"
                  required
                  autoComplete="email"
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-300">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      required
                      autoComplete="new-password"
                      className="glass w-full rounded-lg px-4 py-2.5 pr-10 text-sm text-white placeholder-gray-500 transition-all duration-200 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40"
                    />
                    <button type="button" onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-0.5">
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {password && (
                    <div className="space-y-1">
                      <div className="flex gap-1 h-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${i <= pwStrength.score ? pwStrength.color : 'bg-white/10'}`} />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">Strength: <span className={`font-medium ${pwStrength.score >= 4 ? 'text-green-400' : pwStrength.score >= 3 ? 'text-blue-400' : pwStrength.score >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>{pwStrength.label}</span></p>
                    </div>
                  )}
                </div>

                <Button type="submit" size="lg" loading={loading} className="w-full mt-2 text-base py-3.5">
                  Start my free trial <ArrowRight size={16} />
                </Button>

                <p className="text-center text-xs text-gray-600">
                  No setup fees · Cancel anytime · Australian support
                </p>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
