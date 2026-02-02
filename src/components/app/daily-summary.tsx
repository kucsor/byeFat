'use client';

import { useMemo } from 'react';
import type { DailyLog, DailyLogItem, DailyLogActivity, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { cn } from '@/lib/utils';
import { Beef, Wheat as WheatIcon, Droplets } from 'lucide-react';
import { motion } from 'framer-motion';
import { DancingApple, PlayfulFlame, BouncyActivity, HappyStar } from './animated-icons';

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
    if (selectedLog?.maintenanceCalories) return selectedLog.maintenanceCalories;
    if (userProfile?.maintenanceCalories) return userProfile.maintenanceCalories;
    if (userProfile?.gender && userProfile?.age && userProfile?.weight && userProfile?.height) {
      const { gender, age, weight, height } = userProfile;
      const bmr = (10 * weight) + (6.25 * height) - (5 * age) + (gender === 'male' ? 5 : -161);
      return Math.round(bmr * 1.2);
    }
    return baseGoal;
  }, [userProfile, baseGoal, selectedLog]);
  
  const maintenanceCalories = calculatedMaintenance;
  const deficitTarget = selectedLog?.deficitTarget ?? userProfile?.deficitTarget ?? 500;

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
      {/* Daily Progress Card - Cartoon Glassmorphism */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="glass relative overflow-hidden p-6 border-none cartoon-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <HappyStar />
          </div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-primary-foreground/80">Progresul Zilei</h3>
              <p className="text-sm text-muted-foreground">Ești aproape de obiectiv!</p>
            </div>
            <div className="bg-primary/20 px-4 py-2 rounded-full">
              <span className="text-2xl font-black text-primary-foreground">{Math.round(calorieProgress)}%</span>
            </div>
          </div>

          <div className="relative h-6 bg-white/50 rounded-full overflow-hidden border-2 border-primary/10">
            <motion.div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-accent"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(calorieProgress, 100)}%` }}
              transition={{ duration: 1, ease: "backOut" }}
            />
          </div>

          <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>START</span>
            <span>OBIECTIV ATINS 🌟</span>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Deficit Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          className="h-full"
        >
          <Card className="glass h-full p-6 border-none cartoon-shadow bg-accent/30 relative">
            <div className="absolute top-4 right-4">
              <PlayfulFlame />
            </div>
            <div className="flex flex-col h-full justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-accent-foreground/60">{displayLabel}</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={cn(
                    "text-5xl font-black",
                    caloricDeficit >= 0 ? "text-accent-foreground" : "text-destructive"
                  )}>
                    {displayValue.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold opacity-60">kcal</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-accent-foreground/10 flex justify-between items-center">
                <span className="text-xs font-bold opacity-60">ȚINTĂ</span>
                <span className="text-lg font-black text-accent-foreground">{deficitTarget.toLocaleString()} kcal</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Consumed Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          className="h-full"
        >
          <Card className="glass h-full p-6 border-none cartoon-shadow bg-primary/30 relative">
            <div className="absolute top-4 right-4">
              <DancingApple />
            </div>
            <div className="flex flex-col h-full justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-primary-foreground/60">Consumat Astăzi</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-5xl font-black text-primary-foreground">
                    {totals.totalCalories.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold opacity-60">kcal</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-primary-foreground/10 flex justify-between items-center">
                <span className="text-xs font-bold opacity-60">MAXIM RECOMANDAT</span>
                <span className="text-lg font-black text-primary-foreground">{dynamicGoal.toLocaleString()} kcal</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      <Card className="glass border-none cartoon-shadow">
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
                <BouncyActivity />
              </div>
              {totals.activeCalories > 0 && (
                <span className="text-xs font-medium text-orange-600 dark:text-orange-400">+{totals.activeCalories.toLocaleString()}</span>
              )}
            </div>
            <div className="text-lg font-bold text-accent-foreground">
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
            <div className="bg-primary/10 p-4 rounded-3xl border border-primary/20 bouncy-hover">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-primary/20 rounded-full">
                                <Beef className="h-4 w-4 text-primary-foreground" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider">Proteine</span>
                        </div>
                        <span className="text-xs font-bold">{totals.totalProtein}g</span>
                    </div>
                    <Progress value={proteinGoal > 0 ? (totals.totalProtein / proteinGoal) * 100 : 0} className="h-3 rounded-full bg-white/50 [&>div]:bg-primary" />
                    <span className="text-[10px] text-muted-foreground text-right font-bold">Țintă: {proteinGoal}g</span>
                </div>
            </div>

            {/* Carbs */}
            <div className="bg-accent/10 p-4 rounded-3xl border border-accent/20 bouncy-hover">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                             <div className="p-1.5 bg-accent/20 rounded-full">
                                <WheatIcon className="h-4 w-4 text-accent-foreground" />
                             </div>
                            <span className="text-xs font-bold uppercase tracking-wider">Carbs</span>
                        </div>
                        <span className="text-xs font-bold">{totals.totalCarbohydrates}g</span>
                    </div>
                    <Progress value={carbsGoal > 0 ? (totals.totalCarbohydrates / carbsGoal) * 100 : 0} className="h-3 rounded-full bg-white/50 [&>div]:bg-accent" />
                    <span className="text-[10px] text-muted-foreground text-right font-bold">Țintă: {carbsGoal}g</span>
                </div>
            </div>

            {/* Fat */}
            <div className="bg-secondary/10 p-4 rounded-3xl border border-secondary/20 bouncy-hover">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                             <div className="p-1.5 bg-secondary/20 rounded-full">
                                <Droplets className="h-4 w-4 text-secondary-foreground" />
                             </div>
                            <span className="text-xs font-bold uppercase tracking-wider">Grăsimi</span>
                        </div>
                        <span className="text-xs font-bold">{totals.totalFat}g</span>
                    </div>
                    <Progress value={fatGoal > 0 ? (totals.totalFat / fatGoal) * 100 : 0} className="h-3 rounded-full bg-white/50 [&>div]:bg-secondary" />
                    <span className="text-[10px] text-muted-foreground text-right font-bold">Țintă: {fatGoal}g</span>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
