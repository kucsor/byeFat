'use client';

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type WeightTrendChartProps = {
  chartData: any[]; // Ideally strict type, but using any for now based on extraction
};

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

export function WeightTrendChart({ chartData }: WeightTrendChartProps) {
  return (
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
  );
}
