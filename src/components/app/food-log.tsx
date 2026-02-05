'use client';

import { useMemo, useState, memo, useCallback } from 'react';
import { useFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import type { DailyLogItem, DailyLogActivity } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2, Loader2, Flame, Pencil, Plus, Soup, Clock } from 'lucide-react';
import { doc, increment } from 'firebase/firestore';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
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
    <div className="group flex items-center justify-between py-3 px-4 bg-card border-b last:border-0 hover:bg-slate-50 transition-colors">
        <div className="flex flex-col gap-0.5">
            <span className="font-medium text-slate-900">{item.productName}</span>
            <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="font-medium">{item.grams}g</span>
                {timeLabel && (
                    <>
                        <span className="text-slate-400">•</span>
                        <span>{timeLabel}</span>
                    </>
                )}
            </div>
        </div>

        <div className="flex items-center gap-4">
             <div className="text-right">
                <div className="text-sm font-bold text-slate-900">{item.calories}</div>
                <div className="text-[10px] text-slate-500">kcal</div>
            </div>

            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                {!isAiItem && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-800" onClick={() => onEdit(item)}>
                    <Pencil className="h-4 w-4" />
                </Button>
                )}
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-destructive hover:bg-destructive/5">
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
                    <AlertDialogAction onClick={() => onDelete(item.id, 'items', item.calories)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    </div>
  )
});

const ActivityItemCard = memo(function ActivityItemCard({ item, onDelete }: { item: DailyLogActivity, onDelete: (id: string, type: 'items' | 'activities', calories: number) => void }) {
  return (
    <div className="group flex items-center justify-between py-3 px-4 bg-card border-b last:border-0 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                <Flame className="h-4 w-4" />
            </div>
            <div className="flex flex-col gap-0.5">
                <span className="font-medium text-slate-900">{item.name}</span>
                <span className="text-xs text-orange-600 font-medium">Burned</span>
            </div>
        </div>

        <div className="flex items-center gap-4">
             <div className="text-right">
                <div className="text-sm font-bold text-slate-900">{item.calories}</div>
                <div className="text-[10px] text-muted-foreground">kcal</div>
            </div>

            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/5">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Delete Activity?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Remove "{item.name}" from your log.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(item.id, 'activities', item.calories)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
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

  // Sort items by time (newest first)
  const sortedItems = useMemo(() => {
    if (!items) return [];
    return [...items].sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      }
      return 0;
    });
  }, [items]);

  const sortedActivities = useMemo(() => {
    if (!activities) return [];
    return [...activities].sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      }
      return 0;
    });
  }, [activities]);

  const handleDelete = useCallback((itemId: string, type: 'items' | 'activities', calories: number) => {
    if (!user || !selectedDate) return;
    const docRef = doc(firestore, `users/${user.uid}/dailyLogs/${selectedDate}/${type}`, itemId);
    
    // We update the daily log document to reflect the removed calories
    const dailyLogRef = doc(firestore, `users/${user.uid}/dailyLogs`, selectedDate);

    if (type === 'items') {
         updateDocumentNonBlocking(dailyLogRef, { consumedCalories: increment(-calories) });
    } else if (type === 'activities') {
         updateDocumentNonBlocking(dailyLogRef, { activeCalories: increment(-calories) });
    }
    
    deleteDocumentNonBlocking(docRef);
    triggerHapticFeedback();
  }, [user, selectedDate, firestore]);

  const hasAnyItems = sortedItems.length > 0 || sortedActivities.length > 0;
  const isLoading = items === undefined || activities === undefined;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wide">
            Today's Log
        </h2>
      </div>

      {isLoading && (
         <div className="flex justify-center p-12">
             <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
         </div>
      )}

      {hasAnyItems && (
        <Card className="fitness-card overflow-hidden border-0 shadow-sm bg-white">
          {/* Food Items List */}
          {sortedItems.length > 0 && (
            <div className="divide-y divide-slate-100">
                {sortedItems.map((item) => (
                    <FoodItemCard key={`food-${item.id}`} item={item} onDelete={handleDelete} onEdit={handleEdit} />
                ))}
            </div>
          )}

          {/* Activities Section */}
          {sortedActivities.length > 0 && (
            <div className="border-t border-slate-100">
               <div className="bg-slate-50/50 px-4 py-2 text-xs font-bold uppercase text-slate-600 tracking-wider">
                    Activities
               </div>
              <div className="divide-y divide-slate-100">
                  {sortedActivities.map((item) => (
                    <ActivityItemCard key={`activity-${item.id}`} item={item} onDelete={handleDelete} />
                  ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {!isLoading && !hasAnyItems && (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 bg-transparent shadow-none">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                 <Soup className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No logs yet</h3>
            <p className="text-sm text-slate-600 mb-6">Start tracking your meals for today.</p>
            <Button onClick={onAddFood} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Log Food
            </Button>
        </Card>
      )}

      <EditFoodLogItemSheet 
        isOpen={isEditSheetOpen}
        setIsOpen={setIsEditSheetOpen}
        item={itemToEdit}
        selectedDate={selectedDate}
      />
    </div>
  );
}
