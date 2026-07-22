import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export function PrivacyPage() {
  useEffect(() => { document.title = 'Privacy Policy | TradeDesk'; }, []);
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-white/8 px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center"><Zap size={13} className="text-white" /></div>
            <span className="font-bold text-white">TradeDesk</span>
          </Link>
          <Link to="/" className="text-sm text-gray-400 hover:text-white transition-colors">← Back to home</Link>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-5 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: 26 June 2026</p>
        <div className="prose prose-invert max-w-none space-y-8 text-gray-300 text-sm leading-relaxed">
          {[
            { heading: '1. About TradeDesk', body: 'TradeDesk ("we", "us", "our") is an AI receptionist service built for Australian tradies. We are operated from Newcastle, New South Wales, Australia. This Privacy Policy explains how we collect, use, disclose and protect your personal information in accordance with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).' },
            { heading: '2. Information We Collect', body: `We collect the following types of information:

**Account information**: Name, business name, email address, phone number, trade type, suburb, and billing details when you sign up.

**Call data**: Call recordings, transcripts, caller phone numbers, and AI-generated summaries of calls handled on your behalf.

**Usage data**: How you interact with the TradeDesk dashboard, pages visited, features used, and log data (IP address, browser type, device type).

**Communications**: Any emails or SMS messages you send or receive through the TradeDesk platform.` },
            { heading: '3. How We Use Your Information', body: `We use your information to:
- Provide and improve the TradeDesk service
- Answer calls on your behalf using our AI
- Send you SMS summaries and alerts
- Process billing and manage your account
- Send service-related communications
- Analyse usage to improve the product
- Comply with legal obligations

We do not sell your personal information to third parties.` },
            { heading: '4. Call Recordings and Transcripts', body: 'We record and transcribe calls handled by TradeDesk on your behalf. These recordings are stored securely and used to generate call summaries sent to you. You are responsible for ensuring callers are aware they may be speaking with an AI and that calls may be recorded, in accordance with applicable Australian laws. In most Australian states, you must inform callers before recording.' },
            { heading: '5. Third-Party Services', body: 'We use the following third-party services to operate TradeDesk: Twilio (call and SMS infrastructure), Firebase (authentication and data storage), Google Cloud (AI and infrastructure), Vercel (hosting). Each of these providers has their own privacy policy and we encourage you to review them.' },
            { heading: '6. Data Storage and Security', body: 'Your data is stored on secure servers. We implement industry-standard security measures including encryption in transit (TLS) and at rest. However, no method of transmission over the internet is 100% secure and we cannot guarantee absolute security.' },
            { heading: '7. Data Retention', body: 'We retain your account data for as long as your account is active. Call recordings and transcripts are retained for 12 months and then deleted automatically. You may request earlier deletion by contacting us.' },
            { heading: '8. Access and Correction', body: 'You have the right to access the personal information we hold about you and to request corrections. To make such a request, email liamtw042@gmail.com. We will respond within 30 days.' },
            { heading: '9. Complaints', body: 'If you believe we have breached the Australian Privacy Principles, you may contact us at liamtw042@gmail.com. If you are not satisfied with our response, you may lodge a complaint with the Office of the Australian Information Commissioner (OAIC) at oaic.gov.au.' },
            { heading: '10. Changes to This Policy', body: 'We may update this Privacy Policy from time to time. We will notify you of significant changes via email or a notice in the dashboard. Continued use of TradeDesk after changes constitutes acceptance of the updated policy.' },
            { heading: '11. Contact', body: 'For privacy-related enquiries: liamtw042@gmail.com · TradeDesk · Newcastle NSW 2300 · Australia' },
          ].map(({ heading, body }) => (
            <div key={heading}>
              <h2 className="text-lg font-semibold text-white mb-3">{heading}</h2>
              <div className="text-gray-400 leading-relaxed whitespace-pre-line">{body}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
