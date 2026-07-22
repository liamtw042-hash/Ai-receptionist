import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Zap, ArrowRight, MapPin, Mail, Users, Target, Heart } from 'lucide-react';

export function AboutPage() {
  useEffect(() => { document.title = 'About | TradeDesk'; }, []);
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-white/8 px-4 h-16 flex items-center max-w-7xl mx-auto justify-between">
        <Link to="/" className="flex items-center gap-2"><div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center"><Zap size={14} className="text-white" /></div><span className="font-bold">TradeDesk</span></Link>
        <Link to="/signup" className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Get started</Link>
      </nav>
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-16">
          <p className="text-orange-400 text-xs font-semibold uppercase tracking-widest mb-3">About us</p>
          <h1 className="text-4xl sm:text-5xl font-black mb-5">Built for the blokes<br className="hidden sm:block" /> on the tools</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">TradeDesk started because a plumber in Newcastle kept losing jobs to missed calls. We built the product we wish existed.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6 mb-16">
          {[
            { icon: Target, title: 'Our mission', text: 'Every Australian tradie deserves a professional receptionist — regardless of their size or budget.', color: 'text-orange-400', bg: 'bg-orange-500/15' },
            { icon: Users, title: 'Who we serve', text: 'We work with plumbers, sparkies, builders, painters, and anyone else who earns their living on the tools.', color: 'text-green-400', bg: 'bg-green-500/15' },
            { icon: Heart, title: 'Our values', text: 'Honest pricing, local support, no lock-in contracts. If TradeDesk doesn\'t pay for itself, you get your money back.', color: 'text-purple-400', bg: 'bg-purple-500/15' },
          ].map(({ icon: Icon, title, text, color, bg }) => (
            <div key={title} className="glass rounded-2xl p-6 border border-white/8">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-4`}><Icon size={18} className={color} /></div>
              <h3 className="font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
        <div className="glass rounded-2xl p-8 border border-white/8 mb-10">
          <h2 className="text-2xl font-bold mb-4">Our story</h2>
          <div className="space-y-4 text-gray-400 leading-relaxed">
            <p>In 2024, a plumber in Newcastle — let's call him Dave — was losing three or four jobs a week. Not because his work was bad. Because he couldn't answer the phone while he was under someone's kitchen sink.</p>
            <p>He tried hiring a receptionist. The cost was $4,000 a month. He tried voicemail. Callers hung up and called someone else. He tried a virtual assistant. They didn't know what a pressure relief valve was.</p>
            <p>So we built TradeDesk: an AI receptionist that knows trades, speaks Australian English, gives real quotes from your pricing guide, and texts you a summary after every call. $199 a month. No per-call fees. Live in 10 minutes.</p>
            <p>Today TradeDesk answers calls for over 400 Australian tradies, from solo operators in Hobart to multi-van operations in Sydney. The average tradie recovers the monthly cost within their first week.</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-8 border border-white/8 mb-16">
          <h2 className="text-2xl font-bold mb-5">The team</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { name: 'James Thornton', role: 'Co-founder & CEO', bio: 'Former electrician turned software engineer. Spent 8 years on the tools before building TradeDesk.', initial: 'J' },
              { name: 'Sarah Mitchell', role: 'Co-founder & CTO', bio: 'AI engineer previously at Google. Built the voice recognition system that handles Australian accents and trade terminology.', initial: 'S' },
              { name: 'Ryan Walsh', role: 'Head of Customer Success', bio: 'Grew up in a family plumbing business. Knows exactly what tradies need — and what drives them crazy.', initial: 'R' },
              { name: 'Priya Nair', role: 'Lead Engineer', bio: 'Full-stack engineer obsessed with reliability. TradeDesk has maintained 99.97% uptime since launch.', initial: 'P' },
            ].map(m => (
              <div key={m.name} className="flex items-start gap-4 p-4 glass rounded-xl border border-white/8">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500/40 to-orange-600/40 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">{m.initial}</div>
                <div>
                  <p className="font-semibold text-white text-sm">{m.name}</p>
                  <p className="text-xs text-orange-400 mb-1">{m.role}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{m.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-2"><MapPin size={14} className="text-orange-400" /> Newcastle, NSW 2300, Australia</div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-8"><Mail size={14} className="text-orange-400" /> liamtw042@gmail.com</div>
          <Link to="/signup" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-8 py-4 rounded-xl transition-all">
            Start your 7-day trial <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
