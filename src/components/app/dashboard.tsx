'use client';

import { useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { collection, query, doc } from 'firebase/firestore';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { DailyLog, DailyLogItem, DailyLogActivity, UserProfile } from '@/lib/types';
import { DailySummary } from './daily-summary';
import { FoodLog } from './food-log';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isToday, isYesterday, addDays, subDays } from 'date-fns';
import dynamic from 'next/dynamic';
import { FabMenu } from './fab-menu';
import { motion } from 'framer-motion';

// Lazy load all the sheets
const AiPortionCalculator = dynamic(() => import('./ai-portion-calculator').then(mod => mod.AiPortionCalculator));
const BarcodeScannerSheet = dynamic(() => import('./barcode-scanner-sheet').then(mod => mod.BarcodeScannerSheet));
const AddFoodSheet = dynamic(() => import('./add-food-sheet').then(mod => mod.AddFoodSheet));
const AddActivitySheet = dynamic(() => import('./add-activity-sheet').then(mod => mod.AddActivitySheet));
const AddManualLogSheet = dynamic(() => import('./add-manual-log-sheet').then(mod => mod.AddManualLogSheet));


export function Dashboard({ user, userProfile }: { user: User, userProfile: UserProfile }) {
  const { firestore } = useFirebase();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // State for all sheets is now centralized here
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

  const { data: selectedLog } = useDoc<DailyLog>(dailyLogDocRef);

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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
        >
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-primary-foreground drop-shadow-sm">
            {getGreeting()}
          </h1>
          <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1.5 rounded-full border-2 border-primary/20 shadow-sm">
            <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-primary/20"
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            >
                <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="px-6 rounded-full font-bold hover:bg-primary/20" onClick={() => setSelectedDate(new Date())}>
                {dateLabel}
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-primary/20"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                disabled={isToday(selectedDate)}
            >
                <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-12 lg:col-span-7">
                <DailySummary
                  foodItems={foodItems}
                  activities={activities}
                  userProfile={userProfile}
                  selectedLog={selectedLog}
                />
            </div>
            <div className="md:col-span-12 lg:col-span-5">
                <FoodLog
                  items={foodItems}
                  activities={activities}
                  selectedDate={selectedDateString}
                  onAddFood={() => setIsAddFoodSheetOpen(true)}
                />
            </div>
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
       <AddManualLogSheet
        isOpen={isManualLogOpen}
        setIsOpen={setIsManualLogOpen}
        selectedDate={selectedDateString}
        userProfile={userProfile}
        selectedLog={selectedLog}
       />
    </>
  );
}
