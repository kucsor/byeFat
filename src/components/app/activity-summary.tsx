'use client';

import { useMemo } from 'react';
import type { DailyLog, DailyLogItem, DailyLogActivity, UserProfile } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Flame, Zap, Apple } from 'lucide-react';
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

  // Percentage logic allowing > 100%
  const rawPercentage = deficitTarget > 0 ? (currentDeficit / deficitTarget) * 100 : 0;

  // Ring Visual Logic
  // We want to loop the ring.
  // Loop 1 (0-100%): Blue
  // Loop 2 (100-200%): Gold/Orange?
  // Loop 3 (200%+): Purple?

  const isOverachiever = rawPercentage > 100;
  const isDoubleOverachiever = rawPercentage > 200;

  // Calculate stroke dash offsets
  // Circumference is ~283 (2 * PI * 45)
  const circumference = 283;

  // First ring (Blue): Caps at 100%
  const ring1Percent = Math.min(100, Math.max(0, rawPercentage));
  const ring1Offset = circumference - (ring1Percent / 100) * circumference;

  // Second ring (Gold): Starts from 0 if > 100%, caps at 100% relative (total 200%)
  const ring2Percent = Math.min(100, Math.max(0, rawPercentage - 100));
  const ring2Offset = circumference - (ring2Percent / 100) * circumference;

  // Third ring (Purple): Starts from 0 if > 200%
  const ring3Percent = Math.min(100, Math.max(0, rawPercentage - 200));
  const ring3Offset = circumference - (ring3Percent / 100) * circumference;

  const displayColorClass = isDoubleOverachiever ? "text-purple-500" : isOverachiever ? "text-amber-500" : "text-blue-600";

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
                <h2 className="text-lg font-bold text-slate-900 leading-tight">
                    {userProfile.name}
                </h2>
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-600">{xpStats.xpInLevel} / {xpStats.xpRequired} XP</span>
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
      <Card className="fitness-card p-6 relative overflow-hidden bg-white shadow-sm border-slate-200">
         <div className="flex flex-col md:flex-row gap-8 items-center">
            {/* Left: Ring Chart */}
            <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                 {/* SVG Ring */}
                 <svg className="w-full h-full -rotate-90 drop-shadow-sm" viewBox="0 0 100 100">
                    {/* Background Circle */}
                    <circle
                        cx="50" cy="50" r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-slate-100"
                    />

                    {/* Ring 1: Base Blue */}
                    <motion.circle
                        cx="50" cy="50" r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinecap="round"
                        className="text-blue-600"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: ring1Offset }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    />

                    {/* Ring 2: Gold Overachievement */}
                    {isOverachiever && (
                        <motion.circle
                            cx="50" cy="50" r="45"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            strokeLinecap="round"
                            className="text-amber-500"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: ring2Offset }}
                            transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                        />
                    )}

                    {/* Ring 3: Purple Double Overachievement */}
                    {isDoubleOverachiever && (
                        <motion.circle
                            cx="50" cy="50" r="45"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            strokeLinecap="round"
                            className="text-purple-600"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: ring3Offset }}
                            transition={{ duration: 1, delay: 1, ease: "easeOut" }}
                        />
                    )}
                 </svg>

                 <div className="absolute flex flex-col items-center">
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Deficit</span>
                    <span className={cn("text-3xl font-black tabular-nums tracking-tight", displayColorClass)}>
                        {currentDeficit.toFixed(0)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">kcal</span>
                 </div>
            </div>

            {/* Right: Metrics Grid */}
            <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-6 w-full">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Zap className="h-4 w-4 text-orange-500" />
                        <span className="text-xs font-bold uppercase tracking-wide">Active</span>
                    </div>
                    <div className="text-2xl font-bold tabular-nums text-slate-900">
                        {totals.active} <span className="text-sm font-medium text-slate-400">kcal</span>
                    </div>
                </div>

                <div className="space-y-1">
                     <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Apple className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-bold uppercase tracking-wide">Food</span>
                    </div>
                    <div className="text-2xl font-bold tabular-nums text-slate-900">
                        {totals.food} <span className="text-sm font-medium text-slate-400">kcal</span>
                    </div>
                </div>

                <div className="space-y-2 col-span-2 border-t border-slate-100 pt-4">
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 font-bold">Goal Progress</span>
                        <span className={cn("font-black tabular-nums", displayColorClass)}>
                            {Math.round(rawPercentage)}%
                        </span>
                     </div>
                     <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        {/* Layer 1 Progress */}
                        <motion.div
                            className="absolute top-0 left-0 h-full bg-blue-600 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${ring1Percent}%` }}
                        />
                        {/* Layer 2 Progress */}
                        {isOverachiever && (
                             <motion.div
                                className="absolute top-0 left-0 h-full bg-amber-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${ring2Percent}%` }}
                                transition={{ delay: 0.5 }}
                            />
                        )}
                        {/* Layer 3 Progress */}
                        {isDoubleOverachiever && (
                             <motion.div
                                className="absolute top-0 left-0 h-full bg-purple-600 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${ring3Percent}%` }}
                                transition={{ delay: 1 }}
                            />
                        )}
                     </div>
                     <p className="text-xs text-slate-400 text-right">Target: {deficitTarget} kcal</p>
                </div>
            </div>
         </div>
      </Card>
    </div>
  );
}
