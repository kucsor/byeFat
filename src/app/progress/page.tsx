'use client';

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { format } from 'date-fns';
import { AppHeader } from '@/components/app/header';
import { useFirebase, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import Loading from '@/app/loading';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import type { WeightEntry, DailyLog } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AddWeightEntrySheet } from '@/components/app/add-weight-entry-sheet';
import { Plus, Trash2, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { triggerHapticFeedback } from '@/lib/haptics';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { BottomNav } from '@/components/app/bottom-nav';
import { DeficitProgressChart } from '@/components/app/deficit-progress-chart';


const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-white/50 bg-white/80 backdrop-blur-xl p-3 shadow-xl">
        <div className="flex flex-col space-y-1">
            <span className="text-[0.7rem] uppercase text-muted-foreground font-black tracking-wider">{label ? format(new Date(label), 'MMM d') : ''}</span>
            {payload.map((pld: any) => (
                <div key={pld.dataKey} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pld.color }}></div>
                    <span className="font-bold text-foreground text-sm">
                        {pld.name === 'weight' ? 'Weight' : '7-Day Trend'}: <span style={{ color: pld.color }}>{pld.value} kg</span>
                    </span>
                </div>
            ))}
        </div>
      </div>
    );
  }
  return null;
};


export default function ProgressPage() {
  const { firestore, user, userProfile } = useFirebase();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const weightHistoryQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `users/${user.uid}/weightHistory`),
      orderBy('date', 'desc')
    );
  }, [firestore, user]);

  const { data: weightHistory, isLoading: isWeightLoading } = useCollection<WeightEntry>(weightHistoryQuery);

  const dailyLogsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, `users/${user.uid}/dailyLogs`),
        orderBy('date', 'asc')
    );
  }, [firestore, user]);

  const { data: dailyLogs, isLoading: isLogsLoading } = useCollection<DailyLog>(dailyLogsQuery);

  const stats = useMemo(() => {
    if (!weightHistory || weightHistory.length === 0) {
      return null;
    }
    
    const initialWeight = weightHistory[weightHistory.length - 1]?.weight;
    const currentWeight = weightHistory[0]?.weight;
    const weightChange = currentWeight - initialWeight;

    let bmi = null;
    if (userProfile?.height && currentWeight) {
        const heightInMeters = userProfile.height / 100;
        bmi = currentWeight / (heightInMeters * heightInMeters);
    }
    
    return {
      initialWeight,
      currentWeight,
      weightChange,
      bmi,
    };
  }, [weightHistory, userProfile?.height]);
  
  const handleDeleteWeightEntry = (id: string) => {
    if (!user) return;
    const docRef = doc(firestore, `users/${user.uid}/weightHistory`, id);
    deleteDocumentNonBlocking(docRef);
    triggerHapticFeedback();
  };

  const chartData = useMemo(() => {
    const sortedWeightHistory = [...(weightHistory || [])].sort((a,b) => a.date.localeCompare(b.date));

    if (isLogsLoading || isWeightLoading) {
      return [];
    }
    
    const logMap = new Map(dailyLogs?.map(log => [log.date, { goal: log.goalCalories, consumed: log.consumedCalories, active: log.activeCalories }]) ?? []);
    const weightMap = new Map(sortedWeightHistory?.map(entry => [entry.date, entry.weight]) ?? []);

    const datesWithFood = dailyLogs
      ?.filter(log => (log.consumedCalories || 0) > 0 || (log.activeCalories || 0) > 0)
      .map(log => log.date) || [];

    if (datesWithFood.length === 0 && weightMap.size === 0) {
      return [];
    }

    const allDates = [...new Set([...datesWithFood, ...Array.from(weightMap.keys())])].sort();

    let lastSeenWeight: number | null = null;
    
    const mappedData = allDates.map(date => {
        const log = logMap.get(date);
        const weightOnDate = weightMap.get(date);

        if (weightOnDate !== undefined) {
            lastSeenWeight = weightOnDate;
        }
        
        const calorieBalance = (log?.goal != null && log?.consumed != null) ? log.goal - log.consumed : null;

        return {
            date: date,
            goalCalories: log?.goal,
            consumedCalories: log?.consumed,
            activeCalories: log?.active,
            calorieBalance,
            weight: lastSeenWeight
        };
    }).filter(d => d.date);

    const dataWithTrend = mappedData.map((dataPoint, index) => {
        const past7DaysWeights: number[] = [];
        for (let i = 0; i < 7; i++) {
            if (index - i >= 0) {
                const pastDataPoint = mappedData[index - i];
                if (pastDataPoint.weight !== null) {
                    past7DaysWeights.push(pastDataPoint.weight);
                }
            }
        }
        
        if (past7DaysWeights.length > 0) {
            const sum = past7DaysWeights.reduce((a, b) => a + b, 0);
            const avg = sum / past7DaysWeights.length;
            return { ...dataPoint, weightTrend: parseFloat(avg.toFixed(2)) };
        }

        return { ...dataPoint, weightTrend: null };
    });
    
    return dataWithTrend;
  }, [dailyLogs, weightHistory, isLogsLoading, isWeightLoading]);

  // Clean data for chart
  const chartDisplayData = useMemo(() => {
     return chartData.filter(d => d.weight !== null || d.weightTrend !== null);
  }, [chartData]);


  if (isWeightLoading || isLogsLoading) {
    return <Loading />;
  }

  const noData = !chartData || chartData.length === 0;

  return (
    <div className="flex min-h-screen w-full flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-white">
      <AppHeader userProfile={userProfile} />
      <main className="container mx-auto max-w-xl flex-1 space-y-6 p-4 pb-24 md:p-8 md:pb-8">
        <div className="flex flex-row justify-between items-center">
          <h1 className="text-3xl font-black text-foreground tracking-tight drop-shadow-sm">Progress</h1>
          <AddWeightEntrySheet>
              <Button size="sm" className="rounded-full shadow-lg shadow-primary/30 bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 font-bold">
                  <Plus className="mr-1 h-4 w-4" />
                  Log Weight
              </Button>
          </AddWeightEntrySheet>
        </div>

        {stats && (
            <div className="grid grid-cols-2 gap-4">
                <Card className="glass-card border-white/20">
                    <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">Current</span>
                        <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-4xl font-black text-foreground drop-shadow-sm">{stats.currentWeight?.toFixed(1)}</span>
                            <span className="text-sm font-bold text-muted-foreground">kg</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card border-white/20">
                    <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">Change</span>
                        <div className={cn(
                            "flex items-center gap-1 mt-2 text-4xl font-black drop-shadow-sm",
                            stats.weightChange > 0 ? "text-rose-500" : "text-emerald-500"
                        )}>
                            {stats.weightChange > 0 ? '+' : ''}{stats.weightChange.toFixed(1)}
                            <span className="text-sm font-bold text-muted-foreground opacity-60">kg</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

        {noData ? (
             <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed bg-transparent shadow-none border-2 border-slate-200">
                <CardHeader>
                    <CardTitle className="text-foreground font-black">No Data Yet</CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">Start logging your weight to see trends.</CardDescription>
                </CardHeader>
            </Card>
        ) : (
            <div className="space-y-6">
                {/* Weight Chart - Compact */}
                <Card className="glass-card border-white/20 overflow-visible z-10">
                    <CardHeader className="pb-2 border-b border-white/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-black text-foreground">Weight Trend</CardTitle>
                                <CardDescription className="text-muted-foreground font-medium text-xs">Actual vs 7-day average</CardDescription>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-bold">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                    Actual
                                </div>
                                <div className="flex items-center gap-1 text-primary">
                                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                                    Trend
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-72 w-full pt-6 pr-6">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartDisplayData} margin={{ top: 10, right: 40, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(date) => format(new Date(date), 'MMM d')}
                                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 700 }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                    minTickGap={30}
                                />
                                <YAxis
                                    domain={['auto', 'auto']}
                                    unit="kg"
                                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 700 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={40}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }} />

                                {/* Actual Weight Line */}
                                <Line
                                    type="monotone"
                                    dataKey="weight"
                                    stroke="#94A3B8"
                                    strokeWidth={2}
                                    strokeOpacity={0.5}
                                    dot={{ fill: '#94A3B8', r: 2, strokeWidth: 0, opacity: 0.5 }}
                                    activeDot={{ r: 4, strokeWidth: 0, fill: '#64748B' }}
                                    connectNulls
                                />

                                {/* Trend Line */}
                                <Line
                                    type="monotone"
                                    dataKey="weightTrend"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={4}
                                    dot={false}
                                    activeDot={{ r: 6, strokeWidth: 3, stroke: '#fff', fill: 'hsl(var(--primary))' }}
                                    animationDuration={1500}
                                    connectNulls
                                >
                                    <LabelList
                                        dataKey="weightTrend"
                                        position="right"
                                        content={(props: any) => {
                                            const { x, y, value, index } = props;
                                            // Only show label for the very last data point
                                            if (index === chartDisplayData.length - 1) {
                                                return (
                                                    <g>
                                                        {/* Styled Bubble */}
                                                        <rect
                                                            x={x + 8}
                                                            y={y - 12}
                                                            width="48"
                                                            height="24"
                                                            rx="8"
                                                            fill="hsl(var(--primary))"
                                                            filter="drop-shadow(0px 4px 8px rgba(37, 99, 235, 0.3))"
                                                        />
                                                        {/* Triangle/Arrow pointing left */}
                                                        <path d={`M ${x+8} ${y} L ${x+12} ${y-4} L ${x+12} ${y+4} Z`} fill="hsl(var(--primary))" />

                                                        {/* Text Value */}
                                                        <text
                                                            x={x + 32}
                                                            y={y + 5}
                                                            fill="white"
                                                            fontSize={11}
                                                            fontWeight="900"
                                                            textAnchor="middle"
                                                            style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.1)' }}
                                                        >
                                                            {value}
                                                        </text>
                                                    </g>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                </Line>
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Deficit Chart - Full Width */}
                <div>
                    <DeficitProgressChart
                        chartData={chartData}
                        maintenanceCalories={userProfile?.maintenanceCalories}
                    />
                </div>
            </div>
        )}
        
        {weightHistory && weightHistory.length > 0 && (
            <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">History</h3>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:bg-white/50">
                            <ChevronsUpDown className="h-4 w-4" />
                        </Button>
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                    <div className="rounded-xl border border-white/20 bg-white/40 backdrop-blur-md overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-white/30 hover:bg-white/40 border-b border-white/20">
                                    <TableHead className="w-[100px] text-xs font-black text-muted-foreground uppercase">Date</TableHead>
                                    <TableHead className="text-xs font-black text-muted-foreground uppercase">Weight</TableHead>
                                    <TableHead className="text-right text-xs font-bold text-muted-foreground"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {weightHistory.map((entry) => (
                                    <TableRow key={entry.id} className="hover:bg-white/50 border-b border-white/20 last:border-0 transition-colors">
                                        <TableCell className="font-bold text-muted-foreground py-3">{format(new Date(entry.date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell className="font-black text-foreground py-3">{entry.weight} kg</TableCell>
                                        <TableCell className="text-right py-3">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/50 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="glass-card border-white/20">
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle className="font-black">Delete Entry?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteWeightEntry(entry.id)} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold shadow-lg shadow-rose-500/20">Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
