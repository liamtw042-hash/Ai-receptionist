import OpenAI, { APIError, APIConnectionError, APIConnectionTimeoutError } from 'openai';

// Lazily construct the client. In openai SDK v4 `new OpenAI()` THROWS
// synchronously when no API key is resolvable — doing that at module load
// would crash the whole serverless function on cold start (taking down every
// route, not just the ones that use OpenAI) the moment OPENAI_API_KEY is
// missing. Constructing on first use keeps the failure local and catchable.
let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new AIError('OpenAI API key is not configured', { reason: 'missing_key', status: 503 });
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

// Safe error codes for the caller to act on / surface. None of these carry the
// API key or any secret — they're derived from the upstream HTTP status and
// OpenAI's own public error `code`, both of which are safe to expose.
export type AIErrorReason =
  | 'missing_key'      // OPENAI_API_KEY not set on this deployment
  | 'auth'             // 401 — key present but invalid/revoked
  | 'access'           // 403 — key valid but lacks access to the model/project
  | 'quota'            // 429 — insufficient_quota / billing / rate limited
  | 'model'            // 404 — model not available to this account/project
  | 'bad_request'      // 400 — malformed request
  | 'upstream'         // 5xx from OpenAI
  | 'network'          // could not reach OpenAI (egress/DNS/timeout)
  | 'unknown';

export class AIError extends Error {
  reason: AIErrorReason;
  status: number;          // HTTP status to return to our client
  upstreamStatus?: number; // the status OpenAI returned, if any
  code?: string;           // OpenAI's public error code, e.g. "insufficient_quota"
  constructor(message: string, opts: { reason: AIErrorReason; status: number; upstreamStatus?: number; code?: string }) {
    super(message);
    this.name = 'AIError';
    this.reason = opts.reason;
    this.status = opts.status;
    this.upstreamStatus = opts.upstreamStatus;
    this.code = opts.code;
  }
}

function classify(err: unknown): AIError {
  if (err instanceof AIError) return err;
  // Connection errors are a subclass of APIError but have no HTTP status, so
  // they MUST be matched before the status-based APIError branch below.
  if (err instanceof APIConnectionTimeoutError || err instanceof APIConnectionError) {
    return new AIError('Could not reach OpenAI', { reason: 'network', status: 502 });
  }
  if (err instanceof APIError) {
    const upstream = err.status;
    const code = (err.code ?? undefined) as string | undefined;
    if (upstream === 401) return new AIError('OpenAI rejected the API key', { reason: 'auth', status: 503, upstreamStatus: 401, code });
    if (upstream === 403) return new AIError('OpenAI key lacks access to the model', { reason: 'access', status: 503, upstreamStatus: 403, code });
    if (upstream === 429) return new AIError('OpenAI quota or rate limit hit', { reason: 'quota', status: 503, upstreamStatus: 429, code });
    if (upstream === 404) return new AIError('OpenAI model not available', { reason: 'model', status: 503, upstreamStatus: 404, code });
    if (upstream === 400) return new AIError('OpenAI rejected the request', { reason: 'bad_request', status: 502, upstreamStatus: 400, code });
    if (upstream && upstream >= 500) return new AIError('OpenAI upstream error', { reason: 'upstream', status: 502, upstreamStatus: upstream, code });
    return new AIError('OpenAI API error', { reason: 'unknown', status: 502, upstreamStatus: upstream, code });
  }
  return new AIError(err instanceof Error ? err.message : 'Unknown AI error', { reason: 'unknown', status: 500 });
}

export async function getAIResponse(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  // Optional per-call output cap. Defaults to the value used for calls/SMS; the
  // public marketing chat widget passes a tighter cap to bound its cost.
  maxTokens = 300
): Promise<string> {
  try {
    const response = await getClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });
    return response.choices[0]?.message?.content?.trim() ?? '';
  } catch (err) {
    // Re-throw as a typed, secret-free error so callers can classify and
    // surface the cause (invalid key vs quota vs model vs upstream) safely.
    throw classify(err);
  }
}

export default { getAIResponse };
