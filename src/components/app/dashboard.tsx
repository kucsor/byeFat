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
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const AddFoodSheet = dynamic(() => import('./add-food-sheet').then(mod => mod.AddFoodSheet));
const AddActivitySheet = dynamic(() => import('./add-activity-sheet').then(mod => mod.AddActivitySheet));
const BarcodeScannerSheet = dynamic(() => import('./barcode-scanner-sheet').then(mod => mod.BarcodeScannerSheet));
const AddManualLogSheet = dynamic(() => import('./add-manual-log-sheet').then(mod => mod.AddManualLogSheet));
const AiPortionCalculator = dynamic(() => import('./ai-portion-calculator').then(mod => mod.AiPortionCalculator));

// --- God Mode Constants & Variants ---

const CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const ITEM_VARIANTS = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
};

const CARD_STYLES = cn(
  // Layout & Shape
  "relative overflow-hidden rounded-3xl",
  // Glassmorphism & Colors
  "bg-white/5 backdrop-blur-md border border-white/10",
  "dark:bg-black/20 dark:border-white/5", // Dark mode specific tweaks if needed, but sticking to "God Mode" spec
  // Shadows (Layered)
  "shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] ring-1 ring-white/5",
  // Interaction
  "transition-all duration-300 ease-out",
  "hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] hover:ring-white/10"
);

// Helper for hover scale effect
const HoverCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <motion.div
    variants={ITEM_VARIANTS}
    whileHover={{ scale: 1.02, translateY: -2 }}
    whileTap={{ scale: 0.98 }}
    className={cn(CARD_STYLES, className)}
  >
    {children}
  </motion.div>
);

export default function Dashboard() {
  const { userProfile, firestore, user } = useFirebase();
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isManualLogOpen, setIsManualLogOpen] = useState(false);
  const [isAiCalculatorOpen, setIsAiCalculatorOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');

  // Fetch Daily Log Document
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
    <div className="flex min-h-screen w-full flex-col bg-background font-sans pb-32 md:pb-8">
      {/* Background Gradient Mesh (Subtle) */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none -z-10" />

      <AppHeader userProfile={userProfile} />

      {/* Main Grid Container */}
      <motion.main
        className="container mx-auto max-w-6xl flex-1 p-6 md:p-8"
        initial="hidden"
        animate="visible"
        variants={CONTAINER_VARIANTS}
      >
        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-min">

          {/* Header Area: Date Navigator */}
          <motion.div variants={ITEM_VARIANTS} className="col-span-1 md:col-span-12 mb-2">
            <div className="rounded-full bg-card/30 backdrop-blur-md border border-white/10 p-1.5 shadow-sm inline-block w-full">
              <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
            </div>
          </motion.div>

          {/* Left Column: Summary & Quick Actions */}
          <div className="col-span-1 md:col-span-5 lg:col-span-4 flex flex-col gap-6">

            {/* Daily Summary Card - The Hero */}
            <HoverCard className="min-h-[420px]">
               <DailySummary date={selectedDate} />
            </HoverCard>

            {/* Quick Actions (Desktop) */}
            <motion.div
              variants={ITEM_VARIANTS}
              className="hidden md:block"
            >
              <div className={cn(CARD_STYLES, "p-1 bg-white/5")}> {/* Nested glass container */}
                 <QuickActions
                    onAiCalculator={() => setIsAiCalculatorOpen(true)}
                    onLogActivity={() => setIsAddActivityOpen(true)}
                    onAddFood={() => setIsAddFoodOpen(true)}
                    onScanBarcode={() => setIsBarcodeScannerOpen(true)}
                    onManualLog={() => setIsManualLogOpen(true)}
                 />
              </div>
            </motion.div>
          </div>

          {/* Right Column: Food Log */}
          <motion.div variants={ITEM_VARIANTS} className="col-span-1 md:col-span-7 lg:col-span-8 h-full">
            <div className={cn(CARD_STYLES, "h-full min-h-[500px] flex flex-col")}>
                <FoodLog
                    items={items}
                    activities={activities}
                    selectedDate={selectedDateString}
                    onAddFood={() => setIsAddFoodOpen(true)}
                />
            </div>
          </motion.div>

        </div>
      </motion.main>

      {/* Mobile Quick Actions (Floating) */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        className="md:hidden fixed bottom-24 left-4 right-4 z-50 pointer-events-none"
      >
        <div className="pointer-events-auto shadow-2xl rounded-3xl overflow-hidden bg-background/80 backdrop-blur-xl border border-white/20">
             <QuickActions
                onAiCalculator={() => setIsAiCalculatorOpen(true)}
                onLogActivity={() => setIsAddActivityOpen(true)}
                onAddFood={() => setIsAddFoodOpen(true)}
                onScanBarcode={() => setIsBarcodeScannerOpen(true)}
                onManualLog={() => setIsManualLogOpen(true)}
            />
        </div>
      </motion.div>

      {/* Sheets */}
      {userProfile && (
        <AnimatePresence>
          {isAddFoodOpen && (
            <AddFoodSheet
                isOpen={isAddFoodOpen}
                setIsOpen={setIsAddFoodOpen}
                selectedDate={selectedDateString}
                userProfile={userProfile}
                selectedLog={selectedLog}
                isLogLoading={isLogLoading}
            />
          )}

          {isAddActivityOpen && (
            <AddActivitySheet
                isOpen={isAddActivityOpen}
                setIsOpen={setIsAddActivityOpen}
                selectedDate={selectedDateString}
                userProfile={userProfile}
                selectedLog={selectedLog}
                isLogLoading={isLogLoading}
            />
          )}

          {isBarcodeScannerOpen && (
            <BarcodeScannerSheet
                isOpen={isBarcodeScannerOpen}
                setIsOpen={setIsBarcodeScannerOpen}
                selectedDate={selectedDateString}
                userProfile={userProfile}
                selectedLog={selectedLog}
                isLogLoading={isLogLoading}
            />
          )}

          {isManualLogOpen && (
             <AddManualLogSheet
                isOpen={isManualLogOpen}
                setIsOpen={setIsManualLogOpen}
                selectedDate={selectedDateString}
                userProfile={userProfile}
                selectedLog={selectedLog}
                isLogLoading={isLogLoading}
            />
          )}

          {isAiCalculatorOpen && (
             <AiPortionCalculator
                isOpen={isAiCalculatorOpen}
                setIsOpen={setIsAiCalculatorOpen}
                selectedDate={selectedDateString}
                userProfile={userProfile}
                selectedLog={selectedLog}
                isLogLoading={isLogLoading}
            />
          )}
        </AnimatePresence>
      )}

      <BottomNav />
    </div>
  );
}
