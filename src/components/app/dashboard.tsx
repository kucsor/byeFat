'use client';

import { BottomNav } from './bottom-nav';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useState, useMemo, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { DailyLog, DailyLogItem, DailyLogActivity } from '@/lib/types';
import dynamic from 'next/dynamic';
import { LazyMotion, domAnimation, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Bell, Flame, Egg, Croissant, Droplet } from 'lucide-react';
import Link from 'next/link';

// Dynamic imports for sheets
const AddFoodSheet = dynamic(() => import('./add-food-sheet').then(mod => mod.AddFoodSheet));

// Styles from the HTML (converted to Tailwind string)
const GLASS_PANEL = "backdrop-blur-md border border-white/40 dark:border-white/10 bg-white/60 dark:bg-slate-800/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]";

export default function Dashboard() {
  const { userProfile, firestore, user } = useFirebase();

  // Sheet states
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
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

  const { data: dailyLogs } = useCollection<DailyLog>(dailyLogQuery);
  const selectedLog = dailyLogs?.[0] || null;

  // Fetch Items Subcollection (for Macros calculation and recent activity)
  const itemsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `users/${user.uid}/dailyLogs/${selectedDateString}/items`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user, selectedDateString]);

  const { data: items } = useCollection<DailyLogItem>(itemsQuery);

  // Calculate Macros
  const macros = useMemo(() => {
      let p = 0, c = 0, f = 0;
      items?.forEach(item => {
          p += item.protein || 0;
          c += item.carbs || 0;
          f += item.fat || 0;
      });
      return { p, c, f };
  }, [items]);

  // Calories Logic
  const goalCalories = selectedLog?.goalCalories || userProfile?.dailyCalories || 2000;
  const consumedCalories = selectedLog?.consumedCalories || 0;
  const activeCalories = selectedLog?.activeCalories || 0;
  const netCalories = consumedCalories - activeCalories;
  const caloriesLeft = Math.round(goalCalories - netCalories);

  // Ring Progress
  const radius = 42;
  const circumference = 2 * Math.PI * radius; // ~263.89
  const percentage = Math.min(Math.max(netCalories / goalCalories, 0), 1);
  const strokeDashoffset = circumference - (percentage * circumference);

  // Last Logged Item
  const lastLogged = items && items.length > 0 ? items[0] : null;

  // Listen for Add Menu Event from BottomNav
  useEffect(() => {
      const handleOpenAdd = () => setIsAddFoodOpen(true);
      window.addEventListener('open-add-menu', handleOpenAdd);
      return () => window.removeEventListener('open-add-menu', handleOpenAdd);
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <div className="bg-[#f6f7f8] dark:bg-[#101922] min-h-screen relative overflow-x-hidden font-sans text-slate-800 dark:text-slate-100 pb-24 selection:bg-[#2b8cee]/30">

        {/* Background Blobs */}
        <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#2b8cee]/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="fixed bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-400/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

        <div className="relative z-10 flex flex-col min-h-screen pb-24 max-w-md mx-auto bg-white/5 dark:bg-black/5 backdrop-blur-[2px] shadow-2xl">

            {/* Header */}
            <header className="flex items-center justify-between p-6 pt-8">
                <div className="flex items-center gap-3">
                    <div className="relative group cursor-pointer">
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#2b8cee] to-purple-400 rounded-full blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
                        {user?.photoURL ? (
                             <img
                                alt="Profile"
                                className="relative size-10 rounded-full object-cover border-2 border-white/50 dark:border-white/20"
                                src={user.photoURL}
                             />
                        ) : (
                             <div className="relative size-10 rounded-full bg-slate-200 flex items-center justify-center border-2 border-white/50 dark:border-white/20">
                                <span className="text-xs font-bold text-slate-500">{userProfile?.name?.charAt(0) || 'U'}</span>
                             </div>
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hello,</p>
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white leading-none">{userProfile?.name?.split(' ')[0] || 'User'}</h2>
                    </div>
                </div>
                <button className={`relative ${GLASS_PANEL} rounded-full p-2.5 transition-transform active:scale-95 group`}>
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-800 z-10"></span>
                    <Bell className="text-slate-600 dark:text-slate-300 w-[22px] h-[22px] group-hover:text-[#2b8cee] transition-colors" />
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 px-6 flex flex-col gap-8">

                {/* Date Selector */}
                <div className="flex justify-center items-center gap-4">
                    <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <ChevronLeft className="text-slate-400" />
                    </button>
                    <div className="text-center">
                        <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-slate-700 via-slate-500 to-slate-700 dark:from-slate-200 dark:via-slate-400 dark:to-slate-200">
                            {format(selectedDate, 'eee, MMM d')}
                        </h1>
                    </div>
                    <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                         <ChevronRight className="text-slate-400" />
                    </button>
                </div>

                {/* Hero Section: Calorie Ring */}
                <section className="relative flex justify-center py-4">
                    <div className="relative w-64 h-64">
                        {/* Background Circle */}
                        <div className="absolute inset-0 rounded-full border-[16px] border-slate-100 dark:border-slate-800/50"></div>

                        {/* Progress Circle (SVG) */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90 transform drop-shadow-[0_0_20px_rgba(43,140,238,0.3)]" viewBox="0 0 100 100">
                            <circle
                                cx="50" cy="50" r={radius} fill="transparent" stroke="url(#gradient)" strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                className="transition-all duration-1000 ease-out"
                            ></circle>
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#2b8cee" />
                                    <stop offset="100%" stopColor="#a855f7" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Inner Content Glass */}
                        <div className={`absolute inset-4 rounded-full ${GLASS_PANEL} flex flex-col items-center justify-center z-10`}>
                            <Flame className="text-[#2b8cee] mb-1 w-8 h-8 fill-current" />
                            <h2 className="text-4xl font-bold text-slate-800 dark:text-white tracking-tighter tabular-nums">
                                {caloriesLeft.toLocaleString()}
                            </h2>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Kcal Left</p>
                            <div className="mt-2 text-xs text-slate-400 bg-white/50 dark:bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
                                Goal: {goalCalories.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Macros Section */}
                <section>
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Macronutrients</h3>
                        <Link href="/progress" className="text-sm text-[#2b8cee] font-medium hover:text-[#2b8cee]/80 transition-colors">Details</Link>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                         {/* Protein Card */}
                         <div className={`${GLASS_PANEL} p-5 rounded-3xl hover:scale-[1.02] transition-transform duration-300 cursor-pointer group`}>
                             <div className="flex justify-between items-start mb-4">
                                 <div className="flex items-center gap-3">
                                     <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
                                         <Egg className="w-5 h-5" />
                                     </div>
                                     <div>
                                         <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Protein</p>
                                         <p className="text-xl font-bold text-slate-800 dark:text-white">
                                            {Math.round(macros.p)}g <span className="text-sm font-normal text-slate-400">/ {userProfile?.dailyProtein || 150}g</span>
                                         </p>
                                     </div>
                                 </div>
                                 <span className="text-sm font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
                                     {Math.round((macros.p / (userProfile?.dailyProtein || 150)) * 100)}%
                                 </span>
                             </div>
                             <div className="h-4 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden shadow-inner">
                                 <div
                                    className="h-full rounded-full group-hover:brightness-110 transition-all duration-500 relative"
                                    style={{
                                        width: `${Math.min((macros.p / (userProfile?.dailyProtein || 150)) * 100, 100)}%`,
                                        background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
                                        boxShadow: '2px 2px 5px rgba(43, 140, 238, 0.2)'
                                    }}
                                 >
                                    <div className="absolute right-0 top-0 w-1 h-full bg-black/10 rounded-r-full" />
                                 </div>
                             </div>
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                             {/* Carbs Card */}
                             <div className={`${GLASS_PANEL} p-5 rounded-3xl hover:scale-[1.02] transition-transform duration-300 cursor-pointer group`}>
                                 <div className="flex flex-col gap-3 mb-2">
                                     <div className="flex justify-between items-start">
                                         <div className="bg-amber-100 dark:bg-amber-900/30 p-2.5 rounded-xl text-amber-600 dark:text-amber-400 w-fit">
                                             <Croissant className="w-5 h-5" />
                                         </div>
                                         <span className="text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
                                            {Math.round((macros.c / (userProfile?.dailyCarbs || 250)) * 100)}%
                                         </span>
                                     </div>
                                     <div>
                                         <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Carbs</p>
                                         <p className="text-lg font-bold text-slate-800 dark:text-white">{Math.round(macros.c)}g</p>
                                         <p className="text-xs text-slate-400">/ {userProfile?.dailyCarbs || 250}g goal</p>
                                     </div>
                                 </div>
                                 <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden shadow-inner mt-2">
                                     <div
                                        className="h-full rounded-full group-hover:brightness-110 transition-all duration-500 relative"
                                        style={{
                                            width: `${Math.min((macros.c / (userProfile?.dailyCarbs || 250)) * 100, 100)}%`,
                                            background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)',
                                            boxShadow: '2px 2px 5px rgba(245, 158, 11, 0.2)'
                                        }}
                                     ></div>
                                 </div>
                             </div>

                             {/* Fats Card */}
                             <div className={`${GLASS_PANEL} p-5 rounded-3xl hover:scale-[1.02] transition-transform duration-300 cursor-pointer group`}>
                                 <div className="flex flex-col gap-3 mb-2">
                                     <div className="flex justify-between items-start">
                                         <div className="bg-rose-100 dark:bg-rose-900/30 p-2.5 rounded-xl text-rose-600 dark:text-rose-400 w-fit">
                                             <Droplet className="w-5 h-5" />
                                         </div>
                                         <span className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-lg">
                                            {Math.round((macros.f / (userProfile?.dailyFat || 65)) * 100)}%
                                         </span>
                                     </div>
                                     <div>
                                         <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Fats</p>
                                         <p className="text-lg font-bold text-slate-800 dark:text-white">{Math.round(macros.f)}g</p>
                                         <p className="text-xs text-slate-400">/ {userProfile?.dailyFat || 65}g goal</p>
                                     </div>
                                 </div>
                                 <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden shadow-inner mt-2">
                                     <div
                                        className="h-full rounded-full group-hover:brightness-110 transition-all duration-500 relative"
                                        style={{
                                            width: `${Math.min((macros.f / (userProfile?.dailyFat || 65)) * 100, 100)}%`,
                                            background: 'linear-gradient(90deg, #f43f5e 0%, #fb7185 100%)',
                                            boxShadow: '2px 2px 5px rgba(244, 63, 94, 0.2)'
                                        }}
                                     ></div>
                                 </div>
                             </div>
                         </div>
                    </div>
                </section>

                {/* Recent Activity Teaser */}
                <section className="pb-6">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 px-1">Last Logged</h3>
                    {lastLogged ? (
                        <Link href="/diary">
                        <div className={`${GLASS_PANEL} p-4 rounded-3xl flex items-center gap-4 hover:scale-[1.02] transition-transform`}>
                             <div className="size-14 rounded-2xl bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-500 shadow-sm shrink-0">
                                {lastLogged.productName.charAt(0)}
                             </div>
                             <div className="flex-1 min-w-0">
                                 <h4 className="text-base font-semibold text-slate-800 dark:text-white truncate">{lastLogged.productName}</h4>
                                 <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {lastLogged.createdAt?.toDate ? lastLogged.createdAt.toDate().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Just now'}
                                 </p>
                             </div>
                             <div className="text-right">
                                 <span className="block text-[#2b8cee] font-bold text-lg">{lastLogged.calories}</span>
                                 <span className="text-xs text-slate-400 uppercase font-medium">kcal</span>
                             </div>
                        </div>
                        </Link>
                    ) : (
                        <div className={`${GLASS_PANEL} p-4 rounded-3xl flex items-center justify-center text-slate-400 text-sm`}>
                            No items logged today
                        </div>
                    )}
                </section>

            </main>

            <BottomNav />
        </div>

        {/* Sheets */}
        <AnimatePresence>
            {isAddFoodOpen && userProfile && (
              <AddFoodSheet
                  isOpen={isAddFoodOpen}
                  setIsOpen={setIsAddFoodOpen}
                  selectedDate={selectedDateString}
                  userProfile={userProfile}
                  selectedLog={selectedLog}
                  isLogLoading={isLogLoading}
              />
            )}
        </AnimatePresence>

      </div>
    </LazyMotion>
  );
}
