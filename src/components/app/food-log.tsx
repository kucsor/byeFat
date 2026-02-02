'use client';

import { useMemo, useState } from 'react';
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

function FoodItemCard({ item, onDelete, onEdit }: { item: DailyLogItem, onDelete: (id: string, type: 'items' | 'activities') => void, onEdit: (item: DailyLogItem) => void }) {
  const isAiItem = item.productId.startsWith('ai-');

  // Format the time from Firestore Timestamp
  const timeLabel = useMemo(() => {
    if (!item.createdAt || !item.createdAt.toDate) return '';
    return item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [item.createdAt]);

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md group">
      <CardHeader className="flex flex-row items-center justify-between gap-4 p-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-lg font-serif leading-tight">{item.productName}</CardTitle>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-bold uppercase tracking-widest text-[10px]">{item.grams}g</span>
            {timeLabel && (
              <>
                <span className="text-[10px]">•</span>
                <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span className="font-bold uppercase tracking-widest text-[10px]">{timeLabel}</span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-serif font-bold text-xl text-primary leading-none">{item.calories}</div>
              <div className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">kcal</div>
            </div>
            {!isAiItem && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}>
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the entry for &quot;{item.productName}&quot;. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(item.id, 'items')} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      </CardHeader>
    </Card>
  )
}

function ActivityItemCard({ item, onDelete }: { item: DailyLogActivity, onDelete: (id: string, type: 'items' | 'activities') => void }) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md group">
      <CardHeader className="flex flex-row items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/30">
            <Flame className="h-6 w-6 text-orange-500" />
          </div>
          <div className='space-y-0.5'>
            <CardTitle className="text-lg font-serif">{item.name}</CardTitle>
            <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-orange-500">+{item.calories} kcal active</CardDescription>
          </div>
        </div>
        <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the activity &quot;{item.name}&quot;. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(item.id, 'activities')} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      </CardHeader>
    </Card>
  )
}


export function FoodLog({ items, activities, selectedDate, onAddFood }: DailyLogProps) {
  const { firestore, user } = useFirebase();
  const [itemToEdit, setItemToEdit] = useState<DailyLogItem | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  const handleEdit = (item: DailyLogItem) => {
    setItemToEdit(item);
    setIsEditSheetOpen(true);
  };

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

  const handleDelete = (itemId: string, type: 'items' | 'activities') => {
    if (!user || !selectedDate) return;
    const docRef = doc(firestore, `users/${user.uid}/dailyLogs/${selectedDate}/${type}`, itemId);
    
    if (type === 'items') {
      const itemToDelete = items?.find(i => i.id === itemId);
      if (itemToDelete) {
        const dailyLogRef = doc(firestore, `users/${user.uid}/dailyLogs`, selectedDate);
        updateDocumentNonBlocking(dailyLogRef, { consumedCalories: increment(-itemToDelete.calories) });
      }
    }
    
    deleteDocumentNonBlocking(docRef);
    triggerHapticFeedback();
  };

  const hasAnyItems = sortedItems.length > 0 || sortedActivities.length > 0;
  const isLoading = items === undefined || activities === undefined;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-3xl font-serif font-bold tracking-tight text-primary">Jurnal Zilnic</h2>
      </div>

      {isLoading && (
         <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </Card>
      )}

      {hasAnyItems && (
        <div className="space-y-6">
          {/* Food Items List - Flat List without categories */}
          {sortedItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <AnimatePresence mode='popLayout'>
                {sortedItems.map((item) => (
                  <motion.div
                    key={`food-${item.id}`}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  >
                    <FoodItemCard item={item} onDelete={handleDelete} onEdit={handleEdit} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Activities Section */}
          {sortedActivities.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 pt-4 border-t"
            >
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <span className="font-semibold text-orange-500">Activități</span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  +{sortedActivities.reduce((sum, item) => sum + item.calories, 0)} kcal
                </span>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {sortedActivities.map((item) => (
                    <motion.div
                      key={`activity-${item.id}`}
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    >
                      <ActivityItemCard item={item} onDelete={handleDelete} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {!isLoading && !hasAnyItems && (
        <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed">
            <CardHeader className="items-center">
                <Soup className="h-12 w-12 text-muted-foreground mb-4" />
                <CardTitle>Niciun aliment înregistrat</CardTitle>
                <CardDescription>Jurnalul pentru această zi este gol. Începe acum.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={onAddFood} size="lg">
                    <Plus className="mr-2 h-4 w-4" />
                    Adaugă primul aliment
                </Button>
            </CardContent>
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
