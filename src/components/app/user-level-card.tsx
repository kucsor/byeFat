'use client';

import { motion } from 'framer-motion';
import { calculateLevel } from '@/lib/gamification';
import { Card } from '@/components/ui/card';
import { Zap, Trophy } from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useMemo } from 'react';
import type { DailyLog } from '@/lib/types';

type UserLevelCardProps = {
  initialDeficit?: number;
};

export function UserLevelCard({ initialDeficit }: UserLevelCardProps) {
  const { firestore, user } = useFirebase();

  const dailyLogsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/dailyLogs`));
  }, [firestore, user]);

  const { data: dailyLogs } = useCollection<DailyLog>(dailyLogsQuery);

  const totalDeficit = useMemo(() => {
    if (initialDeficit !== undefined) return initialDeficit;
    if (!dailyLogs) return 0;

    return dailyLogs.reduce((acc, log) => {
        const maintenance = log.maintenanceCalories || 2000;
        const active = log.activeCalories || 0;
        const consumed = log.consumedCalories || 0;

        // Only count days where they actually logged something (consumed > 0)
        if (consumed > 0) {
            const deficit = (maintenance + active) - consumed;
            // Only add positive deficits (or should we subtract surplus? Typically gamification rewards positive behavior, so maybe max(0, deficit))
            // Let's assume net deficit is what matters. If they overeat, they lose progress? Or just don't gain?
            // "Experience" usually doesn't go down. Let's cap at 0 for now to be "cheerful".
            return acc + Math.max(0, deficit);
        }
        return acc;
    }, 0);
  }, [dailyLogs, initialDeficit]);

  const { level, currentXP, nextLevelXP, progress } = calculateLevel(totalDeficit);

  return (
    <Card className="glass-card p-6 border-white/20 relative overflow-hidden group">
      {/* Background Decorative Glows */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-all duration-700" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 group-hover:bg-accent/20 transition-all duration-700" />

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">

        {/* Level Badge */}
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/40 backdrop-blur-md shadow-xl flex items-center justify-center border border-white/50 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-50" />
             <div className="flex flex-col items-center relative z-10">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Level</span>
                <span className="text-4xl md:text-5xl font-black text-primary tracking-tighter drop-shadow-sm">
                    {level}
                </span>
             </div>
          </div>
          {/* Rank Icon Badge */}
          <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 p-2 rounded-xl shadow-lg shadow-orange-500/20 text-white transform rotate-3 group-hover:rotate-6 transition-transform">
            <Trophy className="w-4 h-4" />
          </div>
        </div>

        {/* Stats & Progress */}
        <div className="flex-1 w-full space-y-4">
          <div className="flex justify-between items-end">
            <div>
                <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                    Caloric Master
                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20">
                        Rank {level}
                    </span>
                </h3>
                <p className="text-sm text-muted-foreground font-medium mt-1">
                    Burn calories to evolve.
                </p>
            </div>
            <div className="text-right hidden md:block">
                <div className="text-2xl font-black text-foreground">{totalDeficit.toLocaleString()}</div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total XP</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold tracking-wide">
                <span className="text-primary flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-primary" />
                    {currentXP} XP
                </span>
                <span className="text-muted-foreground">
                    {nextLevelXP} XP
                </span>
            </div>

            <div className="h-4 w-full bg-white/30 rounded-full overflow-hidden p-1 shadow-inner border border-white/20">
                <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 shadow-[0_0_15px_rgba(0,102,255,0.5)] relative overflow-hidden"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1.5, ease: "circOut" }}
                >
                    <div className="absolute top-0 right-0 bottom-0 w-full bg-white/20 animate-shimmer" />
                </motion.div>
            </div>

            <p className="text-[10px] text-muted-foreground font-semibold text-center md:text-left pt-1">
                <span className="text-foreground font-black">{(nextLevelXP - currentXP).toLocaleString()} XP</span> needed for Level {level + 1}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
