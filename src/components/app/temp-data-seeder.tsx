'use client';

import { useEffect, useState } from 'react';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

const HISTORICAL_DATA = [
  { date: '2024-01-28', weight: 85.0 },
  { date: '2024-01-27', weight: 85.6 },
  { date: '2024-01-26', weight: 86.0 },
  { date: '2024-01-25', weight: 86.35 },
  { date: '2024-01-24', weight: 85.6 },
  { date: '2024-01-23', weight: 86.25 },
  { date: '2024-01-22', weight: 86.6 },
  { date: '2024-01-21', weight: 86.8 },
  { date: '2024-01-20', weight: 86.6 },
  { date: '2024-01-07', weight: 89.45 },
  { date: '2024-01-05', weight: 88.7 },
];

const SEED_FLAG = 'hasSeededWeightHistory_kucsor_2024_01';
const TARGET_UID = 'Nf3Aux2OUbMFqPasWSEiCekoKRd2';

/**
 * This is a temporary component to seed historical weight data for a specific user.
 * It runs once and then disables itself using localStorage.
 */
export function TempDataSeeder() {
  const { firestore, user } = useFirebase();
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    if (!firestore || !user || user.uid !== TARGET_UID || isSeeding) {
      return;
    }

    const hasSeeded = localStorage.getItem(SEED_FLAG);
    if (hasSeeded) {
      return;
    }

    const seedData = () => {
      setIsSeeding(true);
      
      HISTORICAL_DATA.forEach(entry => {
        const weightHistoryRef = doc(firestore, `users/${user.uid}/weightHistory`, entry.date);
        const dataToSet = {
          id: entry.date,
          date: entry.date,
          weight: entry.weight,
        };
        setDocumentNonBlocking(weightHistoryRef, dataToSet, { merge: true });
      });
      
      localStorage.setItem(SEED_FLAG, 'true');
      console.log('Historical weight data seeding initiated.');
      setIsSeeding(false);
    };

    seedData();
  }, [firestore, user, isSeeding]);

  return null;
}
