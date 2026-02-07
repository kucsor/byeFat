'use client';

import { Button } from '@/components/ui/button';
import { Scan, Flame, Plus, Barcode, Edit3 } from 'lucide-react';

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
    <div className="flex w-full items-end justify-around gap-2 p-2">
      {/* AI Calculator */}
      <div className="flex flex-col items-center gap-1 group">
        <Button
          variant="ghost"
          size="icon"
          onClick={onAiCalculator}
          aria-label="AI Calculator"
          className="h-12 w-12 rounded-2xl bg-white/5 text-foreground hover:bg-white/10 hover:scale-105 transition-all border border-white/10"
        >
          <Scan className="h-5 w-5 opacity-80" strokeWidth={2} />
        </Button>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight opacity-70 group-hover:opacity-100 transition-opacity">AI Calc</span>
      </div>

      {/* Log Activity */}
      <div className="flex flex-col items-center gap-1 group">
        <Button
          variant="ghost"
          size="icon"
          onClick={onLogActivity}
          aria-label="Log Activity"
          className="h-12 w-12 rounded-2xl bg-white/5 text-foreground hover:bg-orange-500/20 hover:text-orange-500 hover:scale-105 transition-all border border-white/10"
        >
          <Flame className="h-5 w-5 opacity-80" strokeWidth={2} />
        </Button>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight opacity-70 group-hover:opacity-100 transition-opacity">Activity</span>
      </div>

      {/* Add Food (Primary) */}
      <div className="flex flex-col items-center gap-1 -translate-y-3 group z-10">
        <Button
          size="icon"
          onClick={onAddFood}
          aria-label="Add Food"
          className="h-16 w-16 rounded-[28px] bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-110 shadow-lg shadow-primary/30 transition-all border-4 border-background/50 backdrop-blur-sm"
        >
          <Plus className="h-8 w-8" strokeWidth={3} />
        </Button>
        <span className="text-[10px] font-black text-primary uppercase tracking-tight">Add Food</span>
      </div>

      {/* Scan Barcode */}
      <div className="flex flex-col items-center gap-1 group">
        <Button
          variant="ghost"
          size="icon"
          onClick={onScanBarcode}
          aria-label="Scan Barcode"
          className="h-12 w-12 rounded-2xl bg-white/5 text-foreground hover:bg-white/10 hover:scale-105 transition-all border border-white/10"
        >
          <Barcode className="h-5 w-5 opacity-80" strokeWidth={2} />
        </Button>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight opacity-70 group-hover:opacity-100 transition-opacity">Scan</span>
      </div>

      {/* Manual Log */}
      <div className="flex flex-col items-center gap-1 group">
        <Button
          variant="ghost"
          size="icon"
          onClick={onManualLog}
          aria-label="Manual Log"
          className="h-12 w-12 rounded-2xl bg-white/5 text-foreground hover:bg-white/10 hover:scale-105 transition-all border border-white/10"
        >
          <Edit3 className="h-5 w-5 opacity-80" strokeWidth={2} />
        </Button>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight opacity-70 group-hover:opacity-100 transition-opacity">Manual</span>
      </div>
    </div>
  );
}
