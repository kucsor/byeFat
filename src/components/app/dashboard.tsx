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
    <div className="flex min-h-screen w-full flex-col bg-background pb-32 md:pb-8 font-sans">
      <AppHeader userProfile={userProfile} />

      {/* Main Grid Container */}
      <main className="container mx-auto max-w-5xl flex-1 p-4 md:p-6 lg:p-8">

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 auto-rows-min">

          {/* Header Area: Date Navigator */}
          <div className="col-span-1 md:col-span-12">
            <div className="rounded-[20px] bg-card/50 backdrop-blur-sm border border-border/40 p-1">
              <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
            </div>
          </div>

          {/* Left Column: Summary & Quick Actions */}
          <div className="col-span-1 md:col-span-5 lg:col-span-4 flex flex-col gap-4 md:gap-6">

            {/* Daily Summary Card */}
            <div className="rounded-[24px] bg-card border border-border/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-border/80 group">
               <DailySummary date={selectedDate} />
            </div>

            {/* Quick Actions (Desktop: Grid Item, Mobile: Floating handled inside component or here) */}
            <div className="hidden md:block rounded-[24px] bg-card border border-border/60 p-4 shadow-sm">
                <QuickActions
                    onAiCalculator={() => setIsAiCalculatorOpen(true)}
                    onLogActivity={() => setIsAddActivityOpen(true)}
                    onAddFood={() => setIsAddFoodOpen(true)}
                    onScanBarcode={() => setIsBarcodeScannerOpen(true)}
                    onManualLog={() => setIsManualLogOpen(true)}
                />
            </div>
          </div>

          {/* Right Column: Food Log */}
          <div className="col-span-1 md:col-span-7 lg:col-span-8">
            <div className="h-full rounded-[24px] bg-card border border-border/60 shadow-sm overflow-hidden flex flex-col">
                <FoodLog
                    items={items}
                    activities={activities}
                    selectedDate={selectedDateString}
                    onAddFood={() => setIsAddFoodOpen(true)}
                />
            </div>
          </div>

        </div>
      </main>

      {/* Mobile Quick Actions (Floating) */}
      <div className="md:hidden fixed bottom-20 left-0 right-0 z-50 px-4 pointer-events-none">
        <div className="pointer-events-auto">
             <QuickActions
                onAiCalculator={() => setIsAiCalculatorOpen(true)}
                onLogActivity={() => setIsAddActivityOpen(true)}
                onAddFood={() => setIsAddFoodOpen(true)}
                onScanBarcode={() => setIsBarcodeScannerOpen(true)}
                onManualLog={() => setIsManualLogOpen(true)}
            />
        </div>
      </div>

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
