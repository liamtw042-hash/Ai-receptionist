# TradeDesk Voice Bridge

Realtime phone answering: **Twilio Media Streams ⇄ OpenAI Realtime API**.

Replaces the legacy turn-based flow (`Gather` → webhook → completion → `Say`),
which put 2–5 seconds of dead air after every caller utterance. This bridge
streams audio continuously in both directions, so the AI answers in roughly the
time a person would.

The existing `frontend/` and `backend/` stay on Vercel, untouched. This service
deploys separately because Vercel's serverless functions cannot hold the
long-lived websocket a phone call needs.

---

## How it fits together

```
Caller → Twilio number
           │
           ├─ POST /twiml/incoming ──→ <Connect><Stream url="wss://…/media-stream">
           │
           └─ WS  /media-stream  ⇄  CallBridge  ⇄  OpenAI Realtime (gpt-realtime-2.1)
                                        │
                            on hangup   ▼
                    POST {backend}/api/voice/bridge/complete
                                        │
                    ┌───────────────────┴────────────────────┐
                    │  EXISTING pipeline, unchanged:         │
                    │  summary → SMS to tradie → Firestore   │
                    │  → job → Google Sheets/Calendar        │
                    └────────────────────────────────────────┘
```

The bridge deliberately owns **no** business logic. It fetches the tradie's
settings from the backend, runs the conversation, and hands the transcript back.
Everything after the call is the same code the legacy route has always used
(`backend/src/services/callCompletionService.ts`), called from both places.

---

## Audio format — the thing most likely to bite

Twilio and OpenAI can both speak **G.711 μ-law, 8 kHz, mono, base64**. When the
session is configured with `audio/pcmu` on both input and output, the correct
operation is a **straight pass-through of the base64 string** — no decode, no
resample, no re-encode. Every transcode avoided is latency avoided and a class
of garbling that cannot happen.

The failure mode to know about: OpenAI's *default* is `audio/pcm` (24 kHz PCM16).
If you send μ-law bytes to a session configured for PCM — or vice versa — **you
get no error**. You get fast, screeching noise, because 8 kHz μ-law is being
read as 24 kHz linear PCM. If audio ever sounds like chipmunks or static, check
the two `format.type` values before anything else.

`npm run test:audio` pins the maths; `npm run test:protocol` pins the wire format.

### GA vs beta schema

The Realtime API changed shape at GA and most tutorials online still show the
beta form. Sending beta fields **does not error** — they're ignored, leaving the
session on its 24 kHz default:

| | Beta (obsolete) | GA (what this uses) |
|---|---|---|
| Audio format | `session.input_audio_format: "g711_ulaw"` (string) | `session.audio.input.format: {type:"audio/pcmu"}` (object) |
| Modalities | `session.modalities` | `session.output_modalities` |
| Turn detection | `session.turn_detection` | `session.audio.input.turn_detection` |
| Session object | *(no discriminator)* | requires `type: "realtime"` |
| Audio events | `response.audio.delta` | `response.output_audio.delta` |
| Auth header | `OpenAI-Beta: realtime=v1` | *(none — bearer token only)* |

---

## Quality settings, and the trade-off each one buys

All are env-overridable — tune on a live deployment without a code change.

### Turn detection — `TURN_DETECTION`

| | `semantic_vad` **(default)** | `server_vad` |
|---|---|---|
| How | A model judges whether the *thought* is finished | Times raw silence |
| Cuts people off | Rarely — handles "my address is… hang on… 42 Wallace Street" | Often, unless `silence_duration_ms` is generous |
| Dead air | Slightly more variable | Predictable |
| Noise | Handled by the model | Needs `threshold` tuning |
| Idle timeout | Not supported | Supported |

Chosen: **`semantic_vad` + `eagerness=medium`**. The brief's top complaint is
sounding robotic, and being interrupted mid-sentence is the most robotic thing a
phone bot does. Semantic VAD is the single biggest win there. `eagerness` sets
the maximum wait before a turn is forced: `low` 8s, `medium` 4s, `high` 2s.
`medium` keeps a genuine thinking pause alive without leaving a hole in the
conversation.

Switch to `server_vad` if callers report the AI jumping in early in specific
noisy conditions — then tune:

- **`VAD_THRESHOLD`** (default `0.6`, OpenAI default 0.5) — how loud speech must
  be to register. Raised because job-site noise otherwise trips VAD and the AI
  interrupts itself. Too high and softly-spoken callers get missed.
- **`VAD_SILENCE_DURATION_MS`** (default `700`, OpenAI default 500) — silence
  before the turn ends. Longer protects thinking pauses; every extra ms is added
  latency on *every* turn. 700 is a deliberate trade of ~200 ms of speed for far
  fewer interruptions.
- **`VAD_PREFIX_PADDING_MS`** (default `300`) — audio kept from *before* detected
  onset, so the first syllable isn't clipped. Lower it and you get "…urst pipe".
- **`VAD_IDLE_TIMEOUT_MS`** (default `8000`) — if the caller goes silent this
  long after the AI stops, the model re-prompts rather than both sides waiting.
  `server_vad` only.

### Noise reduction — `NOISE_REDUCTION`

Default **`near_field`** (phone held to the face — the common case). Use
`far_field` if your callers are mostly on speakerphone in vehicles, or `none` if
it's clipping quiet speech. This filters audio *before* VAD, so it reduces false
turn-detection triggers as well as improving comprehension.

### Voice — `OPENAI_REALTIME_VOICE`

Default **`marin`**. OpenAI explicitly recommends `marin` and `cedar` as their
highest-quality voices; both are markedly more natural than the original eight
(`alloy`, `ash`, `ballad`, `coral`, `echo`, `sage`, `shimmer`, `verse`). `marin`
reads warmer and slightly younger, which suits a receptionist; `cedar` is a
little more formal. **Neither is Australian** — see Limitations.

`OPENAI_VOICE_SPEED` defaults to `1.0`. Below ~0.9 sounds sedated; above ~1.15
sounds rushed and hurts comprehension on poor lines.

### Getting names, numbers and addresses right

Phone audio is 8 kHz and lossy; Australian accents, surnames and street names
are exactly what ASR fumbles. Three deliberate choices:

1. **Never ask for the phone number.** Twilio already tells us who's calling, so
   the AI *reads it back* — "I've got you on 0412 345 678 — best number for
   Dave?" — formatted into digit groups. Spoken digit strings are the single
   most-mangled thing on a phone call, and this removes that exchange entirely.
   This is the biggest accuracy win available and it costs nothing.
2. **Confirm once, batched, at the end.** "Righto — Dave, burst pipe at 42
   Wallace Street. That right?" rather than confirming each field as it's
   collected. Field-by-field confirmation is precisely what makes bots feel like
   an interrogation, and callers correct a summary happily.
3. **Ask for the suburb, not the spelling.** When a street name is ambiguous,
   the suburb usually disambiguates it and feels like conversation rather than a
   form.

Additionally, the parallel transcription pass is seeded with `keywords` — the
tradie's own business name, suburb and services, plus ~30 trade terms generic
ASR reliably mangles (*switchboard*, *tempering valve*, *colorbond*, *RCD*,
*S-bend*). That transcript is what the tradie actually reads in their SMS, so
the bias is worth having.

---

## Latency

Measured locally (mock realtime server), time from `start` to first audio byte
back to Twilio: **~25 ms** of bridge overhead. That is the only part this code
controls, and it is negligible.

Realistic end-to-end, caller stops speaking → caller hears the reply:

| Component | Typical |
|---|---|
| Turn detection (semantic VAD deciding you're done) | 300–700 ms |
| OpenAI inference + first audio token | 300–600 ms |
| Bridge pass-through | <5 ms |
| Twilio network + jitter buffer, both directions | 100–250 ms |
| **Total** | **≈0.8–1.5 s** |

Against 2–5 s today, that is the difference between "obviously a robot" and
"sounds like a receptionist". The remaining delay is dominated by turn detection
and model inference — neither is something the bridge can optimise away. Hosting
the bridge in an Australian region shaves Twilio↔bridge RTT but **not** the
bridge↔OpenAI leg, which terminates in the US regardless.

---

## Running it

```bash
cd voice-bridge
npm install
cp .env.example .env      # fill in the required values
npm run dev
```

### Testing without a phone

```bash
npm test          # audio maths + GA wire format (29 checks)
npm run simulate  # full offline call, no Twilio, no OpenAI spend
```

`npm run simulate` stands up a mock OpenAI Realtime server and a mock backend,
boots the real bridge against them, and plays the part of Twilio: connects the
media stream, streams μ-law frames, barges in over the AI, hangs up, then kills
the realtime socket mid-call to prove the failover path. It asserts:

- business context is fetched and the persona is built from it
- `audio/pcmu` is set on **both** directions and they match
- the greeting is pushed rather than waited for
- audio returns as 160-byte (20 ms) frames with marks
- caller audio is forwarded byte-identical (pass-through verified)
- barge-in clears Twilio's buffer **and** truncates the model's context,
  clamped so it can never claim more was heard than was generated
- urgency is flagged as `outcome=emergency`, matching the legacy route
- the transcript reaches the existing pipeline
- the realtime socket is closed on hangup (no leaked billing)
- a mid-call drop redirects the caller to voicemail and still delivers the
  partial transcript

---

## Deployment

**Recommended: Railway.** Dockerfile-based, sensible websocket handling, no
cold starts on the paid tier, deploy-from-subdirectory support.

| Host | Cost for this workload | Notes |
|---|---|---|
| **Railway** | **$5/mo Hobby** (includes $5 usage; this service fits well inside it) | Easiest. Set root directory to `voice-bridge`. |
| Render | $7/mo Starter | Free tier **sleeps** — cold start drops calls. Unusable free. |
| Fly.io | ~$2–5/mo | Cheapest, Sydney region available (lowest Twilio RTT). More setup. |

Free tiers are fine for *testing* but not production: a sleeping instance means
a caller hears nothing while it cold-starts.

### Steps (Railway)

1. **Generate the shared secret** — `openssl rand -hex 32`. You'll paste the same
   value in two places.
2. **New Project → Deploy from GitHub repo** → pick `liamtw042-hash/Ai-receptionist`.
3. **Settings → Root Directory → `voice-bridge`**. This is what keeps it
   independent of the Vercel projects.
4. **Variables** — set everything from `.env.example`. `PUBLIC_URL` must be the
   Railway domain from step 5, so set it after generating the domain.
5. **Settings → Networking → Generate Domain.** Copy it (e.g.
   `tradedesk-voice-bridge.up.railway.app`) into `PUBLIC_URL` as
   `https://tradedesk-voice-bridge.up.railway.app`, then redeploy.
6. **Verify**: `curl https://<your-domain>/health` → `{"status":"ok",...}`.

### On the Vercel backend

Add one variable: **`VOICE_BRIDGE_SECRET`** — identical to the bridge's. Redeploy.
Without it, the two `/api/voice/bridge/*` endpoints stay **disabled** (they fail
closed rather than accepting anonymous requests).

### In the Twilio console

Phone Numbers → your number → **Voice Configuration**:

- **A call comes in** → Webhook → `https://<your-bridge-domain>/twiml/incoming`
  → **HTTP POST**
- **Call status changes** → leave pointing at
  `https://<your-vercel-backend>/api/voice/status` (unchanged — the missed-call
  win-back still runs from there)
- **Primary handler fails** → `https://<your-vercel-backend>/api/voice`
  → this makes Twilio fall back to the *legacy* flow automatically if the bridge
  is unreachable.

### Rollback

Point **A call comes in** back to `https://<your-vercel-backend>/api/voice`.
That's the entire rollback — the legacy route was never modified and is still
wired up. No redeploy needed; it takes effect on the next call.

---

## Cost

**Verified rates (July 2026):** `gpt-realtime-2.1` — audio in **$32/M tokens**,
audio out **$64/M tokens**, cached input **$0.40/M**. Audio tokenises at ~600
tokens/min inbound and ~1,200 tokens/min outbound. Twilio Media Streams adds
**$0.004/min** on top of normal voice minutes.

### A typical 90-second call

Assume the caller speaks ~35 s and the AI ~30 s (the rest is silence, which
still streams inbound).

| Item | Calculation | Cost |
|---|---|---|
| OpenAI audio in | 90 s inbound ≈ 900 tokens × $32/M | $0.029 |
| OpenAI audio out | 30 s ≈ 600 tokens × $64/M | $0.038 |
| System prompt (cached after first turn) | ~1.2k tokens, mostly at $0.40/M | ~$0.002 |
| Twilio voice (inbound AU local) | 1.5 min × ~$0.0085 | $0.013 |
| Twilio Media Streams | 1.5 min × $0.004 | $0.006 |
| Hosting amortised | $5/mo ÷ ~400 calls | $0.013 |
| **Total** | | **≈ $0.10 / call** |

**Versus today's setup:** Twilio STT + GPT completions + Polly TTS runs roughly
$0.03–0.05 for the same call. So realtime is **about 2–3× the per-call cost** —
call it **+$0.05–0.06 per call**.

**Against $199/month per tradie:** at 200 calls/month that's ~$20 in call costs
versus ~$8 today. Both are noise against $199. You would need ~1,900 calls a
month from a single tradie before voice costs reached 10% of their subscription.
The unit economics are not the constraint here; the quality difference is worth
far more than $0.06 a call.

**Cheaper option:** `gpt-realtime-2.1-mini` at $10/$20 per M is ~3× cheaper
(~$0.04/call, at or below current cost). It's faster but noticeably less reliable
at holding a multi-part task (get job + urgency + name + number + address, and
confirm them) together across a call. Worth A/B-ing once you have real calls; I
would not ship it as the default.

### The 20-minute call

**≈$1.40–2.00** on OpenAI alone (~$0.077/min of AI speech plus ~$0.019/min of
inbound audio), plus ~$0.25 Twilio. Not catastrophic, but there's a worse case:
**OpenAI has no server-side session lifetime.** An abandoned open line — caller
puts the phone down without hanging up, carrier holds the channel — bills until
something closes it.

So the bridge enforces its own cap: **`MAX_CALL_SECONDS` (default 600 = 10 min)**.
At 9 minutes the model is told to wrap up politely; at 10 the sockets close.
A genuine tradie enquiry is 30 s–2 min, so 10 minutes is generous. Also capped:
`MAX_RESPONSE_OUTPUT_TOKENS` (1200) stops a single rambling reply running up
output cost.

Recommendation: leave it at 600. Lower it to 300 if you want tighter control —
you'd have to work hard to have a legitimate 5-minute call here.

---

## Limitations — read this before going live

**1. The voice is not Australian.** This is the biggest honest caveat. OpenAI's
realtime voices are all US-accented; there is no en-AU option. `marin` sounds
natural and warm, but it sounds American. The *language* is steered Australian
by the prompt (vocabulary, idiom, "no worries"), and the current Polly
`Olivia-Neural` **is** genuinely Australian — so this is a real trade: you gain
enormous naturalness and lose the local accent. I'd rate the naturalness win as
much larger than the accent loss for a receptionist, but you should hear it
before committing, and some tradies will notice.

**2. In-memory session state.** The backend's `callSessionService` stores
sessions in a process-local `Map`. That is pre-existing and is *already* fragile
on Vercel, where consecutive webhooks can land on different lambda instances —
meaning the legacy flow can silently lose a transcript today. The bridge
side-steps it by holding the whole conversation in one process and posting the
complete transcript once. Worth fixing properly (Firestore-backed sessions) but
out of scope here.

**3. `completeCall` retries, then gives up.** Three attempts. If the backend is
down for all three, the call is logged as `CALL_COMPLETION_LOST` with the full
context in the log line — greppable, but nobody is paged. A durable queue would
be the correct fix if this ever fires.

**4. Barge-in truncation is approximate.** The truncation point is computed from
Twilio's media timestamps, which track what was *sent*, not precisely what the
caller *heard* through their jitter buffer. It's clamped so it can never exceed
the audio generated, so it fails safe — occasionally the model thinks it said
slightly more or less than it did. In practice this is not audible.

**5. No DTMF handling.** Keypad presses are ignored. Fine for a receptionist;
would need adding for any menu flow.

**6. Untested against a real call.** Everything here is verified by inspection,
type-checking and the offline simulator against a mock realtime server. The
simulator exercises the real bridge code paths, but it cannot catch a
discrepancy between the mock and OpenAI's live behaviour. Treat the first real
call as the actual test.

---

## Testing checklist (once Twilio is upgraded)

Do these in order — each isolates one layer.

**Before any call**
- [ ] `npm test && npm run simulate` — all 29 checks green
- [ ] `curl https://<bridge>/health` → `{"status":"ok"}`
- [ ] `VOICE_BRIDGE_SECRET` identical on Railway and Vercel
- [ ] `curl -X POST https://<backend>/api/voice/bridge/context -H 'x-bridge-secret: <secret>' -H 'content-type: application/json' -d '{"called":"<your-twilio-number>"}'` → returns your business settings (401 = secret mismatch; 404 = number not in `settings.twilioNumber`)

**First call — does audio work at all**
- [ ] Ring the number. You should hear the greeting within ~1 s.
- [ ] Audio is clear, not screeching/chipmunk. *If it is: the format is wrong —
      check `DEBUG_AUDIO=true` logs for "first inbound frame".*
- [ ] Say "hello" — it responds without a long gap.
- [ ] Railway logs show `first audio out at +NNNms` and no errors.

**Conversation quality**
- [ ] Pause mid-sentence ("my address is… ummm… 42 Wallace Street") — it should
      wait, not cut you off. If it cuts in: raise `VAD_SILENCE_DURATION_MS`, or
      set `VAD_EAGERNESS=low`.
- [ ] Talk over it mid-reply — it should stop **immediately**. If it keeps
      talking, barge-in is broken; check for `clear` events in the logs.
- [ ] Go quiet for 10 s — it should re-prompt, not sit silent (`server_vad` only).
- [ ] Call from a car/speakerphone and from a noisy environment — if it
      self-interrupts, try `NOISE_REDUCTION=far_field` and `TURN_DETECTION=server_vad`
      with `VAD_THRESHOLD=0.7`.

**Accuracy**
- [ ] It reads your number back correctly in digit groups, and does **not** ask
      for your number.
- [ ] Give a hard Australian street name — check the SMS transcript.
- [ ] Say "it's a burst pipe, water everywhere" — should treat it as urgent and
      say someone will call back within 30 min.

**The handoff (this is what actually matters commercially)**
- [ ] Hang up → the tradie's mobile gets the summary SMS, as before.
- [ ] The call appears in the dashboard call log with the transcript.
- [ ] If Google is connected: the Sheet row and (for a booking) the Calendar
      event appear.
- [ ] Railway logs show `closing reason=twilio_stop` and **no**
      `CALL_COMPLETION_LOST`.

**Failure handling**
- [ ] Set `OPENAI_API_KEY` to a bad value, redeploy, ring in → you should get the
      spoken apology and a record beep, **never** silence.
- [ ] Restore the key. With `TWILIO_ACCOUNT_SID`/`AUTH_TOKEN` unset you'd lose
      this recovery path — confirm they're set.
- [ ] Point the number back at `/api/voice` and confirm the legacy flow still
      answers (your rollback works).

**Cost**
- [ ] After ~10 calls, check OpenAI usage — should be ≈$0.07 of OpenAI per
      90 s call.
- [ ] Leave a call open 11 minutes → confirm it wraps up and closes at
      `MAX_CALL_SECONDS`.
