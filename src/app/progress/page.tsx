'use client';

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import { AppHeader } from '@/components/app/header';
import { useFirebase, useCollection, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import Loading from '@/app/loading';
import { collection, query, orderBy, doc, increment } from 'firebase/firestore';
import type { WeightEntry, DailyLog } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AddWeightEntrySheet } from '@/components/app/add-weight-entry-sheet';
import { Plus, Trash2, Scale, TrendingUp, TrendingDown, HeartPulse, Flame, ChevronsUpDown, Target } from 'lucide-react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { BottomNav } from '@/components/app/bottom-nav';
import { DeficitProgressChart } from '@/components/app/deficit-progress-chart';


// Custom Tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col space-y-1">
                <span className="text-[0.7rem] uppercase text-muted-foreground">Date</span>
                <span className="font-bold">{label ? format(new Date(label), 'MMM d, yyyy') : ''}</span>
            </div>
            {payload.map((pld: any) => (
                <div key={pld.dataKey} className="flex flex-col space-y-1">
                    <span className="text-[0.7rem] uppercase text-muted-foreground">{pld.name}</span>
                    <span className="font-bold" style={{ color: pld.color }}>
                        {pld.value} {pld.unit}
                    </span>
                </div>
            ))}
        </div>
      </div>
    );
  }
  return null;
};

const getBmiCategory = (bmi: number): string => {
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Normal weight";
    if (bmi < 30) return "Overweight";
    return "Obese";
};


export default function ProgressPage() {
  const { firestore, user, userProfile } = useFirebase();
  const isMobile = useIsMobile();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const weightHistoryQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `users/${user.uid}/weightHistory`),
      orderBy('date', 'desc') // Show most recent first in the table
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

  const streak = useMemo(() => {
    if (!dailyLogs || dailyLogs.length < 1) {
        return 0;
    }
    
    const sortedLogs = [...dailyLogs].sort((a, b) => b.date.localeCompare(a.date));
    
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    const todayStr = format(today, 'yyyy-MM-dd');
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

    const lastLogDateStr = sortedLogs[0].date;
    
    if (lastLogDateStr !== todayStr && lastLogDateStr !== yesterdayStr) {
        return 0;
    }
    
    let currentStreak = 0;
    // Use replace to handle date string parsing safely across timezones
    let expectedDate = new Date(lastLogDateStr.replace(/-/g, '/'));

    for (const log of sortedLogs) {
        const expectedDateStr = format(expectedDate, 'yyyy-MM-dd');
        if (log.date === expectedDateStr) {
            currentStreak++;
            expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    return currentStreak;
  }, [dailyLogs]);

  const loggedDates = useMemo(() => {
    if (!dailyLogs) return [];
    // Use replace to handle date string parsing safely across timezones
    return dailyLogs.map(log => new Date(log.date.replace(/-/g, '/')));
  }, [dailyLogs]);
  
  const defaultCalendarMonth = useMemo(() => {
    if (loggedDates.length > 0) {
      // Sort to find the most recent date to show in the calendar
      const sortedDates = [...loggedDates].sort((a, b) => b.getTime() - a.getTime());
      return sortedDates[0];
    }
    return new Date();
  }, [loggedDates]);

  const stats = useMemo(() => {
    if (!weightHistory || weightHistory.length === 0) {
      return null;
    }
    
    // History is desc, so current is [0] and initial is last element
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
    
    // Include all daily logs, even those without weight history
    const logMap = new Map(dailyLogs?.map(log => [log.date, { goal: log.goalCalories, consumed: log.consumedCalories, active: log.activeCalories }]) ?? []);
    const weightMap = new Map(sortedWeightHistory?.map(entry => [entry.date, entry.weight]) ?? []);

    // Get all dates from logs that have consumed calories > 0 OR active calories > 0
    const datesWithFood = dailyLogs
      ?.filter(log => (log.consumedCalories || 0) > 0 || (log.activeCalories || 0) > 0)
      .map(log => log.date) || [];

    if (datesWithFood.length === 0 && weightMap.size === 0) {
      return [];
    }

    const allDates = [...new Set([...datesWithFood, ...Array.from(weightMap.keys())])].sort();
    console.log('All dates for chart:', allDates);

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
  
  if (isWeightLoading || isLogsLoading) {
    return <Loading />;
  }

  const noData = !chartData || chartData.length === 0 || (chartData.every(d => !d.weight) && chartData.every(d => !d.goalCalories));

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppHeader />
      <main className="container mx-auto max-w-5xl flex-1 space-y-8 p-4 pb-24 md:p-8 md:pb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight text-primary">Progresul Tău</h1>
            <p className="text-muted-foreground font-medium">Călătoria ta spre o viață mai sănătoasă.</p>
          </div>
          <AddWeightEntrySheet>
              <Button size="lg" className="rounded-2xl shadow-lg border-b-4 border-primary/20 active:border-b-0 active:translate-y-1 transition-all">
                  <Plus className="mr-2 h-5 w-5" />
                  Adaugă Greutate
              </Button>
          </AddWeightEntrySheet>
        </div>

        {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <Card className="border-2 border-primary/10 bg-card/50 backdrop-blur-sm shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                        <CardTitle className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Greutate Actuală</CardTitle>
                        <Scale className="h-4 w-4 text-primary opacity-50" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-3xl font-serif font-bold text-foreground">{stats.currentWeight?.toFixed(1)} <span className="text-sm font-sans font-bold text-muted-foreground">kg</span></div>
                    </CardContent>
                </Card>
                <Card className="border-2 border-primary/10 bg-card/50 backdrop-blur-sm shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                        <CardTitle className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Evoluție</CardTitle>
                         {stats.weightChange <= 0 ? <TrendingDown className="h-4 w-4 text-primary opacity-50" /> : <TrendingUp className="h-4 w-4 text-destructive opacity-50" />}
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className={cn(
                            "text-3xl font-serif font-bold",
                            stats.weightChange > 0 ? "text-destructive" : "text-primary"
                        )}>
                            {stats.weightChange > 0 ? '+' : ''}{stats.weightChange.toFixed(1)} <span className="text-sm font-sans font-bold opacity-70">kg</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-2 border-primary/10 bg-card/50 backdrop-blur-sm shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                        <CardTitle className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">BMI Actual</CardTitle>
                        <HeartPulse className="h-4 w-4 text-primary opacity-50" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-3xl font-serif font-bold text-foreground">{stats.bmi ? stats.bmi.toFixed(1) : 'N/A'}</div>
                        <div className="text-[10px] font-bold uppercase text-muted-foreground truncate">
                            {stats.bmi ? getBmiCategory(stats.bmi) : 'Setează înălțimea'}
                        </div>
                    </CardContent>
                </Card>
                 <Card className="border-2 border-primary/10 bg-card/50 backdrop-blur-sm shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                        <CardTitle className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Serie Activă</CardTitle>
                        <Flame className="h-4 w-4 text-accent opacity-50" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-3xl font-serif font-bold text-accent">{streak} <span className="text-sm font-sans font-bold text-muted-foreground">zile</span></div>
                    </CardContent>
                </Card>
            </div>
        )}

        {noData ? (
             <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed">
                <CardHeader>
                    <CardTitle>Not Enough Data Yet</CardTitle>
                    <CardDescription>Update your weight in your profile or add a historical entry to start tracking your progress.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/profile">Update Profile</Link>
                    </Button>
                </CardContent>
            </Card>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Weight Chart - Large */}
                <Card className="md:col-span-12 lg:col-span-8 shadow-lg border-2 border-primary/5 bg-card relative overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(#8b5a2b_1px,transparent_1px)] [background-size:20px_20px]" />
                    <CardHeader>
                        <CardTitle className="text-2xl font-serif">Greutate în Timp</CardTitle>
                        <CardDescription className="text-xs uppercase font-bold tracking-widest">Fluctuații zilnice și trendul pe 7 zile</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80 pt-4">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData.filter(d => d.weight || d.weightTrend)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="hsl(var(--primary))" strokeOpacity={0.1} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(date) => format(new Date(date), 'd MMM')}
                                    tick={{ fontSize: 10, fontWeight: 'bold' }}
                                    axisLine={{ stroke: 'hsl(var(--primary))', strokeOpacity: 0.2 }}
                                />
                                <YAxis
                                    domain={['dataMin - 2', 'dataMax + 2']}
                                    unit="kg"
                                    tick={{ fontSize: 10, fontWeight: 'bold' }}
                                    axisLine={{ stroke: 'hsl(var(--primary))', strokeOpacity: 0.2 }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', paddingTop: '10px' }} />
                                <Line
                                    type="monotone"
                                    dataKey="weight"
                                    name="Greutate Zilnică"
                                    stroke="hsl(var(--muted-foreground))"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    unit="kg"
                                    dot={{ fill: 'hsl(var(--muted-foreground))', r: 2 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="weightTrend"
                                    name="Trend 7 Zile"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={3}
                                    unit="kg"
                                    dot={false}
                                    animationDuration={2000}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Personal Records - Bento Side */}
                <div className="md:col-span-12 lg:col-span-4 grid grid-cols-1 gap-6">
                    <Card className="shadow-md border-2 border-accent/20 bg-accent/5 relative overflow-hidden">
                         <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12">
                            <TrendingDown className="w-24 h-24 text-accent" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-serif">Record Personal</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-serif font-bold text-accent mb-1">
                            {stats?.weightChange && stats.weightChange < 0 ? Math.abs(stats.weightChange).toFixed(1) : '0.0'} kg
                            </div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Slăbit</p>
                            <div className="mt-4 pt-4 border-t border-accent/10 flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-accent/20">
                                    <Target className="h-4 w-4 text-accent" />
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                                    De la începutul călătoriei
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-md border-2 border-primary/20 bg-primary/5 relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-10 -rotate-12">
                            <Flame className="w-24 h-24 text-primary" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-serif">Consistență</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-serif font-bold text-primary mb-1">{streak}</div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Zile Consecutive</p>
                             <div className="mt-4 pt-4 border-t border-primary/10 flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-primary/20">
                                    <TrendingUp className="h-4 w-4 text-primary" />
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                                    Excelent! Continuă tot așa.
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Deficit Chart - Full Width */}
                <div className="md:col-span-12">
                    <DeficitProgressChart
                        chartData={chartData}
                        maintenanceCalories={userProfile?.maintenanceCalories}
                    />
                </div>
            </div>
        )}
        
        {weightHistory && weightHistory.length > 0 && (
            <Card>
              <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                  <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                          <CardTitle>Weight History</CardTitle>
                          <CardDescription>All recorded weight entries.</CardDescription>
                      </div>
                      <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon">
                              <ChevronsUpDown className="h-4 w-4" />
                              <span className="sr-only">Toggle history</span>
                          </Button>
                      </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Weight (kg)</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isHistoryOpen && weightHistory.map(entry => (
                                    <TableRow key={entry.id}>
                                        <TableCell>{format(new Date(entry.date), 'PPP')}</TableCell>
                                        <TableCell>{entry.weight} kg</TableCell>
                                        <TableCell className="text-right">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="sr-only">Delete</span>
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently delete the weight entry for {format(new Date(entry.date), 'PPP')}. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteWeightEntry(entry.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
