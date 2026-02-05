import { doc, increment, runTransaction, Firestore } from 'firebase/firestore';
import { calculateLevel } from '@/lib/level-system';

/**
 * Atomically updates the user's XP and Level based on a delta.
 * Call this whenever a food or activity is added/removed.
 *
 * @param firestore Firebase instance
 * @param userId User UID
 * @param xpDelta The change in XP (e.g. +500 or -200).
 *                For Food: -Calories (Eating reduces deficit/XP)
 *                For Activity: +Calories (Activity increases deficit/XP)
 */
export async function updateUserXP(firestore: Firestore, userId: string, xpDelta: number) {
  if (xpDelta === 0) return;

  const userRef = doc(firestore, 'users', userId);

  try {
    await runTransaction(firestore, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) return;

      const data = userDoc.data();
      const currentXP = data.xp || 0;
      const newXP = Math.max(0, currentXP + xpDelta); // Prevent negative total XP
      const newLevel = calculateLevel(newXP);

      transaction.update(userRef, {
        xp: newXP,
        level: newLevel
      });
    });
    console.log(`Updated XP for ${userId}: ${xpDelta > 0 ? '+' : ''}${xpDelta} XP`);
  } catch (error) {
    console.error("Failed to update user XP:", error);
    // Don't block the UI, just log error
  }
}
