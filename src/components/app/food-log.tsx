'use client';

import { useMemo, useState, memo, useCallback } from 'react';
import { useFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import type { DailyLogItem, DailyLogActivity } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2, Loader2, Flame, Pencil, Plus, Soup, Clock, ChevronUp } from 'lucide-react';
import { doc, increment } from 'firebase/firestore';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { triggerHapticFeedback } from '@/lib/haptics';
import { Drawer } from 'vaul';
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
    <div className="group flex items-center justify-between py-3 px-4 bg-white border-b border-slate-100 last:border-0">
        <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-900">{item.productName}</span>
            <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-medium text-slate-700">{item.grams}g</span>
                {timeLabel && (
                    <>
                        <span className="text-slate-300">•</span>
                        <span>{timeLabel}</span>
                    </>
                )}
            </div>
        </div>

        <div className="flex items-center gap-4">
             <div className="text-right">
                <div className="text-sm font-black text-slate-900">{item.calories}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">kcal</div>
            </div>

            <div className="flex items-center">
                {!isAiItem && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => onEdit(item)}>
                    <Pencil className="h-4 w-4" />
                </Button>
                )}
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600">
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
                    <AlertDialogAction onClick={() => onDelete(item.id, 'items', item.calories)} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
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
        {/* Peek / Summary View (Always Visible) */}
        <div className="fixed bottom-24 left-4 right-4 z-10 md:static md:z-0 md:mx-auto md:w-full">
            <Drawer.Root shouldScaleBackground>
                <Drawer.Trigger asChild>
                    <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between cursor-pointer active:scale-95 transition-transform border border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-800 p-2 rounded-full">
                                <ChevronUp className="h-5 w-5 text-slate-400" />
                            </div>
                            <div>
                                <div className="text-sm font-bold">Today's Log</div>
                                <div className="text-xs text-slate-400">{totalItems} items • {totalCalories} kcal</div>
                            </div>
                        </div>
                        <Button size="sm" variant="secondary" className="h-8 rounded-full px-4 font-bold text-xs bg-white text-black hover:bg-slate-200">
                            View List
                        </Button>
                    </div>
                </Drawer.Trigger>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="bg-slate-50 flex flex-col rounded-t-[10px] h-[85vh] mt-24 fixed bottom-0 left-0 right-0 z-50 outline-none">
                        <div className="p-4 bg-white rounded-t-[10px] flex-1 overflow-auto">
                            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-300 mb-6" />
                            <div className="max-w-md mx-auto">
                                <Drawer.Title className="font-black text-2xl mb-4 text-slate-900">Today's Log</Drawer.Title>

                                <div className="space-y-4 pb-24">
                                    {sortedItems.length === 0 && (
                                        <div className="text-center py-10 text-slate-500">
                                            No food logged yet.
                                        </div>
                                    )}

                                    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                        {sortedItems.map((item) => (
                                            <FoodItemCard key={`food-${item.id}`} item={item} onDelete={handleDelete} onEdit={handleEdit} />
                                        ))}
                                    </div>

                                    <div className="flex justify-center mt-4">
                                        <Button onClick={onAddFood} className="rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white font-bold px-8">
                                            <Plus className="mr-2 h-4 w-4" /> Add Food
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        </div>

        <EditFoodLogItemSheet
            isOpen={isEditSheetOpen}
            setIsOpen={setIsEditSheetOpen}
            item={itemToEdit}
            selectedDate={selectedDate}
        />
    </>
  );
}
