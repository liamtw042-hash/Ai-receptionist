import { useState, useEffect, useRef, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle, MessageSquare, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* ═══════════════════════════════════════════════════════════════════════════
   SIGNUP — two steps (Better Stack / Amie pattern: email is the whole first
   ask, because every extra field up front costs signups). Step 2 collects the
   minimum to create the account — password + business name — and everything
   else waits for onboarding, where it belongs.

   Honesty notes vs the old page: the fake "FIRSTMONTH promo code" banner is
   gone (no such code exists in billing), and the trade/phone fields moved to
   onboarding where they're actually used.
   ═══════════════════════════════════════════════════════════════════════ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function ValuePanel() {
  return (
    <div className="hidden lg:flex relative flex-col justify-center overflow-hidden border-l border-white/6 bg-ink-900 p-12">
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-orange-500/[0.06] rounded-full blur-[110px] pointer-events-none" />

      <div className="relative max-w-sm mx-auto w-full">
        {/* the SMS you'll get — the product's payoff, shown not told */}
        <div className="rounded-2xl border border-white/10 bg-ink-950 shadow-2xl shadow-black/50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-600 mb-3">Your first SMS summary</p>
          <div className="rounded-2xl rounded-tl-md border border-white/8 bg-white/[0.04] px-4 py-3">
            <p className="text-[13px] text-gray-300 leading-relaxed">
              <span className="text-white font-semibold">New lead:</span> Sharon, Merewether. Burst pipe —
              water off at mains. Quoted <span className="text-orange-300 font-semibold">$890</span> from
              your call-out rate. Wants you today. 0412 087 336
            </p>
          </div>
          <p className="text-[10px] text-gray-600 mt-2.5 font-mono">Delivered 40 seconds after the call</p>
        </div>

        <div className="mt-9 space-y-4">
          {[
            { icon: Phone, text: 'Answers as your business in under 2 seconds' },
            { icon: MessageSquare, text: 'Quotes from the price list you type in' },
            { icon: CheckCircle, text: '$199/month after the trial · no lock-in · cancel any time' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                <Icon size={13} className="text-orange-400" />
              </div>
              <p className="text-sm text-gray-400 leading-relaxed pt-0.5">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SignupPage() {
  useEffect(() => { document.title = 'Start free trial | TradeDesk'; }, []);

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [businessError, setBusinessError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  // focus the first field of step 2 when it appears
  useEffect(() => {
    if (step === 2) passwordRef.current?.focus();
  }, [step]);

  const continueToStep2 = (e: FormEvent) => {
    e.preventDefault();
    const clean = email.trim();
    if (!EMAIL_RE.test(clean)) {
      setEmailError("That doesn't look like an email address — check it and try again.");
      return;
    }
    setEmailError('');
    setStep(2);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    let bad = false;
    if (password.length < 8) { setPasswordError('At least 8 characters.'); bad = true; }
    if (!businessName.trim()) { setBusinessError("What's the business called? This is how the AI answers your phone."); bad = true; }
    if (bad) return;

    setLoading(true);
    try {
      await signUp(email.trim(), password);
      // Pre-fill onboarding with what we know; the rest is collected there.
      localStorage.setItem('td_onboard', JSON.stringify({ businessName: businessName.trim() }));
      navigate('/onboarding');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('email-already-in-use')) {
        setStep(1);
        setEmailError('An account with this email already exists — log in instead?');
      } else if (message.includes('weak-password')) {
        setPasswordError('Firebase reckons that password is too weak — try a longer one.');
      } else {
        setPasswordError('Could not create the account. Give it another go in a moment.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full rounded-xl bg-white/4 border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all min-h-[48px]';

  return (
    <div className="min-h-screen bg-ink-950 text-white grid lg:grid-cols-2">
      {/* LEFT — form */}
      <div className="flex flex-col p-6 sm:p-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 w-fit">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Zap size={15} className="text-black" fill="currentColor" />
            </div>
            <span className="font-bold text-lg tracking-tight">TradeDesk</span>
          </Link>
          {/* two-dot step indicator */}
          <div className="flex items-center gap-1.5" aria-label={`Step ${step} of 2`}>
            <span className={`h-1.5 rounded-full transition-all duration-300 ${step === 1 ? 'w-6 bg-orange-500' : 'w-3 bg-orange-500/40'}`} />
            <span className={`h-1.5 rounded-full transition-all duration-300 ${step === 2 ? 'w-6 bg-orange-500' : 'w-3 bg-white/15'}`} />
          </div>
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full max-w-sm mx-auto py-12">
            {step === 1 ? (
              <div className="animate-fade-in">
                <h1 className="text-3xl font-black tracking-tight mb-2">Start free. Just an email.</h1>
                <p className="text-gray-500 text-sm mb-9">7 days free · no credit card · live in about 10 minutes.</p>

                <form onSubmit={continueToStep2} className="space-y-5" noValidate>
                  <div>
                    <label htmlFor="signup-email" className="block text-sm font-medium text-gray-400 mb-1.5">Work email</label>
                    <input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                      placeholder="dave@smithsplumbing.com.au"
                      required
                      autoComplete="email"
                      autoFocus
                      className={inputCls}
                    />
                    {emailError && (
                      <p className="mt-2 text-xs text-red-400 leading-relaxed">
                        {emailError}{' '}
                        {emailError.includes('already exists') && (
                          <Link to="/login" className="text-orange-400 hover:text-orange-300 font-medium">Log in →</Link>
                        )}
                      </p>
                    )}
                  </div>

                  <button type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 active:scale-[0.99] text-black font-bold py-3.5 rounded-xl transition-all min-h-[52px]">
                    Continue <ArrowRight size={16} />
                  </button>

                  <p className="text-xs text-gray-600 text-center">No credit card required · cancel any time</p>
                </form>
              </div>
            ) : (
              <div className="animate-fade-in">
                <button onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-300 transition-colors mb-6">
                  <ArrowLeft size={13} /> {email}
                </button>
                <h1 className="text-3xl font-black tracking-tight mb-2">Nearly there.</h1>
                <p className="text-gray-500 text-sm mb-9">A password, and the name the AI should answer with.</p>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div>
                    <label htmlFor="signup-password" className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
                    <div className="relative">
                      <input
                        ref={passwordRef}
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
                        placeholder="At least 8 characters"
                        required
                        autoComplete="new-password"
                        className={`${inputCls} pr-11`}
                      />
                      <button type="button" onClick={() => setShowPassword(s => !s)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors p-0.5">
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {passwordError
                      ? <p className="mt-2 text-xs text-red-400">{passwordError}</p>
                      : password.length > 0 && password.length < 8 && (
                          <p className="mt-2 text-xs text-gray-600">{8 - password.length} more character{8 - password.length !== 1 ? 's' : ''}…</p>
                        )}
                  </div>

                  <div>
                    <label htmlFor="signup-business" className="block text-sm font-medium text-gray-400 mb-1.5">Business name</label>
                    <input
                      id="signup-business"
                      value={businessName}
                      onChange={e => { setBusinessName(e.target.value); setBusinessError(''); }}
                      placeholder="Smith's Plumbing"
                      required
                      className={inputCls}
                    />
                    {businessError
                      ? <p className="mt-2 text-xs text-red-400">{businessError}</p>
                      : <p className="mt-2 text-xs text-gray-600">"G'day, you've reached {businessName.trim() || 'Smith\'s Plumbing'}…"</p>}
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 active:scale-[0.99] disabled:opacity-60 text-black font-bold py-3.5 rounded-xl transition-all min-h-[52px]">
                    {loading
                      ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" aria-hidden="true" />
                      : <>Create my receptionist <ArrowRight size={16} /></>}
                  </button>
                </form>
              </div>
            )}

            <p className="text-sm text-gray-600 mt-9">
              Already set up?{' '}
              <Link to="/login" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">Log in</Link>
            </p>
          </div>
        </div>
      </div>

      <ValuePanel />
    </div>
  );
}
