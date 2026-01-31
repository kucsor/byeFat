'use client';

import { useMemo } from 'react';
import type { DailyLog, DailyLogItem, DailyLogActivity, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { ResponsiveContainer, RadialBarChart, PolarAngleAxis, RadialBar } from 'recharts';
import { cn } from '@/lib/utils';
import { Beef, Wheat as WheatIcon, Droplets, Flame } from 'lucide-react';

type DailySummaryProps = {
  foodItems?: DailyLogItem[] | null;
  activities?: DailyLogActivity[] | null;
  userProfile: UserProfile;
  selectedLog: DailyLog | null;
};

export function DailySummary({ foodItems, activities, userProfile, selectedLog }: DailySummaryProps) {
  const baseGoal = selectedLog?.goalCalories ?? userProfile?.dailyCalories ?? 0;
  const maintenanceCalories = userProfile?.maintenanceCalories ?? baseGoal;
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
  
  // For the ring chart - show deficit
  const dynamicGoal = maintenanceCalories > 0 ? maintenanceCalories + totals.activeCalories : 0;
  const calorieProgress = dynamicGoal > 0 ? (totals.totalCalories / dynamicGoal) * 100 : 0;

  // Display values for the ring
  const displayValue = Math.abs(caloricDeficit);
  const displayLabel = caloricDeficit >= 0 ? 'kcal deficit' : 'kcal surplus';

  // Define goals for macros, falling back to profile, then 0
  const proteinGoal = selectedLog?.goalProtein ?? userProfile.dailyProtein ?? 0;
  const carbsGoal = selectedLog?.goalCarbs ?? userProfile.dailyCarbs ?? 0;
  const fatGoal = selectedLog?.goalFat ?? userProfile.dailyFat ?? 0;

  const { animationClass, animationStyle } = useMemo(() => {
    if (calorieProgress < 85) {
      return { animationClass: '', animationStyle: {} };
    }
    
    let duration;
    if (calorieProgress >= 100) {
      duration = 0.7; // Fast pulse
    } else if (calorieProgress >= 95) {
      duration = 1.2; // Medium pulse
    } else { // 85-94.9%
      duration = 2.0; // Slow pulse
    }

    return {
      animationClass: 'animate-heartbeat',
      animationStyle: { animationDuration: `${duration}s` }
    };
  }, [calorieProgress]);
  

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

  const chartData = [{ name: 'calories', value: calorieProgress > 110 ? 110 : calorieProgress }]; // Cap at 110 for visualization

  let calorieColor = 'hsl(var(--primary))'; // Green
  if (calorieProgress >= 85 && calorieProgress < 100) {
      calorieColor = 'hsl(var(--chart-3))'; // Yellow
  } else if (calorieProgress >= 100) {
      calorieColor = 'hsl(var(--destructive))'; // Red
  }

  return (
    <Card className="shadow-md">
      <CardContent className="p-4 md:p-6">
        <div 
          className={cn(
            "relative mx-auto h-48 w-48 md:h-64 md:w-64",
            animationClass
          )}
          style={animationStyle}
        >
           <ResponsiveContainer width="100%" height="100%">
             <RadialBarChart 
                innerRadius="80%" 
                outerRadius="100%" 
                data={chartData} 
                startAngle={90} 
                endAngle={-270}
                barSize={20}
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, 100]}
                  angleAxisId={0}
                  tick={false}
                />
                <RadialBar
                  background
                  dataKey="value"
                  cornerRadius={10}
                  fill={calorieColor}
                  animationDuration={500}
                />
              </RadialBarChart>
           </ResponsiveContainer>
           <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-4xl md:text-5xl font-bold tracking-tighter">
                {displayValue.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">{displayLabel}</span>
           </div>
        </div>
        
        {/* Calorie Balance Breakdown */}
        <div className="mt-6 grid grid-cols-4 gap-2 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/50">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">M</span>
              </div>
            </div>
            <div className="text-base font-bold text-foreground">{maintenanceCalories.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Mentenanță</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/50">
                <span className="text-sm font-bold text-violet-600 dark:text-violet-400">-</span>
              </div>
            </div>
            <div className="text-base font-bold text-violet-600">{deficitTarget.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Deficit Țintă</div>
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
            <div className="text-base font-bold text-orange-500">
              {dynamicGoal.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Target Activ</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">C</span>
              </div>
            </div>
            <div className="text-base font-bold text-emerald-600">{totals.totalCalories.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Consumat</div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
            {/* Protein */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
                            <Beef className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                        <span className="font-medium">Proteine</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{totals.totalProtein.toLocaleString()}</span>
                        <span className="mx-1">/</span>
                        {proteinGoal.toLocaleString()}g
                    </span>
                </div>
                <Progress value={proteinGoal > 0 ? (totals.totalProtein / proteinGoal) * 100 : 0} className="h-2.5 [&>div]:bg-red-500" />
            </div>

            {/* Carbs */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50">
                            <WheatIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="font-medium">Carbohidrați</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{totals.totalCarbohydrates.toLocaleString()}</span>
                        <span className="mx-1">/</span>
                        {carbsGoal.toLocaleString()}g
                    </span>
                </div>
                <Progress value={carbsGoal > 0 ? (totals.totalCarbohydrates / carbsGoal) * 100 : 0} className="h-2.5 [&>div]:bg-amber-500" />
            </div>

            {/* Fat */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/50">
                            <Droplets className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium">Grăsimi</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{totals.totalFat.toLocaleString()}</span>
                        <span className="mx-1">/</span>
                        {fatGoal.toLocaleString()}g
                    </span>
                </div>
                <Progress value={fatGoal > 0 ? (totals.totalFat / fatGoal) * 100 : 0} className="h-2.5 [&>div]:bg-blue-500" />
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
