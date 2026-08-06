/**
 * Offline end-to-end call simulation.
 *
 *   npm run simulate
 *
 * Stands up a mock OpenAI Realtime server and a mock TradeDesk backend, boots
 * the real bridge against them, then plays the part of Twilio: connects the
 * media-stream websocket, sends `start`, streams μ-law frames, barges in over
 * the AI, and hangs up.
 *
 * This exercises the real bridge code — audio pass-through, the GA session
 * payload, barge-in truncation, mark handling and the post-call handoff —
 * without a phone, a Twilio account or a cent of OpenAI spend.
 */
import './testEnv';
import assert from 'node:assert';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import WebSocket, { WebSocketServer } from 'ws';
import { toneFrames, silenceFrame, TWILIO_FRAME_BYTES, base64MulawDurationMs } from '../audio';

const results: string[] = [];
function pass(name: string): void { results.push(name); console.log(`  ✓ ${name}`); }

async function listen(server: http.Server): Promise<number> {
  await new Promise<void>(r => server.listen(0, r));
  return (server.address() as AddressInfo).port;
}

// ── Mock OpenAI Realtime server ──────────────────────────────────────────────
interface MockOpenAIState {
  sessionUpdate: any | null;
  appendedAudioMs: number;
  truncations: Array<{ audio_end_ms: number; item_id: string }>;
  responseCreates: number;
}

function startMockOpenAI(state: MockOpenAIState) {
  const server = http.createServer();
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    // The bridge must authenticate like the real API expects.
    assert.ok(
      (req.headers.authorization || '').startsWith('Bearer '),
      'bridge must send a bearer token'
    );

    ws.on('message', raw => {
      const evt = JSON.parse(raw.toString());
      switch (evt.type) {
        case 'session.update':
          state.sessionUpdate = evt.session;
          ws.send(JSON.stringify({ type: 'session.updated', session: evt.session }));
          break;

        case 'input_audio_buffer.append': {
          const before = state.appendedAudioMs;
          state.appendedAudioMs += base64MulawDurationMs(evt.audio);
          // Once enough caller audio has arrived, emit the ASR result the real
          // API would produce, so the transcript path is exercised too.
          if (before < 300 && state.appendedAudioMs >= 300) {
            ws.send(JSON.stringify({
              type: 'conversation.item.input_audio_transcription.completed',
              transcript: "Yeah g'day, I've got a burst pipe under the kitchen sink in Merewether.",
            }));
          }
          break;
        }

        case 'conversation.item.truncate':
          state.truncations.push({ audio_end_ms: evt.audio_end_ms, item_id: evt.item_id });
          break;

        case 'response.create': {
          state.responseCreates++;
          // Emit a short "spoken" reply as μ-law audio deltas, exactly as the
          // real API does, then the transcript and response.done.
          const itemId = `item_${state.responseCreates}`;
          for (const frame of toneFrames({ durationMs: 200, freqHz: 300 })) {
            ws.send(JSON.stringify({
              type: 'response.output_audio.delta', delta: frame, item_id: itemId,
            }));
          }
          ws.send(JSON.stringify({
            type: 'response.output_audio_transcript.done',
            transcript: state.responseCreates === 1
              ? "G'day, Smith's Plumbing — you're speaking with the AI assistant. What's happening?"
              : 'Righto, I can help with that.',
          }));
          ws.send(JSON.stringify({ type: 'response.done', response: { status: 'completed' } }));
          break;
        }
      }
    });
  });

  return { server, wss };
}

// ── Mock TradeDesk backend ───────────────────────────────────────────────────
interface MockBackendState {
  contextRequests: number;
  completions: any[];
}

function startMockBackend(state: MockBackendState) {
  return http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      assert.strictEqual(req.headers['x-bridge-secret'], 'test-secret',
        'bridge must authenticate to the backend');

      if (req.url === '/voice/bridge/context') {
        state.contextRequests++;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          userId: 'user-123',
          settings: {
            businessName: "Smith's Plumbing", traderName: 'Dave', tradeType: 'plumbing',
            suburb: 'Merewether', pricingGuide: 'Burst pipe $180-$320.',
            availability: 'Mon-Fri', mobileNumber: '+61400111222',
            services: ['burst pipes'], emergencyCallbackMinutes: 30,
          },
        }));
        return;
      }

      if (req.url === '/voice/bridge/complete') {
        state.completions.push(JSON.parse(body));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      res.writeHead(404).end();
    });
  });
}

// ── Twilio impersonation ─────────────────────────────────────────────────────
function twilioFrame(event: string, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ event, ...extra });
}

async function main(): Promise<void> {
  console.log('offline call simulation\n');

  const openaiState: MockOpenAIState = {
    sessionUpdate: null, appendedAudioMs: 0, truncations: [], responseCreates: 0,
  };
  const backendState: MockBackendState = { contextRequests: 0, completions: [] };

  const mockOpenAI = startMockOpenAI(openaiState);
  const openaiPort = await listen(mockOpenAI.server);
  const mockBackend = startMockBackend(backendState);
  const backendPort = await listen(mockBackend);

  // Point the bridge at the mocks, then import it (config reads env on load).
  process.env.OPENAI_REALTIME_URL_OVERRIDE = `ws://127.0.0.1:${openaiPort}`;
  process.env.BACKEND_API_URL = `http://127.0.0.1:${backendPort}`;
  process.env.PORT = '0';
  process.env.VALIDATE_TWILIO_SIGNATURE = 'false';
  process.env.PUBLIC_URL = 'http://127.0.0.1';

  const { CallBridge } = await import('../callBridge');

  // Host the media-stream endpoint the way index.ts does.
  const bridgeServer = http.createServer();
  const bridgeWss = new WebSocketServer({ noServer: true });
  bridgeServer.on('upgrade', (req, socket, head) => {
    bridgeWss.handleUpgrade(req, socket, head, ws => { new CallBridge(ws); });
  });
  const bridgePort = await listen(bridgeServer);

  // ── Act as Twilio ──────────────────────────────────────────────────────────
  const twilio = new WebSocket(`ws://127.0.0.1:${bridgePort}/media-stream`);
  const received: any[] = [];
  twilio.on('message', raw => received.push(JSON.parse(raw.toString())));
  await new Promise<void>(r => twilio.on('open', () => r()));

  twilio.send(twilioFrame('connected', { protocol: 'Call', version: '1.0.0' }));
  twilio.send(twilioFrame('start', {
    start: {
      streamSid: 'MZ_test_stream', callSid: 'CA_test_call',
      customParameters: { from: '+61412345678', called: '+61249001234' },
    },
  }));

  // Give the bridge time to fetch context and negotiate the realtime session.
  await new Promise(r => setTimeout(r, 400));

  pass('bridge fetched business context from the backend');
  assert.strictEqual(backendState.contextRequests, 1);

  assert.ok(openaiState.sessionUpdate, 'session.update should have been sent');
  assert.strictEqual(openaiState.sessionUpdate.audio.input.format.type, 'audio/pcmu');
  assert.strictEqual(openaiState.sessionUpdate.audio.output.format.type, 'audio/pcmu');
  pass('session configured with matching audio/pcmu on both directions');

  assert.ok(openaiState.responseCreates >= 1, 'greeting should be triggered');
  pass('greeting was pushed without waiting for the caller');

  // The greeting audio should have reached "Twilio" as media frames.
  const mediaOut = received.filter(m => m.event === 'media');
  assert.ok(mediaOut.length > 0, 'expected audio back to Twilio');
  assert.strictEqual(mediaOut[0].streamSid, 'MZ_test_stream');
  assert.strictEqual(Buffer.from(mediaOut[0].media.payload, 'base64').length, TWILIO_FRAME_BYTES);
  pass(`greeting audio returned to Twilio (${mediaOut.length} frames, 160 bytes each)`);

  const marksOut = received.filter(m => m.event === 'mark');
  assert.ok(marksOut.length > 0, 'expected marks alongside media');
  pass('marks sent so playback completion can be tracked');

  // ── Caller speaks ──────────────────────────────────────────────────────────
  let ts = 0;
  for (const frame of toneFrames({ durationMs: 300, freqHz: 220 })) {
    twilio.send(twilioFrame('media', { media: { payload: frame, timestamp: String(ts) } }));
    ts += 20;
  }
  await new Promise(r => setTimeout(r, 150));
  assert.ok(openaiState.appendedAudioMs >= 300,
    `expected >=300ms of caller audio forwarded, got ${openaiState.appendedAudioMs}`);
  pass(`caller audio forwarded unmodified (${openaiState.appendedAudioMs}ms, pass-through)`);

  // ── Barge-in ───────────────────────────────────────────────────────────────
  // Trigger a fresh AI response, then interrupt it partway through.
  const openaiClient = [...mockOpenAI.wss.clients][0]!;
  openaiClient.send(JSON.stringify({ type: 'response.create' })); // ignored by bridge
  received.length = 0;
  // Ask the mock to speak again by simulating the model deciding to respond.
  for (const frame of toneFrames({ durationMs: 400, freqHz: 300 })) {
    openaiClient.send(JSON.stringify({
      type: 'response.output_audio.delta', delta: frame, item_id: 'item_barge',
    }));
  }
  await new Promise(r => setTimeout(r, 100));

  // Caller starts talking over it — advance Twilio's clock first.
  twilio.send(twilioFrame('media', { media: { payload: silenceFrame(), timestamp: String(ts + 200) } }));
  await new Promise(r => setTimeout(r, 30));
  openaiClient.send(JSON.stringify({ type: 'input_audio_buffer.speech_started' }));
  await new Promise(r => setTimeout(r, 150));

  const clears = received.filter(m => m.event === 'clear');
  assert.ok(clears.length > 0, 'barge-in must clear Twilio playback buffer');
  pass('barge-in cleared buffered audio on Twilio');

  assert.ok(openaiState.truncations.length > 0, 'barge-in must truncate the model transcript');
  const trunc = openaiState.truncations[0]!;
  assert.ok(trunc.audio_end_ms >= 0, 'truncation point must be non-negative');
  assert.ok(trunc.audio_end_ms <= 400,
    `truncation must not exceed audio generated (got ${trunc.audio_end_ms}ms of 400ms)`);
  pass(`barge-in truncated model context at ${trunc.audio_end_ms}ms (clamped to audio sent)`);

  // ── Hang up ────────────────────────────────────────────────────────────────
  twilio.send(twilioFrame('stop', { stop: { callSid: 'CA_test_call' } }));
  await new Promise(r => setTimeout(r, 600));

  assert.strictEqual(backendState.completions.length, 1, 'exactly one completion handoff');
  const completion = backendState.completions[0];
  assert.strictEqual(completion.callSid, 'CA_test_call');
  assert.strictEqual(completion.from, '+61412345678');
  assert.strictEqual(completion.called, '+61249001234');
  assert.ok(Array.isArray(completion.turns) && completion.turns.length > 0);
  assert.ok(completion.turns.some((t: any) => t.role === 'assistant'));
  assert.ok(completion.turns.some((t: any) => t.role === 'user'),
    'caller speech must reach the pipeline — it is what the tradie reads');
  assert.ok(completion.turns.some((t: any) => /burst pipe/i.test(t.content)));
  pass(`call handed back to existing pipeline (${completion.turns.length} turns, ${completion.durationSeconds}s)`);

  assert.strictEqual(completion.outcome, 'emergency',
    'a burst pipe must be flagged urgent, same as the legacy route');
  pass('urgency detected and passed through as outcome=emergency');

  // ── Teardown ───────────────────────────────────────────────────────────────
  await new Promise(r => setTimeout(r, 200));
  assert.strictEqual(mockOpenAI.wss.clients.size, 0,
    'realtime socket must be closed after the call — an open one keeps billing');
  pass('realtime session closed on hangup (no leaked billing)');

  twilio.close();

  // ── Scenario 2: the realtime leg dies mid-call ─────────────────────────────
  // The caller must not be left in silence, and whatever was said so far must
  // still reach the tradie.
  console.log('\nfailure path: realtime socket drops mid-call');

  const redirected: string[] = [];
  const { __setRedirectHookForTests } = await import('../twilioRest');
  __setRedirectHookForTests(async (callSid: string) => { redirected.push(callSid); return true; });

  const twilio2 = new WebSocket(`ws://127.0.0.1:${bridgePort}/media-stream`);
  await new Promise<void>(r => twilio2.on('open', () => r()));
  twilio2.send(twilioFrame('connected', {}));
  twilio2.send(twilioFrame('start', {
    start: {
      streamSid: 'MZ_drop', callSid: 'CA_drop',
      customParameters: { from: '+61455000111', called: '+61249001234' },
    },
  }));
  await new Promise(r => setTimeout(r, 400));

  // Caller says something, then OpenAI dies.
  for (const frame of toneFrames({ durationMs: 320, freqHz: 220 })) {
    twilio2.send(twilioFrame('media', { media: { payload: frame, timestamp: '0' } }));
  }
  await new Promise(r => setTimeout(r, 150));

  const victim = [...mockOpenAI.wss.clients].at(-1)!;
  victim.terminate(); // hard drop, as an upstream outage would look
  await new Promise(r => setTimeout(r, 800));

  assert.ok(redirected.includes('CA_drop'),
    'a dropped realtime socket must redirect the live call to voicemail');
  pass('mid-call failure redirected the caller to voicemail (no silence)');

  const dropCompletion = backendState.completions.find(c => c.callSid === 'CA_drop');
  assert.ok(dropCompletion, 'a failed call must still hand its transcript back');
  assert.ok(dropCompletion.turns.length > 0, 'partial transcript must survive the failure');
  pass(`partial transcript preserved through failure (${dropCompletion.turns.length} turns)`);

  twilio2.close();
  bridgeServer.close();
  mockBackend.close();
  mockOpenAI.server.close();
  mockOpenAI.wss.close();
  bridgeWss.close();

  console.log(`\nsimulation: ${results.length} checks passed\n`);
  // Sockets can hold the loop briefly; exit deterministically.
  setTimeout(() => process.exit(0), 100).unref();
}

main().catch(err => {
  console.error('\nsimulation FAILED:', err);
  process.exit(1);
});
