import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, Phone, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const STATS = [
  { icon: Clock, value: '< 2 sec', label: 'Answer time', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  { icon: Phone, value: '24/7', label: 'Always on', color: 'text-green-400', bg: 'bg-green-500/15' },
  { icon: TrendingUp, value: '0', label: 'Missed jobs', color: 'text-purple-400', bg: 'bg-purple-500/15' },
];

// Subtle animated ring element
function PulseRing({ size, delay, opacity }: { size: number; delay: number; opacity: number }) {
  return (
    <div
      className="absolute rounded-full border border-blue-500/20"
      style={{
        width: size,
        height: size,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        animation: `ping 3s ${delay}s cubic-bezier(0, 0, 0.2, 1) infinite`,
        opacity,
      }}
    />
  );
}

export function LoginPage() {
  useEffect(() => { document.title = 'Log in | TradeDesk'; }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) { setError('Enter your email address first.'); return; }
    try {
      await resetPassword(email);
      setResetSent(true);
      setError('');
    } catch {
      setError('Failed to send reset email. Check the address and try again.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="min-h-screen flex items-center justify-center p-4 py-10">
        <div className="w-full max-w-4xl animate-slide-up">

          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center blue-glow">
              <Zap size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">TradeDesk</span>
          </div>

          <div className="grid lg:grid-cols-2 gap-0 glass rounded-2xl overflow-hidden border border-white/10">

            {/* LEFT — Branding */}
            <div className="relative bg-gradient-to-br from-blue-600/20 via-blue-500/10 to-transparent border-r border-white/8 p-8 lg:p-12 flex flex-col justify-between overflow-hidden">

              {/* Animated pulse rings behind the icon */}
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <PulseRing size={120} delay={0}   opacity={0.5} />
                <PulseRing size={200} delay={0.8} opacity={0.3} />
                <PulseRing size={300} delay={1.6} opacity={0.15} />
              </div>

              {/* Radial glow */}
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

              <div className="relative z-10">
                {/* Big icon */}
                <div className="relative w-16 h-16 mb-8">
                  <div className="absolute inset-0 bg-blue-500/30 rounded-2xl blur-xl" />
                  <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Zap size={28} className="text-white" />
                  </div>
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3">
                  Welcome back.
                </h1>
                <p className="text-gray-400 text-base leading-relaxed max-w-xs">
                  Your AI receptionist is on the job — answering calls, giving quotes, and locking in jobs while you work.
                </p>
              </div>

              {/* Stats */}
              <div className="relative z-10 mt-10 space-y-3">
                {STATS.map(({ icon: Icon, value, label, color, bg }) => (
                  <div key={label} className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                      <Icon size={17} className={color} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom tagline */}
              <div className="relative z-10 mt-8 pt-6 border-t border-white/8">
                <p className="text-xs text-gray-600">
                  Trusted by tradies across Australia 🇦🇺
                </p>
              </div>
            </div>

            {/* RIGHT — Form */}
            <div className="p-8 lg:p-12 flex flex-col justify-center">
              <h2 className="text-2xl font-bold text-white mb-1">Sign in</h2>
              <p className="text-gray-500 text-sm mb-8">Access your dashboard and call history</p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-5">
                  {error}
                </div>
              )}

              {resetSent && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-lg mb-5">
                  Password reset email sent — check your inbox.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="dave@smithsplumbing.com.au"
                  required
                  autoComplete="email"
                />
                <div>
                  <Input
                    label="Password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors duration-200"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <Button type="submit" size="lg" loading={loading} className="w-full mt-2 text-base py-3.5">
                  Sign in <ArrowRight size={16} />
                </Button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-8">
                No account?{' '}
                <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200">
                  Get started free →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
