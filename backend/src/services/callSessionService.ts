import { db } from '../lib/firebase';

export interface CallTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface CallSession {
  callSid: string;
  userId: string;
  callerNumber: string;
  turns: CallTurn[];
  outcome: 'in_progress' | 'job_booked' | 'quote_given' | 'callback_needed' | 'emergency' | 'voicemail';
  summary: string;
  createdAt: Date;
  updatedAt: Date;
}

const sessions = new Map<string, CallSession>();

export function getSession(callSid: string): CallSession | undefined {
  return sessions.get(callSid);
}

export function createSession(callSid: string, userId: string, callerNumber: string): CallSession {
  const session: CallSession = {
    callSid,
    userId,
    callerNumber,
    turns: [],
    outcome: 'in_progress',
    summary: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  sessions.set(callSid, session);
  return session;
}

export function addTurn(callSid: string, role: 'user' | 'assistant', content: string): void {
  const session = sessions.get(callSid);
  if (!session) return;
  session.turns.push({ role, content, timestamp: new Date() });
  session.updatedAt = new Date();
}

export async function finalizeSession(callSid: string, summary: string, outcome: CallSession['outcome'], durationSeconds?: number): Promise<string | null> {
  const session = sessions.get(callSid);
  if (!session) return null;

  session.summary = summary;
  session.outcome = outcome;
  session.updatedAt = new Date();

  // Prefer Twilio's own CallDuration (from the status callback) since it's the
  // authoritative telephony-measured duration; fall back to our own session
  // bookkeeping if that wasn't provided.
  const computedDurationSeconds = Math.max(0, Math.round((session.updatedAt.getTime() - session.createdAt.getTime()) / 1000));

  const docRef = await db.collection('calls').add({
    ...session,
    turns: session.turns.map(t => ({ ...t, timestamp: t.timestamp.toISOString() })),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    durationSeconds: durationSeconds ?? computedDurationSeconds,
    googleSheetLogged: false,
  });

  sessions.delete(callSid);
  return docRef.id;
}

export function detectOutcome(transcript: string): CallSession['outcome'] {
  const lower = transcript.toLowerCase();
  if (lower.includes('emergency') || lower.includes('urgent') || lower.includes('flood') || lower.includes('gas leak')) return 'emergency';
  if (lower.includes('book') || lower.includes('schedule') || lower.includes('appointment') || lower.includes('locked in')) return 'job_booked';
  if (lower.includes('quote') || lower.includes('price') || lower.includes('cost') || lower.includes('how much')) return 'quote_given';
  return 'callback_needed';
}
