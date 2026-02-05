'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Beef, Wheat as WheatIcon, Droplets, Flame, Target } from 'lucide-react';
import type { DailyLog, DailyLogItem } from '@/lib/types';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CyberFlame, BouncyActivity, QuantumFood } from './animated-icons';

export function DailySummary() {
  const { firestore, user, userProfile } = useFirebase();
  const today = format(new Date(), 'yyyy-MM-dd');

  const dailyLogQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `users/${user.uid}/dailyLogs`),
      where('date', '==', today)
    );
  }, [firestore, user, today]);

  const { data: dailyLogs } = useCollection<DailyLog>(dailyLogQuery);
  const dailyLog = dailyLogs?.[0];

  // Fetch items to calculate macros since they might not be on the dailyLog document
  const itemsQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return query(collection(firestore, `users/${user.uid}/dailyLogs/${today}/items`));
  }, [firestore, user, today]);

  const { data: items } = useCollection<DailyLogItem>(itemsQuery);

  const totals = useMemo(() => {
    const consumed = dailyLog?.consumedCalories || 0; // Use aggregate if available for calories
    const active = dailyLog?.activeCalories || 0;

    // Calculate macros from items
    const protein = items?.reduce((acc, item) => acc + (item.protein || 0), 0) || 0;
    const carbs = items?.reduce((acc, item) => acc + (item.carbs || 0), 0) || 0;
    const fat = items?.reduce((acc, item) => acc + (item.fat || 0), 0) || 0;

    return {
      totalCalories: consumed,
      totalProtein: Math.round(protein),
      totalCarbohydrates: Math.round(carbs),
      totalFat: Math.round(fat),
      activeCalories: active,
    };
  }, [dailyLog, items]);

  // Goals (default to 2000 if not set)
  const calorieGoal = userProfile?.maintenanceCalories ? userProfile.maintenanceCalories - (userProfile.deficitTarget || 500) : 2000;

  // Macro goals (from profile or defaults)
  const proteinGoal = userProfile?.dailyProtein || Math.round((calorieGoal * 0.3) / 4);
  const carbsGoal = userProfile?.dailyCarbs || Math.round((calorieGoal * 0.4) / 4);
  const fatGoal = userProfile?.dailyFat || Math.round((calorieGoal * 0.3) / 9);

  const caloriesRemaining = (calorieGoal + totals.activeCalories) - totals.totalCalories;
  const progressPercentage = Math.min(100, (totals.totalCalories / (calorieGoal + totals.activeCalories)) * 100);

  return (
    <div className="space-y-4">
    <Card className="glass-card border-white/20 overflow-visible relative z-10">
      <CardHeader className="pb-2 border-b border-white/10">
        <CardTitle className="text-lg font-black text-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
                <CyberFlame className="h-6 w-6 text-primary" />
                Daily Fuel
            </span>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest bg-white/30 px-2 py-1 rounded-lg backdrop-blur-sm">
                {format(new Date(), 'EEEE, MMM d')}
            </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-8">
        {/* Main Calorie Ring / Display */}
        <div className="flex flex-col items-center justify-center relative">
             <div className="w-full flex items-end justify-between px-4 mb-2">
                 <div className="flex flex-col items-center">
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Goal</span>
                    <span className="text-xl font-black text-foreground">{calorieGoal}</span>
                 </div>
                 <div className="flex flex-col items-center pb-1">
                    <span className="text-xs font-bold text-muted-foreground">+ {totals.activeCalories} Active</span>
                 </div>
             </div>

             <div className="w-full h-8 bg-slate-100/50 rounded-full overflow-hidden relative border border-slate-200/50 shadow-inner">
                <div
                    className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-1000 ease-out relative"
                    style={{ width: `${progressPercentage}%` }}
                >
                    <div className="absolute top-0 right-0 bottom-0 w-full bg-white/20 animate-shimmer" />
                </div>
             </div>

             <div className="mt-4 flex flex-col items-center">
                <span className="text-sm font-bold text-muted-foreground mb-1">Remaining</span>
                <span className={cn(
                    "text-5xl font-black tracking-tight drop-shadow-sm",
                    caloriesRemaining < 0 ? "text-rose-500" : "text-primary"
                )}>
                    {caloriesRemaining}
                </span>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">kcal</span>
             </div>

             {/* Consumed Tag */}
              <div className="absolute top-24 -right-2 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/40 shadow-lg rotate-3 transform hover:rotate-0 transition-transform cursor-default">
                <div className="text-[10px] uppercase font-bold tracking-tight text-muted-foreground">Consumed</div>
                <div className="text-lg font-black text-foreground">{totals.totalCalories.toLocaleString()}</div>
              </div>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Protein */}
            <div className="group bg-blue-50/30 p-4 rounded-3xl border border-blue-100/50 hover:bg-blue-50/50 transition-all duration-300">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-100/50 rounded-xl group-hover:scale-110 transition-transform">
                                <Beef className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-wider text-blue-900/60">Protein</span>
                        </div>
                        <span className="text-sm font-black text-blue-900">{totals.totalProtein}g</span>
                    </div>
                    <Progress value={proteinGoal > 0 ? (totals.totalProtein / proteinGoal) * 100 : 0} className="h-2.5 rounded-full bg-blue-100/50 [&>div]:bg-blue-500" />
                    <span className="text-[10px] text-blue-400 text-right font-bold">Target: {proteinGoal}g</span>
                </div>
            </div>

            {/* Carbs */}
            <div className="group bg-amber-50/30 p-4 rounded-3xl border border-amber-100/50 hover:bg-amber-50/50 transition-all duration-300">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                             <div className="p-2 bg-amber-100/50 rounded-xl group-hover:scale-110 transition-transform">
                                <WheatIcon className="h-4 w-4 text-amber-600" />
                             </div>
                            <span className="text-xs font-black uppercase tracking-wider text-amber-900/60">Carbs</span>
                        </div>
                        <span className="text-sm font-black text-amber-900">{totals.totalCarbohydrates}g</span>
                    </div>
                    <Progress value={carbsGoal > 0 ? (totals.totalCarbohydrates / carbsGoal) * 100 : 0} className="h-2.5 rounded-full bg-amber-100/50 [&>div]:bg-amber-500" />
                    <span className="text-[10px] text-amber-400 text-right font-bold">Target: {carbsGoal}g</span>
                </div>
            </div>

            {/* Fat */}
            <div className="group bg-rose-50/30 p-4 rounded-3xl border border-rose-100/50 hover:bg-rose-50/50 transition-all duration-300">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                             <div className="p-2 bg-rose-100/50 rounded-xl group-hover:scale-110 transition-transform">
                                <Droplets className="h-4 w-4 text-rose-600" />
                             </div>
                            <span className="text-xs font-black uppercase tracking-wider text-rose-900/60">Fat</span>
                        </div>
                        <span className="text-sm font-black text-rose-900">{totals.totalFat}g</span>
                    </div>
                    <Progress value={fatGoal > 0 ? (totals.totalFat / fatGoal) * 100 : 0} className="h-2.5 rounded-full bg-rose-100/50 [&>div]:bg-rose-500" />
                    <span className="text-[10px] text-rose-400 text-right font-bold">Target: {fatGoal}g</span>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
