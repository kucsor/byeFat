'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, increment } from 'firebase/firestore';

import { useFirebase, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import type { DailyLogItem, Product } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import { triggerHapticFeedback } from '@/lib/haptics';
import { updateUserXP } from '@/firebase/xp-actions';

const editLogItemSchema = z.object({
  grams: z.coerce.number().min(1, { message: 'Grams must be greater than 0.' }),
});

export function EditFoodLogItemSheet({ isOpen, setIsOpen, item, selectedDate }: {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    item: DailyLogItem | null;
    selectedDate: string;
}) {
  const { firestore, user } = useFirebase();
  const isMobile = useIsMobile();
  
  const productRef = useMemoFirebase(() => {
    if (!firestore || !item || item.productId.startsWith('ai-')) return null;
    return doc(firestore, `products`, item.productId);
  }, [firestore, item]);
  
  const { data: product, isLoading: isProductLoading } = useDoc<Product>(productRef);

  const form = useForm<z.infer<typeof editLogItemSchema>>({
    resolver: zodResolver(editLogItemSchema),
    defaultValues: { grams: 0 },
  });

  useEffect(() => {
    if (item) {
        form.reset({ grams: item.grams });
    }
  }, [item, form]);

  const grams = form.watch('grams');
  const calculatedMacros = useMemo(() => {
    if (!product || !grams) return null;
    const ratio = grams / 100;
    return {
        calories: Math.round(product.caloriesPer100g * ratio),
        protein: Math.round(product.proteinPer100g * ratio),
        fat: Math.round(product.fatPer100g * ratio),
        carbs: Math.round(product.carbsPer100g * ratio),
    }
  }, [product, grams]);

  const onSubmit = async (values: z.infer<typeof editLogItemSchema>) => {
    if (!user || !item || !calculatedMacros) return;
    
    const logItemRef = doc(firestore, `users/${user.uid}/dailyLogs/${selectedDate}/items`, item.id);
    const dailyLogRef = logItemRef.parent.parent;

    if (!dailyLogRef) return;

    const calorieDifference = calculatedMacros.calories - item.calories;

    const updatedLogItem = {
        grams: values.grams,
        ...calculatedMacros,
    }

    updateDocumentNonBlocking(logItemRef, updatedLogItem);
    updateDocumentNonBlocking(dailyLogRef, { consumedCalories: increment(calorieDifference) });
    
    // XP Update:
    // If calorieDifference is POSITIVE (ate more), deficit decreases -> XP decreases.
    // So we subtract calorieDifference.
    // Example: Old 500, New 700. Difference +200. Deficit drops 200. XP drops 200.
    // Example: Old 500, New 300. Difference -200. Deficit rises 200. XP rises 200.
    updateUserXP(firestore, user.uid, -calorieDifference);

    triggerHapticFeedback();
    
    setIsOpen(false);
  };
  
  return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side={isMobile ? 'bottom' : 'right'} className="flex flex-col gap-0 p-0">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle>Edit Logged Item</SheetTitle>
            <SheetDescription>
              Update the consumed amount for {item?.productName}.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
             {isProductLoading && <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
            {!isProductLoading && item && (
              <Form {...form}>
                <form className="space-y-6">
                  <FormField
                    control={form.control}
                    name="grams"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Weight (grams)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="150" {...field} onFocus={(e) => e.target.select()} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                  />
                  {calculatedMacros && (
                      <div className="space-y-2 rounded-md bg-muted p-4 text-sm">
                          <h4 className="font-medium text-foreground">Updated Nutrition</h4>
                          <div className="flex justify-between"><span>Calories:</span> <span>{calculatedMacros.calories} kcal</span></div>
                          <div className="flex justify-between"><span>Protein:</span> <span>{calculatedMacros.protein} g</span></div>
                          <div className="flex justify-between"><span>Fat:</span> <span>{calculatedMacros.fat} g</span></div>
                          <div className="flex justify-between"><span>Carbs:</span> <span>{calculatedMacros.carbs} g</span></div>
                      </div>
                  )}
                </form>
              </Form>
            )}
          </div>
          <SheetFooter className="bg-card p-6 mt-4 border-t">
            <Button onClick={form.handleSubmit(onSubmit)} type="submit" className="w-full" disabled={!item || isProductLoading || !calculatedMacros}>
              Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
  );
}

    