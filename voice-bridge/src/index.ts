import http from 'node:http';
import { URL } from 'node:url';
import { WebSocketServer } from 'ws';
import twilio from 'twilio';
import { config, configWarnings } from './config';
import { CallBridge, activeCallCount } from './callBridge';
import { buildFallbackTwiml } from './twilioRest';

// ─────────────────────────────────────────────────────────────────────────────
// HTTP + WebSocket server.
//
//   POST /twiml/incoming  ← Twilio Voice webhook. Answers with <Connect><Stream>
//   WS   /media-stream    ← Twilio's bidirectional media stream
//   GET  /health          ← platform health check
//
// Deliberately plain `node:http` + `ws`: a framework buys nothing here and
// every dependency is another thing that can wedge a live call.
// ─────────────────────────────────────────────────────────────────────────────

const MEDIA_PATH = '/media-stream';

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      // Twilio webhook bodies are tiny; anything large is not from Twilio.
      if (size > 64 * 1024) { reject(new Error('body too large')); req.destroy(); return; }
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

/** The websocket URL Twilio should dial, derived from PUBLIC_URL. */
function mediaStreamUrl(): string {
  const base = config.publicUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  return `${base}${MEDIA_PATH}`;
}

/**
 * TwiML that hands the call to the bridge.
 *
 * `<Connect><Stream>` (not `<Start><Stream>`) is what makes the stream
 * bidirectional — `<Start>` only forks audio out to us and would leave the
 * caller hearing nothing from the AI.
 *
 * The caller's number and the dialled number ride along as <Parameter>s so the
 * bridge can resolve the business without another round trip.
 */
function buildStreamTwiml(from: string, called: string): string {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  const connect = twiml.connect();
  const stream = connect.stream({ url: mediaStreamUrl() });
  stream.parameter({ name: 'from', value: from });
  stream.parameter({ name: 'called', value: called });
  return twiml.toString();
}

function verifyTwilioSignature(req: http.IncomingMessage, rawBody: string, fullUrl: string): boolean {
  if (!config.validateTwilioSignature) return true;
  if (!config.twilioAuthToken) return true; // already warned at boot
  const signature = req.headers['x-twilio-signature'];
  if (typeof signature !== 'string') return false;
  const params = Object.fromEntries(new URLSearchParams(rawBody));
  return twilio.validateRequest(config.twilioAuthToken, signature, fullUrl, params);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', config.publicUrl);

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', activeCalls: activeCallCount(), model: config.model }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/twiml/incoming') {
    let body = '';
    try {
      body = await readBody(req);
    } catch {
      res.writeHead(400).end();
      return;
    }

    const publicHref = `${config.publicUrl}/twiml/incoming`;
    if (!verifyTwilioSignature(req, body, publicHref)) {
      console.warn('[http] rejected /twiml/incoming — bad Twilio signature');
      res.writeHead(403).end();
      return;
    }

    const params = new URLSearchParams(body);
    const from = params.get('From') || '';
    const called = params.get('To') || params.get('Called') || '';

    // If the bridge itself is unhealthy, don't take the call into a stream we
    // can't service — answer with voicemail instead. A recorded message still
    // wins the job; silence does not.
    const twimlXml = config.openaiApiKey
      ? buildStreamTwiml(from, called)
      : buildFallbackTwiml();

    console.log(`[http] incoming call from=${from} called=${called}`);
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twimlXml);
    return;
  }

  res.writeHead(404).end();
});

// ── WebSocket upgrade ────────────────────────────────────────────────────────
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url || '/', config.publicUrl);
  if (pathname !== MEDIA_PATH) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, ws => {
    // Each connection is one phone call; CallBridge owns it from here.
    new CallBridge(ws);
  });
});

// ── Boot ─────────────────────────────────────────────────────────────────────
for (const warning of configWarnings()) console.warn(`[config] ${warning}`);

server.listen(config.port, () => {
  console.log(
    `[boot] voice-bridge listening on :${config.port}\n` +
    `       model=${config.model} voice=${config.voice} speed=${config.speed}\n` +
    `       turn_detection=${config.turnDetection}` +
    (config.turnDetection === 'semantic_vad'
      ? ` eagerness=${config.eagerness}`
      : ` threshold=${config.vadThreshold} silence=${config.vadSilenceDurationMs}ms`) +
    `\n       noise_reduction=${config.noiseReduction} maxCall=${config.maxCallSeconds}s\n` +
    `       stream url=${mediaStreamUrl()}`
  );
});

// Graceful shutdown so a deploy doesn't cut live calls dead. Platforms send
// SIGTERM then SIGKILL after a grace period; we stop accepting new calls and
// let in-flight ones finish.
function gracefulExit(signal: string): void {
  console.log(`[boot] ${signal} received — draining (${activeCallCount()} active calls)`);
  server.close(() => process.exit(0));
  const deadline = setTimeout(() => {
    console.warn('[boot] drain timeout — exiting with calls still active');
    process.exit(0);
  }, 30000);
  deadline.unref?.();
}
process.on('SIGTERM', () => gracefulExit('SIGTERM'));
process.on('SIGINT', () => gracefulExit('SIGINT'));

// A stray rejection must never take down a process that is holding live calls.
process.on('unhandledRejection', reason => {
  console.error('[boot] unhandled rejection:', reason);
});
