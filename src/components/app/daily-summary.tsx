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
        {/* Consumed Card */}
        <Card className="shadow-lg border-2 border-primary/20 bg-card overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Soup className="w-16 h-16 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Consumat Astăzi</span>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-serif font-bold text-foreground">{totals.totalCalories.toLocaleString()}</span>
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-tighter">kcal</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-bold">Target:</span>
              <span className="font-serif">{dynamicGoal.toLocaleString()} kcal</span>
            </div>
          </CardContent>
        </Card>

        {/* Deficit Card */}
        <Card className="shadow-lg border-2 border-accent/20 bg-card overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Flame className="w-16 h-16 text-accent" />
          </div>
          <CardHeader className="pb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{displayLabel}</span>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "text-5xl font-serif font-bold",
                caloricDeficit >= 0 ? "text-primary" : "text-destructive"
              )}>
                {displayValue.toLocaleString()}
              </span>
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-tighter">kcal</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-bold">Țintă Zilnică:</span>
              <span className="font-serif">{deficitTarget.toLocaleString()} kcal</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vintage Ruler Progress Bar */}
      <Card className="shadow-md border-2 border-primary/10 bg-card p-6 relative overflow-hidden">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Progresul Zilei</h3>
          <span className="text-lg font-serif font-bold">{Math.round(calorieProgress)}%</span>
        </div>
        
        <div className="relative h-12 bg-[#e5d5b5] rounded-lg border-2 border-[#c4a484] shadow-inner overflow-hidden flex items-center">
          {/* Ruler Ticks */}
          <div className="absolute inset-0 flex justify-between px-1 opacity-40">
            {[...Array(51)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "bg-[#8b5a2b]",
                  i % 10 === 0 ? "h-6 w-0.5" : i % 5 === 0 ? "h-4 w-px" : "h-2 w-px"
                )}
              />
            ))}
          </div>

          {/* Progress Indicator (The "Slider") */}
          <motion.div
            className="absolute top-0 bottom-0 left-0 bg-primary/40 border-r-4 border-primary shadow-lg z-10"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(calorieProgress, 100)}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-8 bg-primary rounded-sm border-2 border-white shadow-md flex items-center justify-center">
                <div className="w-0.5 h-4 bg-white/50 rounded-full" />
            </div>
          </motion.div>

          {/* Wood Texture Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]" />
        </div>
        <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
          <span>Început</span>
          <span>Target Atins</span>
        </div>
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
