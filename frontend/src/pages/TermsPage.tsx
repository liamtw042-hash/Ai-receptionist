import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export function TermsPage() {
  useEffect(() => { document.title = 'Terms of Service | TradeDesk'; }, []);
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
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: 26 June 2026</p>
        <div className="space-y-8 text-sm leading-relaxed">
          {[
            { heading: '1. Acceptance of Terms', body: 'By signing up for or using TradeDesk ("Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These terms govern your use of the TradeDesk AI receptionist platform.' },
            { heading: '2. Description of Service', body: 'TradeDesk provides an AI-powered telephone receptionist service that answers calls on behalf of your business, generates call summaries, and sends SMS notifications. The Service is designed for sole traders and small businesses operating in Australia.' },
            { heading: '3. Account Registration', body: 'You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account.' },
            { heading: '4. Acceptable Use', body: `You agree not to use TradeDesk to:
- Engage in any unlawful activity
- Impersonate any person or entity
- Transmit any harmful, offensive, or illegal content
- Violate any applicable laws or regulations
- Circumvent any security measures

You are responsible for ensuring your use of the Service complies with applicable Australian laws, including those relating to call recording and AI disclosure.` },
            { heading: '5. Call Recording Disclosure', body: 'You acknowledge that calls handled by TradeDesk are recorded and transcribed. You are solely responsible for complying with applicable laws regarding call recording consent in your jurisdiction. In most Australian states, at least one party to a call must consent to recording. You should consult legal advice if uncertain.' },
            { heading: '6. Subscription and Billing', body: 'TradeDesk is offered on a monthly subscription basis at $199 AUD per month (or as otherwise displayed at signup). Subscriptions automatically renew monthly unless cancelled. No refunds are provided for partial months except under our 30-day money-back guarantee for new subscribers.' },
            { heading: '7. 30-Day Money-Back Guarantee', body: 'New subscribers may request a full refund within 30 days of their first payment if not satisfied. To request a refund, email liamtw042@gmail.com.' },
            { heading: '8. Cancellation', body: 'You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of the current billing period. You will continue to have access to the Service until the end of the paid period.' },
            { heading: '9. Service Availability', body: "We aim for 99.9% uptime but do not guarantee uninterrupted availability. We are not liable for any losses resulting from service downtime or interruptions." },
            { heading: '10. Limitation of Liability', body: 'To the maximum extent permitted by Australian law, TradeDesk\'s total liability to you for any claim arising from your use of the Service shall not exceed the amount paid by you in the 30 days preceding the claim. We are not liable for indirect, incidental, or consequential damages.' },
            { heading: '11. AI Limitations', body: 'Our AI may occasionally make errors, misunderstand callers, or provide inaccurate information. You acknowledge that the AI is not a licensed professional and any quotes, estimates, or information provided by the AI are for informational purposes only and may not always be accurate.' },
            { heading: '12. Changes to Terms', body: 'We reserve the right to modify these Terms at any time. We will notify you of material changes via email. Continued use of the Service after changes constitutes acceptance.' },
            { heading: '13. Governing Law', body: 'These Terms are governed by the laws of New South Wales, Australia. Any disputes shall be subject to the exclusive jurisdiction of the courts of New South Wales.' },
            { heading: '14. Contact', body: 'For questions about these Terms: liamtw042@gmail.com · TradeDesk · Newcastle NSW 2300 · Australia' },
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
