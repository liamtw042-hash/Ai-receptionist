import { Router, Response } from 'express';
import { db } from '../lib/firebase';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware';
import { createJob, JobStatus } from '../services/jobService';

const router = Router();

router.use(requireAuth);

// GET /api/jobs?start=<iso>&end=<iso> — list jobs, optionally bounded to a
// date range (used by the calendar view for the visible month/week).
// Without a range, returns everything (capped) ordered soonest-first —
// used by the list view's "all jobs" mode.
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { start, end } = req.query as { start?: string; end?: string };

    let query = db.collection('jobs').where('userId', '==', req.userId) as FirebaseFirestore.Query;
    if (start) query = query.where('scheduledStart', '>=', start);
    if (end) query = query.where('scheduledStart', '<=', end);
    query = query.orderBy('scheduledStart', 'asc');
    if (!start && !end) query = query.limit(500);

    const snap = await query.get();
    const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(jobs);
  } catch (err) {
    console.error('Fetch jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// POST /api/jobs — manually add a job (tradie booked it directly, not via a call)
router.post('/', async (req: AuthRequest, res: Response) => {
  const { customerName, customerPhone, jobType, address, notes, quoteGiven, status, scheduledStart, scheduledEnd } = req.body;

  if (!customerName || !customerPhone || !jobType || !scheduledStart || !scheduledEnd) {
    res.status(400).json({ error: 'customerName, customerPhone, jobType, scheduledStart, and scheduledEnd are required' });
    return;
  }

  try {
    const job = await createJob(req.userId!, {
      customerName, customerPhone, jobType, address, notes, quoteGiven,
      status: status as JobStatus | undefined,
      scheduledStart, scheduledEnd,
      source: 'manual',
    });
    res.status(201).json(job);
  } catch (err) {
    console.error('Create job error:', err);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// PATCH /api/jobs/:id — update status, reschedule, or edit details
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const allowed = ['customerName', 'customerPhone', 'jobType', 'address', 'notes', 'quoteGiven', 'status', 'scheduledStart', 'scheduledEnd'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (updates.status && !['booked', 'confirmed', 'completed', 'cancelled'].includes(updates.status as string)) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  try {
    const ref = db.collection('jobs').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data()?.userId !== req.userId) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    await ref.update({ ...updates, updatedAt: new Date().toISOString() });
    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error('Update job error:', err);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// DELETE /api/jobs/:id — permanently remove a job
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ref = db.collection('jobs').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data()?.userId !== req.userId) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    await ref.delete();
    res.json({ success: true });
  } catch (err) {
    console.error('Delete job error:', err);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

export { router as jobsRouter };
