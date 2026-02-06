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
import { DeficitProgressChart, ChartDataPoint } from '@/components/app/deficit-progress-chart';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/90 backdrop-blur-xl p-3 shadow-xl">
        <div className="flex flex-col space-y-1">
            <span className="text-[0.7rem] uppercase text-muted-foreground font-black tracking-wider">{label ? format(new Date(label), 'MMM d') : ''}</span>
            {payload.map((pld: any) => (
                <div key={pld.dataKey} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pld.color }}></div>
                    <span className="font-bold text-foreground text-sm">
                        {pld.name === 'weight' ? 'Actual' : 'Trend'}: <span style={{ color: pld.color }}>{pld.value} kg</span>
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

  // Prepare data for Deficit Chart
  const deficitChartData: ChartDataPoint[] = useMemo(() => {
    return dailyLogs?.map(log => ({
        date: log.date,
        consumedCalories: log.consumedCalories,
        activeCalories: log.activeCalories,
        maintenanceCalories: log.maintenanceCalories,
        goalCalories: log.goalCalories,
    })) || [];
  }, [dailyLogs]);

  
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
    
    // We need dates from both logs and weight history
    const allDatesSet = new Set<string>();
    dailyLogs?.forEach(l => allDatesSet.add(l.date));
    sortedWeightHistory?.forEach(w => allDatesSet.add(w.date));

    const allDates = Array.from(allDatesSet).sort();
    const weightMap = new Map(sortedWeightHistory?.map(entry => [entry.date, entry.weight]) ?? []);

    let lastSeenWeight: number | null = null;
    
    const mappedData = allDates.map(date => {
        const weightOnDate = weightMap.get(date);
        if (weightOnDate !== undefined) {
            lastSeenWeight = weightOnDate;
        }
        return {
            date: date,
            weight: lastSeenWeight
        };
    });

    // Calculate Trend
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
    
    // Filter to show only relevant data range (e.g. where we have weight or trend)
    // Actually, prompt says "Weight over Time"
    // Let's return all data points where we have at least one valid value
    return dataWithTrend.filter(d => d.weight !== null || d.weightTrend !== null);
  }, [dailyLogs, weightHistory, isLogsLoading, isWeightLoading]);


  if (isWeightLoading || isLogsLoading) {
    return <Loading />;
  }

  const noWeightData = !chartData || chartData.length === 0;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background pb-32 md:pb-8">
      <AppHeader userProfile={userProfile} />
      <main className="container mx-auto max-w-xl flex-1 space-y-6 p-4">

        {/* Header Section */}
        <div className="flex flex-row justify-between items-center">
          <h1 className="text-2xl font-black text-foreground tracking-tight">Progress</h1>
          <AddWeightEntrySheet>
              <Button size="sm" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6 shadow-lg shadow-primary/20">
                  <Plus className="mr-1 h-4 w-4" />
                  Log Weight
              </Button>
          </AddWeightEntrySheet>
        </div>

        {/* Deficit Chart & Stats */}
        <DeficitProgressChart
            chartData={deficitChartData}
            maintenanceCalories={userProfile?.maintenanceCalories}
        />

        {/* Weight Trend Section */}
        {noWeightData ? (
             <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed bg-transparent shadow-none border-2 border-border/50">
                <CardHeader>
                    <CardTitle className="text-foreground font-bold">No Weight Data Yet</CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">Start logging your weight to see trends.</CardDescription>
                </CardHeader>
            </Card>
        ) : (
            <div className="space-y-6">
                {/* Weight Trend Chart */}
                <Card className="border-border/50 shadow-sm bg-card overflow-visible">
                    <CardHeader className="pb-2 border-b border-border/40">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold text-foreground">Weight Trend</CardTitle>
                                <CardDescription className="text-muted-foreground text-xs">Actual vs 7-day average</CardDescription>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-medium">
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
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(date) => format(new Date(date), 'MMM d')}
                                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                    minTickGap={40}
                                />
                                <YAxis
                                    domain={['auto', 'auto']}
                                    unit="kg"
                                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={40}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }} />

                                {/* Actual Weight Line */}
                                <Line
                                    type="monotone"
                                    dataKey="weight"
                                    stroke="#CBD5E1"
                                    strokeWidth={2}
                                    strokeOpacity={0.8}
                                    dot={{ fill: '#CBD5E1', r: 3, strokeWidth: 0 }}
                                    activeDot={{ r: 5, strokeWidth: 0, fill: '#94A3B8' }}
                                    connectNulls
                                />

                                {/* Trend Line */}
                                <Line
                                    type="monotone"
                                    dataKey="weightTrend"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={3}
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
                                            if (index === chartData.length - 1 && value) {
                                                return (
                                                    <g>
                                                        <rect
                                                            x={x - 24}
                                                            y={y - 30}
                                                            width="48"
                                                            height="24"
                                                            rx="6"
                                                            fill="hsl(var(--primary))"
                                                        />
                                                        <text
                                                            x={x}
                                                            y={y - 14}
                                                            fill="white"
                                                            fontSize={11}
                                                            fontWeight="bold"
                                                            textAnchor="middle"
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
            </div>
        )}
        
        {weightHistory && weightHistory.length > 0 && (
            <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">History</h3>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:bg-secondary">
                            <ChevronsUpDown className="h-4 w-4" />
                        </Button>
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                    <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-secondary/30 border-b border-border/50">
                                    <TableHead className="w-[100px] text-xs font-bold text-muted-foreground uppercase">Date</TableHead>
                                    <TableHead className="text-xs font-bold text-muted-foreground uppercase">Weight</TableHead>
                                    <TableHead className="text-right text-xs font-bold text-muted-foreground"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {weightHistory.map((entry) => (
                                    <TableRow key={entry.id} className="hover:bg-secondary/20 border-b border-border/50 last:border-0">
                                        <TableCell className="font-medium text-foreground py-3">{format(new Date(entry.date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell className="font-bold text-foreground py-3">{entry.weight} kg</TableCell>
                                        <TableCell className="text-right py-3">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full">
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
                                                    <AlertDialogAction onClick={() => handleDeleteWeightEntry(entry.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
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
