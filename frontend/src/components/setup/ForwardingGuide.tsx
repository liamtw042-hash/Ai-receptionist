import { useState } from 'react';
import { Check, Copy, Phone, AlertTriangle, ChevronDown } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   FORWARDING GUIDE — the one piece of setup a tradie does on their PHONE,
   not in our UI, so it has to be exact.

   The codes below are the standard GSM supplementary-service (MMI) codes.
   Telstra, Optus and Vodafone — and the resellers on their networks (Boost,
   Amaysim, ALDImobile, TPG, Kogan, etc.) — all use these same codes. You dial
   them from the phone's keypad like a phone number and press call; the
   network replies with a confirmation message.

   CRITICAL distinction this guide enforces: we only ever set up CONDITIONAL
   forwarding (no-answer / busy / unreachable) so the tradie's phone still
   rings first and they can answer like normal. `**21*` — and the iPhone
   Settings → Phone → Call Forwarding toggle, which is the same thing — is
   UNCONDITIONAL forwarding: the phone never rings again. We warn against it
   explicitly.
   ═══════════════════════════════════════════════════════════════════════ */

interface Props {
  /** The user's TradeDesk (Twilio) number, digits/spaces — null while unassigned. */
  number?: string | null;
}

function cleanNumber(n: string): string {
  return n.replace(/[^\d+]/g, '');
}

/** One dial-code row: the code, tap-to-dial on mobile, copy everywhere. */
function DialCode({ code, label, sub }: { code: string; label: string; sub?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  // '#' must be %23 inside a tel: URI or the dialer drops everything after it.
  const telHref = `tel:${encodeURIComponent(code)}`;
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-xs font-semibold text-gray-300">{label}</p>
        {sub && <p className="text-[10px] text-gray-600">{sub}</p>}
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 font-mono text-[15px] sm:text-base text-white tracking-wide break-all">{code}</code>
        <button type="button" onClick={copy} aria-label={`Copy ${label} code`}
          className="flex-shrink-0 w-9 h-9 rounded-lg border border-white/10 bg-white/4 flex items-center justify-center text-gray-500 hover:text-white hover:border-white/20 transition-all">
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
        {/* tap-to-dial — the killer shortcut when they're reading this ON the
            phone they're setting up. sm:hidden keeps it off desktop where it
            would open useless dialer apps. */}
        <a href={telHref}
          className="sm:hidden flex-shrink-0 h-9 px-3 rounded-lg bg-orange-500 hover:bg-orange-400 flex items-center gap-1.5 text-black text-xs font-bold transition-all">
          <Phone size={12} /> Dial
        </a>
      </div>
    </div>
  );
}

const CARRIER_NOTES = [
  {
    carrier: 'Telstra (and Boost, ALDImobile, Belong…)',
    notes: [
      'The codes on this page work as-is — dial them like a phone number.',
      'Your phone rings for about 15 seconds before forwarding kicks in. To change that, dial the no-answer code as **61*NUMBER**20# (the last number is seconds: 5–30).',
      'These calls currently go to MessageBank (dial 101 to check it) — after this, TradeDesk answers them instead.',
    ],
  },
  {
    carrier: 'Optus (and Amaysim, Coles Mobile, aussie broadband…)',
    notes: [
      'Same standard codes — dial them from your keypad and wait for the confirmation message.',
      'Voicemail on Optus is 321; forwarding to TradeDesk replaces it for missed calls.',
    ],
  },
  {
    carrier: 'Vodafone (and TPG, Kogan, Lebara, felix…)',
    notes: [
      'Same standard codes — dial and wait for the on-screen confirmation.',
      'Voicemail on Vodafone is 121; TradeDesk takes over the calls that used to land there.',
    ],
  },
];

export function ForwardingGuide({ number }: Props) {
  const [openCarrier, setOpenCarrier] = useState<number | null>(null);
  const clean = number ? cleanNumber(number) : null;
  // Placeholder keeps the codes readable even before a number is assigned.
  const target = clean || 'YOUR-TRADEDESK-NUMBER';

  return (
    <div className="space-y-4">
      {/* What this does — plain-english first */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3">
        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="text-white font-semibold">Your phone still rings first.</span>{' '}
          These codes only forward a call when you <em>don't</em> answer, you're already
          on a call, or you've got no signal. Answer like normal and nothing changes.
        </p>
      </div>

      {!clean && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.05] px-4 py-3">
          <AlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-400 leading-relaxed">
            Your TradeDesk number hasn't been assigned yet — it'll appear here (and in
            Settings) shortly. The steps below are the same; just swap in your number
            once you have it.
          </p>
        </div>
      )}

      {/* The three codes. Dial all three for full coverage. */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 mb-2.5">
          Dial these three codes, one at a time
        </p>
        <div className="space-y-2">
          <DialCode label="1 · When you don't answer" sub="most missed calls" code={`**61*${target}#`} />
          <DialCode label="2 · When you're on another call" code={`**67*${target}#`} />
          <DialCode label="3 · When you've got no signal" sub="job sites, black spots" code={`**62*${target}#`} />
        </div>
        <p className="text-xs text-gray-600 mt-2.5 leading-relaxed">
          Open your phone's keypad, dial a code exactly as written (stars and hashes
          included) and press the call button. Your carrier flashes up a confirmation —
          that's it. Works on iPhone and Android.
        </p>
      </div>

      {/* The one mistake that hurts */}
      <div className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/[0.05] px-4 py-3">
        <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400 leading-relaxed">
          <span className="text-red-300 font-semibold">Don't use "forward all calls"</span>{' '}
          (the <code className="font-mono text-gray-300">**21*</code> code, or the iPhone{' '}
          <span className="text-gray-300">Settings → Phone → Call Forwarding</span> toggle —
          they're the same thing). That sends <em>every</em> call straight to the AI and your
          phone never rings again.
        </p>
      </div>

      {/* Per-carrier notes */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 mb-2.5">Your carrier</p>
        <div className="space-y-2">
          {CARRIER_NOTES.map((c, i) => (
            <div key={c.carrier} className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
              <button type="button" onClick={() => setOpenCarrier(o => (o === i ? null : i))}
                aria-expanded={openCarrier === i}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left min-h-[46px]">
                <span className="text-sm font-medium text-white">{c.carrier}</span>
                <ChevronDown size={15} className={`text-gray-500 flex-shrink-0 transition-transform duration-200 ${openCarrier === i ? 'rotate-180' : ''}`} />
              </button>
              {openCarrier === i && (
                <ul className="px-4 pb-3.5 space-y-2">
                  {c.notes.map(n => (
                    <li key={n} className="flex gap-2 text-xs text-gray-400 leading-relaxed">
                      <span className="text-orange-400 flex-shrink-0">·</span>{n}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Undo — trust builder */}
      <p className="text-xs text-gray-600 leading-relaxed">
        Changed your mind? Dial <code className="font-mono text-gray-400">##002#</code> and
        all forwarding switches off — everything's back to how it was.
      </p>
    </div>
  );
}
