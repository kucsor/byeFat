'use client';

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useState, useMemo, useEffect } from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import { collection, query, where, orderBy, doc, increment } from 'firebase/firestore';
import type { DailyLog, DailyLogItem, DailyLogActivity } from '@/lib/types';
import { ChevronRight, Plus, Flame, Bell, Utensils } from 'lucide-react';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { triggerHapticFeedback } from '@/lib/haptics';
import dynamic from 'next/dynamic';
import { BottomNav } from './bottom-nav';
import { cn } from '@/lib/utils';
import { AnimatePresence } from 'framer-motion';

const AddFoodSheet = dynamic(() => import('./add-food-sheet').then(mod => mod.AddFoodSheet));
const EditFoodLogItemSheet = dynamic(() => import('./edit-food-log-item-sheet').then(mod => mod.EditFoodLogItemSheet));

// Helper for glass panel
const GLASS_PANEL = "backdrop-blur-md border border-white/40 dark:border-white/10 bg-white/60 dark:bg-slate-800/40";

export function FoodLog() {
  const { userProfile, firestore, user } = useFirebase();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<DailyLogItem | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  // Fetch Data
  const dailyLogQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `users/${user.uid}/dailyLogs`),
      where('date', '==', selectedDateString)
    );
  }, [firestore, user, selectedDateString]);

  const { data: dailyLogs } = useCollection<DailyLog>(dailyLogQuery);
  const selectedLog = dailyLogs?.[0] || null;

  const itemsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `users/${user.uid}/dailyLogs/${selectedDateString}/items`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user, selectedDateString]);

  const { data: items } = useCollection<DailyLogItem>(itemsQuery);

  const activitiesQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return query(
          collection(firestore, `users/${user.uid}/dailyLogs/${selectedDateString}/activities`),
          orderBy('createdAt', 'desc')
      );
    }, [firestore, user, selectedDateString]);

  const { data: activities } = useCollection<DailyLogActivity>(activitiesQuery);

  // Calculate Totals
  const { netCalories, caloriesLeft, macros } = useMemo(() => {
      const consumed = items?.reduce((acc, i) => acc + i.calories, 0) || 0;
      const burned = activities?.reduce((acc, a) => acc + a.calories, 0) || 0;
      const goal = selectedLog?.goalCalories || userProfile?.dailyCalories || 2000;
      const net = consumed - burned;

      let p = 0, c = 0, f = 0;
      items?.forEach(i => {
          p += (i.protein || 0);
          c += (i.carbs || 0);
          f += (i.fat || 0);
      });

      return {
          netCalories: net,
          caloriesLeft: Math.round(goal - net),
          macros: { p, c, f }
      };
  }, [items, activities, selectedLog, userProfile]);

  // Group items into "Meals" based on time
  const groupedItems = useMemo(() => {
      const breakfast: DailyLogItem[] = [];
      const lunch: DailyLogItem[] = [];
      const dinner: DailyLogItem[] = [];
      const snacks: DailyLogItem[] = [];

      items?.forEach(item => {
          if (!item.createdAt?.toDate) {
              snacks.push(item);
              return;
          }
          const hour = item.createdAt.toDate().getHours();
          if (hour >= 4 && hour < 11) breakfast.push(item);
          else if (hour >= 11 && hour < 16) lunch.push(item);
          else if (hour >= 16 || hour < 4) dinner.push(item);
          else snacks.push(item);
      });

      return { breakfast, lunch, dinner, snacks };
  }, [items]);

  const handleEdit = (item: DailyLogItem) => {
      setItemToEdit(item);
      setIsEditSheetOpen(true);
  };

    // Listen for Add Menu Event from BottomNav
    useEffect(() => {
        const handleOpenAdd = () => setIsAddFoodOpen(true);
        window.addEventListener('open-add-menu', handleOpenAdd);
        return () => window.removeEventListener('open-add-menu', handleOpenAdd);
    }, []);

  // Generate Date Strip Days (e.g., -2 to +3 days from selected)
  const dateStrip = [-2, -1, 0, 1, 2, 3].map(offset => addDays(selectedDate, offset));

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#101922] min-h-screen relative overflow-x-hidden font-sans text-slate-800 dark:text-slate-100 pb-24">
        {/* Header */}
        <header className="pt-8 pb-2 px-6 flex items-center justify-between z-10 sticky top-0 bg-[#f6f7f8]/80 dark:bg-[#101922]/80 backdrop-blur-md">
            <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Food Diary</span>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                    byeFat <span className="text-[#2b8cee] text-xs align-top font-normal tracking-wide">2026</span>
                </h1>
            </div>
            <button className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Bell className="text-slate-700 dark:text-slate-200" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-[#101922]"></span>
            </button>
        </header>

        {/* Date Picker (Glass Strip) */}
        <div className="sticky top-20 z-20 py-4 px-4">
            <div className={`${GLASS_PANEL} rounded-2xl shadow-sm flex items-center p-2 gap-2 overflow-x-auto no-scrollbar`}>
                 {dateStrip.map((date, idx) => {
                     const isSelected = isSameDay(date, selectedDate);
                     const isToday = isSameDay(date, new Date());
                     return (
                         <button
                            key={idx}
                            onClick={() => setSelectedDate(date)}
                            className={cn(
                                "flex-shrink-0 flex flex-col items-center justify-center w-12 h-14 rounded-xl transition-all",
                                isSelected
                                    ? "bg-[#2b8cee] text-white shadow-lg scale-105"
                                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                         >
                             <span className={cn("text-[10px] font-medium uppercase", isSelected ? "opacity-90" : "")}>{format(date, 'eee')}</span>
                             <span className={cn("text-sm", isSelected ? "font-bold" : "font-semibold")}>
                                 {isToday && isSelected ? 'Today' : format(date, 'd')}
                             </span>
                         </button>
                     )
                 })}
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-28">

            {/* Summary Dashboard */}
            <div className="mt-2 mb-6 p-5 rounded-3xl bg-gradient-to-br from-white/60 to-white/30 dark:from-slate-800/60 dark:to-slate-800/30 border border-white/40 dark:border-slate-700/40 shadow-sm backdrop-blur-md">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Calories Remaining</p>
                        <h2 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">
                            {caloriesLeft} <span className="text-sm font-normal text-slate-400 ml-1">kcal left</span>
                        </h2>
                    </div>
                    <div className="h-10 w-10 rounded-full border-2 border-[#2b8cee] flex items-center justify-center">
                        <Flame className="text-[#2b8cee] text-xl fill-current" />
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mb-6 overflow-hidden">
                    <div
                        className="h-full bg-[#2b8cee] rounded-full shadow-[0_0_10px_rgba(43,140,238,0.5)] transition-all duration-1000"
                        style={{ width: `${Math.min((netCalories / (selectedLog?.goalCalories || 2000)) * 100, 100)}%` }}
                    ></div>
                </div>

                {/* Macros Grid */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Protein</span>
                        <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${Math.min((macros.p / (userProfile?.dailyProtein || 150)) * 100, 100)}%` }}></div>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{Math.round(macros.p)}g</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Carbs</span>
                        <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${Math.min((macros.c / (userProfile?.dailyCarbs || 250)) * 100, 100)}%` }}></div>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{Math.round(macros.c)}g</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Fat</span>
                        <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500" style={{ width: `${Math.min((macros.f / (userProfile?.dailyFat || 65)) * 100, 100)}%` }}></div>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{Math.round(macros.f)}g</span>
                    </div>
                </div>
            </div>

            {/* Meals Sections */}
            {[
                { label: 'Breakfast', items: groupedItems.breakfast },
                { label: 'Lunch', items: groupedItems.lunch },
                { label: 'Dinner', items: groupedItems.dinner },
                { label: 'Snacks', items: groupedItems.snacks },
            ].map((meal) => {
                const mealCalories = meal.items.reduce((acc, i) => acc + i.calories, 0);

                return (
                    <div key={meal.label} className="mb-4">
                        <div className="flex justify-between items-center mb-3 px-1">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                {meal.label}
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 font-semibold tracking-wide">
                                    {mealCalories} kcal
                                </span>
                            </h3>
                            <button onClick={() => setIsAddFoodOpen(true)} className="text-[#2b8cee] hover:bg-[#2b8cee]/10 rounded-full p-1 transition-colors">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        {meal.items.length > 0 ? (
                            <div className={`${GLASS_PANEL} border border-white/30 rounded-2xl p-1 overflow-hidden flex flex-col gap-1`}>
                                {meal.items.map((item, idx) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleEdit(item)}
                                        className={cn(
                                            "group flex items-center gap-4 p-3 hover:bg-white/40 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer",
                                            idx !== meal.items.length - 1 ? "border-b border-slate-100/10" : ""
                                        )}
                                    >
                                        <div className="h-14 w-14 rounded-full bg-gray-200 shrink-0 flex items-center justify-center text-gray-500 shadow-md border-2 border-white dark:border-slate-700">
                                            {item.productName.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate pr-2">{item.productName}</h4>
                                                <span className="text-sm font-bold text-[#2b8cee] whitespace-nowrap">{item.calories}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium tracking-wide">
                                                {item.grams}g • P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g
                                            </p>
                                        </div>
                                        <ChevronRight className="text-slate-300 group-hover:text-[#2b8cee] w-5 h-5 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={`${GLASS_PANEL} rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2 border-dashed border-2 !border-slate-200 dark:!border-slate-700 !bg-transparent`}>
                                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-1">
                                    <Utensils className="w-5 h-5" />
                                </div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nothing logged yet</p>
                                <button onClick={() => setIsAddFoodOpen(true)} className="text-xs font-bold text-[#2b8cee] hover:text-[#2b8cee]/80 transition-colors uppercase tracking-wider">Add {meal.label}</button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>

        {/* Glowing FAB (Fixed Position) */}
        <div className="absolute bottom-24 right-6 z-30">
            <button onClick={() => setIsAddFoodOpen(true)} className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#00E096] to-[#00BFA5] text-white shadow-[0_0_20px_rgba(0,224,150,0.6)] hover:scale-105 active:scale-95 transition-all duration-300">
                <div className="absolute inset-0 rounded-full bg-white/20 blur-sm group-hover:blur-md transition-all"></div>
                <Plus className="w-8 h-8 relative z-10 font-bold" />
            </button>
        </div>

        <BottomNav />

        {/* Sheets */}
        <AnimatePresence>
            {isAddFoodOpen && userProfile && (
              <AddFoodSheet
                  isOpen={isAddFoodOpen}
                  setIsOpen={setIsAddFoodOpen}
                  selectedDate={selectedDateString}
                  userProfile={userProfile}
                  selectedLog={selectedLog}
                  isLogLoading={false}
              />
            )}
             {isEditSheetOpen && itemToEdit && (
                <EditFoodLogItemSheet
                    isOpen={isEditSheetOpen}
                    setIsOpen={setIsEditSheetOpen}
                    item={itemToEdit}
                    selectedDate={selectedDateString}
                />
            )}
        </AnimatePresence>
    </div>
  );
}
