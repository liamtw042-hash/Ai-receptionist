import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Zap, ChevronDown, Search, Phone, Settings, MessageSquare, CreditCard, SearchX } from 'lucide-react';

const SECTIONS = [
  {
    icon: Phone,
    title: 'Getting started',
    articles: [
      { q: 'How do I set up call forwarding on my iPhone?', a: 'Go to Settings → Phone → Call Forwarding. Toggle it ON and enter your TradeDesk number. That\'s it — your AI will answer missed calls from that moment.' },
      { q: 'How do I set up call forwarding on Android?', a: 'Open the Phone app → tap ⋮ (three dots) → Settings → Supplementary Services → Call Forwarding → Forward when unanswered. Enter your TradeDesk number.' },
      { q: 'How long does setup take?', a: 'Most tradies are live in under 10 minutes. Sign up, enter your business details, get your number, set forwarding — done.' },
      { q: 'Can I test the AI before it goes live?', a: 'Yes — after setup, just call your TradeDesk number directly. You\'ll hear your AI in action and get a test SMS summary to your phone.' },
    ],
  },
  {
    icon: Settings,
    title: 'Account & settings',
    articles: [
      { q: 'How do I change what my AI says?', a: 'Log in → Settings → AI Configuration. Update your business name, services, pricing guide, and working hours. Changes take effect immediately.' },
      { q: 'How do I update my pricing?', a: 'Settings → AI Configuration → Pricing Guide. Enter your services and rates. The AI will use these to give callers accurate quotes.' },
      { q: 'Can I pause the AI when I\'m available?', a: 'Yes — you can pause call forwarding on your phone whenever you want to take calls directly, and re-enable it when you\'re back on the tools.' },
    ],
  },
  {
    icon: MessageSquare,
    title: 'Calls & SMS',
    articles: [
      { q: 'Where do I see my call transcripts?', a: 'Dashboard → Calls. Every call is recorded with a full transcript and AI-generated summary. You can search and filter by date or outcome.' },
      { q: 'Why didn\'t I get an SMS after a call?', a: 'Make sure your mobile number is set in Settings → Profile. If the number is correct and you\'re still not getting SMS, contact support at liamtw042@gmail.com' },
      { q: 'What happens in an emergency call?', a: 'The AI detects urgent language (flooding, fire, live wire, etc.) and immediately sends you an urgent SMS alert — separate from the standard call summary.' },
    ],
  },
  {
    icon: CreditCard,
    title: 'Billing',
    articles: [
      { q: 'When does my trial end?', a: 'Your 7-day trial starts the moment you sign up. You won\'t be charged until day 8, and only if you choose to continue. No credit card is required upfront.' },
      { q: 'How do I cancel?', a: 'Settings → Billing → Cancel subscription. Your account stays active until the end of your billing period. No lock-in, no penalty, no drama.' },
      { q: 'What\'s the 30-day money-back guarantee?', a: 'If you\'re not satisfied within 30 days of your first charge, we\'ll refund you in full — no questions asked. Email liamtw042@gmail.com' },
    ],
  },
];

function HelpSection({ section, searchActive }: { section: { icon: typeof Phone; title: string; articles: { q: string; a: string }[] }; searchActive: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const Icon = section.icon;
  return (
    <div className="glass rounded-2xl p-6 border border-white/8">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-orange-500/15 rounded-xl flex items-center justify-center"><Icon size={16} className="text-orange-400" /></div>
        <h2 className="font-bold text-white">{section.title}</h2>
      </div>
      <div className="space-y-2">
        {section.articles.map((a, i) => {
          const isOpen = searchActive || open === i;
          return (
            <div key={i} className="rounded-xl overflow-hidden border border-white/6">
              <button onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-start justify-between gap-3 px-4 py-3.5 text-left hover:bg-white/3 transition-colors">
                <span className="text-sm font-medium text-white">{a.q}</span>
                <ChevronDown size={14} className={`text-gray-500 flex-shrink-0 mt-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-48' : 'max-h-0'}`}>
                <p className="px-4 pb-4 text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-3">{a.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HelpPage() {
  useEffect(() => { document.title = 'Help | TradeDesk'; }, []);
  const [search, setSearch] = useState('');

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS
      .map(s => ({ ...s, articles: s.articles.filter(a => a.q.toLowerCase().includes(q) || a.a.toLowerCase().includes(q)) }))
      .filter(s => s.articles.length > 0);
  }, [search]);

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-white/8 px-4 h-16 flex items-center max-w-7xl mx-auto justify-between">
        <Link to="/" className="flex items-center gap-2"><div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center"><Zap size={14} className="text-white" /></div><span className="font-bold">TradeDesk</span></Link>
        <Link to="/signup" className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Get started</Link>
      </nav>
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-20">
        <div className="text-center mb-10">
          <p className="text-orange-400 text-xs font-semibold uppercase tracking-widest mb-3">Help centre</p>
          <h1 className="text-4xl font-black mb-4">How can we help?</h1>
          <div className="relative max-w-md mx-auto">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search help articles…"
              className="glass w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/60" />
          </div>
        </div>
        {filteredSections.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-5 mb-12">
            {filteredSections.map(s => <HelpSection key={s.title} section={s} searchActive={search.trim().length > 0} />)}
          </div>
        ) : (
          <div className="glass rounded-2xl p-10 border border-white/8 text-center mb-12">
            <SearchX size={28} className="text-gray-700 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-400">No articles match "{search}"</p>
            <p className="text-xs text-gray-600 mt-1">Try a different search, or email us below.</p>
          </div>
        )}
        <div className="glass rounded-2xl p-8 border border-white/8 text-center">
          <h2 className="text-xl font-bold mb-2">Still stuck?</h2>
          <p className="text-gray-400 text-sm mb-5">Our Australian support team replies within 2 hours on weekdays.</p>
          <a href="mailto:liamtw042@gmail.com" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
            Email support
          </a>
        </div>
      </div>
    </div>
  );
}
