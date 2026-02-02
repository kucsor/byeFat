'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  calculatePortion,
  type PortionCalculatorOutput,
} from '@/ai/flows/portion-calculator-flow';
import { CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Plus } from 'lucide-react';
import { useFirebase, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, increment } from 'firebase/firestore';
import type { DailyLog, UserProfile } from '@/lib/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { triggerHapticFeedback } from '@/lib/haptics';


const formSchema = z.object({
  query: z.string().min(20, {
    message: 'Please provide more details for an accurate calculation.',
  }),
});

type AiPortionCalculatorProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  selectedDate: string;
  userProfile: UserProfile;
  selectedLog: DailyLog | null;
}

export function AiPortionCalculator({ isOpen, setIsOpen, selectedDate, userProfile, selectedLog }: AiPortionCalculatorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PortionCalculatorOutput | null>(null);
  const { firestore, user } = useFirebase();
  const isMobile = useIsMobile();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      query: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await calculatePortion(values);
      if (response.description.startsWith('ERROR:')) {
        setError(
          'Calculation failed. Please include the nutritional values for the raw product (e.g., "calories", "protein", "fat").'
        );
        setResult(null);
      } else {
        setResult(response);
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }

  const handleAddToLog = () => {
    if (!result || !user || !firestore || !userProfile) return;

    const dailyLogRef = doc(firestore, `users/${user.uid}/dailyLogs`, selectedDate);
    
    const logDataToSet: Partial<DailyLog> = { id: selectedDate, date: selectedDate };

    if (!selectedLog && userProfile.dailyCalories) {
        logDataToSet.goalCalories = userProfile.dailyCalories;
        logDataToSet.goalProtein = userProfile.dailyProtein;
        logDataToSet.goalCarbs = userProfile.dailyCarbs;
        logDataToSet.goalFat = userProfile.dailyFat;
        logDataToSet.maintenanceCalories = userProfile.maintenanceCalories;
        logDataToSet.deficitTarget = userProfile.deficitTarget;
    }

    setDocumentNonBlocking(dailyLogRef, logDataToSet, { merge: true });

    const logItemsCollection = collection(dailyLogRef, 'items');

    const newLogItem = {
      productId: `ai-${Date.now()}`,
      productName: result.description,
      grams: result.portionWeight,
      calories: Math.round(result.calories),
      fat: Math.round(result.fat),
      carbs: Math.round(result.carbs),
      protein: Math.round(result.protein),
      createdAt: serverTimestamp(),
    };

    addDocumentNonBlocking(logItemsCollection, newLogItem);
    updateDocumentNonBlocking(dailyLogRef, { consumedCalories: increment(newLogItem.calories) });
    
    triggerHapticFeedback();
    
    setResult(null);
    form.reset();
    setIsOpen(false);
  };
  
  const handleSheetOpen = (open: boolean) => {
    if (!open) {
      form.reset();
      setResult(null);
      setError(null);
    }
    setIsOpen(open);
  }

  return (
      <Sheet open={isOpen} onOpenChange={handleSheetOpen}>
        <SheetContent side={isMobile ? 'bottom' : 'right'} className="flex flex-col gap-0 p-0">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Portion Calculator
            </SheetTitle>
            <SheetDescription>
              Calculate nutrition for cooked portions.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Form {...form}>
                <form>
                <div className="space-y-4">
                    <CardDescription>
                    For example: "I cooked a 400g pack of raw pasta. The nutrition per 100g raw is 350 kcal, 12g protein, 1.5g fat, and 70g carbs. After boiling, the total weight was 700g. I ate 250g of the cooked pasta."
                    </CardDescription>
                    <FormField
                    control={form.control}
                    name="query"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Your Description</FormLabel>
                        <FormControl>
                            <Textarea
                            placeholder="Describe the raw and cooked weights, nutrition per 100g raw, and your final portion size..."
                            className="resize-none"
                            rows={6}
                            {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    {result && (
                    <div className="mt-6 space-y-2 rounded-md bg-muted p-4">
                        <h4 className="font-medium text-foreground text-sm">Calculated Nutrition for Your Portion</h4>
                        <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                            <span>Calories:</span>
                            <span className="font-bold text-primary">{result.calories.toFixed(0)} kcal</span>
                            </div>
                            <div className="flex justify-between">
                            <span>Protein:</span>
                            <span>{result.protein.toFixed(1)} g</span>
                            </div>
                            <div className="flex justify-between">
                            <span>Fat:</span>
                            <span>{result.fat.toFixed(1)} g</span>
                            </div>
                            <div className="flex justify-between">
                            <span>Carbs:</span>
                            <span>{result.carbs.toFixed(1)} g</span>
                            </div>
                            {result.salt !== undefined && (
                                <div className="flex justify-between">
                                    <span>Salt:</span>
                                    <span>{result.salt.toFixed(1)} g</span>
                                </div>
                            )}
                        </div>
                        <Button onClick={handleAddToLog} className="mt-4 w-full">
                            <Plus className="mr-2 h-4 w-4" />
                            Add to Log
                        </Button>
                    </div>
                    )}
                    {error && (
                        <div className="mt-4 text-sm font-medium text-destructive">
                            <p>Error: {error}</p>
                        </div>
                    )}
                </div>
                </form>
            </Form>
          </div>
          <SheetFooter className="bg-card p-6 mt-4 border-t">
            <Button onClick={form.handleSubmit(onSubmit)} type="submit" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Calculate
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
  );
}

    