'use client';

import { useMemo } from 'react';
import type { DailyLog, DailyLogItem, DailyLogActivity, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { cn } from '@/lib/utils';
import { Beef, Wheat as WheatIcon, Droplets, Flame } from 'lucide-react';
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

  const needleRotation = useMemo(() => {
    // -90deg is 0%, +90deg is 100%
    const progress = Math.min(Math.max(calorieProgress, 0), 120);
    return (progress / 100) * 180 - 90;
  }, [calorieProgress]);

  return (
    <Card className="shadow-lg border-2 border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Flame className="w-24 h-24 text-primary" />
      </div>

      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-serif font-bold text-primary mb-6 uppercase tracking-widest">Calorie Balance</h2>

          <div className="relative w-64 h-40 md:w-80 md:h-48 flex items-center justify-center">
            {/* Gauge Background */}
            <svg viewBox="0 0 200 120" className="w-full h-full">
              {/* Decorative ticks */}
              {[...Array(11)].map((_, i) => {
                const angle = (i * 18) - 180;
                const rad = (angle * Math.PI) / 180;
                const x1 = 100 + Math.cos(rad) * 85;
                const y1 = 100 + Math.sin(rad) * 85;
                const x2 = 100 + Math.cos(rad) * 95;
                const y2 = 100 + Math.sin(rad) * 95;
                return (
                  <line
                    key={i}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-muted-foreground/40"
                  />
                );
              })}

              {/* Gauge Arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                strokeLinecap="round"
                className="text-muted/30"
              />

              {/* Active Arc */}
              <motion.path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray="251.3"
                initial={{ strokeDashoffset: 251.3 }}
                animate={{ strokeDashoffset: 251.3 - (Math.min(calorieProgress, 100) / 100) * 251.3 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />

              {/* Needle */}
              <motion.g
                initial={{ rotate: -90, originX: "100px", originY: "100px" }}
                animate={{ rotate: needleRotation, originX: "100px", originY: "100px" }}
                transition={{ type: "spring", stiffness: 50, damping: 15 }}
              >
                <line
                  x1="100" y1="100" x2="100" y2="25"
                  stroke="hsl(var(--accent))"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="100" cy="100" r="6" fill="hsl(var(--accent))" />
                <circle cx="100" cy="100" r="2" fill="white" />
              </motion.g>

              {/* Center point */}
              <circle cx="100" cy="100" r="4" fill="currentColor" className="text-primary" />
            </svg>

            <div className="absolute bottom-0 flex flex-col items-center">
               <span className="text-4xl md:text-5xl font-serif font-bold text-foreground">
                {displayValue.toLocaleString()}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{displayLabel}</span>
            </div>
          </div>
        </div>
        
        {/* Calorie Balance Breakdown */}
        <div className="mt-10 grid grid-cols-4 gap-4 text-center">
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
  );
}
