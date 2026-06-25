import { Router, Response } from 'express';
import { db } from '../lib/firebase';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const snap = await db.collection('contacts')
      .where('userId', '==', req.userId)
      .orderBy('updatedAt', 'desc')
      .get();

    const contacts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const doc = await db.collection('contacts').doc(req.params.id).get();
    if (!doc.exists || doc.data()?.userId !== req.userId) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const allowed = ['name', 'notes'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  try {
    const doc = await db.collection('contacts').doc(req.params.id).get();
    if (!doc.exists || doc.data()?.userId !== req.userId) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    await db.collection('contacts').doc(req.params.id).update({ ...updates, updatedAt: new Date() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

export { router as contactsRouter };
