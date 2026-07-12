import { Router, Request, Response } from 'express';
import twilio from 'twilio';
import { db } from '../lib/firebase';
import { getAIResponse } from '../lib/openai';
import { getBusinessSettings, buildSystemPrompt } from '../services/businessContext';
import { sendSMS, storeSMSMessage } from '../services/smsService';
import { upsertContact } from '../services/contactService';
import { resolveTwilioUser } from '../middleware/authMiddleware';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

// Twilio inbound SMS webhook.
//
// Always answers 200 + valid TwiML. Anything else (a 500, or the bare "OK" that
// res.sendStatus(200) used to send) makes Twilio fall through to the number's
// SmsFallbackUrl — which on a fresh number is still Twilio's demo responder, the
// actual source of the "Thanks for the message. Configure your number's SMS URL
// to change this message" auto-reply. The reply itself is sent via the REST API
// (sendSMS) below, so the TwiML we return here is deliberately EMPTY — returning
// a <Message> as well would text the customer twice.
router.post('/inbound', async (req: Request, res: Response) => {
  const emptyTwiml = () =>
    res.type('text/xml').status(200).send(new twilio.twiml.MessagingResponse().toString());

  // req.body is {} if the form-encoded parser didn't run — never destructure blind.
  const { From, To, Body } = (req.body ?? {}) as Record<string, string | undefined>;

  if (!From || !To || !Body) {
    console.warn('SMS inbound: missing fields', {
      hasFrom: Boolean(From), hasTo: Boolean(To), hasBody: Boolean(Body),
      contentType: req.headers['content-type'],
    });
    emptyTwiml();
    return;
  }

  try {
    const userId = await resolveTwilioUser(To, db);
    if (!userId) { emptyTwiml(); return; }

    const settings = await getBusinessSettings(userId);
    if (!settings) { emptyTwiml(); return; }

    await storeSMSMessage(userId, From, Body, 'inbound');
    await upsertContact(userId, From, { lastInteraction: new Date() });

    const systemPrompt = buildSystemPrompt(settings) +
      '\n\nIMPORTANT: You are replying via SMS. Keep replies under 160 characters when possible. Be helpful and warm.';

    const recentMessages = await db.collection('sms_messages')
      .where('userId', '==', userId)
      .where('contactNumber', '==', From)
      .orderBy('timestamp', 'desc')
      .limit(6)
      .get();

    const history = recentMessages.docs.reverse().map(d => {
      const data = d.data();
      return { role: (data.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant', content: data.body };
    });

    const reply = await getAIResponse(systemPrompt, Body, history.slice(0, -1));

    await sendSMS(From, reply);
    await storeSMSMessage(userId, From, reply, 'outbound');

  } catch (err) {
    // Log the REAL error (config errors from lib/firebase + lib/twilio carry a
    // .reason and a message naming the missing env var) instead of swallowing it.
    const reason = (err as { reason?: string }).reason;
    console.error('SMS inbound error:', reason ? `[${reason}] ` : '', err);
  }

  emptyTwiml();
});

// Send SMS from dashboard
router.post('/send', requireAuth, async (req: AuthRequest, res: Response) => {
  const { to, body } = req.body;
  if (!to || !body) { res.status(400).json({ error: 'Missing to or body' }); return; }

  try {
    await sendSMS(to, body);
    await storeSMSMessage(req.userId!, to, body, 'outbound');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Get SMS conversations — one entry per contact number, each with its full
// message history, shaped to match the frontend's Conversation interface.
router.get('/conversations', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [msgSnap, contactsSnap] = await Promise.all([
      db.collection('sms_messages')
        .where('userId', '==', req.userId)
        .orderBy('timestamp', 'asc')
        .limit(500)
        .get(),
      db.collection('contacts')
        .where('userId', '==', req.userId)
        .get(),
    ]);

    // Contact docs store the number under `phoneNumber` (see contactService.ts).
    const nameByNumber: Record<string, string> = {};
    contactsSnap.docs.forEach(d => {
      const data = d.data();
      if (data.name) nameByNumber[data.phoneNumber] = data.name;
    });

    interface ConvoAccumulator {
      id: string;
      phoneNumber: string;
      contactName?: string;
      channel: 'sms' | 'email';
      subject?: string;
      messages: Array<{ id: string; direction: 'inbound' | 'outbound'; body: string; createdAt: string; status?: string; subject?: string }>;
      lastMessage?: string;
      lastMessageAt?: string;
      unread: number;
    }

    const grouped: Record<string, ConvoAccumulator> = {};

    msgSnap.docs.forEach(d => {
      const data = d.data();
      const num = data.contactNumber;
      const channel: 'sms' | 'email' = data.channel === 'email' ? 'email' : 'sms';
      if (!grouped[num]) {
        grouped[num] = {
          id: num,
          phoneNumber: num,
          contactName: nameByNumber[num] || undefined,
          channel,
          messages: [],
          unread: 0,
        };
      }
      const createdAt = data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : (data.timestamp ?? new Date().toISOString());
      grouped[num].messages.push({
        id: d.id,
        direction: data.direction,
        body: data.body,
        createdAt,
        status: data.direction === 'outbound' ? (data.status || 'delivered') : undefined,
        subject: data.subject || undefined,
      });
      grouped[num].lastMessage = data.body;
      grouped[num].lastMessageAt = createdAt;
      // Most recent message's channel/subject wins for conversation-level display.
      grouped[num].channel = channel;
      if (data.subject) grouped[num].subject = data.subject;
      if (data.direction === 'inbound' && !data.read) grouped[num].unread += 1;
    });

    const conversations = Object.values(grouped).sort((a, b) =>
      (b.lastMessageAt || '').localeCompare(a.lastMessageAt || '')
    );

    res.json(conversations);
  } catch (err) {
    console.error('Fetch conversations error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get messages for a specific contact
router.get('/messages/:contactNumber', requireAuth, async (req: AuthRequest, res: Response) => {
  const { contactNumber } = req.params;
  try {
    const snap = await db.collection('sms_messages')
      .where('userId', '==', req.userId)
      .where('contactNumber', '==', contactNumber)
      .orderBy('timestamp', 'asc')
      .get();

    const messages = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id, body: data.body, direction: data.direction,
        timestamp: data.timestamp.toDate().toISOString(), read: data.read,
        channel: data.channel === 'email' ? 'email' : 'sms',
        subject: data.subject || undefined,
      };
    });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export { router as smsRouter };
