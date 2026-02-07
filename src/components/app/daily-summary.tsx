'use client';

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { Apple, Zap } from 'lucide-react';
import type { DailyLog, DailyLogItem } from '@/lib/types';
import { useMemo, useId } from 'react';
import { cn } from '@/lib/utils';
import { MacrosDisplay } from './macros-display';
import { Skeleton } from '@/components/ui/skeleton';

interface DailySummaryProps {
  date: Date;
}

export function DailySummary({ date }: DailySummaryProps) {
  const { firestore, user, userProfile } = useFirebase();
  const dateString = format(date, 'yyyy-MM-dd');

  const dailyLogQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `users/${user.uid}/dailyLogs`),
      where('date', '==', dateString)
    );
  }, [firestore, user, dateString]);

  const { data: dailyLogs, isLoading: isLogLoading } = useCollection<DailyLog>(dailyLogQuery);
  const dailyLog = dailyLogs?.[0];

  // Fetch items to calculate macros/calories if needed
  const itemsQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return query(collection(firestore, `users/${user.uid}/dailyLogs/${dateString}/items`));
  }, [firestore, user, dateString]);

  const { data: items, isLoading: isItemsLoading } = useCollection<DailyLogItem>(itemsQuery);

  const isLoading = isLogLoading || isItemsLoading;

  const totals = useMemo(() => {
    const consumed = dailyLog?.consumedCalories || 0;
    const active = dailyLog?.activeCalories || 0;
    return {
      consumed,
      active,
    };
  }, [dailyLog]);

  const macros = useMemo(() => {
    if (!items) return { fat: 0, protein: 0, carbs: 0 };
    return items.reduce((acc, item) => ({
      fat: acc.fat + (item.fat || 0),
      protein: acc.protein + (item.protein || 0),
      carbs: acc.carbs + (item.carbs || 0),
    }), { fat: 0, protein: 0, carbs: 0 });
  }, [items]);

  const maintenance = userProfile?.maintenanceCalories || 2000;
  const deficitTarget = userProfile?.deficitTarget || 500;

  const totalBurned = maintenance + totals.active;
  const currentDeficit = totalBurned - totals.consumed;

  const progressPercentage = Math.min(100, Math.max(0, (currentDeficit / deficitTarget) * 100));

  // SVG Config
  const size = 260; // Slightly smaller to fit padding
  const strokeWidth = 16; // Thicker for modern look
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  const id = useId();
  const gradientId = `gradient-${id.replace(/:/g, '')}`;
  const filterId = `filter-${id.replace(/:/g, '')}`;

  if (isLoading) {
      return (
          <div className="flex flex-col h-full w-full p-6 space-y-6">
              <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="flex-1 flex items-center justify-center">
                  <Skeleton className="h-[260px] w-[260px] rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-6">
                  <Skeleton className="h-20 w-full rounded-2xl" />
                  <Skeleton className="h-20 w-full rounded-2xl" />
              </div>
              <div className="mt-4 pt-4 border-t border-dashed border-border/50">
                  <Skeleton className="h-12 w-full rounded-xl" />
              </div>
          </div>
      )
  }

  return (
    <div className="flex flex-col h-full w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold tracking-tight text-foreground">Daily Summary</h2>
            <div className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    Target: {deficitTarget}
                </span>
            </div>
        </div>

        {/* Ring Chart Container */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[280px] relative">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-full blur-3xl opacity-50 pointer-events-none" />

            <div className="relative flex items-center justify-center transition-transform hover:scale-[1.02] duration-500 ease-out cursor-default">
                {/* SVG Ring */}
                <svg width={size} height={size} className="transform -rotate-90 drop-shadow-lg">
                    <defs>
                        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#3B82F6" /> {/* Blue-500 */}
                            <stop offset="100%" stopColor="#60A5FA" /> {/* Blue-400 */}
                        </linearGradient>
                        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    {/* Track */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeLinecap="round"
                        className="text-muted/10"
                    />
                    {/* Progress */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={`url(#${gradientId})`}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                        style={{ filter: `url(#${filterId})` }}
                    />
                </svg>

                {/* Center Info */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-80">Total Deficit</span>
                    <span className={cn(
                        "text-6xl font-black tracking-tighter text-foreground font-sans tabular-nums",
                        currentDeficit < 0 && "text-destructive"
                    )}>
                        {Math.round(currentDeficit)}
                    </span>
                    <div className="flex items-center gap-1.5 mt-2 px-3 py-1 bg-background/50 backdrop-blur-md rounded-full border border-border/50 shadow-sm">
                        <div className={cn("w-2 h-2 rounded-full animate-pulse", currentDeficit >= deficitTarget ? "bg-emerald-500" : "bg-blue-500")} />
                        <span className="text-xs font-medium text-muted-foreground">
                            {progressPercentage >= 100 ? 'Target Reached' : `${Math.round(progressPercentage)}% of Goal`}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* Sub Info Grid - Bento within Bento */}
        <div className="grid grid-cols-2 gap-3 mt-6">
            {/* Active Card */}
            <div className="group relative overflow-hidden bg-orange-50/50 hover:bg-orange-50 transition-colors rounded-2xl p-4 border border-orange-100/50">
                <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-white rounded-xl shadow-sm border border-orange-100 group-hover:scale-110 transition-transform duration-300">
                         <Zap className="h-4 w-4 text-orange-500 fill-orange-500" />
                    </div>
                    <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Active</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-2xl font-black text-gray-900 tabular-nums tracking-tight">
                        {totals.active}
                    </span>
                    <span className="text-xs text-orange-600/70 font-medium">calories burned</span>
                </div>
            </div>

            {/* Food Card */}
            <div className="group relative overflow-hidden bg-emerald-50/50 hover:bg-emerald-50 transition-colors rounded-2xl p-4 border border-emerald-100/50">
                <div className="flex items-center justify-between mb-2">
                     <div className="p-2 bg-white rounded-xl shadow-sm border border-emerald-100 group-hover:scale-110 transition-transform duration-300">
                         <Apple className="h-4 w-4 text-emerald-500 fill-emerald-500" />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Food</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-2xl font-black text-gray-900 tabular-nums tracking-tight">
                        {Math.round(totals.consumed)}
                    </span>
                    <span className="text-xs text-emerald-600/70 font-medium">calories eaten</span>
                </div>
            </div>
        </div>

        {/* Macros - Styled Container */}
        <div className="mt-4 pt-4 border-t border-dashed border-border/50">
             <MacrosDisplay
                 fat={Math.round(macros.fat)}
                 protein={Math.round(macros.protein)}
                 carbohydrates={Math.round(macros.carbs)}
                 goalFat={userProfile?.dailyFat}
                 goalProtein={userProfile?.dailyProtein}
                 goalCarbs={userProfile?.dailyCarbs}
             />
        </div>
    </div>
  );
}
