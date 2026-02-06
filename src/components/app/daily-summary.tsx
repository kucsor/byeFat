'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { Activity, Apple, Zap } from 'lucide-react';
import type { DailyLog, DailyLogItem } from '@/lib/types';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { MacrosDisplay } from './macros-display';

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

  const { data: dailyLogs } = useCollection<DailyLog>(dailyLogQuery);
  const dailyLog = dailyLogs?.[0];

  // Fetch items to calculate macros/calories if needed
  const itemsQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return query(collection(firestore, `users/${user.uid}/dailyLogs/${dateString}/items`));
  }, [firestore, user, dateString]);

  const { data: items } = useCollection<DailyLogItem>(itemsQuery);

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
  // Target "Eaten" = Maintenance - Deficit + Active
  // But wait, the Ring is "Circular Deficit Tracker".
  // Label: "TOTAL DEFICIT".
  // Value: (Maintenance + Active) - Consumed.

  const totalBurned = maintenance + totals.active;
  const currentDeficit = totalBurned - totals.consumed;

  // Progress Ring Logic
  // If Deficit > Target, full circle? Or relative?
  // Usually ring represents "Calories Remaining" or "Deficit Progress".
  // If the goal is 500 deficit, and we are at 1109, we are overachieving (good).
  // Let's assume the ring fills up as we reach the deficit target.
  // Target: 500. Current: 1109. Percentage = 100% (saturated).
  // Or maybe the ring represents "Calories Eaten" vs "Limit".
  // The prompt says: "Ring progress chart central (circular deficit tracker) ... Label: TOTAL DEFICIT ... Value: 1109 ... Target: 500 kcal".
  // So the main number is Deficit.
  // The ring should probably visualize Deficit vs Target.

  const progressPercentage = Math.min(100, Math.max(0, (currentDeficit / deficitTarget) * 100));

  // SVG Config
  const size = 280;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardContent className="p-0 flex flex-col items-center">
        {/* Ring Chart */}
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            {/* SVG Ring */}
            <svg width={size} height={size} className="transform -rotate-90">
                <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0066FF" />
                        <stop offset="100%" stopColor="#60A5FA" />
                    </linearGradient>
                </defs>
                {/* Track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#E2E8F0"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                />
                {/* Progress */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="url(#progressGradient)"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>

            {/* Center Info */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Deficit</span>
                <span className={cn(
                    "text-6xl font-bold tracking-tighter text-foreground font-sans",
                    currentDeficit < 0 && "text-destructive"
                )}>
                    {Math.round(currentDeficit)}
                </span>
                <span className="text-sm font-medium text-muted-foreground mt-1">
                    Target: {deficitTarget} kcal
                </span>
            </div>
        </div>

        {/* Sub Info */}
        <div className="flex w-full mt-6 gap-4">
            <div className="flex-1 bg-card rounded-2xl p-4 flex items-center justify-between border border-border/50 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-full">
                        <Zap className="h-5 w-5 fill-current" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active</span>
                        <span className="text-lg font-bold text-foreground">{totals.active}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-card rounded-2xl p-4 flex items-center justify-between border border-border/50 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full">
                        <Apple className="h-5 w-5 fill-current" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Food</span>
                        <span className="text-lg font-bold text-foreground">{Math.round(totals.consumed)}</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-6 w-full flex justify-center">
             <MacrosDisplay
                 fat={Math.round(macros.fat)}
                 protein={Math.round(macros.protein)}
                 carbohydrates={Math.round(macros.carbs)}
                 goalFat={userProfile?.dailyFat}
                 goalProtein={userProfile?.dailyProtein}
                 goalCarbs={userProfile?.dailyCarbs}
             />
        </div>
      </CardContent>
    </Card>
  );
}
