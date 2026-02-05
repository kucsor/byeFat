'use client';

import { useMemo, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, doc, updateDoc } from 'firebase/firestore';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { DailyLog, DailyLogItem, DailyLogActivity, UserProfile } from '@/lib/types';
import { ActivitySummary } from './activity-summary';
import { FoodLog } from './food-log';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { format, isToday, isYesterday, addDays, subDays } from 'date-fns';
import dynamic from 'next/dynamic';
import { FabMenu } from './fab-menu';
import { motion } from 'framer-motion';
import { AppHeader } from './header';

// Lazy load all the sheets
const AiPortionCalculator = dynamic(() => import('./ai-portion-calculator').then(mod => mod.AiPortionCalculator));
const BarcodeScannerSheet = dynamic(() => import('./barcode-scanner-sheet').then(mod => mod.BarcodeScannerSheet));
const AddFoodSheet = dynamic(() => import('./add-food-sheet').then(mod => mod.AddFoodSheet));
const AddActivitySheet = dynamic(() => import('./add-activity-sheet').then(mod => mod.AddActivitySheet));
const AddManualLogSheet = dynamic(() => import('./add-manual-log-sheet').then(mod => mod.AddManualLogSheet));


export function Dashboard({ user, userProfile }: { user: User, userProfile: UserProfile }) {
  const { firestore } = useFirebase();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // State for all sheets
  const [isAiCalculatorOpen, setIsAiCalculatorOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isAddFoodSheetOpen, setIsAddFoodSheetOpen] = useState(false);
  const [isActivitySheetOpen, setIsActivitySheetOpen] = useState(false);
  const [isManualLogOpen, setIsManualLogOpen] = useState(false);

  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');

  const dailyLogDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, `users/${user.uid}/dailyLogs`, selectedDateString);
  }, [user, firestore, selectedDateString]);

  const { data: selectedLog, isLoading: isLogLoading } = useDoc<DailyLog>(dailyLogDocRef);

  const foodItemsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/dailyLogs/${selectedDateString}/items`));
  }, [user, firestore, selectedDateString]);

  const { data: foodItems } = useCollection<DailyLogItem>(foodItemsQuery);

  const activitiesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/dailyLogs/${selectedDateString}/activities`));
    }, [user, firestore, selectedDateString]);

  const { data: activities } = useCollection<DailyLogActivity>(activitiesQuery);

  // Sync activeCalories logic (preserved)
  useEffect(() => {
    if (!selectedLog || !activities) return;
    const totalActiveFromActivities = activities.reduce((acc, curr) => acc + curr.calories, 0);
    const storedActive = selectedLog.activeCalories || 0;

    if (totalActiveFromActivities !== storedActive && dailyLogDocRef) {
      updateDoc(dailyLogDocRef, {
        activeCalories: totalActiveFromActivities
      }).catch(err => {
        console.error("Failed to sync active calories:", err);
      });
    }
  }, [activities, selectedLog, dailyLogDocRef]);
  
  const dateLabel = useMemo(() => {
    if (isToday(selectedDate)) return 'Today';
    if (isYesterday(selectedDate)) return 'Yesterday';
    return format(selectedDate, 'MMM d');
  }, [selectedDate]);


  return (
    <>
      <AppHeader userProfile={userProfile} />
      <div className="container mx-auto max-w-xl p-4 md:p-8 pb-32">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-1 bg-white p-1 rounded-full border shadow-sm">
            <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8 hover:bg-slate-50"
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-4 font-bold text-sm min-w-[120px] justify-center text-slate-700">
                <CalendarDays className="h-4 w-4 opacity-50" />
                {dateLabel}
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8 hover:bg-slate-50"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                disabled={isToday(selectedDate)}
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-6">
            <ActivitySummary
                foodItems={foodItems}
                activities={activities}
                userProfile={userProfile}
                selectedLog={selectedLog}
            />

            {/* The Food Log is now handled by the bottom Peek Drawer inside FoodLog component */}
            <FoodLog
                items={foodItems}
                activities={activities}
                selectedDate={selectedDateString}
                onAddFood={() => setIsAddFoodSheetOpen(true)}
            />
        </div>
      </div>

      <FabMenu 
        onAddFood={() => setIsAddFoodSheetOpen(true)}
        onLogActivity={() => setIsActivitySheetOpen(true)}
        onScanBarcode={() => setIsBarcodeScannerOpen(true)}
        onAiCalculator={() => setIsAiCalculatorOpen(true)}
        onManualLog={() => setIsManualLogOpen(true)}
      />

      <BarcodeScannerSheet 
        isOpen={isBarcodeScannerOpen}
        setIsOpen={setIsBarcodeScannerOpen}
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
       <AddFoodSheet
        isOpen={isAddFoodSheetOpen}
        setIsOpen={setIsAddFoodSheetOpen}
        selectedDate={selectedDateString}
        userProfile={userProfile}
        selectedLog={selectedLog}
        isLogLoading={isLogLoading}
      />
      <AddActivitySheet 
        isOpen={isActivitySheetOpen} 
        setIsOpen={setIsActivitySheetOpen} 
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
    </>
  );
}
