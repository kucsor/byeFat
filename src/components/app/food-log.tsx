'use client';

import { useMemo, useState, memo, useCallback, useRef } from 'react';
import { useFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import type { DailyLogItem, DailyLogActivity } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Pencil, Apple, Clock, Flame } from 'lucide-react';
import { doc, increment } from 'firebase/firestore';
import dynamic from 'next/dynamic';
import { triggerHapticFeedback } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { m, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const x = useMotionValue(0);
  const controls = useMotionValue(0); // For programmatic control if needed, but x handles it

  // Background opacity/scale based on x
  // Dragging Right (Positive X) -> Reveal Left Background (Delete)
  const leftOpacity = useTransform(x, [20, 100], [0, 1]);
  const leftScale = useTransform(x, [20, 100], [0.8, 1]);

  // Dragging Left (Negative X) -> Reveal Right Background (Edit)
  const rightOpacity = useTransform(x, [-20, -100], [0, 1]);
  const rightScale = useTransform(x, [-20, -100], [0.8, 1]);

  // Format time
  const timeLabel = useMemo(() => {
    if (!item.createdAt || !item.createdAt.toDate) return '';
    return item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [item.createdAt]);

  const handleDragEnd = async (event: any, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < -80 || (offset < -20 && velocity < -500)) {
        // Swiped Left -> Edit (if not activity)
        if (!isActivity) {
            triggerHapticFeedback();
            onEdit(item as DailyLogItem);
        }
    } else if (offset > 80 || (offset > 20 && velocity > 500)) {
        // Swiped Right -> Delete
        triggerHapticFeedback();
        setIsDeleteDialogOpen(true);
    }

    // Always snap back
    animate(x, 0, { type: "spring", stiffness: 400, damping: 25 });
  };

  // Long Press Logic
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    longPressTimerRef.current = setTimeout(() => {
        triggerHapticFeedback();
        setIsMenuOpen(true);
    }, 800); // 800ms for long press
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
    }
  };

  return (
    <div className="relative mb-2 w-full touch-pan-y">
        {/* Background Actions Layer */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden z-0">
             {/* Left (Delete) - Visible on Drag Right */}
             <m.div
                className="absolute inset-y-0 left-0 w-1/2 bg-destructive/10 flex items-center justify-start pl-6"
                style={{ opacity: leftOpacity, scale: leftScale, x: useTransform(x, (val) => val > 0 ? 0 : -50) }}
             >
                 <div className="flex flex-col items-center justify-center text-destructive">
                    <Trash2 className="h-5 w-5 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Delete</span>
                 </div>
             </m.div>

             {/* Right (Edit) - Visible on Drag Left */}
             <m.div
                className="absolute inset-y-0 right-0 w-1/2 bg-primary/10 flex items-center justify-end pr-6"
                style={{ opacity: rightOpacity, scale: rightScale, x: useTransform(x, (val) => val < 0 ? 0 : 50) }}
             >
                {!isActivity && (
                     <div className="flex flex-col items-center justify-center text-primary">
                        <Pencil className="h-5 w-5 mb-1" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Edit</span>
                     </div>
                )}
             </m.div>
        </div>

        {/* Card */}
        <m.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, x: 0 }} // Ensure x is managed by style
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ x }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragStart={() => {
                if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                }
            }}
            onDragEnd={handleDragEnd}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
            className="group relative z-10 flex items-center justify-between p-3 rounded-2xl bg-card border border-border/40 transition-colors duration-200 cursor-grab active:cursor-grabbing select-none"
        >
             {/* Card Background (ensure opacity for layers if needed) */}
             <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-2xl -z-10" />

            <div className="flex-1 min-w-0 flex items-center gap-3 md:gap-4 overflow-hidden">
                {/* Icon Box */}
                <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    isActivity ? "bg-orange-100/50 text-orange-600" : "bg-blue-100/50 text-blue-600"
                )}>
                    {isActivity ? <Flame className="h-5 w-5 fill-current opacity-80" /> : <Apple className="h-5 w-5 fill-current opacity-80" />}
                </div>

                {/* Content */}
                <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm text-foreground break-words whitespace-normal pr-2">
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

            {/* Value (Buttons removed/hidden) */}
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
            </div>
        </m.div>

        {/* Long Press Menu */}
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger className="hidden" />
            <DropdownMenuContent align="end" className="w-48">
                {!isActivity && (
                    <DropdownMenuItem onClick={() => onEdit(item as DailyLogItem)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        {/* Delete Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
