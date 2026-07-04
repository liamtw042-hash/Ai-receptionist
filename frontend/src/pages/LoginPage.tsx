import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, Eye, EyeOff, PhoneIncoming, MessageSquare, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* ═══════════════════════════════════════════════════════════════════════════
   LOGIN — Linear/Vercel auth pattern: split screen, form on the left, real
   product context (not marketing fluff) on the right, everything on the same
   near-black surface system as the app itself so logging in feels like
   stepping through a door, not visiting a different website.
   ═══════════════════════════════════════════════════════════════════════ */

/* Right-hand panel: a quiet dashboard vignette with slow drift (CSS keyframes
   in index.css would be overkill — inline animation respects reduced motion
   via the global media query that zeroes animation durations). */
function ProductPanel() {
  return (
    <div className="hidden lg:flex relative flex-col justify-center overflow-hidden border-l border-white/6 bg-ink-900 p-12">
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-500/[0.06] rounded-full blur-[110px] pointer-events-none" />

      <div className="relative max-w-sm mx-auto w-full" style={{ animation: 'slide-up 0.5s ease both' }}>
        {/* mini call card — same visual language as the real Calls page */}
        <div className="rounded-2xl border border-white/10 bg-ink-950 shadow-2xl shadow-black/50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/6">
            <span className="w-2 h-2 rounded-full bg-white/10" />
            <span className="w-2 h-2 rounded-full bg-white/10" />
            <span className="ml-2 text-[10px] text-gray-600 tracking-wide">while you were out</span>
            <span className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> AI live
            </span>
          </div>
          <div className="p-4 space-y-3">
            {[
              { name: 'Sharon M.', job: 'Burst pipe · quoted $890', badge: 'Emergency', badgeCls: 'text-red-400 bg-red-500/10 border-red-500/25' },
              { name: 'Tom R.', job: 'Blocked drain · Thurs 3pm', badge: 'Booked', badgeCls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' },
              { name: 'Priya S.', job: 'Hot water quote · $950–1,400', badge: 'Lead', badgeCls: 'text-orange-400 bg-orange-500/10 border-orange-500/25' },
            ].map(c => (
              <div key={c.name} className="flex items-center gap-3 rounded-xl border border-white/7 bg-white/[0.02] px-3.5 py-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <PhoneIncoming size={13} className="text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">{c.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{c.job}</p>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wide border px-1.5 py-0.5 rounded flex-shrink-0 ${c.badgeCls}`}>{c.badge}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-white/6 flex items-center gap-2 text-xs text-gray-500">
            <MessageSquare size={12} className="text-orange-400" /> 3 SMS summaries sent to your phone
          </div>
        </div>

        <p className="mt-8 text-sm text-gray-500 leading-relaxed">
          "Now I check the phone between jobs and there's a proper list of who rang and what
          they wanted."
        </p>
        <p className="mt-2 text-xs text-gray-600"><span className="text-gray-400 font-medium">Tanya K.</span> · Electrician, Sydney · early access</p>
      </div>
    </div>
  );
}

export function LoginPage() {
  useEffect(() => { document.title = 'Log in | TradeDesk'; }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSent(false);
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch {
      setError('That email and password don\'t match. Try again, or reset your password below.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) { setError('Type your email address in first, then hit reset.'); return; }
    try {
      await resetPassword(email);
      setResetSent(true);
      setError('');
    } catch {
      setError('Couldn\'t send the reset email — double-check the address.');
    }
  };

  return (
    <div className="min-h-screen bg-ink-950 text-white grid lg:grid-cols-2">
      {/* LEFT — form */}
      <div className="flex flex-col p-6 sm:p-10">
        <Link to="/" className="flex items-center gap-2.5 w-fit">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/25">
            <Zap size={15} className="text-black" fill="currentColor" />
          </div>
          <span className="font-bold text-lg tracking-tight">TradeDesk</span>
        </Link>

        <div className="flex-1 flex items-center">
          <div className="w-full max-w-sm mx-auto py-12">
            <h1 className="text-3xl font-black tracking-tight mb-2">Welcome back</h1>
            <p className="text-gray-500 text-sm mb-9">Your AI's been answering. Come see what it caught.</p>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="dave@smithsplumbing.com.au"
                  required
                  autoComplete="email"
                  autoFocus
                  className="w-full rounded-xl bg-white/4 border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all min-h-[48px]"
                />
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label htmlFor="login-password" className="text-sm font-medium text-gray-400">Password</label>
                  <button type="button" onClick={handleReset}
                    className="text-xs text-gray-600 hover:text-orange-400 transition-colors">
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full rounded-xl bg-white/4 border border-white/10 px-4 py-3 pr-11 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all min-h-[48px]"
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors p-0.5">
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {/* inline error, anchored to the field it belongs to */}
                {error && <p className="mt-2 text-xs text-red-400 leading-relaxed">{error}</p>}
                {resetSent && (
                  <p className="mt-2 text-xs text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle size={12} /> Reset email sent — check your inbox.
                  </p>
                )}
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 active:scale-[0.99] disabled:opacity-60 text-black font-bold py-3.5 rounded-xl transition-all min-h-[52px]">
                {loading
                  ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" aria-hidden="true" />
                  : <>Open my dashboard <ArrowRight size={16} /></>}
              </button>
            </form>

            <p className="text-sm text-gray-600 mt-9">
              New here?{' '}
              <Link to="/signup" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
                Start your free trial
              </Link>
            </p>
          </div>
        </div>
      </div>

      <ProductPanel />
    </div>
  );
}
