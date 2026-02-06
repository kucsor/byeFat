'use client';

import { AppHeader } from './header';
import { DailySummary } from './daily-summary';
import { FoodLog } from './food-log';
import { BottomNav } from './bottom-nav';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useState } from 'react';
import { format } from 'date-fns';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { DailyLog, DailyLogItem, DailyLogActivity } from '@/lib/types';
import { DateNavigator } from './date-navigator';
import { QuickActions } from './quick-actions';
import dynamic from 'next/dynamic';

const AddFoodSheet = dynamic(() => import('./add-food-sheet').then(mod => mod.AddFoodSheet));
const AddActivitySheet = dynamic(() => import('./add-activity-sheet').then(mod => mod.AddActivitySheet));
const BarcodeScannerSheet = dynamic(() => import('./barcode-scanner-sheet').then(mod => mod.BarcodeScannerSheet));
const AddManualLogSheet = dynamic(() => import('./add-manual-log-sheet').then(mod => mod.AddManualLogSheet));
const AiPortionCalculator = dynamic(() => import('./ai-portion-calculator').then(mod => mod.AiPortionCalculator));

export default function Dashboard() {
  const { userProfile, firestore, user } = useFirebase();
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isManualLogOpen, setIsManualLogOpen] = useState(false);
  const [isAiCalculatorOpen, setIsAiCalculatorOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');

  // Fetch Daily Log Document (for goals/aggregated stats)
  const dailyLogQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `users/${user.uid}/dailyLogs`),
      where('date', '==', selectedDateString)
    );
  }, [firestore, user, selectedDateString]);

  const { data: dailyLogs, isLoading: isLogLoading } = useCollection<DailyLog>(dailyLogQuery);
  const selectedLog = dailyLogs?.[0] || null;

  // Fetch Items Subcollection
  const itemsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `users/${user.uid}/dailyLogs/${selectedDateString}/items`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user, selectedDateString]);

  const { data: items } = useCollection<DailyLogItem>(itemsQuery);

  // Fetch Activities Subcollection
  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, `users/${user.uid}/dailyLogs/${selectedDateString}/activities`),
        orderBy('createdAt', 'desc')
    );
  }, [firestore, user, selectedDateString]);

  const { data: activities } = useCollection<DailyLogActivity>(activitiesQuery);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background pb-32 md:pb-8">
      <AppHeader userProfile={userProfile} />

      <main className="container mx-auto max-w-xl flex-1 space-y-6 p-4">
        {/* Date Navigator */}
        <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />

        {/* Daily Summary (Ring Chart) */}
        <DailySummary date={selectedDate} />

        {/* Quick Actions */}
        <QuickActions
            onAiCalculator={() => setIsAiCalculatorOpen(true)}
            onLogActivity={() => setIsAddActivityOpen(true)}
            onAddFood={() => setIsAddFoodOpen(true)}
            onScanBarcode={() => setIsBarcodeScannerOpen(true)}
            onManualLog={() => setIsManualLogOpen(true)}
        />

        {/* Today's Log */}
        <FoodLog
            items={items}
            activities={activities}
            selectedDate={selectedDateString}
            onAddFood={() => setIsAddFoodOpen(true)}
        />
      </main>

      {/* Sheets */}
      {userProfile && (
        <>
            <AddFoodSheet
                isOpen={isAddFoodOpen}
                setIsOpen={setIsAddFoodOpen}
                selectedDate={selectedDateString}
                userProfile={userProfile}
                selectedLog={selectedLog}
                isLogLoading={isLogLoading}
            />

            <AddActivitySheet
                isOpen={isAddActivityOpen}
                setIsOpen={setIsAddActivityOpen}
                selectedDate={selectedDateString}
                userProfile={userProfile}
                selectedLog={selectedLog}
                isLogLoading={isLogLoading}
            />

            <BarcodeScannerSheet
                isOpen={isBarcodeScannerOpen}
                setIsOpen={setIsBarcodeScannerOpen}
                selectedDate={selectedDateString}
                userProfile={userProfile}
                selectedLog={selectedLog}
                isLogLoading={isLogLoading}
            />

            <AddManualLogSheet
                isOpen={isManualLogOpen}
                setIsOpen={setIsManualLogOpen}
                selectedDate={selectedDateString}
                userProfile={userProfile}
                selectedLog={selectedLog}
                isLogLoading={isLogLoading}
            />

            <AiPortionCalculator
                isOpen={isAiCalculatorOpen}
                setIsOpen={setIsAiCalculatorOpen}
                selectedDate={selectedDateString}
                userProfile={userProfile}
                selectedLog={selectedLog}
                isLogLoading={isLogLoading}
            />
        </>
      )}

      <BottomNav />
    </div>
  );
}
