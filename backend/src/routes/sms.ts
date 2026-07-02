import { Router, Request, Response } from 'express';
import { db } from '../lib/firebase';
import { getAIResponse } from '../lib/openai';
import { getBusinessSettings, buildSystemPrompt } from '../services/businessContext';
import { sendSMS, storeSMSMessage } from '../services/smsService';
import { upsertContact } from '../services/contactService';
import { resolveTwilioUser } from '../middleware/authMiddleware';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

// Twilio inbound SMS webhook
router.post('/inbound', async (req: Request, res: Response) => {
  const { From, To, Body } = req.body;

  try {
    const userId = await resolveTwilioUser(To, db);
    if (!userId) { res.sendStatus(200); return; }

    const settings = await getBusinessSettings(userId);
    if (!settings) { res.sendStatus(200); return; }

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
    console.error('SMS inbound error:', err);
  }

  res.sendStatus(200);
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

// Get SMS conversations
router.get('/conversations', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [smsSnap, contactsSnap] = await Promise.all([
      db.collection('sms_messages')
        .where('userId', '==', req.userId)
        .orderBy('timestamp', 'desc')
        .limit(300)
        .get(),
      db.collection('contacts')
        .where('userId', '==', req.userId)
        .get(),
    ]);

    // Build contact name lookup
    const contactNames: Record<string, string> = {};
    contactsSnap.docs.forEach(d => {
      const data = d.data();
      if (data.phone && data.name) contactNames[data.phone] = data.name;
    });

    // Group messages by phone number (oldest-first per thread)
    const threads: Record<string, {
      messages: Array<{ id: string; direction: string; body: string; createdAt: string; status?: string }>;
      lastAt: string;
    }> = {};

    // snap is newest-first, so push and reverse per thread
    smsSnap.docs.forEach(d => {
      const data = d.data();
      const num: string = data.contactNumber;
      if (!threads[num]) threads[num] = { messages: [], lastAt: '' };
      const ts = data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : (data.timestamp ?? new Date().toISOString());
      threads[num].messages.push({
        id: d.id,
        direction: data.direction,
        body: data.body,
        createdAt: ts,
        status: data.read === false && data.direction === 'inbound' ? 'delivered' : undefined,
      });
      if (!threads[num].lastAt || ts > threads[num].lastAt) threads[num].lastAt = ts;
    });

    const conversations = Object.entries(threads)
      .sort(([, a], [, b]) => b.lastAt.localeCompare(a.lastAt))
      .map(([phoneNumber, thread]) => {
        const msgs = thread.messages.slice().reverse(); // oldest-first
        const last = msgs[msgs.length - 1];
        const unread = msgs.filter(m => m.direction === 'inbound' && !m.status).length;
        return {
          id: phoneNumber,
          phoneNumber,
          contactName: contactNames[phoneNumber] ?? undefined,
          messages: msgs,
          lastMessage: last?.body ?? '',
          lastMessageAt: last?.createdAt ?? '',
          unread,
        };
      });

    res.json(conversations);
  } catch (err) {
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
      return { id: d.id, body: data.body, direction: data.direction, timestamp: data.timestamp.toDate().toISOString(), read: data.read };
    });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export { router as smsRouter };
