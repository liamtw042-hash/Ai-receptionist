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

export async function finalizeSession(callSid: string, summary: string, outcome: CallSession['outcome']): Promise<void> {
  const session = sessions.get(callSid);
  if (!session) return;

  session.summary = summary;
  session.outcome = outcome;
  session.updatedAt = new Date();

  await db.collection('calls').add({
    ...session,
    turns: session.turns.map(t => ({ ...t, timestamp: t.timestamp.toISOString() })),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  });

  sessions.delete(callSid);
}

export function detectOutcome(transcript: string): CallSession['outcome'] {
  const lower = transcript.toLowerCase();
  if (lower.includes('emergency') || lower.includes('urgent') || lower.includes('flood') || lower.includes('gas leak')) return 'emergency';
  if (lower.includes('book') || lower.includes('schedule') || lower.includes('appointment') || lower.includes('locked in')) return 'job_booked';
  if (lower.includes('quote') || lower.includes('price') || lower.includes('cost') || lower.includes('how much')) return 'quote_given';
  return 'callback_needed';
}
