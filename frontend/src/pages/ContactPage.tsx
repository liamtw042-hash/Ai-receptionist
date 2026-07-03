import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Mail, MapPin, Clock, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { publicPost } from '../lib/api';

export function ContactPage() {
  useEffect(() => { document.title = 'Contact | TradeDesk'; }, []);
  const [form, setForm] = useState({ name: '', email: '', trade: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await publicPost<{ status: string }>('/contact-form', form);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-white/8 px-5 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center"><Zap size={13} className="text-white" /></div>
            <span className="font-bold text-white">TradeDesk</span>
          </Link>
          <Link to="/" className="text-sm text-gray-400 hover:text-white transition-colors">← Back to home</Link>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-5 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-3">Get in touch</h1>
          <p className="text-gray-500">Have a question? We're real humans. We reply fast.</p>
        </div>
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact info */}
          <div className="space-y-6">
            <div className="glass rounded-xl p-5 border border-white/8 flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail size={18} className="text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm mb-1">Email us</p>
                <a href="mailto:hello@tradedesk.com.au" className="text-blue-400 text-sm hover:underline">hello@tradedesk.com.au</a>
                <p className="text-xs text-gray-600 mt-1">We reply within 4 business hours</p>
              </div>
            </div>
            <div className="glass rounded-xl p-5 border border-white/8 flex items-start gap-4">
              <div className="w-10 h-10 bg-green-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin size={18} className="text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm mb-1">Location</p>
                <p className="text-gray-400 text-sm">Newcastle, NSW 2300</p>
                <p className="text-gray-600 text-xs mt-1">Australia 🇦🇺</p>
              </div>
            </div>
            <div className="glass rounded-xl p-5 border border-white/8 flex items-start gap-4">
              <div className="w-10 h-10 bg-yellow-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock size={18} className="text-yellow-400" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm mb-1">Support hours</p>
                <p className="text-gray-400 text-sm">Mon–Fri 8am–6pm AEST</p>
                <p className="text-gray-600 text-xs mt-1">TradeDesk itself answers 24/7 🤖</p>
              </div>
            </div>
            <div className="glass rounded-xl p-5 border border-blue-500/20 bg-blue-500/5">
              <p className="text-sm text-gray-300 mb-2 font-medium">Already a customer?</p>
              <p className="text-xs text-gray-500">Log in to your dashboard and use the live chat in the bottom right, or email us directly — we'll pull up your account automatically.</p>
              <Link to="/dashboard" className="inline-flex items-center gap-1 text-blue-400 text-xs mt-3 hover:underline">Go to dashboard →</Link>
            </div>
          </div>

          {/* Form */}
          <div className="glass rounded-2xl p-6 border border-white/8">
            {sent ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Message sent!</h3>
                <p className="text-gray-400 text-sm">We'll get back to you within 4 hours. Check your inbox.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-lg font-semibold text-white mb-5">Send us a message</h2>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dave Smith" required />
                  <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="dave@smithplumbing.com.au" required />
                </div>
                <Input label="Trade (optional)" value={form.trade} onChange={e => setForm(f => ({ ...f, trade: e.target.value }))} placeholder="Plumber, Electrician, etc." />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-300">Message</label>
                  <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    rows={5} required placeholder="What can we help with?"
                    className="glass rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 transition-all resize-none" />
                </div>
                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}
                <Button type="submit" loading={sending} size="lg" className="w-full">
                  Send message
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
