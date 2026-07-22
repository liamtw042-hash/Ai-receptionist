import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Home, Phone, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  useEffect(() => { document.title = '404 — Page Not Found | TradeDesk'; }, []);
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* nav */}
      <nav className="border-b border-white/8 px-5 py-4">
        <Link to="/" className="flex items-center gap-2 w-fit">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center"><Zap size={13} className="text-white" /></div>
          <span className="font-bold text-white">TradeDesk</span>
        </Link>
      </nav>

      {/* content */}
      <div className="flex-1 flex items-center justify-center px-5 py-20">
        <div className="text-center max-w-md">
          {/* animated glitch number */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-orange-500/10 rounded-full blur-3xl scale-150" />
            <div className="relative text-[120px] font-extrabold leading-none text-transparent bg-clip-text bg-gradient-to-br from-orange-400 to-orange-600">
              404
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Looks like this page went on a job</h1>
          <p className="text-gray-500 text-sm mb-10 leading-relaxed">
            The page you're looking for doesn't exist. Maybe it's out answering calls.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-6 py-3 rounded-xl transition-all"
              style={{ boxShadow: '0 0 20px rgba(59,130,246,0.3)' }}>
              <Home size={16} /> Back to home
            </Link>
            <Link to="/dashboard"
              className="inline-flex items-center gap-2 glass border border-white/10 hover:border-white/20 text-white font-medium px-6 py-3 rounded-xl transition-all">
              <Phone size={16} /> Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
