'use client';

import { Button } from '@/components/ui/button';
import { Scan, Flame, Plus, Barcode, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionsProps {
  onAiCalculator: () => void;
  onLogActivity: () => void;
  onAddFood: () => void;
  onScanBarcode: () => void;
  onManualLog: () => void;
}

export function QuickActions({
  onAiCalculator,
  onLogActivity,
  onAddFood,
  onScanBarcode,
  onManualLog,
}: QuickActionsProps) {
  return (
    <div className="fixed bottom-20 left-0 right-0 z-30 flex justify-center px-4 pointer-events-none md:static md:bottom-auto md:bg-transparent md:pointer-events-auto md:p-0 md:mt-8">
      <div className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-xl rounded-3xl p-4 flex items-end gap-3 pointer-events-auto md:bg-white md:shadow-sm md:border-border/50 md:w-full md:justify-around">
        {/* AI Calculator */}
        <div className="flex flex-col items-center gap-1 group">
          <Button
            variant="outline"
            size="icon"
            onClick={onAiCalculator}
            className="h-14 w-14 rounded-full border-2 border-primary/10 bg-white hover:bg-primary/5 hover:border-primary hover:scale-105 transition-all shadow-sm"
          >
            <Scan className="h-6 w-6 text-primary" strokeWidth={2} />
          </Button>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight group-hover:text-primary transition-colors">AI Calc</span>
        </div>

        {/* Log Activity */}
        <div className="flex flex-col items-center gap-1 group">
          <Button
            variant="outline"
            size="icon"
            onClick={onLogActivity}
            className="h-14 w-14 rounded-full border-2 border-orange-100 bg-white hover:bg-orange-50 hover:border-orange-500 hover:scale-105 transition-all shadow-sm"
          >
            <Flame className="h-6 w-6 text-orange-500" strokeWidth={2} />
          </Button>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight group-hover:text-orange-500 transition-colors">Activity</span>
        </div>

        {/* Add Food (Primary) */}
        <div className="flex flex-col items-center gap-1 -translate-y-4 md:translate-y-0 group z-10">
          <Button
            size="icon"
            onClick={onAddFood}
            className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90 hover:scale-110 shadow-lg shadow-primary/30 transition-all border-4 border-white/50"
          >
            <Plus className="h-8 w-8 text-white" strokeWidth={3} />
          </Button>
          <span className="text-[10px] font-black text-primary uppercase tracking-tight">Add Food</span>
        </div>

        {/* Scan Barcode */}
        <div className="flex flex-col items-center gap-1 group">
          <Button
            variant="outline"
            size="icon"
            onClick={onScanBarcode}
            className="h-14 w-14 rounded-full border-2 border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-400 hover:scale-105 transition-all shadow-sm"
          >
            <Barcode className="h-6 w-6 text-slate-600" strokeWidth={2} />
          </Button>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight group-hover:text-slate-600 transition-colors">Scan</span>
        </div>

        {/* Manual Log */}
        <div className="flex flex-col items-center gap-1 group">
          <Button
            variant="outline"
            size="icon"
            onClick={onManualLog}
            className="h-14 w-14 rounded-full border-2 border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-400 hover:scale-105 transition-all shadow-sm"
          >
            <Edit3 className="h-6 w-6 text-slate-600" strokeWidth={2} />
          </Button>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight group-hover:text-slate-600 transition-colors">Manual</span>
        </div>
      </div>
    </div>
  );
}
