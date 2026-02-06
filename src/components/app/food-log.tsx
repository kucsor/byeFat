'use client';

import { useMemo, useState, memo, useCallback } from 'react';
import { useFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import type { DailyLogItem, DailyLogActivity } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Pencil, Apple, Clock } from 'lucide-react';
import { doc, increment } from 'firebase/firestore';
import dynamic from 'next/dynamic';
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

const EditFoodLogItemSheet = dynamic(() => import('./edit-food-log-item-sheet').then(mod => mod.EditFoodLogItemSheet));

type DailyLogProps = {
  items?: DailyLogItem[] | null;
  activities?: DailyLogActivity[] | null;
  selectedDate: string;
  onAddFood: () => void;
};

const FoodItemCard = memo(function FoodItemCard({ item, onDelete, onEdit }: { item: DailyLogItem, onDelete: (id: string, type: 'items' | 'activities', calories: number) => void, onEdit: (item: DailyLogItem) => void }) {
  const isAiItem = item.productId.startsWith('ai-');

  const timeLabel = useMemo(() => {
    if (!item.createdAt || !item.createdAt.toDate) return '';
    return item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [item.createdAt]);

  return (
    <div className="group flex items-center justify-between py-4 border-b border-border/40 last:border-0 hover:bg-secondary/5 transition-colors">
        <div className="flex items-center gap-3">
             <div className="p-2 bg-secondary rounded-xl text-muted-foreground">
                <Apple className="h-4 w-4" />
             </div>
             <div className="flex flex-col gap-0.5">
                <span className="font-bold text-sm text-foreground">{item.productName}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">{item.grams}g</span>
                    {timeLabel && (
                        <>
                            <span className="text-muted-foreground/40">•</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeLabel}</span>
                        </>
                    )}
                </div>
            </div>
        </div>

        <div className="flex items-center gap-3">
             <div className="text-right">
                <div className="text-sm font-black text-foreground">{item.calories}</div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">kcal</div>
            </div>

            <div className="flex items-center">
                {!isAiItem && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => onEdit(item)}>
                    <Pencil className="h-4 w-4" />
                </Button>
                )}
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Delete Item?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Remove "{item.productName}" from your log.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(item.id, 'items', item.calories)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
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

  const sortedItems = useMemo(() => {
    if (!items) return [];
    return [...items].sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      }
      return 0;
    });
  }, [items]);

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

  const totalItems = (items?.length || 0) + (activities?.length || 0);
  const totalCalories = (items?.reduce((acc, i) => acc + i.calories, 0) || 0);

  return (
    <>
        <Card className="border border-border/50 shadow-sm bg-card mb-24 md:mb-0">
            <CardHeader className="pb-2 border-b border-border/40">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-black text-foreground">Today's Log</CardTitle>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {totalItems} items • {totalCalories} kcal
                    </span>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="flex flex-col">
                    {sortedItems.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm font-medium">
                            No food logged yet today.
                        </div>
                    ) : (
                        sortedItems.map((item) => (
                            <div key={`food-${item.id}`} className="px-4">
                                <FoodItemCard item={item} onDelete={handleDelete} onEdit={handleEdit} />
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>

        <EditFoodLogItemSheet
            isOpen={isEditSheetOpen}
            setIsOpen={setIsEditSheetOpen}
            item={itemToEdit}
            selectedDate={selectedDate}
        />
    </>
  );
}
