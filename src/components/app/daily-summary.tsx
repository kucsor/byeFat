'use client';

import { useMemo } from 'react';
import type { DailyLog, DailyLogItem, DailyLogActivity, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { cn } from '@/lib/utils';
import { Beef, Wheat as WheatIcon, Droplets, Flame, Soup } from 'lucide-react';
import { motion } from 'framer-motion';

type DailySummaryProps = {
  foodItems?: DailyLogItem[] | null;
  activities?: DailyLogActivity[] | null;
  userProfile: UserProfile;
  selectedLog: DailyLog | null;
};

export function DailySummary({ foodItems, activities, userProfile, selectedLog }: DailySummaryProps) {
  const baseGoal = selectedLog?.goalCalories ?? userProfile?.dailyCalories ?? 0;
  
  // Calculate maintenance calories if not saved in profile
  const calculatedMaintenance = useMemo(() => {
    if (userProfile?.maintenanceCalories) return userProfile.maintenanceCalories;
    if (userProfile?.gender && userProfile?.age && userProfile?.weight && userProfile?.height) {
      const { gender, age, weight, height } = userProfile;
      const bmr = (10 * weight) + (6.25 * height) - (5 * age) + (gender === 'male' ? 5 : -161);
      return Math.round(bmr * 1.2);
    }
    return baseGoal;
  }, [userProfile, baseGoal]);
  
  const maintenanceCalories = calculatedMaintenance;
  const deficitTarget = userProfile?.deficitTarget ?? 500;

  const totals = useMemo(() => {
    const foodTotals = foodItems?.reduce(
      (acc, item) => {
        acc.totalCalories += item.calories;
        acc.totalFat += item.fat;
        acc.totalProtein += item.protein;
        acc.totalCarbohydrates += item.carbs;
        return acc;
      },
      { totalCalories: 0, totalFat: 0, totalProtein: 0, totalCarbohydrates: 0 }
    ) ?? { totalCalories: 0, totalFat: 0, totalProtein: 0, totalCarbohydrates: 0 };

    const activeCalories = activities?.reduce((acc, activity) => acc + activity.calories, 0) ?? 0;

    return { ...foodTotals, activeCalories };
  }, [foodItems, activities]);
  
  // Calculate caloric deficit
  const totalBurned = maintenanceCalories + totals.activeCalories; // Maintenance + exercise
  const caloricDeficit = Math.round(totalBurned - totals.totalCalories); // Positive = losing weight
  
  // Target Active = Maintenance - Deficit Target + Active Calories
  // This is the actual calorie goal for the day
  const targetActive = maintenanceCalories - deficitTarget + totals.activeCalories;
  
  // For the ring chart - show progress toward target
  const dynamicGoal = targetActive > 0 ? targetActive : 0;
  const calorieProgress = dynamicGoal > 0 ? (totals.totalCalories / dynamicGoal) * 100 : 0;

  // Display values for the ring
  const displayValue = Math.abs(caloricDeficit);
  const displayLabel = caloricDeficit >= 0 ? 'kcal deficit' : 'kcal surplus';

  // Define goals for macros, falling back to profile, then 0
  const proteinGoal = selectedLog?.goalProtein ?? userProfile.dailyProtein ?? 0;
  const carbsGoal = selectedLog?.goalCarbs ?? userProfile.dailyCarbs ?? 0;
  const fatGoal = selectedLog?.goalFat ?? userProfile.dailyFat ?? 0;

  if(!userProfile?.dailyCalories) {
    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Bun venit la byeFat!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
                <p className="text-muted-foreground">Setează-ți profilul pentru a primi obiective personalizate.</p>
                <Button asChild>
                    <Link href="/profile">Setează Profilul</Link>
                </Button>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Consumed Card - Radio Tuner Style */}
        <Card className="shadow-lg border-2 border-primary/20 bg-[#f4ead5] overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Soup className="w-16 h-16 text-primary" />
          </div>
          <CardHeader className="pb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Consumat Astăzi</span>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-serif font-bold text-foreground drop-shadow-sm">{totals.totalCalories.toLocaleString()}</span>
                <span className="text-xs font-black text-muted-foreground uppercase tracking-tighter">kcal</span>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase text-muted-foreground leading-none">Target</div>
                <div className="text-xl font-serif font-bold text-primary">{dynamicGoal.toLocaleString()}</div>
              </div>
            </div>

            {/* Tuner Scale */}
            <div className="relative h-8 bg-black/5 rounded border border-black/10 flex items-center px-1 overflow-hidden">
               <div className="absolute inset-0 flex justify-between items-end pb-1 px-2 opacity-30">
                  {[...Array(21)].map((_, i) => (
                    <div key={i} className={cn("bg-foreground", i % 5 === 0 ? "h-4 w-0.5" : "h-2 w-px")} />
                  ))}
               </div>
               <motion.div
                 className="absolute top-0 bottom-0 w-0.5 bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)] z-10"
                 initial={{ left: 0 }}
                 animate={{ left: `${Math.min((totals.totalCalories / (dynamicGoal || 1)) * 100, 100)}%` }}
                 transition={{ duration: 1.5, ease: "easeOut" }}
               >
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
               </motion.div>
            </div>
          </CardContent>
        </Card>

        {/* Deficit Card - Hi-Fi VU Meter Style */}
        <Card className="shadow-lg border-2 border-accent/20 bg-[#f4ead5] overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Flame className="w-16 h-16 text-accent" />
          </div>
          <CardHeader className="pb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent/70">{displayLabel}</span>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span className={cn(
                    "text-6xl font-serif font-bold drop-shadow-sm",
                    caloricDeficit >= 0 ? "text-accent" : "text-destructive"
                  )}>
                    {displayValue.toLocaleString()}
                  </span>
                  <span className="text-xs font-black text-muted-foreground uppercase tracking-tighter">kcal</span>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground leading-none">Țintă Zilnică</div>
                  <div className="text-xl font-serif font-bold text-accent">{deficitTarget.toLocaleString()}</div>
                </div>
              </div>

              {/* VU Meter Bars */}
              <div className="flex gap-1 h-8 items-end bg-black/5 rounded border border-black/10 p-1">
                {[...Array(20)].map((_, i) => {
                  const progress = (displayValue / (deficitTarget || 1)) * 100;
                  const threshold = (i / 20) * 100;
                  const isActive = progress > threshold;
                  return (
                    <motion.div
                      key={i}
                      className={cn(
                        "flex-1 rounded-sm transition-colors duration-500",
                        isActive
                          ? (i > 15 ? "bg-destructive" : i > 10 ? "bg-accent" : "bg-primary")
                          : "bg-black/10"
                      )}
                      initial={{ height: "10%" }}
                      animate={{ height: isActive ? ["40%", "100%", "60%"] : "10%" }}
                      transition={{
                        repeat: isActive ? Infinity : 0,
                        repeatType: "mirror",
                        duration: 0.5 + (i * 0.05) % 0.4,
                        ease: "easeInOut"
                      }}
                    />
                  );
                })}
              </div>
          </CardContent>
        </Card>
      </div>

      {/* Retro Hi-Fi Frequency Progress Bar */}
      <Card className="shadow-xl border-2 border-foreground/10 bg-[#2a2a2a] p-6 relative overflow-hidden text-[#e5d5b5]">
        <div className="flex justify-between items-center mb-6 border-b border-[#e5d5b5]/20 pb-2">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)] animate-pulse" />
            <h3 className="text-xs font-black uppercase tracking-[0.3em]">Progresul Zilei (KCAL)</h3>
          </div>
          <div className="flex items-baseline gap-1 bg-black/40 px-3 py-1 rounded-md border border-white/10">
            <span className="text-2xl font-serif font-bold text-primary">{Math.round(calorieProgress)}</span>
            <span className="text-[10px] font-black opacity-50">%</span>
          </div>
        </div>
        
        <div className="relative h-20 bg-black/60 rounded-lg border-2 border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,1)] overflow-hidden flex flex-col justify-center">
          {/* Frequency Ticks */}
          <div className="absolute inset-0 flex justify-between items-center px-4 opacity-20 pointer-events-none">
            {[...Array(41)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "bg-white",
                  i % 10 === 0 ? "h-12 w-0.5" : i % 5 === 0 ? "h-8 w-px" : "h-4 w-px"
                )}
              />
            ))}
          </div>

          {/* Glow Effect */}
          <motion.div
            className="absolute top-0 bottom-0 left-0 bg-primary/20 blur-xl pointer-events-none"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(calorieProgress, 100)}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />

          {/* Scale Numbers */}
          <div className="absolute inset-0 flex justify-between items-end px-4 pb-2 text-[8px] font-black opacity-40 pointer-events-none uppercase tracking-widest">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>

          {/* The Needle */}
          <motion.div
            className="absolute top-0 bottom-0 w-1 bg-primary z-10 flex flex-col items-center"
            initial={{ left: 0 }}
            animate={{ left: `${Math.min(calorieProgress, 100)}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            <div className="w-4 h-1 bg-primary shadow-[0_0_15px_hsl(var(--primary))]" />
            <div className="flex-1 w-px bg-white/20" />
            <div className="w-4 h-1 bg-primary shadow-[0_0_15px_hsl(var(--primary))]" />

            {/* Indicator Light */}
            <div className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary/30 blur-md" />
          </motion.div>
        </div>

        <div className="flex justify-between mt-4 px-2">
           <div className="flex flex-col">
             <span className="text-[8px] font-black uppercase tracking-tighter opacity-50">Start Line</span>
             <span className="text-[10px] font-bold">ÎNCEPUT</span>
           </div>
           <div className="flex flex-col items-end">
             <span className="text-[8px] font-black uppercase tracking-tighter opacity-50">Operational Goal</span>
             <span className="text-[10px] font-bold text-primary">TARGET ATINS</span>
           </div>
        </div>

        {/* Brushed Metal Texture Effect (Subtle Noise) */}
        <div className="absolute inset-0 pointer-events-none opacity-5 mix-blend-overlay bg-black/10" />
      </Card>

      <Card className="shadow-lg border-2 border-primary/5 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6 md:p-8">
        {/* Calorie Balance Breakdown */}
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/50">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">M</span>
              </div>
            </div>
            <div className="text-lg font-serif font-bold text-foreground">{maintenanceCalories.toLocaleString()}</div>
            <div className="text-[10px] uppercase font-bold tracking-tight text-muted-foreground">Mentenanță</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/50">
                <span className="text-sm font-bold text-violet-600 dark:text-violet-400">-</span>
              </div>
            </div>
            <div className="text-lg font-serif font-bold text-primary">{deficitTarget.toLocaleString()}</div>
            <div className="text-[10px] uppercase font-bold tracking-tight text-muted-foreground">Țintă</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950/50">
                <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              {totals.activeCalories > 0 && (
                <span className="text-xs font-medium text-orange-600 dark:text-orange-400">+{totals.activeCalories.toLocaleString()}</span>
              )}
            </div>
            <div className="text-lg font-serif font-bold text-accent">
              {dynamicGoal.toLocaleString()}
            </div>
            <div className="text-[10px] uppercase font-bold tracking-tight text-muted-foreground">Activ</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">C</span>
              </div>
            </div>
            <div className="text-lg font-serif font-bold text-foreground">{totals.totalCalories.toLocaleString()}</div>
            <div className="text-[10px] uppercase font-bold tracking-tight text-muted-foreground">Consumat</div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Protein */}
            <div className="bg-card/30 p-4 rounded-xl border border-primary/10">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Beef className="h-4 w-4 text-primary" />
                            <span className="text-xs font-bold uppercase tracking-wider">Proteine</span>
                        </div>
                        <span className="text-xs font-serif font-bold">{totals.totalProtein}g</span>
                    </div>
                    <Progress value={proteinGoal > 0 ? (totals.totalProtein / proteinGoal) * 100 : 0} className="h-1.5 [&>div]:bg-primary" />
                    <span className="text-[10px] text-muted-foreground text-right">Target: {proteinGoal}g</span>
                </div>
            </div>

            {/* Carbs */}
            <div className="bg-card/30 p-4 rounded-xl border border-primary/10">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <WheatIcon className="h-4 w-4 text-accent" />
                            <span className="text-xs font-bold uppercase tracking-wider">Carbs</span>
                        </div>
                        <span className="text-xs font-serif font-bold">{totals.totalCarbohydrates}g</span>
                    </div>
                    <Progress value={carbsGoal > 0 ? (totals.totalCarbohydrates / carbsGoal) * 100 : 0} className="h-1.5 [&>div]:bg-accent" />
                    <span className="text-[10px] text-muted-foreground text-right">Target: {carbsGoal}g</span>
                </div>
            </div>

            {/* Fat */}
            <div className="bg-card/30 p-4 rounded-xl border border-primary/10">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Droplets className="h-4 w-4 text-secondary" />
                            <span className="text-xs font-bold uppercase tracking-wider">Grăsimi</span>
                        </div>
                        <span className="text-xs font-serif font-bold">{totals.totalFat}g</span>
                    </div>
                    <Progress value={fatGoal > 0 ? (totals.totalFat / fatGoal) * 100 : 0} className="h-1.5 [&>div]:bg-secondary" />
                    <span className="text-[10px] text-muted-foreground text-right">Target: {fatGoal}g</span>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
