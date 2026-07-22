import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function WelcomePage() {
  useEffect(() => { document.title = 'Welcome to TradeDesk!'; }, []);
  const navigate = useNavigate();
  const { user } = useAuth();

  const firstName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Glow bg */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(59,130,246,0.12),transparent)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/8 rounded-full blur-[80px] animate-pulse pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center px-4 animate-slide-up">
        {/* Logo */}
        <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-orange-500/30">
          <Zap size={36} className="text-white" />
        </div>

        <p className="text-orange-400 text-sm font-semibold uppercase tracking-widest mb-3">Welcome aboard 🎉</p>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
          Welcome to TradeDesk,<br />
          <span className="text-gradient">{firstName}!</span>
        </h1>

        <p className="text-gray-400 text-base sm:text-lg max-w-md mb-10 leading-relaxed">
          You're minutes away from having an AI receptionist that answers every call, books jobs, and keeps you in the loop — all while you're on the tools.
        </p>

        {/* Steps preview */}
        <div className="flex flex-col sm:flex-row gap-4 mb-10 text-left w-full max-w-lg">
          {[
            { n: '1', label: 'Tell us about your business', sub: 'Name, trade, pricing' },
            { n: '2', label: 'Get your number', sub: 'Your AI receptionist number' },
            { n: '3', label: "You're live!", sub: 'AI answers in < 2 seconds' },
          ].map(({ n, label, sub }) => (
            <div key={n} className="flex-1 glass rounded-xl p-4 border border-white/8">
              <span className="text-xs font-bold text-orange-400 mb-2 block">Step {n}</span>
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/onboarding')}
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all min-h-[56px]"
          style={{ boxShadow: '0 0 32px rgba(59,130,246,0.4)' }}
        >
          Let's get started <ArrowRight size={20} />
        </button>

        <p className="text-xs text-gray-600 mt-4">Takes about 5 minutes · No technical knowledge needed</p>
      </div>
    </div>
  );
}
