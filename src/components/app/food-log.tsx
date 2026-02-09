'use client';

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useState, useMemo, useEffect } from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import { collection, query, where, orderBy, doc, increment } from 'firebase/firestore';
import type { DailyLog, DailyLogItem, DailyLogActivity } from '@/lib/types';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
    MdLocalFireDepartment,
    MdNotifications,
    MdAdd,
    MdChevronRight,
    MdRestaurant,
    MdCalendarToday,
    MdAnalytics,
    MdRestaurantMenu,
    MdPerson
} from 'react-icons/md';

const AddFoodSheet = dynamic(() => import('@/components/app/add-food-sheet').then(mod => mod.AddFoodSheet));
const EditFoodLogItemSheet = dynamic(() => import('@/components/app/edit-food-log-item-sheet').then(mod => mod.EditFoodLogItemSheet));

export function FoodLog() {
  const { userProfile, firestore, user } = useFirebase();
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<DailyLogItem | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');

  // Fetch Data
  const dailyLogQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    try {
        return query(
        collection(firestore, `users/${user.uid}/dailyLogs`),
        where('date', '==', selectedDateString)
        );
    } catch (e) {
        console.error("Error creating dailyLogQuery", e);
        return null;
    }
  }, [firestore, user, selectedDateString]);

  const { data: dailyLogs } = useCollection<DailyLog>(dailyLogQuery);
  const selectedLog = dailyLogs?.[0] || null;

  const itemsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    try {
        return query(
        collection(firestore, `users/${user.uid}/dailyLogs/${selectedDateString}/items`),
        orderBy('createdAt', 'desc')
        );
    } catch (e) {
        console.error("Error creating itemsQuery", e);
        return null;
    }
  }, [firestore, user, selectedDateString]);

  const { data: items } = useCollection<DailyLogItem>(itemsQuery);

  const activitiesQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      try {
        return query(
            collection(firestore, `users/${user.uid}/dailyLogs/${selectedDateString}/activities`),
            orderBy('createdAt', 'desc')
        );
      } catch (e) {
          console.error("Error creating activitiesQuery", e);
          return null;
      }
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
          else if (hour >= 16 && hour < 22) dinner.push(item);
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
  // To keep "Today" somewhat centered or visible
  const dateStrip = [-2, -1, 0, 1, 2, 3].map(offset => addDays(selectedDate, offset));

  const proteinGoal = userProfile?.dailyProtein || 150;
  const carbsGoal = userProfile?.dailyCarbs || 250;
  const fatGoal = userProfile?.dailyFat || 60;
  const calorieGoal = selectedLog?.goalCalories || userProfile?.dailyCalories || 2000;

  if (!mounted) {
    return null; // or a loading skeleton
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col mx-auto max-w-md shadow-2xl overflow-hidden bg-gradient-to-b from-blue-50/50 to-background-light dark:from-slate-900/50 dark:to-background-dark text-slate-800 dark:text-slate-100 antialiased selection:bg-primary selection:text-white">
        {/* Header / Top Bar */}
        <header className="pt-8 pb-2 px-6 flex items-center justify-between z-10">
            <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Food Diary</span>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                    byeFat <span className="text-primary text-xs align-top font-normal tracking-wide">2026</span>
                </h1>
            </div>
            <button className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <MdNotifications className="text-slate-700 dark:text-slate-200 text-2xl" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-background-dark"></span>
            </button>
        </header>

        {/* Date Picker (Glass Strip) */}
        <div className="sticky top-0 z-20 py-4 px-4">
            <div className="glass-panel rounded-2xl shadow-glass flex items-center p-2 gap-2 overflow-x-auto no-scrollbar bg-white/70 dark:bg-slate-900/70">
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
                                    ? "bg-primary text-white shadow-glow-primary scale-105"
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

        {/* Main Content Scroll Area */}
        <div className="flex-1 overflow-y-auto px-4 pb-28 no-scrollbar">

            {/* Summary Dashboard */}
            <div className="mt-2 mb-6 p-5 rounded-3xl bg-gradient-to-br from-white/60 to-white/30 dark:from-slate-800/60 dark:to-slate-800/30 border border-white/40 dark:border-slate-700/40 shadow-sm backdrop-blur-md">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Calories Remaining</p>
                        <h2 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">
                            {caloriesLeft.toLocaleString('en-US')} <span className="text-sm font-normal text-slate-400 ml-1">kcal left</span>
                        </h2>
                    </div>
                    <div className="h-10 w-10 rounded-full border-2 border-primary flex items-center justify-center">
                        <MdLocalFireDepartment className="text-primary text-xl" />
                    </div>
                </div>

                {/* Custom Progress Bar */}
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mb-6 overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(43,140,238,0.5)] transition-all duration-1000"
                        style={{ width: `${Math.min((netCalories / calorieGoal) * 100, 100)}%` }}
                    ></div>
                </div>

                {/* Macros Grid */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Protein</span>
                        <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${Math.min((macros.p / proteinGoal) * 100, 100)}%` }}></div>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{Math.round(macros.p)}g <span className="text-slate-400 font-normal">/ {proteinGoal}g</span></span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Carbs</span>
                        <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${Math.min((macros.c / carbsGoal) * 100, 100)}%` }}></div>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{Math.round(macros.c)}g <span className="text-slate-400 font-normal">/ {carbsGoal}g</span></span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Fat</span>
                        <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500" style={{ width: `${Math.min((macros.f / fatGoal) * 100, 100)}%` }}></div>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{Math.round(macros.f)}g <span className="text-slate-400 font-normal">/ {fatGoal}g</span></span>
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
                                    {Math.round(mealCalories)} kcal
                                </span>
                            </h3>
                            <button onClick={() => setIsAddFoodOpen(true)} className="text-primary hover:bg-primary/10 rounded-full p-1 transition-colors">
                                <MdAdd className="text-[20px]" />
                            </button>
                        </div>

                        {meal.items.length > 0 ? (
                            <div className="glass-card rounded-2xl p-1 overflow-hidden flex flex-col gap-1">
                                {meal.items.map((item, idx) => (
                                    <div key={item.id}>
                                        <div
                                            onClick={() => handleEdit(item)}
                                            className="group flex items-center gap-4 p-3 hover:bg-white/40 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer"
                                        >
                                            <div
                                                className="h-14 w-14 rounded-full bg-gray-200 bg-cover bg-center shadow-md border-2 border-white dark:border-slate-700 shrink-0 flex items-center justify-center text-gray-500"
                                            >
                                                {/* Placeholder if no image */}
                                                <span className="text-xl font-bold">{item.productName.charAt(0)}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate pr-2">{item.productName}</h4>
                                                    <span className="text-sm font-bold text-primary whitespace-nowrap">{Math.round(item.calories)}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium tracking-wide">
                                                    {item.grams}g • P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g
                                                </p>
                                            </div>
                                            <MdChevronRight className="text-slate-300 group-hover:text-primary text-lg transition-colors" />
                                        </div>
                                        {idx !== meal.items.length - 1 && <div className="h-px bg-slate-200/50 dark:bg-slate-700/50 mx-4"></div>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2 border-dashed border-2 !border-slate-200 dark:!border-slate-700 !bg-transparent">
                                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-1">
                                    <MdRestaurant className="text-2xl" />
                                </div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nothing logged yet</p>
                                <button onClick={() => setIsAddFoodOpen(true)} className="text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider">Add {meal.label}</button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>

        {/* Glowing FAB */}
        <div className="absolute bottom-24 right-6 z-30">
            <button
                onClick={() => setIsAddFoodOpen(true)}
                className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#00E096] to-[#00BFA5] text-white shadow-glow-green hover:scale-105 active:scale-95 transition-all duration-300"
            >
                <div className="absolute inset-0 rounded-full bg-white/20 blur-sm group-hover:blur-md transition-all"></div>
                <MdAdd className="text-3xl relative z-10 font-bold" />
            </button>
        </div>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 w-full z-20">
            <div className="glass-panel mx-4 mb-4 h-16 rounded-3xl flex justify-between items-center px-6 shadow-2xl bg-white/70 dark:bg-slate-900/70">
                <Link href="/diary" className="flex flex-col items-center justify-center gap-1 text-primary w-12 cursor-pointer">
                    <MdCalendarToday className="text-[26px] fill-current" />
                    <span className="text-[9px] font-bold">Diary</span>
                </Link>
                <Link href="/progress" className="flex flex-col items-center justify-center gap-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors w-12 cursor-pointer">
                    <MdAnalytics className="text-[26px]" />
                    <span className="text-[9px] font-medium">Stats</span>
                </Link>
                <div className="w-12"></div> {/* Spacer for FAB visual balance, though FAB is floating above */}
                <Link href="/products" className="flex flex-col items-center justify-center gap-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors w-12 cursor-pointer">
                    <MdRestaurantMenu className="text-[26px]" />
                    <span className="text-[9px] font-medium">Recipes</span>
                </Link>
                <Link href="/profile" className="flex flex-col items-center justify-center gap-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors w-12 cursor-pointer">
                    <div className="h-[26px] w-[26px] rounded-full overflow-hidden border border-slate-300 dark:border-slate-600">
                        {user?.photoURL ? (
                            <img alt="User profile" className="h-full w-full object-cover" src={user.photoURL} />
                        ) : (
                            <div className="h-full w-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                                {userProfile?.name?.charAt(0) || user?.displayName?.charAt(0) || 'U'}
                            </div>
                        )}
                    </div>
                    <span className="text-[9px] font-medium">Profile</span>
                </Link>
            </div>
            {/* Gradient fade at bottom */}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background-light dark:from-background-dark to-transparent -z-10 pointer-events-none"></div>
        </nav>

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
