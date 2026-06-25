import { db } from '../lib/firebase';

export async function upsertContact(
  userId: string,
  phoneNumber: string,
  updates: Partial<{ name: string; lastInteraction: Date; notes: string }>
): Promise<void> {
  const ref = db.collection('contacts').doc(`${userId}_${phoneNumber.replace(/\D/g, '')}`);
  const existing = await ref.get();

  if (existing.exists) {
    await ref.update({ ...updates, updatedAt: new Date() });
  } else {
    await ref.set({
      userId,
      phoneNumber,
      name: updates.name || '',
      notes: updates.notes || '',
      lastInteraction: updates.lastInteraction || new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

export async function getContactByPhone(
  userId: string,
  phoneNumber: string
): Promise<{ name: string; notes: string } | null> {
  const ref = db.collection('contacts').doc(`${userId}_${phoneNumber.replace(/\D/g, '')}`);
  const doc = await ref.get();
  return doc.exists ? (doc.data() as { name: string; notes: string }) : null;
}
