'use client';

import { useMemo } from 'react';
import type { DailyLog, DailyLogItem, DailyLogActivity, UserProfile } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { LevelBadge, XPCrystal, QuestScroll, ManaPotion } from './game-icons';
import { getLevelProgress } from '@/lib/level-system';
import { Star, Zap, Shield, Trophy } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type HeroStatusCardProps = {
  foodItems?: DailyLogItem[] | null;
  activities?: DailyLogActivity[] | null;
  userProfile: UserProfile;
  selectedLog: DailyLog | null;
};

export function HeroStatusCard({ foodItems, activities, userProfile, selectedLog }: HeroStatusCardProps) {
  // --- XP & Level Calculation ---
  const xpStats = useMemo(() => {
    return getLevelProgress(userProfile.xp || 0);
  }, [userProfile.xp]);

  // --- Daily Quest Calculation (Deficit) ---
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
  // But wait, user gains XP based on Deficit.
  // Daily Quest: Reach Target Deficit.

  const currentDeficit = (maintenanceCalories + totals.active) - totals.food;
  const isDeficitPositive = currentDeficit > 0;
  const deficitProgress = Math.min(100, Math.max(0, (currentDeficit / deficitTarget) * 100));

  // --- Macros ---
  // If needed later. For now, focus on Quest.

  if(!userProfile?.dailyCalories) {
      return (
          <Card className="rpg-card p-6 text-center">
              <h3 className="font-headline text-xl mb-2">Character Not Created</h3>
              <p className="text-muted-foreground mb-4">You need to set up your profile to start the game.</p>
              <Button asChild className="w-full">
                  <Link href="/profile">Create Character</Link>
              </Button>
          </Card>
      )
  }

  return (
    <div className="space-y-4">
      {/* Main Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rpg-card bg-slate-900 text-white p-4 relative overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[url('/app-icon.svg')] bg-center bg-no-repeat bg-cover mix-blend-overlay"></div>

        <div className="flex items-center gap-4 relative z-10">
            {/* Level Badge */}
            <div className="w-16 h-16 shrink-0">
                <LevelBadge level={xpStats.currentLevel} />
            </div>

            <div className="flex-1 space-y-2">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-xl font-headline font-bold text-amber-400 tracking-wide">
                            {userProfile.name || 'Hero'}
                        </h2>
                        <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                            <Shield className="h-3 w-3" />
                            <span>Warrior Class</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-black font-mono text-white">
                            {xpStats.xpInLevel}
                        </span>
                        <span className="text-xs text-slate-400 font-bold ml-1">/ {xpStats.xpRequired} XP</span>
                    </div>
                </div>

                {/* XP Bar */}
                <div className="relative h-4 bg-slate-800 rounded-full border border-slate-700 overflow-hidden">
                    <motion.div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-600 to-yellow-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${xpStats.progressPercent}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    />
                </div>
            </div>
        </div>
      </motion.div>

      {/* Daily Quest Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quest Progress */}
        <Card className="rpg-card border-l-4 border-l-primary">
            <CardContent className="p-4 pt-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <QuestScroll className="h-6 w-6 text-amber-700" />
                        <h3 className="font-headline font-bold text-lg text-amber-900">Daily Quest</h3>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground bg-amber-100 px-2 py-1 rounded text-amber-800">
                        Rank {xpStats.currentLevel}
                    </span>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-1 font-bold">
                            <span className="text-muted-foreground">Main Objective: Deficit</span>
                            <span className={cn(
                                isDeficitPositive ? "text-primary" : "text-destructive"
                            )}>
                                {currentDeficit.toFixed(0)} / {deficitTarget}
                            </span>
                        </div>
                        <Progress value={deficitProgress} className="h-2 bg-slate-100 [&>div]:bg-primary" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed">
                         <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 rounded text-blue-600">
                                <ManaPotion className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase font-bold text-muted-foreground">Consumed</div>
                                <div className="font-mono font-bold">{totals.food}</div>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-orange-100 rounded text-orange-600">
                                <Zap className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase font-bold text-muted-foreground">Energy Burned</div>
                                <div className="font-mono font-bold">+{totals.active}</div>
                            </div>
                         </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Stats / Inventory Summary */}
        <Card className="rpg-card bg-slate-50 border-slate-200">
            <CardContent className="p-4 pt-4 h-full flex flex-col justify-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-white rounded-full shadow-sm border border-slate-100">
                        <Trophy className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div>
                        <div className="text-xs font-bold uppercase text-slate-500 tracking-wider">Total XP</div>
                        <div className="text-2xl font-black font-mono text-slate-800">
                            {userProfile.xp?.toLocaleString() || 0}
                        </div>
                    </div>
                </div>
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-white rounded-full shadow-sm border border-slate-100">
                        <Star className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                        <div className="text-xs font-bold uppercase text-slate-500 tracking-wider">Title</div>
                        <div className="text-lg font-headline font-bold text-slate-800">
                            {xpStats.currentLevel < 5 ? 'Novice Adventurer' :
                             xpStats.currentLevel < 10 ? 'Apprentice Hero' :
                             xpStats.currentLevel < 20 ? 'Seasoned Warrior' : 'Legendary Guardian'}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
