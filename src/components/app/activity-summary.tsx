'use client';

import { useMemo } from 'react';
import type { DailyLog, DailyLogItem, DailyLogActivity, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Flame, Zap, Apple, Trophy } from 'lucide-react';
import { getLevelProgress } from '@/lib/level-system';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

type ActivitySummaryProps = {
  foodItems?: DailyLogItem[] | null;
  activities?: DailyLogActivity[] | null;
  userProfile: UserProfile;
  selectedLog: DailyLog | null;
};

export function ActivitySummary({ foodItems, activities, userProfile, selectedLog }: ActivitySummaryProps) {
  // --- XP & Level Calculation ---
  const xpStats = useMemo(() => {
    return getLevelProgress(userProfile.xp || 0);
  }, [userProfile.xp]);

  // --- Daily Metrics ---
  const baseGoal = selectedLog?.goalCalories ?? userProfile?.dailyCalories ?? 0;

  const maintenanceCalories = useMemo(() => {
    if (selectedLog?.maintenanceCalories) return selectedLog.maintenanceCalories;
    if (userProfile?.maintenanceCalories) return userProfile.maintenanceCalories;
    return baseGoal + 500; // Fallback
  }, [userProfile, baseGoal, selectedLog]);

  const deficitTarget = selectedLog?.deficitTarget ?? userProfile?.deficitTarget ?? 500;

  const totals = useMemo(() => {
    const food = foodItems?.reduce((acc, item) => acc + item.calories, 0) ?? 0;
    const active = activities?.reduce((acc, item) => acc + item.calories, 0) ?? 0;
    return { food, active };
  }, [foodItems, activities]);

  // Deficit = (Maintenance + Active) - Food
  const currentDeficit = (maintenanceCalories + totals.active) - totals.food;
  const isDeficitPositive = currentDeficit > 0;

  // Progress Ring Calculation (for Deficit)
  // Clamp between 0 and 100
  const deficitProgress = Math.min(100, Math.max(0, (currentDeficit / deficitTarget) * 100));

  if(!userProfile?.dailyCalories) {
      return (
          <Card className="fitness-card p-6 text-center">
              <h3 className="text-lg font-medium mb-2">Welcome to byeFat</h3>
              <p className="text-muted-foreground mb-4">Set up your profile to start tracking.</p>
              <Button asChild className="w-full">
                  <Link href="/profile">Get Started</Link>
              </Button>
          </Card>
      )
  }

  return (
    <div className="space-y-6">
      {/* Level / User Header */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-lg font-bold text-slate-700">
                    {userProfile.name?.charAt(0) || 'U'}
                </div>
                 <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white">
                    {xpStats.currentLevel}
                </div>
            </div>
            <div>
                <h2 className="text-lg font-bold text-foreground leading-tight">
                    {userProfile.name}
                </h2>
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">{xpStats.xpInLevel} / {xpStats.xpRequired} XP</span>
                     {/* Mini XP Bar */}
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${xpStats.progressPercent}%` }}
                        />
                    </div>
                </div>
            </div>
         </div>
      </div>

      {/* Main Activity Card */}
      <Card className="fitness-card p-6 relative overflow-hidden">
         <div className="flex flex-col md:flex-row gap-8 items-center">
            {/* Left: Ring Chart */}
            <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                 {/* SVG Ring */}
                 <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    {/* Background Circle */}
                    <circle
                        cx="50" cy="50" r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-slate-100"
                    />
                    {/* Progress Circle */}
                    <motion.circle
                        cx="50" cy="50" r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinecap="round"
                        className={cn("transition-colors duration-500", isDeficitPositive ? "text-blue-600" : "text-amber-500")}
                        strokeDasharray="283"
                        initial={{ strokeDashoffset: 283 }}
                        animate={{ strokeDashoffset: 283 - (283 * deficitProgress) / 100 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                 </svg>

                 <div className="absolute flex flex-col items-center">
                    <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Deficit</span>
                    <span className={cn("text-3xl font-black tabular-nums tracking-tight", isDeficitPositive ? "text-blue-600" : "text-amber-500")}>
                        {currentDeficit.toFixed(0)}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground">kcal</span>
                 </div>
            </div>

            {/* Right: Metrics Grid */}
            <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-6 w-full">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Zap className="h-4 w-4 text-orange-500" />
                        <span className="text-xs font-bold uppercase tracking-wide">Active</span>
                    </div>
                    <div className="text-2xl font-bold tabular-nums text-foreground">
                        {totals.active} <span className="text-sm font-medium text-muted-foreground">kcal</span>
                    </div>
                </div>

                <div className="space-y-1">
                     <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Apple className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-bold uppercase tracking-wide">Food</span>
                    </div>
                    <div className="text-2xl font-bold tabular-nums text-foreground">
                        {totals.food} <span className="text-sm font-medium text-muted-foreground">kcal</span>
                    </div>
                </div>

                <div className="space-y-1 col-span-2 border-t pt-4">
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Goal Deficit</span>
                        <span className="font-bold">{deficitTarget} kcal</span>
                     </div>
                     <Progress value={deficitProgress} className="h-1.5 bg-slate-100 [&>div]:bg-blue-600" />
                </div>
            </div>
         </div>
      </Card>
    </div>
  );
}
