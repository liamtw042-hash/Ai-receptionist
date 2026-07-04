import { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/firebase';

export interface AuthRequest extends Request {
  userId?: string;
}

// The single owner/admin account. Checked against the VERIFIED Firebase token
// (email or uid), never against anything the client sends in a body/header —
// so a non-admin can't reach admin data no matter what the frontend does.
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'liamtw042@gmail.com').toLowerCase();
const ADMIN_UID = process.env.ADMIN_UID || '';

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const decoded = await auth.verifyIdToken(token);
    const email = (decoded.email || '').toLowerCase();
    const isAdmin = email === ADMIN_EMAIL || (ADMIN_UID !== '' && decoded.uid === ADMIN_UID);
    if (!isAdmin) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    req.userId = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    req.userId = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Maps Twilio phone number to userId for webhook routes
export async function resolveTwilioUser(
  calledNumber: string,
  db: FirebaseFirestore.Firestore
): Promise<string | null> {
  const snap = await db.collection('settings').where('twilioNumber', '==', calledNumber).limit(1).get();
  if (snap.empty) {
    // fallback: return first user (for single-tenant dev mode)
    const all = await db.collection('settings').limit(1).get();
    return all.empty ? null : all.docs[0].id;
  }
  return snap.docs[0].id;
}
