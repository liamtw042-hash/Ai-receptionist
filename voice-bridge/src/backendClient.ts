import { config } from './config';

// Mirrors backend/src/services/businessContext.ts — the bridge never writes
// business data, it only reads this shape to build the persona.
export interface BusinessSettings {
  businessName: string;
  traderName: string;
  tradeType: string;
  suburb: string;
  pricingGuide: string;
  availability: string;
  mobileNumber: string;
  services: string[];
  emergencyCallbackMinutes: number;
}

export interface BusinessContext {
  userId: string;
  settings: BusinessSettings;
}

export type CallOutcome =
  | 'in_progress' | 'job_booked' | 'quote_given'
  | 'callback_needed' | 'emergency' | 'voicemail';

export interface BridgeTurn {
  role: 'user' | 'assistant';
  content: string;
}

async function request<T>(path: string, body: unknown, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${config.backendApiUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bridge-secret': config.bridgeSecret,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`${path} failed: HTTP ${res.status} ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Look up which tradie owns the dialled number, and their business context.
 * Kept fast and on the critical path: this runs while the caller is hearing
 * ring tone, so it must not stall the greeting.
 */
export function fetchBusinessContext(called: string): Promise<BusinessContext> {
  return request<BusinessContext>('/voice/bridge/context', { called }, 4000);
}

/**
 * Hand the finished call back to the existing backend, which runs the SAME
 * post-call pipeline as the legacy flow: AI summary → SMS to the tradie →
 * Firestore call log → job creation → Google Sheets/Calendar.
 *
 * Retried, because losing this call means the tradie never hears about a lead —
 * which is the one failure the product cannot tolerate.
 */
export async function completeCall(payload: {
  callSid: string;
  from: string;
  called: string;
  turns: BridgeTurn[];
  outcome?: CallOutcome;
  durationSeconds?: number;
}): Promise<boolean> {
  const delays = [0, 1000, 4000];
  let lastErr: unknown;

  for (let attempt = 0; attempt < delays.length; attempt++) {
    const wait = delays[attempt] ?? 0;
    if (wait) await new Promise(r => setTimeout(r, wait));
    try {
      await request('/voice/bridge/complete', payload, 20000);
      return true;
    } catch (err) {
      lastErr = err;
      console.error(
        `[bridge] complete attempt ${attempt + 1}/${delays.length} failed for ${payload.callSid}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  // Loud, structured and greppable: this is a lost lead until someone acts.
  console.error(
    `[bridge] CALL_COMPLETION_LOST callSid=${payload.callSid} from=${payload.from} ` +
    `called=${payload.called} turns=${payload.turns.length} — the tradie will NOT ` +
    `get an SMS for this call. Last error:`, lastErr
  );
  return false;
}
