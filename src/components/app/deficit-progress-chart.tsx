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
  // Calculate deficit data for each day - include days with goalCalories set
  const deficitData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];

    console.log('ChartData received:', chartData);

    const filtered = chartData
      .filter((day) => {
        // Include days that have goalCalories set (active tracking days)
        const hasGoal = (day.goalCalories || 0) > 0;
        console.log(`Date ${day.date}: goalCalories=${day.goalCalories}, consumedCalories=${day.consumedCalories}, hasGoal=${hasGoal}`);
        return hasGoal;
      })
      .map((day) => {
        const maintenance = maintenanceCalories || day.goalCalories || 2000;
        // If consumedCalories is not set, assume 0 (no food logged that day)
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-primary" />
          Evoluție Deficit Caloric
        </CardTitle>
        <CardDescription>
          Urmărește deficitul caloric zilnic și proiecția de slăbire
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart */}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={deficitData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'd MMM')}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}`}
                label={{ value: 'kcal', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Area under the line */}
              <Area
                type="monotone"
                dataKey="deficit"
                name="Deficit Zilnic"
                stroke="none"
                fill="hsl(var(--primary))"
                fillOpacity={0.1}
              />
              
              {/* Main deficit line */}
              <Line
                type="monotone"
                dataKey="deficit"
                name="Deficit Zilnic"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
              
              {/* Average line */}
              <ReferenceLine
                y={stats.averageDeficit}
                stroke="hsl(var(--chart-2))"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: `Medie: ${stats.averageDeficit} kcal`,
                  position: 'right',
                  fill: 'hsl(var(--chart-2))',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
              
              {/* Zero line */}
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-primary/10 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Deficit Mediu</span>
            </div>
            <div className="text-2xl font-bold text-primary">{stats.averageDeficit}</div>
            <div className="text-xs text-muted-foreground">kcal/zi</div>
          </div>

          <div className="bg-chart-2/10 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-chart-2" />
              <span className="text-sm text-muted-foreground">Total Zile</span>
            </div>
            <div className="text-2xl font-bold text-chart-2">{stats.daysCount}</div>
            <div className="text-xs text-muted-foreground">zile logate</div>
          </div>

          <div className="bg-emerald-500/10 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Cel Mai Bun</span>
            </div>
            <div className="text-2xl font-bold text-emerald-500">{stats.maxDeficit}</div>
            <div className="text-xs text-muted-foreground">kcal deficit</div>
          </div>

          <div className="bg-orange-500/10 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Scale className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Total Deficit</span>
            </div>
            <div className="text-2xl font-bold text-orange-500">{stats.totalDeficit.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">kcal</div>
          </div>
        </div>

        {/* Projection Card */}
        <div className="bg-gradient-to-r from-primary/10 to-chart-2/10 rounded-xl p-6 border border-primary/20">
          <div className="flex items-start gap-4">
            <div className="bg-primary rounded-full p-3">
              <Scale className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold mb-1">Proiecție Lunară</h4>
              <p className="text-muted-foreground text-sm mb-3">
                Dacă continui cu un deficit mediu de <span className="font-semibold text-foreground">{stats.averageDeficit} kcal</span> pe zi:
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary">{stats.projectedWeightLossKg}</span>
                <span className="text-xl text-muted-foreground">kg</span>
                <span className="text-sm text-muted-foreground">pe lună</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Aproximativ <span className="font-medium">{stats.projectedWeightLossGrams}g</span> de grăsime (7700 kcal = 1kg)
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}