'use client';

import { useMemo } from 'react';
import type { DailyLog, DailyLogItem, DailyLogActivity, UserProfile } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Flame, Zap, Apple } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type ActivitySummaryProps = {
  foodItems?: DailyLogItem[] | null;
  activities?: DailyLogActivity[] | null;
  userProfile: UserProfile;
  selectedLog: DailyLog | null;
};

export function ActivitySummary({ foodItems, activities, userProfile, selectedLog }: ActivitySummaryProps) {
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

  if(!userProfile?.dailyCalories) {
      return (
          <Card className="fitness-card p-6 text-center">
              <h3 className="text-lg font-bold text-black mb-2">Welcome to byeFat</h3>
              <p className="text-slate-600 mb-4">Set up your profile to start tracking.</p>
              <Button asChild className="w-full">
                  <Link href="/profile">Get Started</Link>
              </Button>
          </Card>
      )
  }

  return (
    <div className="space-y-6">
      {/* User Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-lg font-black text-black">
            {userProfile.name?.charAt(0) || 'U'}
        </div>
        <div>
            <h2 className="text-xl font-black text-black leading-tight">
                {userProfile.name}
            </h2>
            <span className="text-sm font-bold text-slate-500">Let's crush today's goals.</span>
        </div>
      </div>

      {/* 3D Ring Card */}
      <Card className="fitness-card p-6 relative overflow-hidden bg-white">
         <div className="flex flex-col items-center justify-center gap-6">

            {/* 3D Ring Container */}
            <div className="relative w-64 h-64 flex items-center justify-center">
                 <svg className="w-full h-full drop-shadow-2xl" viewBox="0 0 200 200">
                    <defs>
                        {/* Metallic Gradient */}
                        <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#e2e8f0" />
                            <stop offset="50%" stopColor="#f8fafc" />
                            <stop offset="100%" stopColor="#cbd5e1" />
                        </linearGradient>
                        {/* Inner Shadow for Depth */}
                        <filter id="innerShadow">
                            <feOffset dx="0" dy="4" />
                            <feGaussianBlur stdDeviation="4" result="offset-blur" />
                            <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                            <feFlood floodColor="black" floodOpacity="0.2" result="color" />
                            <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                            <feComposite operator="over" in="shadow" in2="SourceGraphic" />
                        </filter>
                    </defs>

                    {/* The 3D Ring Base */}
                    <circle
                        cx="100" cy="100" r="80"
                        fill="none"
                        stroke="url(#ringGradient)"
                        strokeWidth="16"
                        filter="url(#innerShadow)"
                    />

                    {/* Subtle Outline */}
                    <circle
                        cx="100" cy="100" r="88"
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="1"
                        strokeOpacity="0.3"
                    />
                    <circle
                        cx="100" cy="100" r="72"
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="1"
                        strokeOpacity="0.3"
                    />
                 </svg>

                 {/* Center Content */}
                 <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Total Deficit</span>
                    <span className={cn(
                        "text-5xl font-black tabular-nums tracking-tighter drop-shadow-sm",
                        isDeficitPositive ? "text-blue-700" : "text-amber-600"
                    )}>
                        {currentDeficit.toFixed(0)}
                    </span>
                    <div className="flex items-center gap-1 mt-1 px-3 py-1 bg-slate-100 rounded-full">
                        <span className="text-xs font-bold text-slate-500">TARGET: {deficitTarget}</span>
                    </div>
                 </div>
            </div>

            {/* Metrics Row */}
            <div className="flex w-full justify-between gap-4 px-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-100 rounded-2xl border border-orange-200">
                        <Zap className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-500 uppercase">Active</div>
                        <div className="text-xl font-black text-slate-900">{totals.active}</div>
                    </div>
                </div>

                <div className="w-px bg-slate-200 h-10 self-center"></div>

                <div className="flex items-center gap-3 text-right">
                    <div>
                        <div className="text-xs font-bold text-slate-500 uppercase">Food</div>
                        <div className="text-xl font-black text-slate-900">{totals.food}</div>
                    </div>
                    <div className="p-3 bg-emerald-100 rounded-2xl border border-emerald-200">
                        <Apple className="h-5 w-5 text-emerald-600" />
                    </div>
                </div>
            </div>
         </div>
      </Card>
    </div>
  );
}
