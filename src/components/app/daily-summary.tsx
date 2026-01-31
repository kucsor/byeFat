'use client';

import { useMemo } from 'react';
import type { DailyLog, DailyLogItem, DailyLogActivity, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { ResponsiveContainer, RadialBarChart, PolarAngleAxis, RadialBar } from 'recharts';
import { cn } from '@/lib/utils';

type DailySummaryProps = {
  foodItems?: DailyLogItem[] | null;
  activities?: DailyLogActivity[] | null;
  userProfile: UserProfile;
  selectedLog: DailyLog | null;
};

export function DailySummary({ foodItems, activities, userProfile, selectedLog }: DailySummaryProps) {
  const baseGoal = selectedLog?.goalCalories ?? userProfile?.dailyCalories ?? 0;

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
  
  const dynamicGoal = baseGoal > 0 ? baseGoal + totals.activeCalories : 0;
  const caloriesRemaining = Math.round(dynamicGoal - totals.totalCalories);

  const displayValue = Math.abs(caloriesRemaining);
  const displayLabel = caloriesRemaining >= 0 ? 'kcal rămase' : 'kcal surplus';

  // Define goals for macros, falling back to profile, then 0
  const proteinGoal = selectedLog?.goalProtein ?? userProfile.dailyProtein ?? 0;
  const carbsGoal = selectedLog?.goalCarbs ?? userProfile.dailyCarbs ?? 0;
  const fatGoal = selectedLog?.goalFat ?? userProfile.dailyFat ?? 0;

  const calorieProgress = dynamicGoal > 0 ? (totals.totalCalories / dynamicGoal) * 100 : 0;

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
        
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <span className='font-medium text-foreground'>{dynamicGoal.toLocaleString()}</span> Goal
          = 
          <span className='font-medium text-foreground'>{baseGoal.toLocaleString()}</span> Base
          -
          <span className='font-medium text-foreground'>{totals.totalCalories.toLocaleString()}</span> Food
          + 
          <span className='font-medium text-orange-500'>{totals.activeCalories.toLocaleString()}</span> Active
        </div>

        <div className="mt-6 space-y-4">
            <div>
                <div className="flex justify-between mb-1 text-sm font-medium">
                    <span>Proteine</span>
                    <span className="text-muted-foreground">{totals.totalProtein.toLocaleString()}g / {proteinGoal.toLocaleString()}g</span>
                </div>
                <Progress value={proteinGoal > 0 ? (totals.totalProtein / proteinGoal) * 100 : 0} className="h-2 [&>div]:bg-chart-2" />
            </div>

            <div>
                <div className="flex justify-between mb-1 text-sm font-medium">
                    <span>Carbohidrați</span>
                    <span className="text-muted-foreground">{totals.totalCarbohydrates.toLocaleString()}g / {carbsGoal.toLocaleString()}g</span>
                </div>
                <Progress value={carbsGoal > 0 ? (totals.totalCarbohydrates / carbsGoal) * 100 : 0} className="h-2 [&>div]:bg-chart-3" />
            </div>
            
            <div>
                <div className="flex justify-between mb-1 text-sm font-medium">
                    <span>Grăsimi</span>
                    <span className="text-muted-foreground">{totals.totalFat.toLocaleString()}g / {fatGoal.toLocaleString()}g</span>
                </div>
                <Progress value={fatGoal > 0 ? (totals.totalFat / fatGoal) * 100 : 0} className="h-2 [&>div]:bg-chart-1" />
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
