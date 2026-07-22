import { auth } from './firebase';

// Prefer the same-origin '/api' path — frontend/vercel.json rewrites it to the
// backend project, so no CORS is involved. If VITE_API_URL is set anyway,
// normalise it: strip trailing slashes and append '/api' when it's missing,
// because a bare backend URL (e.g. https://tradedesk-backend-delta.vercel.app)
// would otherwise send every call to paths like /chat/widget that Express
// doesn't serve — surfacing in the browser as a CORS/"Failed to fetch" error.
function normaliseBase(raw: string | undefined): string {
  if (!raw) return '/api';
  let base = raw.trim().replace(/\/+$/, '');
  if (!base) return '/api';
  if (!base.endsWith('/api')) base += '/api';
  return base;
}
const BASE_URL = normaliseBase(import.meta.env.VITE_API_URL);

async function getToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    // `detail` (when the server includes it, e.g. admin routes) names the real
    // underlying cause so failures are diagnosable instead of a bare message.
    const base = err.error || `HTTP ${res.status}`;
    throw new Error(err.detail ? `${base} — ${err.detail}` : base);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// Unauthenticated POST for public marketing-page actions (newsletter signup,
// chat widget). Unlike `api.post`, this never attaches a Firebase token, so it
// works for logged-out visitors. Returns the parsed JSON on 2xx; on a non-2xx
// response it throws an Error whose message is the server's `error` field (so
// callers can surface it) but preserves the parsed body via `.data` when needed.
export async function publicPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data && (data as any).error) || `HTTP ${res.status}`) as Error & { data?: unknown };
    err.data = data;
    throw err;
  }
  return data as T;
}

// Unauthenticated GET for public marketing-page reads (e.g. the waitlist
// counter). No Firebase token attached, so it works for logged-out visitors.
export async function publicGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data && (data as any).error) || `HTTP ${res.status}`);
  return data as T;
}
