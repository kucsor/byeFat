'use client';

import { useMemo, useState, memo, useCallback } from 'react';
import { useFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import type { DailyLogItem, DailyLogActivity } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Pencil, Apple, Clock, Flame } from 'lucide-react';
import { doc, increment } from 'firebase/firestore';
import dynamic from 'next/dynamic';
import { triggerHapticFeedback } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { m } from 'framer-motion';
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

const EditFoodLogItemSheet = dynamic(() => import('./edit-food-log-item-sheet').then(mod => mod.EditFoodLogItemSheet));

type DailyLogProps = {
  items?: DailyLogItem[] | null;
  activities?: DailyLogActivity[] | null;
  selectedDate: string;
  onAddFood: () => void;
};

// Unified item type for display
type LogItem = (DailyLogItem | DailyLogActivity) & { type: 'food' | 'activity' };

const LogItemCard = memo(function LogItemCard({ item, onDelete, onEdit }: { item: LogItem, onDelete: (id: string, type: 'items' | 'activities', calories: number) => void, onEdit: (item: DailyLogItem) => void }) {
  const isActivity = item.type === 'activity';

  // Format time
  const timeLabel = useMemo(() => {
    if (!item.createdAt || !item.createdAt.toDate) return '';
    return item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [item.createdAt]);

  return (
    <div className="relative mb-2 w-full">
        {/* Card */}
        <m.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="group relative z-10 flex items-center justify-between p-3 rounded-2xl bg-card border border-border/40 transition-colors duration-200"
        >
             {/* Card Background (ensure opacity for layers if needed) */}
             <div className="absolute inset-0 bg-background/40 backdrop-blur-sm rounded-2xl -z-10" />

            <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                {/* Icon Box */}
                <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    isActivity ? "bg-orange-100/50 text-orange-600" : "bg-blue-100/50 text-blue-600"
                )}>
                    {isActivity ? <Flame className="h-5 w-5 fill-current opacity-80" /> : <Apple className="h-5 w-5 fill-current opacity-80" />}
                </div>

                {/* Content */}
                <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm text-foreground truncate pr-2">
                        {isActivity ? (item as DailyLogActivity).name : (item as DailyLogItem).productName}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {!isActivity && <span className="font-medium bg-background/50 px-1.5 py-0.5 rounded-md">{(item as DailyLogItem).grams}g</span>}

                        {timeLabel && (
                            <span className="flex items-center gap-1 opacity-60">
                                <Clock className="h-3 w-3" /> {timeLabel}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions & Value */}
            <div className="flex items-center gap-3 md:gap-4 flex-shrink-0 pl-2">
                <div className="text-right">
                    <div className={cn(
                        "text-sm font-black tabular-nums tracking-tight",
                        isActivity ? "text-orange-600" : "text-foreground"
                    )}>
                        {isActivity ? '-' : ''}{item.calories}
                    </div>
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider opacity-70">kcal</div>
                </div>

                {/* Actions (Visible on Mobile & Desktop) */}
                <div className="flex items-center gap-1 opacity-100">
                    {!isActivity && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-primary/80 hover:text-primary hover:bg-primary/10"
                            onClick={() => onEdit(item as DailyLogItem)}
                            aria-label="Edit item"
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                    )}

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                aria-label="Delete item"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[24px]">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will remove this entry from your daily log permanently.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => onDelete(item.id, isActivity ? 'activities' : 'items', item.calories)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </m.div>
    </div>
  )
});

export function FoodLog({ items, activities, selectedDate, onAddFood }: DailyLogProps) {
  const { firestore, user } = useFirebase();
  const [itemToEdit, setItemToEdit] = useState<DailyLogItem | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  const handleEdit = useCallback((item: DailyLogItem) => {
    setItemToEdit(item);
    setIsEditSheetOpen(true);
  }, []);

  const handleDelete = useCallback((itemId: string, type: 'items' | 'activities', calories: number) => {
    if (!user || !selectedDate) return;
    const docRef = doc(firestore, `users/${user.uid}/dailyLogs/${selectedDate}/${type}`, itemId);
    const dailyLogRef = doc(firestore, `users/${user.uid}/dailyLogs`, selectedDate);

    if (type === 'items') {
         updateDocumentNonBlocking(dailyLogRef, { consumedCalories: increment(-calories) });
    } else if (type === 'activities') {
         updateDocumentNonBlocking(dailyLogRef, { activeCalories: increment(-calories) });
    }
    
    deleteDocumentNonBlocking(docRef);
    triggerHapticFeedback();
  }, [user, selectedDate, firestore]);

  // Merge and sort
  const combinedItems: LogItem[] = useMemo(() => {
      const foodItems = (items || []).map(i => ({ ...i, type: 'food' } as LogItem));
      const activityItems = (activities || []).map(a => ({ ...a, type: 'activity' } as LogItem));

      return [...foodItems, ...activityItems].sort((a, b) => {
        if (a.createdAt && b.createdAt) {
             return b.createdAt.toMillis() - a.createdAt.toMillis();
        }
        return 0;
      });
  }, [items, activities]);

  const totalCalories = (items?.reduce((acc, i) => acc + i.calories, 0) || 0);
  const totalBurned = (activities?.reduce((acc, a) => acc + a.calories, 0) || 0);
  const netCalories = totalCalories - totalBurned;

  return (
    <div className="flex flex-col h-full w-full bg-transparent">
        {/* Header */}
        <div className="flex-none px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-xl sticky top-0 z-10">
            <div className="flex items-center gap-3">
                <div className="h-8 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-bold text-foreground tracking-tight">Today's Log</h3>
            </div>
            <div className="flex items-center gap-4">
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Net</span>
                    <span className="text-sm font-black text-foreground tabular-nums">{netCalories}</span>
                 </div>
            </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 w-full p-4">
            <div className="flex flex-col min-h-full pb-36 md:pb-0">
                {combinedItems.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-60">
                        <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center mb-4">
                            <Apple className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">
                            Nothing logged yet.
                        </span>
                        <Button variant="link" onClick={onAddFood} className="mt-2 text-primary font-bold">
                            Start Tracking
                        </Button>
                    </div>
                ) : (
                    combinedItems.map((item) => (
                        <LogItemCard
                            key={`${item.type}-${item.id}`}
                            item={item}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                        />
                    ))
                )}
            </div>
        </ScrollArea>

        <EditFoodLogItemSheet
            isOpen={isEditSheetOpen}
            setIsOpen={setIsEditSheetOpen}
            item={itemToEdit}
            selectedDate={selectedDate}
        />
    </div>
  );
}
