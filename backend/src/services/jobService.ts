import { db } from '../lib/firebase';

export type JobStatus = 'booked' | 'confirmed' | 'completed' | 'cancelled';

export interface Job {
  id: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  jobType: string;
  address?: string;
  notes?: string;
  quoteGiven?: string;
  status: JobStatus;
  scheduledStart: string; // ISO
  scheduledEnd: string;   // ISO
  source: 'call' | 'manual';
  callId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobInput {
  customerName: string;
  customerPhone: string;
  jobType: string;
  address?: string;
  notes?: string;
  quoteGiven?: string;
  status?: JobStatus;
  scheduledStart: string;
  scheduledEnd: string;
  source?: 'call' | 'manual';
  callId?: string;
}

// Stored in a flat `jobs` collection with a userId field, matching every
// other collection in this app (calls, contacts, sms_messages, settings) —
// keeps one consistent Firestore access pattern instead of introducing a
// one-off users/{uid}/jobs subcollection just for this feature.
export async function createJob(userId: string, input: CreateJobInput): Promise<Job> {
  const now = new Date().toISOString();
  const doc = {
    userId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    jobType: input.jobType,
    address: input.address || '',
    notes: input.notes || '',
    quoteGiven: input.quoteGiven || '',
    status: input.status || 'booked',
    scheduledStart: input.scheduledStart,
    scheduledEnd: input.scheduledEnd,
    source: input.source || 'manual',
    ...(input.callId ? { callId: input.callId } : {}),
    createdAt: now,
    updatedAt: now,
  };
  const ref = await db.collection('jobs').add(doc);
  return { id: ref.id, ...doc };
}

// Auto-creates a job when the AI books one during a call. The exact time is
// a placeholder (next business day, 9am, 2hr block) since a phone call
// rarely nails down a precise slot — the tradie confirms/reschedules from
// the Jobs page once they're across it.
export async function createJobFromCall(userId: string, params: {
  callId: string;
  callerName: string;
  callerNumber: string;
  jobType: string;
  address: string;
  quoteGiven: string;
  notes: string;
}): Promise<Job> {
  const now = new Date();
  const scheduledStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  scheduledStart.setHours(9, 0, 0, 0);
  const scheduledEnd = new Date(scheduledStart.getTime() + 2 * 60 * 60 * 1000);

  return createJob(userId, {
    customerName: params.callerName || 'Unknown caller',
    customerPhone: params.callerNumber,
    jobType: params.jobType || 'General enquiry',
    address: params.address,
    quoteGiven: params.quoteGiven,
    notes: params.notes,
    status: 'booked',
    scheduledStart: scheduledStart.toISOString(),
    scheduledEnd: scheduledEnd.toISOString(),
    source: 'call',
    callId: params.callId,
  });
}
