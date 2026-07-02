/**
 * Automated verification for the Gmail email auto-reply feature.
 *
 * This does NOT hit real Google / OpenAI / Firebase. Instead it intercepts the
 * module loader so that the four external dependencies of emailAutoReply.ts
 * (firebase `db`, googleAuth `getAuthedClient`, the `googleapis` Gmail client,
 * openai `getAIResponse`, businessContext, and smsService `storeSMSMessage`)
 * are replaced with in-memory fakes that record what the REAL, unmodified
 * pollAndReplyForUser() code path does with a realistic nested-multipart Gmail
 * message. It then asserts on:
 *   - header / body / threadId / RFC Message-ID extraction (nested MIME)
 *   - the AI reply going through the real getAIResponse/buildSystemPrompt path
 *   - the outgoing raw MIME (base64url, In-Reply-To/References use the RFC
 *     Message-ID not Gmail's numeric id, Content-Type / MIME-Version headers)
 *   - the original message being marked read (UNREAD label removed)
 *   - both inbound + outbound writes via storeSMSMessage with channel:'email'
 *   - the idempotency/dedupe guard actually preventing a double reply
 *
 * Run with:  npx tsx src/services/__tests__/emailAutoReply.test.ts
 */
import Module from 'module';

// ── 1. Build in-memory fakes ────────────────────────────────────────────────
interface StoredMsg {
  userId: string; contactNumber: string; body: string;
  direction: 'inbound' | 'outbound';
  channel?: string; subject?: string; gmailMessageId?: string; threadId?: string;
}
const storedMessages: StoredMsg[] = [];        // simulates the sms_messages collection
const modifiedIds: Array<{ id: string; removeLabelIds?: string[] }> = [];
const sentMessages: Array<{ raw: string; threadId?: string }> = [];
let aiCalls: Array<{ systemPrompt: string; userMessage: string }> = [];

// A realistic Gmail messages.get(format:'full') response with a NESTED
// multipart payload (multipart/mixed > multipart/alternative > text/plain),
// not a flat one-level body.
const GMAIL_NUMERIC_ID = '18f0abc123def456';   // Gmail's internal id
const RFC_MESSAGE_ID = '<CAJq8zP2example@mail.gmail.com>'; // real RFC Message-ID
const THREAD_ID = 'thread-99887766';
const enc = (s: string) => Buffer.from(s, 'utf-8').toString('base64url');

const fakeFullMessage = {
  data: {
    id: GMAIL_NUMERIC_ID,
    threadId: THREAD_ID,
    payload: {
      mimeType: 'multipart/mixed',
      headers: [
        { name: 'From', value: 'Dave Smith <dave@example.com.au>' },
        { name: 'Subject', value: 'Quote for blocked drain' },
        { name: 'Message-ID', value: RFC_MESSAGE_ID },
        { name: 'To', value: 'tradie@smithsplumbing.com.au' },
      ],
      parts: [
        {
          mimeType: 'multipart/alternative',
          parts: [
            { mimeType: 'text/plain', body: { data: enc('Hi, my kitchen drain is blocked. What would a callout cost?') } },
            { mimeType: 'text/html', body: { data: enc('<p>Hi, my kitchen drain is blocked.</p>') } },
          ],
        },
        { mimeType: 'application/pdf', filename: 'photo.pdf', body: { attachmentId: 'att-1' } },
      ],
    },
  },
};

// Fake gmail client
function makeGmailClient() {
  return {
    users: {
      messages: {
        list: async () => ({ data: { messages: [{ id: GMAIL_NUMERIC_ID }] } }),
        get: async () => fakeFullMessage,
        send: async (args: any) => { sentMessages.push(args.requestBody); return { data: { id: 'sent-1' } }; },
        modify: async (args: any) => { modifiedIds.push({ id: args.id, removeLabelIds: args.requestBody?.removeLabelIds }); return { data: {} }; },
      },
    },
  };
}

// Fake Firestore db — only implements the query surface pollAndReplyForUser uses.
const fakeDb = {
  collection(name: string) {
    return {
      doc(_id: string) {
        return {
          get: async () => {
            if (name === 'googleTokens') {
              return {
                exists: true,
                data: () => ({ scope: 'https://www.googleapis.com/auth/gmail.modify', email: 'tradie@smithsplumbing.com.au' }),
              };
            }
            return { exists: false, data: () => undefined };
          },
        };
      },
      where(field: string, _op: string, value: any) {
        // Only used for the dedupe check: gmailMessageId == msgRef.id
        const self = {
          where() { return self; },
          limit() { return self; },
          get: async () => {
            const matches = storedMessages.filter(m =>
              field === 'gmailMessageId' ? m.gmailMessageId === value : true);
            return { empty: matches.length === 0, docs: matches.map(m => ({ data: () => m })) };
          },
        };
        return self;
      },
    };
  },
};

// ── 2. Intercept module loading so the REAL emailAutoReply.ts gets fakes ─────
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'googleapis') {
    return {
      google: { gmail: () => makeGmailClient() },
      gmail_v1: {},
    };
  }
  if (request.endsWith('/lib/firebase') || request.endsWith('lib/firebase')) {
    return { db: fakeDb, auth: {}, default: {} };
  }
  if (request.endsWith('/lib/googleAuth')) {
    return { getAuthedClient: async () => ({ /* fake authed client */ }) };
  }
  if (request.endsWith('/lib/openai')) {
    return {
      getAIResponse: async (systemPrompt: string, userMessage: string) => {
        aiCalls.push({ systemPrompt, userMessage });
        return 'No worries Dave — a standard drain callout runs about $120–$180. Happy to book you in. Cheers, Dave from Smith’s Plumbing.';
      },
    };
  }
  if (request.endsWith('/businessContext') || request.endsWith('businessContext')) {
    return {
      getBusinessSettings: async () => ({
        businessName: "Smith's Plumbing", traderName: 'Dave', tradeType: 'plumber',
        suburb: 'Bondi', pricingGuide: 'Callout $120-180', availability: 'Mon-Fri',
        mobileNumber: '0400000000', services: ['drains'], emergencyCallbackMinutes: 30,
      }),
      buildSystemPrompt: (s: any) => `SYSTEM_PROMPT_FOR:${s.businessName}`,
    };
  }
  if (request.endsWith('/smsService') || request.endsWith('smsService')) {
    return {
      storeSMSMessage: async (userId: string, contactNumber: string, body: string, direction: string, extra: any = {}) => {
        storedMessages.push({ userId, contactNumber, body, direction: direction as any, ...extra });
      },
    };
  }
  return originalLoad.apply(this, [request, parent, isMain]);
};

// ── 3. Import the REAL module (now wired to fakes) and run assertions ────────
let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { console.log(`  ✓ ${msg}`); }
  else { console.error(`  ✗ FAIL: ${msg}`); failures++; }
}

async function run() {
  const mod = require('../emailAutoReply');
  const { pollAndReplyForUser, buildRawReply, extractPlainTextBody, parseFromHeader } = mod;

  console.log('\n── Unit: parseFromHeader ──');
  assert(parseFromHeader('Dave Smith <dave@example.com.au>').email === 'dave@example.com.au', 'extracts email from "Name <addr>"');
  assert(parseFromHeader('Dave Smith <dave@example.com.au>').name === 'Dave Smith', 'extracts display name');
  assert(parseFromHeader('bare@example.com').email === 'bare@example.com', 'handles a bare address');

  console.log('\n── Unit: extractPlainTextBody (nested multipart) ──');
  const body = extractPlainTextBody(fakeFullMessage.data.payload);
  assert(body.includes('kitchen drain is blocked'), 'walks nested multipart/mixed>alternative to the text/plain part');
  assert(!body.includes('<p>'), 'prefers text/plain over text/html');

  console.log('\n── Unit: buildRawReply MIME ──');
  const raw = buildRawReply({
    fromAddress: 'me@x.com', toAddress: 'dave@example.com.au',
    subject: 'Quote for blocked drain', body: 'Hi Dave', inReplyToMessageId: RFC_MESSAGE_ID,
  });
  // base64url should not contain +, /, or = padding
  assert(!/[+/=]/.test(raw), 'output is base64url (no +, /, or = chars)');
  const decoded = Buffer.from(raw, 'base64url').toString('utf-8');
  assert(decoded.includes('MIME-Version: 1.0'), 'includes MIME-Version header');
  assert(decoded.includes('Content-Type: text/plain; charset="UTF-8"'), 'includes Content-Type header');
  assert(decoded.includes(`In-Reply-To: ${RFC_MESSAGE_ID}`), 'In-Reply-To uses the RFC Message-ID');
  assert(decoded.includes(`References: ${RFC_MESSAGE_ID}`), 'References uses the RFC Message-ID');
  assert(!decoded.includes(GMAIL_NUMERIC_ID), 'does NOT leak Gmail internal numeric id into threading headers');
  assert(decoded.includes('Subject: Re: Quote for blocked drain'), 'prefixes Re: on the subject');
  assert(decoded.includes('\r\n\r\nHi Dave'), 'separates headers from body with a blank line');

  console.log('\n── Integration: pollAndReplyForUser (first poll) ──');
  const result1 = await pollAndReplyForUser('user-1');
  assert(result1.connected === true, 'reports connected');
  assert(result1.processed === 1, 'processes exactly 1 unread message');

  assert(aiCalls.length === 1, 'called getAIResponse exactly once');
  assert(aiCalls[0].systemPrompt.includes("SYSTEM_PROMPT_FOR:Smith's Plumbing"), 'used buildSystemPrompt output');
  assert(aiCalls[0].systemPrompt.includes('replying to an email enquiry'), 'appended the email-specific instructions');
  assert(aiCalls[0].userMessage.includes('kitchen drain is blocked'), 'fed the extracted body to the AI');
  assert(aiCalls[0].userMessage.includes('Subject: Quote for blocked drain'), 'fed the subject to the AI');

  assert(sentMessages.length === 1, 'sent exactly 1 reply');
  assert(sentMessages[0].threadId === THREAD_ID, 'reply sent on the original threadId');
  const sentDecoded = Buffer.from(sentMessages[0].raw, 'base64url').toString('utf-8');
  assert(sentDecoded.includes(`In-Reply-To: ${RFC_MESSAGE_ID}`), 'sent reply threads via RFC Message-ID');
  assert(sentDecoded.includes('To: Dave Smith <dave@example.com.au>'), 'sent reply addressed back to sender');

  assert(modifiedIds.length === 1 && modifiedIds[0].id === GMAIL_NUMERIC_ID, 'marked the original message');
  assert((modifiedIds[0].removeLabelIds || []).includes('UNREAD'), 'removed the UNREAD label (marks it read)');

  const inbound = storedMessages.find(m => m.direction === 'inbound');
  const outbound = storedMessages.find(m => m.direction === 'outbound');
  assert(!!inbound && !!outbound, 'wrote both inbound and outbound messages');
  assert(inbound!.channel === 'email' && outbound!.channel === 'email', "both stored with channel:'email'");
  assert(inbound!.subject === 'Quote for blocked drain', 'inbound stored with the subject');
  assert(inbound!.gmailMessageId === GMAIL_NUMERIC_ID, 'inbound stored with gmailMessageId (for dedupe)');
  assert(inbound!.threadId === THREAD_ID && outbound!.threadId === THREAD_ID, 'both stored with threadId');
  assert(inbound!.contactNumber === 'dave@example.com.au', 'inbound keyed by sender email address');

  console.log('\n── Integration: idempotency / dedupe (second poll of same message) ──');
  const beforeSent = sentMessages.length;
  const beforeStored = storedMessages.length;
  const result2 = await pollAndReplyForUser('user-1');
  assert(result2.processed === 0, 'second poll processes 0 (dedupe guard hit)');
  assert(sentMessages.length === beforeSent, 'no second reply sent');
  assert(storedMessages.length === beforeStored, 'no duplicate messages written');

  console.log('\n── Integration: GET /api/email/poll CRON_SECRET auth ──');
  // Exercise the real email router. pollAllUsers reads googleTokens.get() which
  // our fakeDb doesn't fully implement, so we only assert the AUTH branches
  // (rejection paths return before any DB access; the success path we detect by
  // it getting *past* auth into pollAllUsers).
  process.env.CRON_SECRET = 'test-secret-123';
  const { emailRouter } = require('../../routes/email');

  function dispatch(headers: Record<string, string>): Promise<{ status: number; body: any }> {
    return new Promise((resolve) => {
      const req: any = { method: 'GET', url: '/poll', headers, on: () => {}, once: () => {} };
      let statusCode = 200;
      const res: any = {
        status(c: number) { statusCode = c; return res; },
        json(b: any) { resolve({ status: statusCode, body: b }); return res; },
        setHeader() {}, getHeader() {}, end() { resolve({ status: statusCode, body: undefined }); },
      };
      emailRouter.handle(req, res, () => resolve({ status: 404, body: 'no-route' }));
    });
  }

  const noAuth = await dispatch({});
  assert(noAuth.status === 401, 'rejects a request with NO Authorization header (401)');
  const badAuth = await dispatch({ authorization: 'Bearer wrong-secret' });
  assert(badAuth.status === 401, 'rejects a request with a WRONG bearer token (401)');
  const goodAuth = await dispatch({ authorization: 'Bearer test-secret-123' });
  // With the correct secret it proceeds into pollAllUsers; our fakeDb.get() on a
  // collection has no .docs, so pollAllUsers throws -> 500. The key point: it got
  // PAST the 401 auth gate (status is NOT 401), proving a valid token is accepted.
  assert(goodAuth.status !== 401, 'accepts a VALID bearer token (proceeds past the auth gate)');

  console.log(`\n${failures === 0 ? '✅ ALL ASSERTIONS PASSED' : `❌ ${failures} ASSERTION(S) FAILED`}\n`);
  (Module as any)._load = originalLoad;
  process.exit(failures === 0 ? 0 : 1);
}

run().catch(err => { console.error('Test harness error:', err); process.exit(1); });
