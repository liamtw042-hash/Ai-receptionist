import twilioClient, { getTwilioNumber } from '../lib/twilio';
import { db } from '../lib/firebase';

export async function sendSMS(to: string, body: string): Promise<void> {
  await twilioClient.messages.create({ from: getTwilioNumber(), to, body });
}

export async function sendCallSummaryToTradie(
  tradieNumber: string,
  callerNumber: string,
  summary: string,
  outcome: string
): Promise<void> {
  const msg = `📞 TradeDesk Call Summary\nCaller: ${callerNumber}\nOutcome: ${outcome}\n\n${summary}`;
  await sendSMS(tradieNumber, msg);
}

export async function sendBookingConfirmationToCaller(
  callerNumber: string,
  businessName: string,
  details: string
): Promise<void> {
  const msg = `Hi! Your job booking with ${businessName} has been confirmed.\n\n${details}\n\nWe'll be in touch to confirm the time. Reply to this message with any questions.`;
  await sendSMS(callerNumber, msg);
}

export async function sendEmergencyAlertToTradie(
  tradieNumber: string,
  callerNumber: string,
  details: string
): Promise<void> {
  const msg = `🚨 URGENT — TradeDesk Emergency\nCaller: ${callerNumber}\nDetails: ${details}\n\nCaller has been told you'll call back within 30 mins.`;
  await sendSMS(tradieNumber, msg);
}

export async function sendMissedCallWinback(
  callerNumber: string,
  businessName: string
): Promise<void> {
  const msg = `Hi, sorry we missed your call — this is ${businessName}. How can we help? Reply here and we'll get back to you shortly.`;
  await sendSMS(callerNumber, msg);
}

export async function storeSMSMessage(
  userId: string,
  contactNumber: string,
  body: string,
  direction: 'inbound' | 'outbound',
  // Optional extras so other channels (e.g. email auto-reply) can reuse this
  // same collection/shape and show up in the one unified Messages UI.
  extra?: { channel?: 'sms' | 'email'; subject?: string; gmailMessageId?: string; threadId?: string }
): Promise<void> {
  await db.collection('sms_messages').add({
    userId,
    contactNumber,
    body,
    direction,
    channel: extra?.channel || 'sms',
    ...(extra?.subject ? { subject: extra.subject } : {}),
    ...(extra?.gmailMessageId ? { gmailMessageId: extra.gmailMessageId } : {}),
    ...(extra?.threadId ? { threadId: extra.threadId } : {}),
    timestamp: new Date(),
    read: direction === 'outbound',
  });
}
