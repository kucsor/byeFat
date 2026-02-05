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
  ReferenceLine,
  Label,
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
import { Plus, Trash2, TrendingUp, TrendingDown, ChevronsUpDown } from 'lucide-react';
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
      <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
        <div className="flex flex-col space-y-1">
            <span className="text-[0.7rem] uppercase text-slate-500 font-bold">{label ? format(new Date(label), 'MMM d') : ''}</span>
            {payload.map((pld: any) => (
                <span key={pld.dataKey} className="font-bold text-slate-900">
                    {pld.value} kg
                </span>
            ))}
        </div>
      </div>
    );
  }
  return null;
};

const getBmiCategory = (bmi: number): string => {
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Normal";
    if (bmi < 30) return "Overweight";
    return "Obese";
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

  const lastTrendValue = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;
    const lastPoint = chartData[chartData.length - 1];
    return lastPoint.weightTrend;
  }, [chartData]);
  
  if (isWeightLoading || isLogsLoading) {
    return <Loading />;
  }

  const noData = !chartData || chartData.length === 0 || (chartData.every(d => !d.weight) && chartData.every(d => !d.goalCalories));

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50">
      <AppHeader userProfile={userProfile} />
      <main className="container mx-auto max-w-xl flex-1 space-y-6 p-4 pb-24 md:p-8 md:pb-8">
        <div className="flex flex-row justify-between items-center">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Progress</h1>
          <AddWeightEntrySheet>
              <Button size="sm" className="rounded-full shadow-md bg-slate-900 text-white hover:bg-slate-800">
                  <Plus className="mr-1 h-4 w-4" />
                  Log Weight
              </Button>
          </AddWeightEntrySheet>
        </div>

        {stats && (
            <div className="grid grid-cols-2 gap-4">
                <Card className="shadow-sm border-slate-200 bg-white">
                    <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Current</span>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-3xl font-black text-slate-900">{stats.currentWeight?.toFixed(1)}</span>
                            <span className="text-sm font-bold text-slate-400">kg</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200 bg-white">
                    <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Change</span>
                        <div className={cn(
                            "flex items-center gap-1 mt-1 text-3xl font-black",
                            stats.weightChange > 0 ? "text-rose-500" : "text-emerald-500"
                        )}>
                            {stats.weightChange > 0 ? '+' : ''}{stats.weightChange.toFixed(1)}
                            <span className="text-sm font-bold text-slate-400 opacity-60">kg</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

        {noData ? (
             <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed bg-transparent shadow-none">
                <CardHeader>
                    <CardTitle className="text-slate-900">No Data Yet</CardTitle>
                    <CardDescription>Start logging your weight to see trends.</CardDescription>
                </CardHeader>
            </Card>
        ) : (
            <div className="space-y-6">
                {/* Weight Chart - Compact */}
                <Card className="shadow-sm border-slate-200 bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold text-slate-900">Weight Trend</CardTitle>
                        <CardDescription className="text-slate-500 text-xs">7-day moving average</CardDescription>
                    </CardHeader>
                    <CardContent className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData.filter(d => d.weight || d.weightTrend)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(date) => format(new Date(date), 'MMM d')}
                                    tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    domain={['dataMin - 1', 'dataMax + 1']}
                                    unit="kg"
                                    tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94A3B8', strokeWidth: 1 }} />
                                <Line
                                    type="monotone"
                                    dataKey="weight"
                                    stroke="#CBD5E1"
                                    strokeWidth={2}
                                    dot={{ fill: '#CBD5E1', r: 2, strokeWidth: 0 }}
                                    activeDot={{ r: 4, strokeWidth: 0 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="weightTrend"
                                    stroke="#2563EB"
                                    strokeWidth={3}
                                    dot={false}
                                    animationDuration={1500}
                                />
                                {lastTrendValue && (
                                    <ReferenceLine y={lastTrendValue} stroke="#2563EB" strokeDasharray="3 3" strokeOpacity={0.5}>
                                        <Label
                                            value={`${lastTrendValue}`}
                                            position="right"
                                            fill="#2563EB"
                                            fontSize={10}
                                            fontWeight="bold"
                                            className="bg-white px-1"
                                        />
                                    </ReferenceLine>
                                )}
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
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">History</h3>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400">
                            <ChevronsUpDown className="h-4 w-4" />
                        </Button>
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 hover:bg-slate-50">
                                    <TableHead className="w-[100px] text-xs font-bold text-slate-500">Date</TableHead>
                                    <TableHead className="text-xs font-bold text-slate-500">Weight</TableHead>
                                    <TableHead className="text-right text-xs font-bold text-slate-500"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {weightHistory.map((entry) => (
                                    <TableRow key={entry.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                                        <TableCell className="font-medium text-slate-700 py-3">{format(new Date(entry.date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell className="font-bold text-slate-900 py-3">{entry.weight} kg</TableCell>
                                        <TableCell className="text-right py-3">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteWeightEntry(entry.id)} className="bg-destructive text-white">Delete</AlertDialogAction>
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
