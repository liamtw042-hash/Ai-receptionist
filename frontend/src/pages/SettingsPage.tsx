import { useEffect, useState, FormEvent } from 'react';
import { Save, Mail, CheckCircle, AlertCircle, Phone } from 'lucide-react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';
import { useSearchParams } from 'react-router-dom';

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
}

export function SettingsPage() {
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [searchParams] = useSearchParams();

  const gmailStatus = searchParams.get('gmail');

  useEffect(() => {
    api.get<Settings>('/settings').then(s => {
      setSettings(s);
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
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const servicesStr = Array.isArray(settings.services) ? settings.services.join(', ') : (settings.services || '');

  return (
    <div className="max-w-2xl space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Configure your AI receptionist</p>
      </div>

      {gmailStatus === 'connected' && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-lg">
          <CheckCircle size={16} /> Gmail connected successfully
        </div>
      )}
      {gmailStatus === 'error' && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          <AlertCircle size={16} /> Gmail connection failed — try again
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Business details</h2>
          <div className="space-y-4">
            <Input label="Business name" value={settings.businessName || ''} onChange={e => update('businessName', e.target.value)} placeholder="Smith's Plumbing" required />
            <Input label="Your name" value={settings.traderName || ''} onChange={e => update('traderName', e.target.value)} placeholder="Dave Smith" required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Trade type" value={settings.tradeType || ''} onChange={e => update('tradeType', e.target.value)} placeholder="Plumber" />
              <Input label="Suburb / area" value={settings.suburb || ''} onChange={e => update('suburb', e.target.value)} placeholder="Bondi, Sydney" />
            </div>
            <Input label="Your mobile (for alerts)" type="tel" value={settings.mobileNumber || ''} onChange={e => update('mobileNumber', e.target.value)} placeholder="+61400000000" />
            <Input label="Availability" value={settings.availability || ''} onChange={e => update('availability', e.target.value)} placeholder="Mon–Fri 7am–5pm" />
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Services & pricing</h2>
          <div className="space-y-4">
            <Textarea
              label="Services offered"
              value={servicesStr}
              onChange={e => update('services', e.target.value)}
              placeholder="Hot water repairs, blocked drains, new installations"
              rows={3}
              hint="Comma-separated"
            />
            <Textarea
              label="Pricing guide"
              value={settings.pricingGuide || ''}
              onChange={e => update('pricingGuide', e.target.value)}
              placeholder="Service call: $120. Blocked drain: $180–$350. Emergency: $200 callout."
              rows={4}
              hint="The AI uses this to give callers rough quotes"
            />
            <Input
              label="Emergency callback (minutes)"
              type="number"
              value={settings.emergencyCallbackMinutes || 30}
              onChange={e => update('emergencyCallbackMinutes', parseInt(e.target.value))}
              hint="How many minutes before someone calls back in an emergency"
            />
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-white mb-1">Twilio phone number</h2>
          <p className="text-gray-500 text-sm mb-4">This is the number callers reach your AI on</p>
          <div className="flex items-center gap-3 glass rounded-lg px-4 py-3">
            <Phone size={16} className="text-blue-400" />
            <span className="text-white font-mono">{settings.twilioNumber || 'Not configured yet'}</span>
          </div>
          <Input
            label="Update Twilio number"
            value={settings.twilioNumber || ''}
            onChange={e => update('twilioNumber', e.target.value)}
            placeholder="+61400000000"
            className="mt-3"
            hint="Set this to match your Twilio number"
          />
        </Card>

        <div className="flex items-center justify-between gap-4">
          <Button type="submit" loading={saving} size="lg">
            <Save size={16} />
            {saving ? 'Saving...' : 'Save settings'}
          </Button>
          {saved && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle size={16} /> Saved!
            </div>
          )}
        </div>
      </form>

      {/* Gmail */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <Mail size={18} className="text-blue-400" /> Gmail Integration
            </h2>
            <p className="text-gray-500 text-sm">
              {settings.gmailConnected
                ? 'Gmail is connected. The AI will auto-reply to new emails.'
                : 'Connect Gmail to let the AI auto-reply to your emails.'}
            </p>
          </div>
          {settings.gmailConnected ? (
            <div className="flex items-center gap-2 text-green-400 text-sm flex-shrink-0">
              <CheckCircle size={16} /> Connected
            </div>
          ) : null}
        </div>
        <div className="flex gap-3 mt-4">
          {!settings.gmailConnected ? (
            <Button variant="secondary" loading={gmailLoading} onClick={connectGmail}>
              <Mail size={16} /> Connect Gmail
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={processEmails}>
                Process unread emails now
              </Button>
              <Button variant="ghost" onClick={connectGmail}>
                Reconnect
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
