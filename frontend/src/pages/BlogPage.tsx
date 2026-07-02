import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Zap, Clock } from 'lucide-react';

const POSTS = [
  {
    slug: 'missed-calls-cost',
    title: 'How much are missed calls actually costing Australian tradies?',
    excerpt: 'The average tradie misses 3–4 calls a day. At $350 per job and a 25% conversion rate, that\'s over $13,000 in lost revenue every month. Here\'s the maths.',
    author: 'James Thornton',
    date: 'June 12, 2026',
    readTime: '5 min read',
    category: 'Business',
    img: '💰',
  },
  {
    slug: 'ai-receptionist-tradies',
    title: 'Why AI receptionists are the best hire a tradie can make in 2026',
    excerpt: 'A human receptionist costs $4,000 a month and works 9–5. An AI receptionist costs $199 and works around the clock. Here\'s what that means for your business.',
    author: 'Sarah Mitchell',
    date: 'May 28, 2026',
    readTime: '7 min read',
    category: 'Technology',
    img: '🤖',
  },
  {
    slug: 'call-forwarding-setup',
    title: 'The 2-minute guide to setting up call forwarding on iPhone and Android',
    excerpt: 'Getting your missed calls forwarded to TradeDesk takes about 2 minutes on any phone. Here\'s exactly how to do it, step by step.',
    author: 'Ryan Walsh',
    date: 'May 14, 2026',
    readTime: '3 min read',
    category: 'How-to',
    img: '📱',
  },
];

export function BlogPage() {
  useEffect(() => { document.title = 'Blog | TradeDesk'; }, []);
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-white/8 px-4 h-16 flex items-center max-w-7xl mx-auto justify-between">
        <Link to="/" className="flex items-center gap-2"><div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center"><Zap size={14} className="text-white" /></div><span className="font-bold">TradeDesk</span></Link>
        <Link to="/signup" className="bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Get started</Link>
      </nav>
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-12">
          <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">Blog</p>
          <h1 className="text-4xl font-black mb-4">Tips for tradies</h1>
          <p className="text-gray-400">Business advice, tech guides, and industry insights for Australian trades.</p>
        </div>
        <div className="space-y-6">
          {POSTS.map(post => (
            <div key={post.slug} className="glass rounded-2xl p-6 sm:p-8 border border-white/8 hover:border-white/15 transition-all group">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 glass rounded-xl flex items-center justify-center text-3xl flex-shrink-0 border border-white/8 group-hover:scale-110 transition-transform">{post.img}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">{post.category}</span>
                    <span className="text-xs text-gray-600 flex items-center gap-1"><Clock size={10} /> {post.readTime}</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">{post.title}</h2>
                  <p className="text-sm text-gray-400 leading-relaxed mb-4">{post.excerpt}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500/40 to-purple-500/40 rounded-full flex items-center justify-center text-xs font-bold text-white">{post.author[0]}</div>
                    <span className="text-xs text-gray-500">{post.author} · {post.date}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
