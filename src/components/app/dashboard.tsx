'use client';

import { AppHeader } from './header';
import { DailySummary } from './daily-summary';
import { FoodLog } from './food-log';
import { BottomNav } from './bottom-nav';
import { AddFoodSheet } from './add-food-sheet';
import { AddActivitySheet } from './add-activity-sheet';
import { BarcodeScannerSheet } from './barcode-scanner-sheet';
import { AddManualLogSheet } from './add-manual-log-sheet';
import { ProductFormSheet } from './product-form-sheet';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Utensils, Dumbbell } from 'lucide-react';
import { FabMenu } from './fab-menu';
import { useState } from 'react';
import { UserLevelCard } from './user-level-card';
import { format } from 'date-fns';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { DailyLog, DailyLogItem, DailyLogActivity } from '@/lib/types';

export default function Dashboard() {
  const { userProfile, firestore, user } = useFirebase();
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isManualLogOpen, setIsManualLogOpen] = useState(false);
  const [isAiCalculatorOpen, setIsAiCalculatorOpen] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch Daily Log Document (for goals/aggregated stats)
  const dailyLogQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `users/${user.uid}/dailyLogs`),
      where('date', '==', today)
    );
  }, [firestore, user, today]);

  const { data: dailyLogs, isLoading: isLogLoading } = useCollection<DailyLog>(dailyLogQuery);
  const selectedLog = dailyLogs?.[0] || null;

  // Fetch Items Subcollection
  const itemsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `users/${user.uid}/dailyLogs/${today}/items`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user, today]);

  const { data: items } = useCollection<DailyLogItem>(itemsQuery);

  // Fetch Activities Subcollection
  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, `users/${user.uid}/dailyLogs/${today}/activities`),
        orderBy('createdAt', 'desc')
    );
  }, [firestore, user, today]);

  const { data: activities } = useCollection<DailyLogActivity>(activitiesQuery);

  return (
    <div className="flex min-h-screen w-full flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-white pb-24 md:pb-8">
      <AppHeader userProfile={userProfile} />

      <main className="container mx-auto max-w-xl flex-1 space-y-6 p-4">
        {/* User Level Card - Gamification */}
        <UserLevelCard />

        {/* Daily Summary */}
        <DailySummary />

        {/* Actions Grid */}
        <div className="grid grid-cols-2 gap-3">
            <Button
                variant="outline"
                className="h-24 flex flex-col gap-2 rounded-2xl border-dashed border-2 hover:border-primary hover:bg-primary/5 glass-card"
                onClick={() => setIsAddFoodOpen(true)}
            >
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                    <Utensils className="h-6 w-6" />
                </div>
                <span className="font-bold text-xs uppercase tracking-wider">Log Food</span>
            </Button>

            <Button
                variant="outline"
                className="h-24 flex flex-col gap-2 rounded-2xl border-dashed border-2 hover:border-accent hover:bg-accent/5 glass-card"
                onClick={() => setIsAddActivityOpen(true)}
            >
                <div className="p-2 rounded-full bg-accent/10 text-accent">
                    <Dumbbell className="h-6 w-6" />
                </div>
                <span className="font-bold text-xs uppercase tracking-wider">Log Activity</span>
            </Button>
        </div>

        {/* Logs */}
        <div className="space-y-6">
            <FoodLog
                items={items}
                activities={activities}
                selectedDate={today}
                onAddFood={() => setIsAddFoodOpen(true)}
            />
        </div>
      </main>

      {/* Sheets */}
      {userProfile && (
        <>
            <AddFoodSheet
                isOpen={isAddFoodOpen}
                setIsOpen={setIsAddFoodOpen}
                selectedDate={today}
                userProfile={userProfile}
                selectedLog={selectedLog}
                isLogLoading={isLogLoading}
            />

            <AddActivitySheet
                isOpen={isAddActivityOpen}
                setIsOpen={setIsAddActivityOpen}
                selectedDate={today}
                userProfile={userProfile}
                selectedLog={selectedLog}
                isLogLoading={isLogLoading}
            />
        </>
      )}

      {/* Floating Action Button Menu (Mobile) */}
      <div className="md:hidden">
          <FabMenu
             onAddFood={() => setIsAddFoodOpen(true)}
             onLogActivity={() => setIsAddActivityOpen(true)}
             onScanBarcode={() => setIsBarcodeScannerOpen(true)}
             onAiCalculator={() => setIsAiCalculatorOpen(true)}
             onManualLog={() => setIsManualLogOpen(true)}
          />
      </div>

      <BottomNav />
    </div>
  );
}
