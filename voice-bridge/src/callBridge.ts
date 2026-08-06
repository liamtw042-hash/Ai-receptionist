import WebSocket from 'ws';
import { config } from './config';
import {
  REALTIME_URL, REALTIME_HEADERS, buildSessionUpdate, buildGreetingTrigger, buildWrapUpTrigger,
} from './realtimeSession';
import { base64MulawDurationMs, validateMulawPayload } from './audio';
import {
  fetchBusinessContext, completeCall,
  type BusinessSettings, type BridgeTurn, type CallOutcome,
} from './backendClient';
import { redirectCallToFallback } from './twilioRest';

// ─────────────────────────────────────────────────────────────────────────────
// One CallBridge instance per phone call. It owns two sockets — Twilio's media
// stream and OpenAI's realtime session — and the state that keeps them in sync.
//
// Lifecycle, in order:
//   Twilio: connected → start → media…(+ mark echoes) → stop
//   OpenAI: open → session.update → session.updated → response.create(greeting)
//           → response.output_audio.delta… → speech_started/stopped → …
//
// Teardown is idempotent and runs from whichever side dies first, so a dropped
// call can never leave an OpenAI session open and billing.
// ─────────────────────────────────────────────────────────────────────────────

type Phase = 'starting' | 'live' | 'closing' | 'closed';

let activeCalls = 0;
export function activeCallCount(): number { return activeCalls; }

export class CallBridge {
  private readonly twilioWs: WebSocket;
  private openaiWs: WebSocket | null = null;

  private phase: Phase = 'starting';
  private streamSid = '';
  private callSid = '';
  private from = '';
  private called = '';
  private userId = '';
  private settings: BusinessSettings | null = null;

  /** Ordered transcript handed back to the backend when the call ends. */
  private readonly turns: BridgeTurn[] = [];
  /** Assistant text accumulates per response; flushed on response completion. */
  private assistantBuffer = '';
  private outcome: CallOutcome | undefined;

  // ── Playback / interruption bookkeeping ────────────────────────────────────
  /** Most recent media timestamp Twilio reported (ms since stream start). */
  private latestMediaTimestamp = 0;
  /** Twilio timestamp at which the current assistant response began playing. */
  private responseStartedAt: number | null = null;
  /** Realtime item id of the assistant message currently being spoken. */
  private currentAssistantItemId: string | null = null;
  /** Total ms of audio emitted for the current response (truncation clamp). */
  private currentResponseAudioMs = 0;
  /** Marks sent to Twilio and not yet echoed back — non-empty = still playing. */
  private readonly markQueue: string[] = [];
  private markCounter = 0;

  // ── Timers / diagnostics ──────────────────────────────────────────────────
  private maxDurationTimer: NodeJS.Timeout | null = null;
  private wrapUpTimer: NodeJS.Timeout | null = null;
  private connectTimeout: NodeJS.Timeout | null = null;
  private startedAt = Date.now();
  private firstAudioAt: number | null = null;
  private inboundFrames = 0;
  private outboundFrames = 0;
  private fellBack = false;

  constructor(twilioWs: WebSocket) {
    this.twilioWs = twilioWs;
    activeCalls++;

    twilioWs.on('message', (raw: WebSocket.RawData) => {
      // Never let a malformed frame take the process down mid-call.
      try { this.onTwilioMessage(raw); } catch (err) {
        console.error(`[${this.tag()}] error handling Twilio message:`, err);
      }
    });
    twilioWs.on('close', () => { void this.shutdown('twilio_closed'); });
    twilioWs.on('error', err => {
      console.error(`[${this.tag()}] Twilio socket error:`, err);
      void this.shutdown('twilio_error');
    });
  }

  private tag(): string { return this.callSid || this.streamSid || 'pending'; }

  // ───────────────────────────────────────────────────────────────────────────
  // Twilio → bridge
  // ───────────────────────────────────────────────────────────────────────────
  private onTwilioMessage(raw: WebSocket.RawData): void {
    const msg = JSON.parse(raw.toString()) as {
      event: string;
      start?: { streamSid: string; callSid: string; customParameters?: Record<string, string> };
      media?: { payload: string; timestamp: string };
      mark?: { name: string };
    };

    switch (msg.event) {
      case 'connected':
        // Protocol handshake only — no call data yet.
        break;

      case 'start':
        this.onStart(msg.start);
        break;

      case 'media':
        this.onMedia(msg.media);
        break;

      case 'mark':
        // Twilio echoes each mark once the audio before it has finished
        // playing. An empty queue means our side has gone quiet.
        if (this.markQueue.length > 0) this.markQueue.shift();
        break;

      case 'stop':
        void this.shutdown('twilio_stop');
        break;

      case 'dtmf':
        // Keypad input isn't part of the receptionist flow; ignored deliberately.
        break;

      default:
        break;
    }
  }

  private onStart(start?: { streamSid: string; callSid: string; customParameters?: Record<string, string> }): void {
    if (!start) return;
    this.streamSid = start.streamSid;
    this.callSid = start.callSid;
    // The TwiML passes these through as <Parameter> children so the bridge
    // knows who called and which business was dialled.
    this.from = start.customParameters?.from || '';
    this.called = start.customParameters?.called || '';
    this.startedAt = Date.now();

    console.log(`[${this.tag()}] stream started from=${this.from} called=${this.called}`);
    void this.connectToOpenAI();
    this.armDurationLimits();
  }

  private onMedia(media?: { payload: string; timestamp: string }): void {
    if (!media?.payload) return;
    this.latestMediaTimestamp = Number(media.timestamp) || this.latestMediaTimestamp;
    this.inboundFrames++;

    if (config.debugAudio && this.inboundFrames === 1) {
      const problem = validateMulawPayload(media.payload);
      console.log(`[${this.tag()}] first inbound frame ${problem ? `INVALID: ${problem}` : 'looks valid'}`);
    }

    // Straight pass-through: Twilio μ-law 8k → OpenAI audio/pcmu. See audio.ts.
    if (this.openaiWs?.readyState === WebSocket.OPEN) {
      this.sendToOpenAI({ type: 'input_audio_buffer.append', audio: media.payload });
    }
    // Before the realtime socket is up we intentionally drop frames rather than
    // buffering them: replaying stale audio would make the AI answer a question
    // the caller has already moved on from.
  }

  // ───────────────────────────────────────────────────────────────────────────
  // OpenAI session
  // ───────────────────────────────────────────────────────────────────────────
  private async connectToOpenAI(): Promise<void> {
    // Business context first — the persona depends on it.
    try {
      const ctx = await fetchBusinessContext(this.called);
      this.userId = ctx.userId;
      this.settings = ctx.settings;
    } catch (err) {
      console.error(`[${this.tag()}] could not load business context:`, err);
      await this.failOver('no_business_context');
      return;
    }

    let ws: WebSocket;
    try {
      ws = new WebSocket(REALTIME_URL, { headers: REALTIME_HEADERS });
    } catch (err) {
      console.error(`[${this.tag()}] could not open realtime socket:`, err);
      await this.failOver('openai_connect_throw');
      return;
    }
    this.openaiWs = ws;

    // A hung TCP connect would otherwise leave the caller in silence forever.
    this.connectTimeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        console.error(`[${this.tag()}] realtime connect timed out`);
        try { ws.terminate(); } catch { /* already gone */ }
        void this.failOver('openai_connect_timeout');
      }
    }, config.openaiConnectTimeoutMs);

    ws.on('open', () => {
      if (this.connectTimeout) { clearTimeout(this.connectTimeout); this.connectTimeout = null; }
      if (!this.settings) return;
      this.sendToOpenAI(buildSessionUpdate(this.settings, this.from));
      // Greeting is triggered on session.updated, so it can't race the config.
    });

    ws.on('message', (raw: WebSocket.RawData) => {
      try { this.onOpenAIMessage(raw); } catch (err) {
        console.error(`[${this.tag()}] error handling realtime message:`, err);
      }
    });

    ws.on('error', err => {
      console.error(`[${this.tag()}] realtime socket error:`, err);
      void this.failOver('openai_error');
    });

    ws.on('close', (code, reason) => {
      // A close during a live call means the caller is now hearing nothing.
      if (this.phase === 'live') {
        console.error(`[${this.tag()}] realtime socket closed mid-call code=${code} reason=${reason.toString()}`);
        void this.failOver('openai_closed');
      }
    });
  }

  private onOpenAIMessage(raw: WebSocket.RawData): void {
    const evt = JSON.parse(raw.toString()) as {
      type: string;
      delta?: string;
      transcript?: string;
      item_id?: string;
      error?: { message?: string; code?: string; type?: string };
      response?: { status?: string; status_details?: unknown };
    };

    switch (evt.type) {
      case 'session.updated': {
        // Config is confirmed applied — now it's safe to speak.
        if (this.phase === 'starting') {
          this.phase = 'live';
          this.sendToOpenAI(buildGreetingTrigger());
        }
        break;
      }

      case 'response.output_audio.delta': {
        if (evt.delta) this.playToCaller(evt.delta, evt.item_id);
        break;
      }

      case 'input_audio_buffer.speech_started': {
        // The caller has started talking over us. Barge-in handling.
        this.handleInterruption();
        break;
      }

      case 'conversation.item.input_audio_transcription.completed': {
        // What the caller said (parallel ASR pass).
        const text = (evt.transcript || '').trim();
        if (text) {
          this.turns.push({ role: 'user', content: text });
          this.noteUrgency(text);
        }
        break;
      }

      case 'response.output_audio_transcript.delta': {
        if (evt.delta) this.assistantBuffer += evt.delta;
        break;
      }

      case 'response.output_audio_transcript.done': {
        // Prefer the complete transcript when present; fall back to deltas.
        const text = (evt.transcript || this.assistantBuffer).trim();
        if (text) this.turns.push({ role: 'assistant', content: text });
        this.assistantBuffer = '';
        break;
      }

      case 'response.done': {
        // Response finished cleanly; reset per-response playback state.
        this.responseStartedAt = null;
        this.currentAssistantItemId = null;
        this.currentResponseAudioMs = 0;
        break;
      }

      case 'error': {
        console.error(`[${this.tag()}] realtime error:`, JSON.stringify(evt.error));
        break;
      }

      default:
        break;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Playback & barge-in
  // ───────────────────────────────────────────────────────────────────────────
  private playToCaller(deltaB64: string, itemId?: string): void {
    if (this.twilioWs.readyState !== WebSocket.OPEN || !this.streamSid) return;

    if (this.firstAudioAt === null) {
      this.firstAudioAt = Date.now();
      console.log(`[${this.tag()}] first audio out at +${this.firstAudioAt - this.startedAt}ms`);
    }

    // Mark the start of this response against Twilio's own clock, so the
    // truncation point we compute later is in the same time base Twilio uses.
    if (this.responseStartedAt === null) {
      this.responseStartedAt = this.latestMediaTimestamp;
      this.currentResponseAudioMs = 0;
    }
    if (itemId) this.currentAssistantItemId = itemId;
    this.currentResponseAudioMs += base64MulawDurationMs(deltaB64);

    // Pass-through — same μ-law bytes, no transcode.
    this.sendToTwilio({
      event: 'media',
      streamSid: this.streamSid,
      media: { payload: deltaB64 },
    });
    this.outboundFrames++;

    // A mark after each chunk tells us when playback actually drains.
    const name = `m${++this.markCounter}`;
    this.markQueue.push(name);
    this.sendToTwilio({ event: 'mark', streamSid: this.streamSid, mark: { name } });
  }

  /**
   * The caller talked over the AI. Three things must happen together, or the
   * result sounds broken:
   *   1. Twilio drops the audio it has buffered but not yet played (`clear`).
   *   2. OpenAI truncates its record of the assistant message to what the
   *      caller actually HEARD — otherwise the model believes it said things
   *      that were cut off, and its next reply references them.
   *   3. Local playback bookkeeping resets.
   */
  private handleInterruption(): void {
    if (this.markQueue.length === 0 || this.responseStartedAt === null) return;

    const heardMs = Math.max(0, this.latestMediaTimestamp - this.responseStartedAt);
    // Never claim more was heard than was generated — OpenAI rejects that.
    const truncateAt = Math.floor(Math.min(heardMs, this.currentResponseAudioMs));

    if (this.currentAssistantItemId && truncateAt > 0) {
      this.sendToOpenAI({
        type: 'conversation.item.truncate',
        item_id: this.currentAssistantItemId,
        content_index: 0,
        audio_end_ms: truncateAt,
      });
    }

    if (this.streamSid) {
      this.sendToTwilio({ event: 'clear', streamSid: this.streamSid });
    }

    if (config.debugAudio) {
      console.log(`[${this.tag()}] barge-in: truncated at ${truncateAt}ms`);
    }

    this.markQueue.length = 0;
    this.responseStartedAt = null;
    this.currentAssistantItemId = null;
    this.currentResponseAudioMs = 0;
  }

  private noteUrgency(text: string): void {
    // Mirrors the legacy route's emergency heuristic so the tradie's SMS is
    // flagged the same way regardless of which pipeline handled the call.
    if (/emergency|urgent|flood|gas leak|burst pipe|no power|fire|sparking/i.test(text)) {
      this.outcome = 'emergency';
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Duration limits
  // ───────────────────────────────────────────────────────────────────────────
  private armDurationLimits(): void {
    const warnAt = (config.maxCallSeconds - config.maxCallWarningSeconds) * 1000;
    if (warnAt > 0) {
      this.wrapUpTimer = setTimeout(() => {
        if (this.phase !== 'live') return;
        console.log(`[${this.tag()}] approaching max duration — asking model to wrap up`);
        this.sendToOpenAI(buildWrapUpTrigger(config.maxCallWarningSeconds));
      }, warnAt);
    }

    this.maxDurationTimer = setTimeout(() => {
      console.warn(`[${this.tag()}] hit max call duration (${config.maxCallSeconds}s) — closing`);
      void this.shutdown('max_duration');
    }, config.maxCallSeconds * 1000);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Failure path
  // ───────────────────────────────────────────────────────────────────────────
  /**
   * The realtime leg is unusable. The caller must never just hear silence, so
   * hand the live call back to Twilio, which plays an apology and records a
   * message. The transcript gathered so far is still delivered.
   */
  private async failOver(reason: string): Promise<void> {
    if (this.fellBack || this.phase === 'closing' || this.phase === 'closed') return;
    this.fellBack = true;
    console.error(`[${this.tag()}] failing over to voicemail (${reason})`);

    const redirected = this.callSid ? await redirectCallToFallback(this.callSid) : false;
    if (!redirected) {
      console.error(
        `[${this.tag()}] FAILOVER_REDIRECT_FAILED — caller may hear silence. ` +
        `Check TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN.`
      );
    }
    // Twilio takes over the call from here; tear our side down either way.
    await this.shutdown(`failover_${reason}`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Teardown
  // ───────────────────────────────────────────────────────────────────────────
  private async shutdown(reason: string): Promise<void> {
    if (this.phase === 'closing' || this.phase === 'closed') return;
    this.phase = 'closing';

    for (const t of [this.maxDurationTimer, this.wrapUpTimer, this.connectTimeout]) {
      if (t) clearTimeout(t);
    }
    this.maxDurationTimer = this.wrapUpTimer = this.connectTimeout = null;

    // Close OpenAI first — this is the socket that costs money while open.
    if (this.openaiWs) {
      const ws = this.openaiWs;
      this.openaiWs = null;
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close();
        // Belt and braces: if the peer never completes the close handshake,
        // force the socket down so the session can't linger and bill.
        setTimeout(() => { try { ws.terminate(); } catch { /* gone */ } }, 2000).unref?.();
      } catch (err) {
        console.error(`[${this.tag()}] error closing realtime socket:`, err);
      }
    }

    if (this.twilioWs.readyState === WebSocket.OPEN) {
      try { this.twilioWs.close(); } catch { /* gone */ }
    }

    const durationSeconds = Math.max(0, Math.round((Date.now() - this.startedAt) / 1000));
    // Any assistant text still buffered when the call dropped is real speech
    // the caller heard — keep it in the record.
    if (this.assistantBuffer.trim()) {
      this.turns.push({ role: 'assistant', content: this.assistantBuffer.trim() });
      this.assistantBuffer = '';
    }

    console.log(
      `[${this.tag()}] closing reason=${reason} duration=${durationSeconds}s ` +
      `turns=${this.turns.length} inFrames=${this.inboundFrames} outFrames=${this.outboundFrames} ` +
      `ttfa=${this.firstAudioAt ? this.firstAudioAt - this.startedAt : 'n/a'}ms`
    );

    // Hand back to the existing post-call pipeline. Only skip when there is
    // genuinely nothing to report, so we don't SMS the tradie about a call
    // where nobody spoke.
    if (this.callSid && this.from && this.called && this.turns.length > 0) {
      await completeCall({
        callSid: this.callSid,
        from: this.from,
        called: this.called,
        turns: this.turns,
        outcome: this.outcome,
        durationSeconds,
      });
    } else if (this.callSid) {
      console.log(`[${this.tag()}] no transcript to hand back — skipping completion`);
    }

    this.phase = 'closed';
    activeCalls--;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Socket helpers
  // ───────────────────────────────────────────────────────────────────────────
  private sendToOpenAI(payload: unknown): void {
    if (this.openaiWs?.readyState !== WebSocket.OPEN) return;
    try { this.openaiWs.send(JSON.stringify(payload)); } catch (err) {
      console.error(`[${this.tag()}] failed to send to realtime:`, err);
    }
  }

  private sendToTwilio(payload: unknown): void {
    if (this.twilioWs.readyState !== WebSocket.OPEN) return;
    try { this.twilioWs.send(JSON.stringify(payload)); } catch (err) {
      console.error(`[${this.tag()}] failed to send to Twilio:`, err);
    }
  }
}
