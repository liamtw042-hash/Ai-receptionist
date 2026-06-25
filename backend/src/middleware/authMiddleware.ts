import { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/firebase';

export interface AuthRequest extends Request {
  userId?: string;
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
