import { useEffect, useState, FormEvent } from 'react';
import {
  Save, Mail, CheckCircle, AlertCircle, Phone, User, Bell, CreditCard, Trash2,
  ChevronDown, Play, Mic, Zap, Link2, ExternalLink, Table2, CalendarCheck,
  Loader2, Unlink,
} from 'lucide-react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../contexts/AuthContext';

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
  hasForwardingSetup?: boolean;
}

interface GoogleStatus {
  connected: boolean;
  email?: string;
  sheetsConnected: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  calendarConnected: boolean;
  calendarId?: string;
}

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

// ── Google Integrations Card ──────────────────────────────────────────────────
function GoogleIntegrationsCard() {
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [testingSheet, setTestingSheet] = useState(false);
  const [testingCal, setTestingCal] = useState(false);
  const [sheetMsg, setSheetMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [calMsg, setCalMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const fetchStatus = async () => {
    try {
      const s = await api.get<GoogleStatus>('/google/status');
      setStatus(s);
    } catch {
      setStatus({ connected: false, sheetsConnected: false, calendarConnected: false });
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { url } = await api.get<{ url: string }>('/google/connect');
      window.location.href = url;
    } catch {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your Google account? Calls will no longer be logged to Sheets or Calendar.')) return;
    setDisconnecting(true);
    try {
      await api.post('/google/disconnect', {});
      setStatus({ connected: false, sheetsConnected: false, calendarConnected: false });
    } catch { /* ignore */ } finally {
      setDisconnecting(false);
    }
  };

  const handleCreateSheet = async () => {
    setCreatingSheet(true);
    setSheetMsg(null);
    try {
      const res = await api.post<{ spreadsheetUrl: string }>('/google/create-sheet', {});
      setSheetMsg({ ok: true, text: 'Sheet created!' });
      await fetchStatus();
      if (res.spreadsheetUrl) window.open(res.spreadsheetUrl, '_blank');
    } catch (err: any) {
      setSheetMsg({ ok: false, text: err?.message || 'Failed to create sheet' });
    } finally {
      setCreatingSheet(false);
    }
  };

  const handleTestSheet = async () => {
    setTestingSheet(true);
    setSheetMsg(null);
    try {
      await api.post('/google/test-sheet', {});
      setSheetMsg({ ok: true, text: 'Test row added to your sheet ✓' });
    } catch (err: any) {
      setSheetMsg({ ok: false, text: err?.message || 'Failed to write test row' });
    } finally {
      setTestingSheet(false);
    }
  };

  const handleTestCal = async () => {
    setTestingCal(true);
    setCalMsg(null);
    try {
      await api.post('/google/test-calendar', {});
      setCalMsg({ ok: true, text: 'Test event created in your calendar ✓' });
    } catch (err: any) {
      setCalMsg({ ok: false, text: err?.message || 'Failed to create test event' });
    } finally {
      setTestingCal(false);
    }
  };

  return (
    <Card>
      <Section icon={Link2} title="Integrations" description="Auto-log calls to Google Sheets and create Calendar jobs" iconColor="text-emerald-400" iconBg="bg-emerald-500/15">

        {/* Connect / Connected header */}
        {loadingStatus ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-5"><Loader2 size={14} className="animate-spin" /> Checking connection…</div>
        ) : !status?.connected ? (
          <div className="mb-5">
            <p className="text-sm text-gray-400 mb-4">
              Connect your Google account to automatically log every call to a spreadsheet and create calendar jobs when a booking is made.
            </p>
            <Button variant="secondary" onClick={handleConnect} loading={connecting} type="button">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="" />
              Connect Google Account
            </Button>
          </div>
        ) : (
          <div className="mb-5 flex items-center justify-between gap-3 glass rounded-lg px-4 py-3 border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center gap-2">
              <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-white font-medium">Google connected</p>
                {status.email && <p className="text-xs text-gray-500">{status.email}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              {disconnecting ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={12} />}
              Disconnect
            </button>
          </div>
        )}

        {status?.connected && (
          <div className="space-y-4">
            {/* Google Sheets card */}
            <div className="glass rounded-xl p-4 border border-white/8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                  <Table2 size={15} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">Google Sheets</p>
                  <p className="text-xs text-gray-500">Auto-log every call as a row</p>
                </div>
                {status.sheetsConnected && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold flex-shrink-0">
                    <CheckCircle size={12} /> Active
                  </span>
                )}
              </div>

              {status.sheetsConnected ? (
                <div className="space-y-3">
                  {status.spreadsheetUrl && (
                    <a href={status.spreadsheetUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                      <ExternalLink size={11} /> Open your calls spreadsheet
                    </a>
                  )}
                  {sheetMsg && (
                    <p className={`text-xs ${sheetMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{sheetMsg.text}</p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <button type="button" onClick={handleTestSheet} disabled={testingSheet}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 glass rounded-lg text-gray-300 hover:text-white hover:border-white/20 transition-all disabled:opacity-50">
                      {testingSheet ? <Loader2 size={11} className="animate-spin" /> : null}
                      Test — add row
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">No spreadsheet linked yet. Create a pre-formatted template to get started.</p>
                  {sheetMsg && (
                    <p className={`text-xs ${sheetMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{sheetMsg.text}</p>
                  )}
                  <button type="button" onClick={handleCreateSheet} disabled={creatingSheet}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 rounded-lg transition-all disabled:opacity-50">
                    {creatingSheet ? <Loader2 size={11} className="animate-spin" /> : <Table2 size={11} />}
                    {creatingSheet ? 'Creating…' : 'Create sheet template'}
                  </button>
                </div>
              )}
            </div>

            {/* Google Calendar card */}
            <div className="glass rounded-xl p-4 border border-white/8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                  <CalendarCheck size={15} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">Google Calendar</p>
                  <p className="text-xs text-gray-500">Auto-create events when jobs are booked</p>
                </div>
                {status.calendarConnected && (
                  <span className="flex items-center gap-1 text-xs text-blue-400 font-semibold flex-shrink-0">
                    <CheckCircle size={12} /> Active
                  </span>
                )}
              </div>

              {status.calendarConnected ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    Logging to: <span className="text-gray-300">{status.calendarId === 'primary' ? 'Primary calendar' : status.calendarId}</span>
                  </p>
                  {calMsg && (
                    <p className={`text-xs ${calMsg.ok ? 'text-blue-400' : 'text-red-400'}`}>{calMsg.text}</p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <button type="button" onClick={handleTestCal} disabled={testingCal}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 glass rounded-lg text-gray-300 hover:text-white hover:border-white/20 transition-all disabled:opacity-50">
                      {testingCal ? <Loader2 size={11} className="animate-spin" /> : null}
                      Test — create event
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Calendar access granted — events will appear in your primary calendar when jobs are booked.</p>
              )}
            </div>

            {/* How it works note */}
            <div className="glass rounded-lg px-3 py-2.5 border border-white/5 bg-white/[0.02]">
              <p className="text-xs text-gray-500 leading-relaxed">
                <span className="text-gray-400 font-medium">How it works:</span> After every call, TradeDesk logs a row to your sheet with the date, caller details, job type, quote and outcome. If the call results in a booking, a Calendar event is automatically created for the next business day at 9am.
              </p>
            </div>
          </div>
        )}
      </Section>
    </Card>
  );
}

// ── Billing Card (Stripe) ───────────────────────────────────────────────────
interface BillingStatus {
  status: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid';
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

function BillingCard() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [starting, setStarting] = useState(false);
  const [managing, setManaging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<BillingStatus>('/billing/status')
      .then(setBilling)
      .catch(() => setBilling({ status: 'none' }))
      .finally(() => setLoadingStatus(false));
  }, []);

  const handleSubscribe = async () => {
    setStarting(true);
    setError(null);
    try {
      const { url } = await api.post<{ url: string }>('/billing/create-checkout-session', {});
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout');
      setStarting(false);
    }
  };

  const handleManage = async () => {
    setManaging(true);
    setError(null);
    try {
      const { url } = await api.post<{ url: string }>('/billing/create-portal-session', {});
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Failed to open billing portal');
      setManaging(false);
    }
  };

  const isActive = !!billing && (billing.status === 'active' || billing.status === 'trialing');

  return (
    <Card>
      <Section icon={CreditCard} title="Billing" description="Your plan and payment details" iconColor="text-blue-400" iconBg="bg-blue-500/15">
        {loadingStatus ? (
          <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={14} className="animate-spin" /> Checking subscription…</div>
        ) : isActive ? (
          <>
            <div className="glass rounded-xl p-4 border border-blue-500/20 bg-blue-500/5 mb-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-semibold text-white text-sm">TradeDesk Pro</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    $199/month AUD{billing?.status === 'trialing' ? ' · Free trial' : ''}
                    {billing?.currentPeriodEnd && ` · ${billing.cancelAtPeriodEnd ? 'ends' : 'renews'} ${new Date(billing.currentPeriodEnd).toLocaleDateString('en-AU')}`}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                  billing?.cancelAtPeriodEnd ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'
                }`}>
                  {billing?.cancelAtPeriodEnd ? 'Cancels soon' : billing?.status === 'trialing' ? 'Trialing' : 'Active'}
                </span>
              </div>
            </div>
            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
            <Button variant="secondary" size="sm" type="button" onClick={handleManage} loading={managing}>Manage billing</Button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-4">
              {billing?.status === 'canceled' ? 'Your subscription has ended — resubscribe any time.' : billing?.status === 'past_due' ? 'Your last payment failed — update your card to keep TradeDesk running.' : "You're not subscribed yet."} Start your 7-day free trial, then $199/month AUD. Cancel any time. (Stripe test mode)
            </p>
            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
            <Button type="button" onClick={handleSubscribe} loading={starting}>
              <CreditCard size={15} /> Start 7-day free trial
            </Button>
          </>
        )}
      </Section>
    </Card>
  );
}

// ── Main SettingsPage ─────────────────────────────────────────────────────────
export function SettingsPage() {
  useEffect(() => { document.title = 'Settings | TradeDesk'; }, []);
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const gmailStatus = searchParams.get('gmail');
  const googleStatus = searchParams.get('google');
  const billingStatus = searchParams.get('billing');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const navigate = useNavigate();
  const { logOut } = useAuth();

  useEffect(() => {
    api.get<Settings>('/settings').then(s => {
      setSettings({ smsAlertsEnabled: true, emailSummaryEnabled: true, weeklySummaryEnabled: true, ...s });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const update = (key: keyof Settings, val: unknown) => {
    setSettings(s => ({ ...s, [key]: val }));
    setSaved(false);
  };

  const handleTestAI = async () => {
    setTesting(true);
    setTestResult(null);
    await new Promise(r => setTimeout(r, 1800));
    const biz = settings.businessName || 'your business';
    const trader = settings.traderName || 'Dave';
    setTestResult(`"G'day! You've reached ${biz}. ${trader}'s on a job right now — I'm their AI receptionist. How can I help you today?"`);
    setTesting(false);
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

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This cancels your subscription and permanently deletes all your data. This cannot be undone.')) return;
    setDeletingAccount(true);
    try {
      await api.delete('/account');
      await logOut();
      navigate('/');
    } catch (err: any) {
      alert(err.message || 'Failed to delete account. Please try again or contact support.');
      setDeletingAccount(false);
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
      {googleStatus === 'connected' && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm px-4 py-3 rounded-lg mb-4">
          <CheckCircle size={16} /> Google account connected — set up your sheet below
        </div>
      )}
      {googleStatus === 'error' && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
          <AlertCircle size={16} /> Google connection failed — try again
        </div>
      )}
      {billingStatus === 'success' && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-lg mb-4">
          <CheckCircle size={16} /> You're subscribed — welcome to TradeDesk Pro!
        </div>
      )}
      {billingStatus === 'canceled' && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm px-4 py-3 rounded-lg mb-4">
          <AlertCircle size={16} /> Checkout canceled — no charge was made
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

        {/* Save button (mid-form, before integrations) */}
        <div className="flex items-center gap-4 pb-2">
          <Button type="submit" loading={saving} size="lg" variant={saved ? 'success' : 'primary'}>
            {saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save settings'}
          </Button>
        </div>
      </form>

      {/* 3. Integrations (outside form — manages its own state) */}
      <div className="mt-4">
        <GoogleIntegrationsCard />
      </div>

      {/* 4. Notification Preferences */}
      <form onSubmit={handleSave} className="space-y-4 mt-4">
        <Card>
          <Section icon={Bell} title="Notification Preferences" description="How and when you get notified" iconColor="text-yellow-400" iconBg="bg-yellow-500/15">
            <Toggle label="SMS alerts after each call" hint="Receive a text summary after every call" checked={!!(settings.smsAlertsEnabled)} onChange={v => update('smsAlertsEnabled', v)} />
            <Toggle label="Email summary" hint="Get a daily email digest of all calls" checked={!!(settings.emailSummaryEnabled)} onChange={v => update('emailSummaryEnabled', v)} />
            <Toggle label="Weekly leads summary" hint="Sunday email with your week's leads and bookings" checked={!!(settings.weeklySummaryEnabled)} onChange={v => update('weeklySummaryEnabled', v)} />
          </Section>
        </Card>

        {/* 5. Twilio / Phone Number */}
        <Card>
          <Section icon={Phone} title="Your TradeDesk Number" description="The number callers reach your AI on" iconColor="text-green-400" iconBg="bg-green-500/15">
            <div className="flex items-center gap-3 glass rounded-lg px-4 py-3 mb-3">
              <Phone size={16} className="text-blue-400" />
              <span className="text-white font-mono text-sm">{settings.twilioNumber || 'Not configured yet'}</span>
            </div>
            <Input label="Update number" value={settings.twilioNumber || ''} onChange={e => update('twilioNumber', e.target.value)} placeholder="+61400000000" hint="Set this to match your Twilio number" />
            <div className="mt-1">
              <Toggle
                label="Call forwarding is set up"
                hint="Tick this once you've forwarded your missed calls to the number above"
                checked={!!settings.hasForwardingSetup}
                onChange={v => update('hasForwardingSetup', v)}
              />
            </div>
          </Section>
        </Card>

        {/* 6. Gmail */}
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

      {/* 7. Billing */}
      <div className="mt-4">
        <BillingCard />
      </div>

      {/* Test your AI */}
      <Card className="mt-4">
        <Section icon={Zap} title="Test your AI" description="Hear exactly what your AI says when it picks up a call" iconColor="text-blue-400" iconBg="bg-blue-500/15">
          <p className="text-sm text-gray-400 mb-4">
            Click below to simulate what your AI receptionist will say when answering a call — using your actual business name and details.
          </p>
          <button
            type="button"
            onClick={handleTestAI}
            disabled={testing}
            className="flex items-center gap-2 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 text-sm font-medium px-4 py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            {testing ? (
              <><span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin inline-block" />Simulating call...</>
            ) : (
              <><Play size={15} />Simulate a call</>
            )}
          </button>
          {testResult && (
            <div className="mt-4 glass rounded-xl p-4 border border-blue-500/20 bg-blue-500/5 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <Mic size={14} className="text-blue-400" />
                <p className="text-xs text-blue-400 font-semibold">Your AI would say:</p>
              </div>
              <p className="text-sm text-white leading-relaxed italic">{testResult}</p>
            </div>
          )}
        </Section>
      </Card>

      {/* Danger Zone */}
      <Card className="mt-4 border-red-500/20">
        <Section icon={Trash2} title="Danger Zone" description="Irreversible actions — proceed with caution" iconColor="text-red-400" iconBg="bg-red-500/15">
          <Button variant="danger" size="sm" type="button" loading={deletingAccount} onClick={handleDeleteAccount}>
            <Trash2 size={14} /> Delete account
          </Button>
        </Section>
      </Card>
    </div>
  );
}
