import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// Firebase Admin — LAZILY initialised.
//
// This file used to call admin.initializeApp()/admin.credential.cert() at module
// load. cert() THROWS synchronously when projectId/clientEmail/privateKey are
// undefined ("Service account object must contain a string 'project_id'
// property"). Because nearly every route and service imports `db` from here, and
// index.ts imports every router, that throw happened during the serverless COLD
// START — crashing the whole function before Express could route anything. The
// symptom is a bare HTTP 500 on EVERY endpoint (including webhooks whose
// handlers are fully try/caught and can never themselves return 500), with no
// stack trace at the call site.
//
// Same lazy pattern as ./openai.ts, ./anthropic.ts and ./stripe.ts, which were
// already fixed for exactly this. Init now happens on first real Firestore/Auth
// use, so a misconfigured deployment fails locally and catchably inside a
// request — naming the missing variable — instead of taking down the whole app.
// ─────────────────────────────────────────────────────────────────────────────

/** Missing/malformed Firebase credentials. Safe to surface: carries variable
 *  NAMES only, never values. */
export class FirebaseConfigError extends Error {
  status = 503 as const;
  reason = 'firebase_config' as const;
  missing: string[];
  constructor(message: string, missing: string[] = []) {
    super(message);
    this.name = 'FirebaseConfigError';
    this.missing = missing;
  }
}

let cachedApp: admin.app.App | null = null;

function buildCredential(): admin.ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (raw && raw.trim()) {
    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new FirebaseConfigError(
        'FIREBASE_SERVICE_ACCOUNT_JSON is set but is not valid JSON. Make sure it is the ' +
        'full single-line service-account JSON object and that no quotes were stripped.',
        ['FIREBASE_SERVICE_ACCOUNT_JSON']
      );
    }
    // Accept raw Google service-account JSON (snake_case) or an already-camelCased object.
    return {
      projectId: parsed.project_id ?? parsed.projectId,
      clientEmail: parsed.client_email ?? parsed.clientEmail,
      privateKey: (parsed.private_key ?? parsed.privateKey)?.replace(/\\n/g, '\n'),
    } as admin.ServiceAccount;
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Vercel stores newlines in env vars as the two characters \ and n.
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  } as admin.ServiceAccount;
}

function getApp(): admin.app.App {
  if (cachedApp) return cachedApp;
  if (admin.apps.length && admin.apps[0]) {
    cachedApp = admin.apps[0] as admin.app.App;
    return cachedApp;
  }

  const serviceAccount = buildCredential();

  const ENV_FOR: Record<string, string> = {
    projectId: 'FIREBASE_PROJECT_ID',
    clientEmail: 'FIREBASE_CLIENT_EMAIL',
    privateKey: 'FIREBASE_PRIVATE_KEY',
  };
  const missing = (['projectId', 'clientEmail', 'privateKey'] as const)
    .filter((k) => !serviceAccount[k])
    .map((k) => ENV_FOR[k]);

  if (missing.length) {
    throw new FirebaseConfigError(
      `Firebase Admin is not configured — missing: ${missing.join(', ')}. Set these on the ` +
      'backend Vercel project (Settings -> Environment Variables), or set ' +
      'FIREBASE_SERVICE_ACCOUNT_JSON instead, then redeploy.',
      missing
    );
  }

  cachedApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.projectId,
  });
  return cachedApp;
}

/** null when Firebase initialises cleanly, else the reason. Never throws.
 *  Used by the /api/health diagnostic. */
export function firebaseStatusMessage(): string | null {
  try {
    getApp();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'unknown Firebase init failure';
  }
}

// Lazy proxies: identical call-site API (`db.collection(...)`, `auth.verifyIdToken(...)`),
// but nothing touches Firebase until a property is actually read, at request time.
function lazy<T extends object>(resolve: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop, receiver) {
      const real = resolve();
      const value = Reflect.get(real as object, prop, receiver);
      return typeof value === 'function' ? value.bind(real) : value;
    },
    has(_target, prop) {
      return Reflect.has(resolve() as object, prop);
    },
  });
}

export const db: FirebaseFirestore.Firestore = lazy(() => admin.firestore(getApp()));
export const auth: admin.auth.Auth = lazy(() => admin.auth(getApp()));

export default admin;
