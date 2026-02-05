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
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { format, subDays, parseISO, isAfter, startOfDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingDown, Target, Calendar, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

type RangeType = '7' | '30' | 'all';

type ChartDataPoint = {
  date: string;
  goalCalories?: number;
  consumedCalories?: number;
  activeCalories?: number;
  calorieBalance?: number | null;
  weight?: number | null;
  weightTrend?: number | null;
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
        const maintenance = maintenanceCalories || day.goalCalories || 2000;
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
    <div className="flex items-center gap-1 bg-white/40 p-1 rounded-xl w-fit backdrop-blur-md border border-white/20">
      {(['7', '30', 'all'] as const).map((r) => (
        <Button
          key={r}
          variant={range === r ? 'default' : 'ghost'}
          size="sm"
          className={cn(
            "h-7 px-3 text-[10px] font-bold uppercase rounded-lg transition-all",
            range === r ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-white/50"
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
        <div className="rounded-xl border border-white/50 bg-white/80 backdrop-blur-xl p-3 shadow-xl">
          <div className="font-black mb-2 text-foreground">{format(new Date(label), 'PPP')}</div>
          <div className="space-y-1 text-sm font-medium">
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
                    <span className="font-bold text-emerald-500">+{data.active} kcal</span>
                </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Consumat:</span>
              <span className="font-bold text-rose-500">{data.consumed} kcal</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!stats || deficitData.length === 0) {
    return (
      <Card className="glass-card border-white/20">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <CardTitle className="text-base font-black text-foreground">Caloric Deficit Trend</CardTitle>
            <CardDescription>Not enough data yet.</CardDescription>
          </div>
          <RangeSelector />
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-white/20">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <CardTitle className="text-base font-black text-foreground flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-primary" />
            Caloric Deficit Trend
          </CardTitle>
          <CardDescription className="text-muted-foreground font-medium">
            Daily deficit and weight loss projection
          </CardDescription>
        </div>
        <RangeSelector />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart */}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={deficitData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'MMM d')}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 700 }}
                tickFormatter={(value) => `${value}`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2, strokeDasharray: '4 4', opacity: 0.5 }} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px', color: 'hsl(var(--muted-foreground))', fontWeight: 700 }} iconType="circle" />
              
              {/* Area under the line */}
              <Area
                type="monotone"
                dataKey="deficit"
                name="Daily Deficit"
                stroke="none"
                fill="url(#deficitGradient)"
                fillOpacity={0.8}
              />
              <defs>
                <linearGradient id="deficitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
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
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4, stroke: '#fff' }}
                activeDot={{ r: 7, strokeWidth: 3, fill: 'hsl(var(--primary))', stroke: '#fff' }}
              />
              
              {/* Average line */}
              <ReferenceLine
                y={stats.averageDeficit}
                stroke="hsl(var(--accent))"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `AVG: ${stats.averageDeficit}`,
                  position: 'insideBottomRight',
                  fill: 'hsl(var(--accent))',
                  fontSize: 10,
                  fontWeight: 900,
                  className: "bg-white/80"
                }}
              />
              
              {/* Zero line */}
              <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeOpacity={0.2} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white/40 border border-white/30 backdrop-blur-sm">
            <div className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">Avg Deficit</div>
            <div className="text-2xl font-black text-foreground">{stats.averageDeficit} <span className="text-xs font-bold text-muted-foreground">kcal</span></div>
          </div>

          <div className="p-4 rounded-xl bg-white/40 border border-white/30 backdrop-blur-sm">
            <div className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">Days Logged</div>
             <div className="text-2xl font-black text-foreground">{stats.daysCount}</div>
          </div>

          <div className="p-4 rounded-xl bg-white/40 border border-white/30 backdrop-blur-sm">
            <div className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">Best Day</div>
             <div className="text-2xl font-black text-foreground">{stats.maxDeficit} <span className="text-xs font-bold text-muted-foreground">kcal</span></div>
          </div>

          <div className="p-4 rounded-xl bg-white/40 border border-white/30 backdrop-blur-sm">
            <div className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">Total Deficit</div>
             <div className="text-2xl font-black text-foreground">{stats.totalDeficit.toLocaleString()} <span className="text-xs font-bold text-muted-foreground">kcal</span></div>
          </div>
        </div>

        {/* Projection Card */}
        <div className="relative overflow-hidden rounded-xl p-6 border border-primary/20 bg-primary/5">
          <div className="absolute top-0 right-0 p-4 opacity-10">
              <Scale className="h-24 w-24 text-primary" />
          </div>
          <div className="relative z-10 flex items-start gap-4">
            <div className="bg-primary/20 rounded-full p-3 backdrop-blur-md">
              <Scale className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-black text-foreground mb-1">Monthly Projection</h4>
              <p className="text-muted-foreground text-sm mb-4 font-medium">
                Based on your {range !== 'all' ? `${range}-day` : 'total'} average deficit of <span className="font-black text-primary">{stats.averageDeficit} kcal</span>.
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-primary drop-shadow-sm">{stats.projectedWeightLossKg}</span>
                <span className="text-xl font-bold text-muted-foreground">kg</span>
                <span className="text-xs font-black text-primary/60 uppercase tracking-widest ml-1">loss / month</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
