'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { format, addDays, isSameDay } from 'date-fns';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { DailyLog, DailyLogItem } from '@/lib/types';
import { AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
    MdLocalFireDepartment,
    MdChevronLeft,
    MdChevronRight,
    MdNotifications,
    MdEgg,
    MdBakeryDining,
    MdOpacity,
    MdRestaurant,
    MdDashboard,
    MdAnalytics,
    MdAdd,
    MdRestaurantMenu,
    MdPerson
} from 'react-icons/md';

// Dynamic imports for heavy components
const AddFoodSheet = dynamic(() => import('@/components/app/add-food-sheet').then(mod => mod.AddFoodSheet));
const EditFoodLogItemSheet = dynamic(() => import('@/components/app/edit-food-log-item-sheet').then(mod => mod.EditFoodLogItemSheet));

export default function Dashboard() {
  const { user, userProfile, firestore: db } = useFirebase();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');

  // Fetch Daily Log
  const logsQuery = useMemoFirebase(() => {
      if (!user || !db) return null;
      try {
        return query(
            collection(db, `users/${user.uid}/dailyLogs`),
            where('date', '==', selectedDateString),
            limit(1)
        );
      } catch (e) {
          console.error("Error creating logs query", e);
          return null;
      }
  }, [user, db, selectedDateString]);

  const { data: logs, isLoading: isLogLoading } = useCollection<DailyLog>(logsQuery);
  const dailyLog = logs?.[0];

  // Fetch Items for Macros and Recent Activity
  const itemsQuery = useMemoFirebase(() => {
      if (!user || !db) return null;
      try {
        return query(
            collection(db, `users/${user.uid}/dailyLogs/${selectedDateString}/items`),
            orderBy('createdAt', 'desc')
        );
      } catch (e) {
        console.error("Error creating items query", e);
        return null;
      }
  }, [user, db, selectedDateString]);

  const { data: items } = useCollection<DailyLogItem>(itemsQuery);

  // Calculate Stats
  const goalCalories = userProfile?.dailyCalories || 2000;
  const activeCalories = dailyLog?.activeCalories || 0;

  // Calculate Macros from items
  const { consumedCalories, protein, carbs, fat } = useMemo(() => {
      if (!items) return { consumedCalories: 0, protein: 0, carbs: 0, fat: 0 };
      return items.reduce((acc, item) => ({
          consumedCalories: acc.consumedCalories + (item.calories || 0),
          protein: acc.protein + (item.protein || 0),
          carbs: acc.carbs + (item.carbs || 0),
          fat: acc.fat + (item.fat || 0),
      }), { consumedCalories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [items]);

  const netCalories = consumedCalories - activeCalories;
  // If netCalories > goalCalories, caloriesLeft is negative (which is correct behavior)
  const caloriesLeft = goalCalories - netCalories;

  const proteinGoal = userProfile?.dailyProtein || 150;
  const carbsGoal = userProfile?.dailyCarbs || 250;
  const fatGoal = userProfile?.dailyFat || 60;

  // Calculate stroke dashoffset for the ring
  // Circumference = 2 * pi * r. r=42 -> C ≈ 264.
  // Offset = C - (percent * C)
  const circumference = 264;
  // Calculate percent of GOAL consumed (net)
  // If consumed > goal, percent > 1, offset becomes negative, which fills the circle more?
  // Actually usually ring charts clamp to 100% or loop.
  // The provided HTML has hardcoded values.
  // Let's clamp between 0 and 1 for the ring visual.
  const percent = Math.min(Math.max(netCalories / goalCalories, 0), 1);
  const offset = circumference - (percent * circumference);

  // Helper for 3D Bar width
  const getBarWidth = (current: number, goal: number) => {
      const p = Math.min((current / goal) * 100, 100);
      return `${p}%`;
  };

  const lastItem = items?.[0];

  const handleEdit = (item: any) => {
      setItemToEdit(item);
      setIsEditSheetOpen(true);
  };

  const changeDate = (days: number) => {
      setSelectedDate(prev => addDays(prev, days));
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="relative min-h-screen pb-24 max-w-md mx-auto shadow-2xl bg-white/5 dark:bg-black/5 backdrop-blur-[2px] overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between p-6 pt-8">
            <div className="flex items-center gap-3">
                <div className="relative group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary to-purple-400 rounded-full blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
                    <div className="relative size-10 rounded-full overflow-hidden border-2 border-white/50 dark:border-white/20">
                        {user?.photoURL ? (
                            <img alt="Profile" className="w-full h-full object-cover" src={user.photoURL} />
                        ) : (
                             <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
                                {userProfile?.name?.charAt(0) || user?.displayName?.charAt(0) || 'U'}
                             </div>
                        )}
                    </div>
                </div>
                <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hello,</p>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white leading-none">
                        {userProfile?.name?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'User'}
                    </h2>
                </div>
            </div>
            <button className="relative glass-panel bg-white/40 dark:bg-slate-800/40 rounded-full p-2.5 transition-transform active:scale-95 shadow-glass group">
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-800 z-10"></span>
                <MdNotifications className="text-slate-600 dark:text-slate-300 text-[22px] group-hover:text-primary transition-colors" />
            </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-6 flex flex-col gap-8">
            {/* Date Selector */}
            <div className="flex justify-center items-center gap-4">
                <button onClick={() => changeDate(-1)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <MdChevronLeft className="text-slate-400 text-2xl" />
                </button>
                <div className="text-center">
                    <h1 className="text-metallic text-xl font-bold tracking-tight">
                        {isSameDay(selectedDate, new Date()) ? 'Today' : format(selectedDate, 'EEEE')}, {format(selectedDate, 'MMM d')}
                    </h1>
                </div>
                <button onClick={() => changeDate(1)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <MdChevronRight className="text-slate-400 text-2xl" />
                </button>
            </div>

            {/* Hero Section: Calorie Ring */}
            <section className="relative flex justify-center py-4">
                {/* Outer Glow Ring */}
                <div className="relative w-64 h-64">
                    {/* Background Circle */}
                    <div className="absolute inset-0 rounded-full border-[16px] border-slate-100 dark:border-slate-800/50"></div>
                    {/* Progress Circle (SVG) */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90 transform drop-shadow-glow" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" fill="transparent" r="42" stroke="url(#gradient)" strokeDasharray="264" strokeDashoffset={offset} strokeLinecap="round" strokeWidth="8"></circle>
                        <defs>
                            <linearGradient id="gradient" x1="0%" x2="100%" y1="0%" y2="0%">
                                <stop offset="0%" stopColor="#2b8cee"></stop>
                                <stop offset="100%" stopColor="#a855f7"></stop>
                            </linearGradient>
                        </defs>
                    </svg>
                    {/* Inner Content Glass */}
                    <div className="absolute inset-4 rounded-full glass-panel bg-glass-surface dark:bg-glass-surface-dark shadow-inner-glow flex flex-col items-center justify-center z-10">
                        <MdLocalFireDepartment className="text-primary mb-1 text-3xl" />
                        <h2 className="text-4xl font-bold text-slate-800 dark:text-white tracking-tighter">
                            {Math.round(caloriesLeft).toLocaleString('en-US')}
                        </h2>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Kcal Left</p>
                        <div className="mt-2 text-xs text-slate-400 bg-white/50 dark:bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
                            Goal: {goalCalories.toLocaleString('en-US')}
                        </div>
                    </div>
                </div>
            </section>

            {/* Macros Section */}
            <section>
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Macronutrients</h3>
                    <button className="text-sm text-primary font-medium hover:text-primary/80 transition-colors">Details</button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    {/* Protein Card */}
                    <div className="glass-panel bg-white/60 dark:bg-slate-800/40 p-5 rounded-3xl shadow-glass hover:scale-[1.02] transition-transform duration-300 cursor-pointer group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
                                    <MdEgg className="text-2xl" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Protein</p>
                                    <p className="text-xl font-bold text-slate-800 dark:text-white">
                                        {Math.round(protein)}g <span className="text-sm font-normal text-slate-400">/ {proteinGoal}g</span>
                                    </p>
                                </div>
                            </div>
                            <span className="text-sm font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
                                {proteinGoal > 0 ? Math.round((protein / proteinGoal) * 100) : 0}%
                            </span>
                        </div>
                        <div className="h-4 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full rounded-full bar-3d from-blue-500 to-blue-400 group-hover:brightness-110 transition-all duration-500"
                                style={{ background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)', width: getBarWidth(protein, proteinGoal) }}
                            ></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Carbs Card */}
                        <div className="glass-panel bg-white/60 dark:bg-slate-800/40 p-5 rounded-3xl shadow-glass hover:scale-[1.02] transition-transform duration-300 cursor-pointer group">
                            <div className="flex flex-col gap-3 mb-2">
                                <div className="flex justify-between items-start">
                                    <div className="bg-amber-100 dark:bg-amber-900/30 p-2.5 rounded-xl text-amber-600 dark:text-amber-400 w-fit">
                                        <MdBakeryDining className="text-2xl" />
                                    </div>
                                    <span className="text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
                                        {carbsGoal > 0 ? Math.round((carbs / carbsGoal) * 100) : 0}%
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Carbs</p>
                                    <p className="text-lg font-bold text-slate-800 dark:text-white">{Math.round(carbs)}g</p>
                                    <p className="text-xs text-slate-400">/ {carbsGoal}g goal</p>
                                </div>
                            </div>
                            <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden shadow-inner mt-2">
                                <div
                                    className="h-full rounded-full bar-3d group-hover:brightness-110 transition-all duration-500"
                                    style={{ background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)', boxShadow: '2px 2px 5px rgba(245, 158, 11, 0.2)', width: getBarWidth(carbs, carbsGoal) }}
                                ></div>
                            </div>
                        </div>

                        {/* Fats Card */}
                        <div className="glass-panel bg-white/60 dark:bg-slate-800/40 p-5 rounded-3xl shadow-glass hover:scale-[1.02] transition-transform duration-300 cursor-pointer group">
                            <div className="flex flex-col gap-3 mb-2">
                                <div className="flex justify-between items-start">
                                    <div className="bg-rose-100 dark:bg-rose-900/30 p-2.5 rounded-xl text-rose-600 dark:text-rose-400 w-fit">
                                        <MdOpacity className="text-2xl" />
                                    </div>
                                    <span className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-lg">
                                        {fatGoal > 0 ? Math.round((fat / fatGoal) * 100) : 0}%
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Fats</p>
                                    <p className="text-lg font-bold text-slate-800 dark:text-white">{Math.round(fat)}g</p>
                                    <p className="text-xs text-slate-400">/ {fatGoal}g goal</p>
                                </div>
                            </div>
                            <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden shadow-inner mt-2">
                                <div
                                    className="h-full rounded-full bar-3d group-hover:brightness-110 transition-all duration-500"
                                    style={{ background: 'linear-gradient(90deg, #f43f5e 0%, #fb7185 100%)', boxShadow: '2px 2px 5px rgba(244, 63, 94, 0.2)', width: getBarWidth(fat, fatGoal) }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Recent Activity Teaser */}
            <section className="pb-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 px-1">Last Logged</h3>
                {lastItem ? (
                    <div
                        onClick={() => handleEdit(lastItem)}
                        className="glass-panel bg-white/40 dark:bg-slate-800/20 p-4 rounded-3xl flex items-center gap-4 cursor-pointer hover:bg-white/50 transition-colors"
                    >
                        <div className="size-14 rounded-2xl bg-gray-200 flex items-center justify-center text-2xl text-gray-500 shadow-sm shrink-0">
                            {/* Placeholder icon */}
                            <MdRestaurant className="text-3xl" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-base font-semibold text-slate-800 dark:text-white truncate">{lastItem.productName}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {mounted && lastItem.createdAt?.toDate ? format(lastItem.createdAt.toDate(), 'h:mm a') : 'Just now'}
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <span className="block text-primary font-bold text-lg">{Math.round(lastItem.calories)}</span>
                            <span className="text-xs text-slate-400 uppercase font-medium">kcal</span>
                        </div>
                    </div>
                ) : (
                    <div className="glass-panel bg-white/40 dark:bg-slate-800/20 p-4 rounded-3xl flex items-center justify-center text-slate-500 text-sm">
                        No food logged today.
                    </div>
                )}
            </section>
        </main>

        {/* Floating Bottom Navigation */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[360px]">
            <div className="glass-panel bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-full px-6 py-4 shadow-2xl flex justify-between items-center">
                <Link href="/" className="flex flex-col items-center gap-1 group w-12 cursor-pointer">
                    <MdDashboard className="text-primary font-semibold text-[26px] group-hover:scale-110 transition-transform" />
                    <span className="w-1 h-1 bg-primary rounded-full"></span>
                </Link>
                <Link href="/progress" className="flex flex-col items-center gap-1 group w-12 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer">
                    <MdAnalytics className="text-[26px]" />
                </Link>
                {/* Floating Action Button (Center) */}
                <div className="relative -top-8 group">
                    <div className="absolute inset-0 bg-primary blur-lg opacity-40 group-hover:opacity-60 transition-opacity rounded-full"></div>
                    <button
                        onClick={() => setIsAddFoodOpen(true)}
                        className="relative bg-gradient-to-br from-primary to-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-all duration-300 border-4 border-white dark:border-slate-900"
                    >
                        <MdAdd className="text-3xl" />
                    </button>
                </div>
                <Link href="/diary" className="flex flex-col items-center gap-1 group w-12 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer">
                    <MdRestaurantMenu className="text-[26px]" />
                </Link>
                <Link href="/profile" className="flex flex-col items-center gap-1 group w-12 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer">
                    <MdPerson className="text-[26px]" />
                </Link>
            </div>
        </nav>

        {/* Sheets */}
        <AnimatePresence>
            {isAddFoodOpen && userProfile && (
              <AddFoodSheet
                  isOpen={isAddFoodOpen}
                  setIsOpen={setIsAddFoodOpen}
                  selectedDate={selectedDateString}
                  userProfile={userProfile}
                  selectedLog={dailyLog || null}
                  isLogLoading={isLogLoading}
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
