import { db } from '../lib/firebase';
import { getAIResponse } from '../lib/openai';
import { getBusinessSettings } from './businessContext';
import {
  getSession, createSession, addTurn, finalizeSession, detectOutcome, CallSession,
} from './callSessionService';
import { sendCallSummaryToTradie, sendBookingConfirmationToCaller } from './smsService';
import { upsertContact } from './contactService';
import { resolveTwilioUser } from '../middleware/authMiddleware';
import { appendToSheet, createCalendarEvent } from '../lib/googleAuth';
import { createJobFromCall } from './jobService';

// ─────────────────────────────────────────────────────────────────────────────
// The post-call pipeline: summarise → SMS the tradie → log to Firestore →
// create the job → sync to Google Sheets/Calendar.
//
// This used to live inline in the `/api/voice/status` handler. It's been lifted
// here verbatim so the *same* implementation serves two callers:
//   1. `/api/voice/status`      — the legacy <Gather>/<Say> flow (unchanged).
//   2. `/api/voice/bridge/complete` — the Realtime media-stream bridge, which
//      runs on a separate host and hands its transcript back over HTTP.
// There is deliberately only one copy of this logic; the bridge does not
// reimplement any of it.
// ─────────────────────────────────────────────────────────────────────────────

// Extract structured fields from the transcript/summary for the Sheet row,
// the Jobs page and the Calendar event.
export function extractCallDetails(
  transcript: string,
  summary: string,
  outcome: string,
  callerNumber: string,
  now: Date
): Record<string, string> {
  // Try to extract caller name from transcript
  const nameMatch = transcript.match(/(?:my name is|this is|it'?s)\s+([A-Z][a-z]+ ?[A-Z]?[a-z]*)/i);
  const callerName = nameMatch ? nameMatch[1].trim() : '';

  // Try to extract address
  const addrMatch = transcript.match(/(\d+\s+[A-Za-z]+ (?:St|Street|Rd|Road|Ave|Avenue|Dr|Drive|Cl|Close|Pl|Place|Cres|Crescent)[a-z,\s]*)/i);
  const address = addrMatch ? addrMatch[1].trim() : '';

  // Try to extract job type from first user turn
  const jobMatch = transcript.match(/(?:need|want|looking for|fix|repair|install|replace)\s+([a-zA-Z\s]{3,40}?)(?:\.|,|$)/i);
  const jobType = jobMatch ? jobMatch[1].trim() : '';

  // Try to extract quote
  const quoteMatch = transcript.match(/\$[\d,]+(?:\s*[-–]\s*\$[\d,]+)?/);
  const quoteGiven = quoteMatch ? quoteMatch[0] : '';

  return {
    date: now.toLocaleDateString('en-AU'),
    time: now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
    callerName,
    callerNumber,
    jobType,
    address,
    quoteGiven,
    outcome: outcome.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    notes: summary.replace(/\n/g, ' ').slice(0, 500),
  };
}

export type CompleteCallResult =
  | 'ok'
  | 'no_session'
  | 'no_user'
  | 'no_settings';

/**
 * Run the full post-call pipeline for a call whose session is already in the
 * in-process session store. Safe to call once per completed call.
 */
export async function completeCall(params: {
  callSid: string;
  from: string;
  called: string;
  durationSeconds?: number;
}): Promise<CompleteCallResult> {
  const { callSid, from, called, durationSeconds } = params;

  const session = getSession(callSid);
  if (!session) return 'no_session';

  const userId = await resolveTwilioUser(called, db);
  if (!userId) return 'no_user';

  const settings = await getBusinessSettings(userId);
  if (!settings) return 'no_settings';

  const transcript = session.turns
    .map(t => `${t.role === 'assistant' ? 'AI' : 'Caller'}: ${t.content}`)
    .join('\n');
  const outcome = session.outcome === 'in_progress' ? detectOutcome(transcript) : session.outcome;

  const summaryPrompt = `Summarise this call transcript in 3 bullet points for a tradie. Include: what the caller wanted, any details captured (name, address, job type), and what was agreed.\n\n${transcript}`;
  const summary = await getAIResponse(
    'You are a concise assistant. Summarise call transcripts for tradies in plain English.',
    summaryPrompt
  );

  const callDoc = await finalizeSession(callSid, summary, outcome, durationSeconds);
  await sendCallSummaryToTradie(settings.mobileNumber, from, summary, outcome.replace(/_/g, ' ').toUpperCase());

  const now = new Date();

  if (outcome === 'job_booked') {
    await sendBookingConfirmationToCaller(from, settings.businessName,
      'Your job has been logged. We\'ll confirm the exact time shortly.');

    // Log it to the Jobs page too — independent of whether Google is
    // connected, this is the in-app source of truth for booked work.
    try {
      const details = extractCallDetails(transcript, summary, outcome, from, now);
      await createJobFromCall(userId, {
        callId: callDoc || callSid,
        callerName: details.callerName,
        callerNumber: from,
        jobType: details.jobType,
        address: details.address,
        quoteGiven: details.quoteGiven,
        notes: summary,
      });
    } catch (jobErr) {
      console.error('Create job from call error:', jobErr);
    }
  }

  await upsertContact(userId, from, { lastInteraction: new Date(), notes: summary });

  // ── Google integrations ────────────────────────────────────────────────
  const tokenDoc = await db.collection('googleTokens').doc(userId).get();

  if (tokenDoc.exists) {
    const tokenData = tokenDoc.data()!;

    // Append to Google Sheets if connected
    if (tokenData.spreadsheetId) {
      try {
        const rowData = extractCallDetails(transcript, summary, outcome, from, now);
        await appendToSheet(userId, rowData);

        // Mark this call as logged in the DB doc if we have the id
        if (callDoc) {
          await db.collection('calls').doc(callDoc).update({ googleSheetLogged: true });
        }
      } catch (sheetErr) {
        console.error('Google Sheets append error:', sheetErr);
      }
    }

    // Create Calendar event if job booked
    if (outcome === 'job_booked') {
      try {
        const details = extractCallDetails(transcript, summary, outcome, from, now);
        // Schedule for next business day 9 AM by default
        const eventStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        eventStart.setHours(9, 0, 0, 0);
        const eventEnd = new Date(eventStart.getTime() + 2 * 60 * 60 * 1000);

        await createCalendarEvent(userId, {
          title: `🔧 ${details.jobType || 'Job'} — ${details.callerName || from}`,
          description: [
            `Customer: ${details.callerName || 'Unknown'}`,
            `Phone: ${from}`,
            `Job: ${details.jobType || 'See notes'}`,
            `Address: ${details.address || 'TBC'}`,
            `Quote: ${details.quoteGiven || 'TBC'}`,
            '',
            'Notes:',
            summary,
          ].join('\n'),
          startTime: eventStart.toISOString(),
          endTime: eventEnd.toISOString(),
          location: details.address,
        });
      } catch (calErr) {
        console.error('Google Calendar event error:', calErr);
      }
    }
  }
  // ── End Google integrations ───────────────────────────────────────────

  return 'ok';
}

/**
 * Rehydrate a call that was handled entirely by the Realtime voice bridge on
 * another host, then run the identical post-call pipeline above.
 *
 * The bridge holds the conversation in its own process, so by the time the call
 * ends there is no session in *this* process's store. We rebuild an equivalent
 * session from the transcript the bridge posts back, which lets `completeCall`
 * (and therefore `finalizeSession`, the SMS, Firestore, Sheets, Calendar and
 * Jobs paths) run exactly as it does for the legacy flow.
 */
export async function completeBridgedCall(params: {
  callSid: string;
  from: string;
  called: string;
  turns: Array<{ role: 'user' | 'assistant'; content: string }>;
  outcome?: CallSession['outcome'];
  durationSeconds?: number;
}): Promise<CompleteCallResult> {
  const { callSid, from, called, turns, outcome, durationSeconds } = params;

  const userId = await resolveTwilioUser(called, db);
  if (!userId) return 'no_user';

  // Replace any partial session for this SID (e.g. a retry) so a redelivered
  // completion can't append the transcript twice.
  const existing = getSession(callSid);
  if (existing) existing.turns.length = 0;

  const session = existing ?? createSession(callSid, userId, from);
  for (const turn of turns) {
    if (turn.content && turn.content.trim()) addTurn(callSid, turn.role, turn.content.trim());
  }
  if (outcome) session.outcome = outcome;

  return completeCall({ callSid, from, called, durationSeconds });
}
