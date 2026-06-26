import { useEffect, useState, FormEvent } from 'react';
import { Save, Mail, CheckCircle, AlertCircle, Phone, User, Bell, CreditCard, Trash2, ChevronDown } from 'lucide-react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';
import { useSearchParams } from 'react-router-dom';
import { Skeleton } from '../components/ui/Skeleton';

const TRADES = ['Plumber', 'Electrician', 'Builder', 'Carpenter', 'Painter', 'Landscaper', 'Roofer', 'Tiler', 'Locksmith', 'HVAC', 'Other'];

interface Settings {
  businessName: string;
  traderName: string;
  tradeType: string;
  suburb: string;
  mobileNumber: string;
  services: string[];
  pricingGuide: string;
  availability: string;
  emergencyCallbackMinutes: number;
  gmailConnected: boolean;
  twilioNumber: string;
  onboardingComplete: boolean;
  smsAlertsEnabled?: boolean;
  emailSummaryEnabled?: boolean;
  weeklySummaryEnabled?: boolean;
}

// Section wrapper
function Section({ icon: Icon, title, description, children, iconColor = 'text-blue-400', iconBg = 'bg-blue-500/15' }: {
  icon: typeof User; title: string; description?: string; children: React.ReactNode;
  iconColor?: string; iconBg?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon size={17} className={iconColor} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// Toggle row
function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/6 last:border-0">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0 ${checked ? 'bg-blue-500' : 'bg-white/15'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

export function SettingsPage() {
  useEffect(() => { document.title = 'Settings | TradeDesk'; }, []);
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const gmailStatus = searchParams.get('gmail');

  useEffect(() => {
    api.get<Settings>('/settings').then(s => {
      setSettings({ smsAlertsEnabled: true, emailSummaryEnabled: true, weeklySummaryEnabled: true, ...s });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const update = (key: keyof Settings, val: unknown) => {
    setSettings(s => ({ ...s, [key]: val }));
    setSaved(false);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings', {
        ...settings,
        services: typeof settings.services === 'string'
          ? (settings.services as string).split(',').map(s => s.trim()).filter(Boolean)
          : settings.services,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const connectGmail = async () => {
    setGmailLoading(true);
    try {
      const { url } = await api.get<{ url: string }>('/email/auth-url');
      window.location.href = url;
    } catch {
      setGmailLoading(false);
    }
  };

  const processEmails = async () => {
    try {
      const result = await api.post<{ processed: number }>('/email/process', {});
      alert(`Processed ${result.processed} email(s).`);
    } catch {
      alert('Failed to process emails. Make sure Gmail is connected.');
    }
  };

  if (loading) return (
    <div className="max-w-2xl space-y-6">
      <Skeleton className="h-8 w-32" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="glass rounded-xl p-6 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );

  const servicesStr = Array.isArray(settings.services) ? settings.services.join(', ') : (settings.services || '');

  return (
    <div className="max-w-2xl animate-slide-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Configure your AI receptionist</p>
      </div>

      {gmailStatus === 'connected' && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-lg mb-4">
          <CheckCircle size={16} /> Gmail connected successfully
        </div>
      )}
      {gmailStatus === 'error' && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
          <AlertCircle size={16} /> Gmail connection failed — try again
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">

        {/* 1. Business Profile */}
        <Card>
          <Section icon={User} title="Business Profile" description="How your AI introduces itself to callers">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Business name" value={settings.businessName || ''} onChange={e => update('businessName', e.target.value)} placeholder="Smith's Plumbing" required />
                <Input label="Your name" value={settings.traderName || ''} onChange={e => update('traderName', e.target.value)} placeholder="Dave Smith" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">Trade type</label>
                <div className="relative">
                  <select value={settings.tradeType || ''} onChange={e => update('tradeType', e.target.value)}
                    className="glass w-full rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 appearance-none pr-10 bg-transparent cursor-pointer transition-all">
                    <option value="" disabled className="bg-gray-900">Select trade…</option>
                    {TRADES.map(t => <option key={t} value={t} className="bg-gray-900">{t}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Suburb / area" value={settings.suburb || ''} onChange={e => update('suburb', e.target.value)} placeholder="Bondi, Sydney" />
                <Input label="Mobile (for alerts)" type="tel" value={settings.mobileNumber || ''} onChange={e => update('mobileNumber', e.target.value)} placeholder="+61400000000" />
              </div>
              <Input label="Availability" value={settings.availability || ''} onChange={e => update('availability', e.target.value)} placeholder="Mon–Fri 7am–5pm, Sat 8am–12pm" />
            </div>
          </Section>
        </Card>

        {/* 2. Call Settings */}
        <Card>
          <Section icon={Phone} title="Call Settings" description="What your AI says and how it handles calls" iconColor="text-purple-400" iconBg="bg-purple-500/15">
            <div className="space-y-4">
              <Textarea label="Services offered" value={servicesStr} onChange={e => update('services', e.target.value)}
                placeholder="Hot water repairs, blocked drains, new installations" rows={3} hint="Comma-separated" />
              <Textarea label="Pricing guide" value={settings.pricingGuide || ''} onChange={e => update('pricingGuide', e.target.value)}
                placeholder="Service call: $120. Blocked drain: $180–$350. Emergency: $200 callout." rows={4}
                hint="The AI uses this to give callers rough quotes" />
              <Input label="Emergency callback (minutes)" type="number"
                value={settings.emergencyCallbackMinutes ?? 30} onChange={e => update('emergencyCallbackMinutes', parseInt(e.target.value))}
                hint="Time promised to callers for an emergency callback" />
            </div>
          </Section>
        </Card>

        {/* 3. Notification Preferences */}
        <Card>
          <Section icon={Bell} title="Notification Preferences" description="How and when you get notified" iconColor="text-yellow-400" iconBg="bg-yellow-500/15">
            <Toggle label="SMS alerts after each call" hint="Receive a text summary after every call" checked={!!(settings.smsAlertsEnabled)} onChange={v => update('smsAlertsEnabled', v)} />
            <Toggle label="Email summary" hint="Get a daily email digest of all calls" checked={!!(settings.emailSummaryEnabled)} onChange={v => update('emailSummaryEnabled', v)} />
            <Toggle label="Weekly leads summary" hint="Sunday email with your week's leads and bookings" checked={!!(settings.weeklySummaryEnabled)} onChange={v => update('weeklySummaryEnabled', v)} />
          </Section>
        </Card>

        {/* 4. Twilio / Phone Number */}
        <Card>
          <Section icon={Phone} title="Your TradeDesk Number" description="The number callers reach your AI on" iconColor="text-green-400" iconBg="bg-green-500/15">
            <div className="flex items-center gap-3 glass rounded-lg px-4 py-3 mb-3">
              <Phone size={16} className="text-blue-400" />
              <span className="text-white font-mono text-sm">{settings.twilioNumber || 'Not configured yet'}</span>
            </div>
            <Input label="Update number" value={settings.twilioNumber || ''} onChange={e => update('twilioNumber', e.target.value)} placeholder="+61400000000" hint="Set this to match your Twilio number" />
          </Section>
        </Card>

        {/* 5. Gmail */}
        <Card>
          <Section icon={Mail} title="Gmail Integration" description="AI auto-replies to enquiry emails" iconColor="text-red-400" iconBg="bg-red-500/15">
            <div className="flex items-center justify-between gap-4 mb-4">
              <p className="text-sm text-gray-400">
                {settings.gmailConnected
                  ? '✅ Gmail connected — AI will auto-reply to new emails.'
                  : 'Connect Gmail to let the AI reply to email enquiries automatically.'}
              </p>
              {settings.gmailConnected && (
                <span className="text-xs text-green-400 font-medium flex items-center gap-1 flex-shrink-0">
                  <CheckCircle size={13} /> Active
                </span>
              )}
            </div>
            <div className="flex gap-3">
              {!settings.gmailConnected ? (
                <Button variant="secondary" loading={gmailLoading} onClick={connectGmail} type="button">
                  <Mail size={15} /> Connect Gmail
                </Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={processEmails} type="button">Process unread now</Button>
                  <Button variant="ghost" onClick={connectGmail} type="button">Reconnect</Button>
                </>
              )}
            </div>
          </Section>
        </Card>

        {/* Save button */}
        <div className="flex items-center gap-4 pb-2">
          <Button type="submit" loading={saving} size="lg" variant={saved ? 'success' : 'primary'}>
            {saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save settings'}
          </Button>

        </div>
      </form>

      {/* 6. Billing */}
      <Card className="mt-4">
        <Section icon={CreditCard} title="Billing" description="Your plan and payment details" iconColor="text-blue-400" iconBg="bg-blue-500/15">
          <div className="glass rounded-xl p-4 border border-blue-500/20 bg-blue-500/5 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white text-sm">TradeDesk Pro</p>
                <p className="text-xs text-gray-400 mt-0.5">$199/month · renews monthly</p>
              </div>
              <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2.5 py-1 rounded-full font-semibold">Active</span>
            </div>
          </div>
          <Button variant="secondary" size="sm" type="button">Manage billing</Button>
        </Section>
      </Card>

      {/* 7. Danger Zone */}
      <Card className="mt-4 border-red-500/20">
        <Section icon={Trash2} title="Danger Zone" description="Irreversible actions — proceed with caution" iconColor="text-red-400" iconBg="bg-red-500/15">
          <Button variant="danger" size="sm" type="button"
            onClick={() => { if (confirm('Are you sure you want to delete your account? This cannot be undone.')) { /* handle delete */ } }}>
            <Trash2 size={14} /> Delete account
          </Button>
        </Section>
      </Card>
    </div>
  );
}
