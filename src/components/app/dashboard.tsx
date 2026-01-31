'use client';

import { useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { collection, query } from 'firebase/firestore';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { DailyLog, DailyLogItem, DailyLogActivity, UserProfile } from '@/lib/types';
import { DailySummary } from './daily-summary';
import { FoodLog } from './food-log';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isToday, isYesterday, addDays, subDays } from 'date-fns';
import dynamic from 'next/dynamic';
import { FabMenu } from './fab-menu';

// Lazy load all the sheets
const AiPortionCalculator = dynamic(() => import('./ai-portion-calculator').then(mod => mod.AiPortionCalculator));
const BarcodeScannerSheet = dynamic(() => import('./barcode-scanner-sheet').then(mod => mod.BarcodeScannerSheet));
const AddFoodSheet = dynamic(() => import('./add-food-sheet').then(mod => mod.AddFoodSheet));
const AddActivitySheet = dynamic(() => import('./add-activity-sheet').then(mod => mod.AddActivitySheet));


export function Dashboard({ user, userProfile }: { user: User, userProfile: UserProfile }) {
  const { firestore } = useFirebase();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // State for all sheets is now centralized here
  const [isAiCalculatorOpen, setIsAiCalculatorOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isAddFoodSheetOpen, setIsAddFoodSheetOpen] = useState(false);
  const [isActivitySheetOpen, setIsActivitySheetOpen] = useState(false);

  const selectedDateString = selectedDate.toISOString().slice(0, 10);

  const dailyLogsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/dailyLogs`));
  }, [user, firestore]);

  const { data: dailyLogs } = useCollection<DailyLog>(dailyLogsQuery);

  const selectedLog = useMemo(() => {
    if (!dailyLogs) return null;
    return dailyLogs.find((log) => log.id === selectedDateString) ?? null;
  }, [dailyLogs, selectedDateString]);

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
  
  const getGreeting = () => {
    if (!userProfile?.name) return "Today's Dashboard";
    const hour = new Date().getHours();
    const firstName = userProfile.name.split(' ')[0];

    if (hour >= 5 && hour < 12) {
      return `Bună dimineața, ${firstName}!`;
    } else if (hour >= 12 && hour < 18) {
      return `Bună ziua, ${firstName}!`;
    } else {
      return `Bună seara, ${firstName}!`;
    }
  };
  
  const dateLabel = useMemo(() => {
    if (isToday(selectedDate)) return 'Today';
    if (isYesterday(selectedDate)) return 'Yesterday';
    return format(selectedDate, 'PPP');
  }, [selectedDate]);


  return (
    <>
      <div className="container mx-auto max-w-5xl p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {getGreeting()}
          </h1>
          <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-36 justify-center" onClick={() => setSelectedDate(new Date())}>
                {dateLabel}
            </Button>
            <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                disabled={isToday(selectedDate)}
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-8">
            <DailySummary 
              foodItems={foodItems} 
              activities={activities} 
              userProfile={userProfile} 
              selectedLog={selectedLog}
            />
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
      />

      <BarcodeScannerSheet 
        isOpen={isBarcodeScannerOpen}
        setIsOpen={setIsBarcodeScannerOpen}
        selectedDate={selectedDateString} 
        userProfile={userProfile} 
        selectedLog={selectedLog} 
      />
      <AiPortionCalculator 
        isOpen={isAiCalculatorOpen}
        setIsOpen={setIsAiCalculatorOpen}
        selectedDate={selectedDateString}
        userProfile={userProfile}
        selectedLog={selectedLog} 
      />
       <AddFoodSheet
        isOpen={isAddFoodSheetOpen}
        setIsOpen={setIsAddFoodSheetOpen}
        selectedDate={selectedDateString}
        userProfile={userProfile}
        selectedLog={selectedLog}
      />
      <AddActivitySheet 
        isOpen={isActivitySheetOpen} 
        setIsOpen={setIsActivitySheetOpen} 
        selectedDate={selectedDateString}
        userProfile={userProfile}
        selectedLog={selectedLog}
       />
    </>
  );
}
