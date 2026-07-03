import Anthropic from '@anthropic-ai/sdk';

// ─────────────────────────────────────────────────────────────────────────────
// Anthropic client — DEDICATED to the public landing-page chat widget FAQ bot.
//
// This is deliberately SEPARATE from the shared OpenAI helper in ./openai.ts,
// which still powers call replies, SMS auto-replies, and the Gmail email
// auto-reply. Only the marketing chat widget was switched to Claude, so it gets
// its own client and its own typed error surface here — nothing else imports
// this file.
// ─────────────────────────────────────────────────────────────────────────────

// The chat widget's model. Claude Sonnet, tightly output-capped for cost.
const CHAT_WIDGET_MODEL = 'claude-sonnet-4-6';

// Lazily construct the client. Like the OpenAI helper, we avoid constructing at
// module load so a missing key surfaces as a catchable, local failure instead of
// crashing the serverless cold start for every route.
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new AIError('Anthropic API key is not configured', { reason: 'missing_key', status: 503 });
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

// Safe error categories for the caller to act on / surface. These are the SAME
// category names the chat route (and, by extension, the response body the
// frontend already handles) expects — the mapping below just derives them from
// Anthropic's error shapes instead of OpenAI's. None carry the API key or any
// secret.
export type AIErrorReason =
  | 'missing_key'      // ANTHROPIC_API_KEY not set on this deployment
  | 'auth'             // 401 — key present but invalid/revoked
  | 'access'           // 403 — key valid but lacks access to the model/project
  | 'quota'            // 429 — rate limited / over capacity
  | 'model'            // 404 — model not available to this account
  | 'bad_request'      // 400 — malformed request
  | 'upstream'         // 5xx from Anthropic
  | 'network'          // could not reach Anthropic (egress/DNS/timeout)
  | 'unknown';

export class AIError extends Error {
  reason: AIErrorReason;
  status: number;          // HTTP status to return to our client
  upstreamStatus?: number; // the status Anthropic returned, if any
  code?: string;           // Anthropic's error type, e.g. "authentication_error"
  constructor(message: string, opts: { reason: AIErrorReason; status: number; upstreamStatus?: number; code?: string }) {
    super(message);
    this.name = 'AIError';
    this.reason = opts.reason;
    this.status = opts.status;
    this.upstreamStatus = opts.upstreamStatus;
    this.code = opts.code;
  }
}

// Pull Anthropic's public error `type` (e.g. "authentication_error",
// "rate_limit_error") out of the error body if present. Safe to expose — no
// secrets.
function errorType(err: unknown): string | undefined {
  const e = err as { error?: { error?: { type?: string }; type?: string }; type?: string };
  return e?.error?.error?.type ?? e?.error?.type ?? e?.type ?? undefined;
}

function classify(err: unknown): AIError {
  if (err instanceof AIError) return err;

  // Connection errors carry no HTTP status, so match them before the
  // status-based branches below.
  if (err instanceof Anthropic.APIConnectionTimeoutError || err instanceof Anthropic.APIConnectionError) {
    return new AIError('Could not reach Anthropic', { reason: 'network', status: 502 });
  }

  if (err instanceof Anthropic.APIError) {
    const upstream = err.status;
    const code = errorType(err);
    // Prefer the SDK's typed subclasses; fall back to status codes.
    if (err instanceof Anthropic.AuthenticationError || upstream === 401) {
      return new AIError('Anthropic rejected the API key', { reason: 'auth', status: 503, upstreamStatus: upstream ?? 401, code });
    }
    if (err instanceof Anthropic.PermissionDeniedError || upstream === 403) {
      return new AIError('Anthropic key lacks access to the model', { reason: 'access', status: 503, upstreamStatus: upstream ?? 403, code });
    }
    if (err instanceof Anthropic.RateLimitError || upstream === 429) {
      return new AIError('Anthropic rate limit or capacity hit', { reason: 'quota', status: 503, upstreamStatus: upstream ?? 429, code });
    }
    if (err instanceof Anthropic.NotFoundError || upstream === 404) {
      return new AIError('Anthropic model not available', { reason: 'model', status: 503, upstreamStatus: upstream ?? 404, code });
    }
    if (err instanceof Anthropic.BadRequestError || upstream === 400) {
      return new AIError('Anthropic rejected the request', { reason: 'bad_request', status: 502, upstreamStatus: upstream ?? 400, code });
    }
    if (typeof upstream === 'number' && upstream >= 500) {
      return new AIError('Anthropic upstream error', { reason: 'upstream', status: 502, upstreamStatus: upstream, code });
    }
    return new AIError('Anthropic API error', { reason: 'unknown', status: 502, upstreamStatus: upstream, code });
  }

  return new AIError(err instanceof Error ? err.message : 'Unknown AI error', { reason: 'unknown', status: 500 });
}

// Ask Claude a single chat-widget question. Mirrors the shape of the old OpenAI
// helper (system prompt + prior turns + user message + output cap) but adapted
// to Anthropic's Messages API:
//   - the system prompt is a top-level `system` parameter, NOT a message
//   - `max_tokens` is required
//   - user/assistant turns go in the `messages` array
export async function getChatWidgetResponse(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  maxTokens = 150
): Promise<string> {
  try {
    const response = await getClient().messages.create({
      model: CHAT_WIDGET_MODEL,
      max_tokens: maxTokens,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        ...history,
        { role: 'user', content: userMessage },
      ],
    });
    // Concatenate any text blocks in the response content.
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();
    return text;
  } catch (err) {
    // Re-throw as a typed, secret-free error so the route can classify and
    // surface the cause (invalid key vs quota vs model vs upstream) safely.
    throw classify(err);
  }
}

export default { getChatWidgetResponse };
