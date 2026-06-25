# TradeDesk — AI Receptionist for Australian Tradies

Never miss a job again. TradeDesk answers your calls, books jobs, sends SMS summaries, and auto-replies to emails — 24/7.

## Features

- **AI Call Handler** — Answers in under 2 seconds with a warm Australian greeting. Understands what callers want, gives rough quotes, captures details, books jobs.
- **Call Summaries via SMS** — After every call, the tradie gets an SMS: caller number, what they wanted, what the AI said, outcome.
- **Emergency Detection** — Caller says "emergency"? Tradie gets an urgent SMS instantly and caller is told someone will call back within 30 minutes.
- **Missed Call Win-back** — Missed call? Caller gets an automated SMS within 60 seconds.
- **AI Email Responder** — Connects to Gmail, auto-replies to incoming emails with the same knowledge as the call AI.
- **SMS Inbox** — Two-way SMS conversations with every caller, right in the dashboard.
- **Contacts** — Every caller automatically becomes a contact with full history.
- **Dashboard** — Calls today, jobs booked, leads this week, recent call transcripts.

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Database**: Firebase Firestore
- **Auth**: Firebase Auth
- **Calls & SMS**: Twilio
- **AI**: OpenAI GPT-4o mini
- **Deployment**: Vercel

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/liamtw042-hash/ai-receptionist.git
cd ai-receptionist
npm install --workspace=backend
npm install --workspace=frontend
```

### 2. Configure environment variables

**Backend** — copy `backend/.env.example` to `backend/.env` and fill in:
```
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_PHONE_NUMBER=+61400000000
OPENAI_API_KEY=sk-...
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

**Frontend** — copy `frontend/.env.example` to `frontend/.env`:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_API_URL=http://localhost:3001/api
```

### 3. Run dev servers

```bash
# Backend
cd backend && npm run dev

# Frontend (separate terminal)
cd frontend && npm run dev
```

### 4. Configure Twilio

In your Twilio console:
- Set **Incoming Call webhook** → `https://your-backend.vercel.app/api/voice`
- Set **Call Status Callback** → `https://your-backend.vercel.app/api/voice/status`
- Set **Incoming SMS webhook** → `https://your-backend.vercel.app/api/sms/inbound`

### 5. Set up call forwarding

When you sign up, the onboarding flow shows you exactly how to forward missed calls to your TradeDesk number on both iPhone and Android.

## Build

```bash
npm run build --workspace=backend
npm run build --workspace=frontend
```

## Deploy to Vercel

```bash
vercel --prod
```

Set all environment variables in the Vercel dashboard under **Settings → Environment Variables**.

## Firestore Collections

| Collection | Description |
|---|---|
| `settings` | One doc per user — business details, pricing, availability |
| `calls` | Every call with full transcript and AI summary |
| `sms_messages` | All inbound/outbound SMS messages |
| `contacts` | Auto-created from callers, updatable from dashboard |
| `gmail_tokens` | OAuth tokens for Gmail integration |
