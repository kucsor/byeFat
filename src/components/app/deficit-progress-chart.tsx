'use client';

import { useMemo, useState } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  LabelList,
} from 'recharts';
import { format, subDays, parseISO, isAfter, startOfDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingDown, Target, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

type RangeType = '7' | '30' | 'all';

export type ChartDataPoint = {
  date: string;
  goalCalories?: number;
  consumedCalories?: number;
  activeCalories?: number;
  calorieBalance?: number | null;
  weight?: number | null;
  weightTrend?: number | null;
  maintenanceCalories?: number;
};

type DeficitProgressChartProps = {
  chartData: ChartDataPoint[];
  maintenanceCalories?: number;
};

export function DeficitProgressChart({ chartData, maintenanceCalories }: DeficitProgressChartProps) {
  const [range, setRange] = useState<RangeType>('30');

  // Calculate deficit data for each day - only include days with consumed calories and within range
  const deficitData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];

    const now = new Date();
    const cutoffDate = range === 'all' ? null : startOfDay(subDays(now, parseInt(range)));

    return chartData
      .filter((day) => {
        // Must have calorie data
        const hasCalories = (day.consumedCalories || 0) > 0;
        if (!hasCalories) return false;

        // Must be within selected range
        if (cutoffDate) {
          const dayDate = parseISO(day.date);
          return isAfter(dayDate, cutoffDate) || day.date === format(cutoffDate, 'yyyy-MM-dd');
        }
        return true;
      })
      .map((day) => {
        const maintenance = day.maintenanceCalories || maintenanceCalories || day.goalCalories || 2000;
        const consumed = day.consumedCalories || 0;
        const active = day.activeCalories || 0;
        // Total burned = Maintenance + Active Calories (Exercise)
        // Deficit = Total Burned - Consumed
        const deficit = (maintenance + active) - consumed;

        return {
          date: day.date,
          deficit: Math.round(deficit),
          maintenance: Math.round(maintenance),
          consumed: Math.round(consumed),
          active: Math.round(active),
        };
      });
  }, [chartData, maintenanceCalories, range]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (deficitData.length === 0) return null;

    const deficits = deficitData.map(d => d.deficit);
    const totalDeficit = deficits.reduce((sum, d) => sum + d, 0);
    const averageDeficit = totalDeficit / deficits.length;
    const maxDeficit = Math.max(...deficits);
    const minDeficit = Math.min(...deficits);

    // Projection: 7700 kcal = 1 kg fat
    // Monthly projection (30 days)
    const monthlyDeficit = averageDeficit * 30;
    const projectedWeightLossKg = monthlyDeficit / 7700;

    return {
      averageDeficit: Math.round(averageDeficit),
      totalDeficit: Math.round(totalDeficit),
      maxDeficit: Math.round(maxDeficit),
      minDeficit: Math.round(minDeficit),
      daysCount: deficits.length,
      projectedWeightLossKg: projectedWeightLossKg.toFixed(1),
      projectedWeightLossGrams: Math.round(projectedWeightLossKg * 1000),
    };
  }, [deficitData]);

  // Range Selector Component
  const RangeSelector = () => (
    <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg w-fit border border-border/50">
      {(['7', '30', 'all'] as const).map((r) => (
        <Button
          key={r}
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-3 text-[10px] font-bold uppercase rounded-md transition-all hover:bg-background/80",
            range === r ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          )}
          onClick={() => setRange(r)}
        >
          {r === 'all' ? 'Tot' : `${r} Zile`}
        </Button>
      ))}
    </div>
  );

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="rounded-xl border border-border/50 bg-card/95 backdrop-blur-sm p-3 shadow-xl">
          <div className="font-bold mb-2 text-foreground text-sm">{format(new Date(label), 'MMM d, yyyy')}</div>
          <div className="space-y-1 text-xs font-medium">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Deficit:</span>
              <span className="font-bold text-primary">{data.deficit} kcal</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Mentenanță:</span>
              <span className="font-bold text-foreground">{data.maintenance} kcal</span>
            </div>
            {data.active > 0 && (
                <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Activ:</span>
                    <span className="font-bold text-success">+{data.active} kcal</span>
                </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Consumat:</span>
              <span className="font-bold text-destructive">{data.consumed} kcal</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!stats || deficitData.length === 0) {
    return (
      <Card className="border-border/50 shadow-sm bg-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <CardTitle className="text-lg font-bold text-foreground">Caloric Deficit Trend</CardTitle>
            <CardDescription>Not enough data yet.</CardDescription>
          </div>
          <RangeSelector />
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
    <Card className="border-border/50 shadow-sm bg-card overflow-visible">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-primary" />
            Caloric Deficit Trend
          </CardTitle>
          <CardDescription className="text-muted-foreground font-medium text-xs">
            Daily deficit and weight loss projection
          </CardDescription>
        </div>
        <RangeSelector />
      </CardHeader>
      <CardContent className="pt-6">
        {/* Chart */}
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={deficitData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'MMM d')}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                dy={10}
                minTickGap={30}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                tickFormatter={(value) => `${value}`}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', paddingTop: '20px', fontWeight: 500 }}
              />
              
              {/* Area under the line */}
              <Area
                type="monotone"
                dataKey="deficit"
                name="Daily Deficit"
                stroke="none"
                fill="url(#deficitGradient)"
                fillOpacity={0.1}
              />
              <defs>
                <linearGradient id="deficitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              {/* Main deficit line */}
              <Line
                type="monotone"
                dataKey="deficit"
                name="Daily Deficit"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--background))', strokeWidth: 2, r: 4, stroke: 'hsl(var(--primary))' }}
                activeDot={{ r: 6, strokeWidth: 3, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))' }}
                animationDuration={1500}
              />
              
              {/* Average line */}
              <ReferenceLine
                y={stats.averageDeficit}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
                label={{
                  value: `AVG: ${stats.averageDeficit}`,
                  position: 'insideBottomRight',
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 10,
                  fontWeight: 600,
                  className: "bg-background/80 px-1"
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>

    {/* Statistics Grid */}
    <div className="grid grid-cols-2 gap-4">
        <Card className="border-border/50 shadow-sm bg-card p-4">
            <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Avg Deficit</span>
                <span className="text-2xl font-black text-foreground font-mono">{stats.averageDeficit}</span>
                <span className="text-[10px] text-muted-foreground">kcal / day</span>
            </div>
        </Card>

        <Card className="border-border/50 shadow-sm bg-card p-4">
            <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Days Logged</span>
                <span className="text-2xl font-black text-foreground font-mono">{stats.daysCount}</span>
                <span className="text-[10px] text-muted-foreground">total days</span>
            </div>
        </Card>

        <Card className="border-border/50 shadow-sm bg-card p-4">
            <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Best Day</span>
                <span className="text-2xl font-black text-foreground font-mono">{stats.maxDeficit}</span>
                <span className="text-[10px] text-muted-foreground">kcal deficit</span>
            </div>
        </Card>

        <Card className="border-border/50 shadow-sm bg-card p-4">
            <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Deficit</span>
                <span className="text-2xl font-black text-foreground font-mono">{stats.totalDeficit.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground">lifetime kcal</span>
            </div>
        </Card>
    </div>

    {/* Projection Card */}
    {/* Only show projection if we have decent data */}
    {stats.daysCount > 2 && (
        <Card className="border-primary/20 bg-primary/5 shadow-none">
            <CardContent className="p-5 flex items-start gap-4">
                <div className="bg-primary/20 rounded-full p-2.5">
                    <Scale className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                    <h4 className="text-sm font-bold text-foreground mb-1">Monthly Projection</h4>
                    <p className="text-muted-foreground text-xs mb-3 font-medium leading-relaxed">
                        Based on your {range !== 'all' ? `${range}-day` : 'total'} average deficit of <span className="font-bold text-primary">{stats.averageDeficit} kcal</span>.
                    </p>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-black text-primary tracking-tight">{stats.projectedWeightLossKg}</span>
                        <span className="text-sm font-bold text-muted-foreground">kg</span>
                        <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest ml-1">loss / month</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )}
    </div>
  );
}
