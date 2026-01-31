'use client';

import { useMemo } from 'react';
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
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, Target, Calendar, Scale } from 'lucide-react';

type ChartDataPoint = {
  date: string;
  goalCalories?: number;
  consumedCalories?: number;
  calorieBalance?: number | null;
  weight?: number | null;
  weightTrend?: number | null;
};

type DeficitProgressChartProps = {
  chartData: ChartDataPoint[];
  maintenanceCalories?: number;
};

export function DeficitProgressChart({ chartData, maintenanceCalories }: DeficitProgressChartProps) {
  // Calculate deficit data for each day - only include days with consumed calories
  const deficitData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];

    console.log('ChartData received:', chartData);

    const filtered = chartData
      .filter((day) => {
        const hasCalories = (day.consumedCalories || 0) > 0;
        console.log(`Date ${day.date}: consumedCalories=${day.consumedCalories}, hasCalories=${hasCalories}`);
        return hasCalories;
      })
      .map((day) => {
        const maintenance = maintenanceCalories || day.goalCalories || 2000;
        const consumed = day.consumedCalories || 0;
        const deficit = maintenance - consumed;

        return {
          date: day.date,
          deficit: Math.round(deficit),
          maintenance: Math.round(maintenance),
          consumed: Math.round(consumed),
        };
      });

    console.log('Filtered deficitData:', filtered);
    return filtered;
  }, [chartData, maintenanceCalories]);

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

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-sm">
          <div className="font-semibold mb-2">{format(new Date(label), 'PPP')}</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Deficit:</span>
              <span className="font-medium text-primary">{data.deficit} kcal</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Mentenanță:</span>
              <span className="font-medium">{data.maintenance} kcal</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Consumat:</span>
              <span className="font-medium">{data.consumed} kcal</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!stats || deficitData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evoluție Deficit Caloric</CardTitle>
          <CardDescription>Încă nu există suficiente date pentru a calcula deficitul.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-2 border-primary/5 bg-card relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(#8b5a2b_1px,transparent_1px)] [background-size:20px_20px]" />
      <CardHeader>
        <CardTitle className="text-2xl font-serif flex items-center gap-2">
          <TrendingDown className="h-6 w-6 text-primary" />
          Evoluție Deficit Caloric
        </CardTitle>
        <CardDescription className="text-xs uppercase font-bold tracking-widest">
          Urmărește deficitul caloric zilnic și proiecția de slăbire
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart */}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={deficitData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="hsl(var(--primary))" strokeOpacity={0.1} />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'd MMM')}
                tick={{ fontSize: 10, fontWeight: 'bold' }}
                axisLine={{ stroke: 'hsl(var(--primary))', strokeOpacity: 0.2 }}
              />
              <YAxis 
                tick={{ fontSize: 10, fontWeight: 'bold' }}
                tickFormatter={(value) => `${value}`}
                axisLine={{ stroke: 'hsl(var(--primary))', strokeOpacity: 0.2 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', paddingTop: '10px' }} />
              
              {/* Area under the line */}
              <Area
                type="monotone"
                dataKey="deficit"
                name="Deficit Zilnic"
                stroke="none"
                fill="hsl(var(--primary))"
                fillOpacity={0.05}
              />
              
              {/* Main deficit line */}
              <Line
                type="monotone"
                dataKey="deficit"
                name="Deficit Zilnic"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                strokeDasharray="5 5"
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              
              {/* Average line */}
              <ReferenceLine
                y={stats.averageDeficit}
                stroke="hsl(var(--accent))"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `MEDIE: ${stats.averageDeficit} KCAL`,
                  position: 'insideBottomRight',
                  fill: 'hsl(var(--accent))',
                  fontSize: 10,
                  fontWeight: 800,
                }}
              />
              
              {/* Zero line */}
              <ReferenceLine y={0} stroke="hsl(var(--primary))" strokeOpacity={0.3} strokeWidth={1} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-primary/5 rounded-xl border border-primary/10 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Target className="h-4 w-4 text-primary opacity-60" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Deficit Mediu</span>
            </div>
            <div className="text-2xl font-serif font-bold text-primary">{stats.averageDeficit}</div>
            <div className="text-[10px] font-bold uppercase text-muted-foreground/60">kcal/zi</div>
          </div>

          <div className="bg-secondary/5 rounded-xl border border-secondary/10 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-secondary opacity-60" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Zile</span>
            </div>
            <div className="text-2xl font-serif font-bold text-secondary">{stats.daysCount}</div>
            <div className="text-[10px] font-bold uppercase text-muted-foreground/60">logate</div>
          </div>

          <div className="bg-accent/5 rounded-xl border border-accent/10 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-accent opacity-60" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cel Mai Bun</span>
            </div>
            <div className="text-2xl font-serif font-bold text-accent">{stats.maxDeficit}</div>
            <div className="text-[10px] font-bold uppercase text-muted-foreground/60">kcal deficit</div>
          </div>

          <div className="bg-primary/5 rounded-xl border border-primary/10 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Scale className="h-4 w-4 text-primary opacity-60" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Deficit</span>
            </div>
            <div className="text-2xl font-serif font-bold text-primary">{stats.totalDeficit.toLocaleString()}</div>
            <div className="text-[10px] font-bold uppercase text-muted-foreground/60">kcal</div>
          </div>
        </div>

        {/* Projection Card */}
        <div className="bg-primary/5 rounded-2xl p-6 border-2 border-primary/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <TrendingDown className="w-24 h-24 text-primary" />
          </div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="bg-primary rounded-2xl p-3 shadow-lg">
              <Scale className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-serif font-bold mb-1">Proiecție Lunară</h4>
              <p className="text-muted-foreground text-sm mb-4">
                Menținând media de <span className="font-bold text-foreground">{stats.averageDeficit} kcal/zi</span>:
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-serif font-bold text-primary">{stats.projectedWeightLossKg}</span>
                <span className="text-2xl font-serif font-bold text-muted-foreground">kg</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">pe lună</span>
              </div>
              <div className="mt-4 pt-4 border-t border-primary/10">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Echivalentul a <span className="text-foreground">{stats.projectedWeightLossGrams}g</span> de grăsime pură
                 </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}