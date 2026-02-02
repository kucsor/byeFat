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
import { Loader2, Sparkles, Plus, ScanLine } from 'lucide-react';
import { useFirebase, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { BarcodeScanner } from './barcode-scanner';
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
import { motion } from 'framer-motion';


const formSchema = z.object({
  query: z.string().min(3, {
    message: 'Te rugăm să oferi mai multe detalii pentru o calculare precisă.',
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
  const [isScanning, setIsScanning] = useState(false);
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
      if (!response.success) {
        setError(response.error);
        setResult(null);
        return;
      }

      const result = response.data;
      if (result.description.startsWith('ERROR:')) {
        setError(
          'Calcularea a eșuat. Te rugăm să incluzi valorile nutriționale pentru produsul crud (ex: "calorii", "proteine", "grăsimi").'
        );
        setResult(null);
      } else {
        setResult(result);
      }
    } catch (e: any) {
      setError(e.message || 'A apărut o eroare neașteptată.');
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
      setIsScanning(false);
    }
    setIsOpen(open);
  }

  const handleScan = (product: any) => {
    const currentQuery = form.getValues('query');
    const nutritionInfo = `Produs: ${product.name} (per 100g: ${product.caloriesPer100g} kcal, ${product.proteinPer100g}g proteine, ${product.fatPer100g}g grăsimi, ${product.carbsPer100g}g carbs). `;
    form.setValue('query', nutritionInfo + currentQuery);
    setIsScanning(false);
    triggerHapticFeedback();
  };

  return (
      <Sheet open={isOpen} onOpenChange={handleSheetOpen}>
        <SheetContent side={isMobile ? 'bottom' : 'right'} className="flex flex-col gap-0 p-0 rounded-t-[2.5rem] md:rounded-l-[2.5rem] md:rounded-tr-none border-none glass overflow-hidden min-h-[85vh]">
          <SheetHeader className="p-6 pb-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-secondary/20 p-2 rounded-2xl">
                <Sparkles className="h-6 w-6 text-secondary-foreground" />
              </div>
              <SheetTitle className="text-2xl font-black text-secondary-foreground">Calculator Porții AI</SheetTitle>
            </div>
            <SheetDescription className="font-bold opacity-70">
              Calculează nutriția pentru porții gătite folosind AI.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Form {...form}>
                <form>
                <div className="space-y-6">
                    <div className="bg-secondary/10 p-4 rounded-2xl border-2 border-secondary/20">
                      <p className="text-xs font-bold leading-relaxed opacity-80">
                        Exemplu: "Am gătit 400g paste crude. Nutriția per 100g crud este 350 kcal, 12g proteine. După fierbere, greutatea totală a fost 700g. Am mâncat 250g din pastele gătite."
                      </p>
                    </div>

                    <FormField
                    control={form.control}
                    name="query"
                    render={({ field }) => (
                        <FormItem>
                        <div className="flex justify-between items-center mb-2">
                            <FormLabel className="text-xs font-black uppercase tracking-widest opacity-60">Descrierea ta</FormLabel>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 gap-1.5 rounded-full font-bold border-2"
                                onClick={() => setIsScanning(!isScanning)}
                            >
                                <ScanLine className="h-4 w-4" />
                                {isScanning ? 'Anulează' : 'Scanează Produs Crud'}
                            </Button>
                        </div>
                        {isScanning && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mb-4 rounded-[2rem] overflow-hidden border-4 border-secondary/20 h-64 relative bg-black"
                            >
                                <BarcodeScanner
                                    onScan={handleScan}
                                    onClose={() => setIsScanning(false)}
                                />
                            </motion.div>
                        )}
                        <FormControl>
                            <Textarea
                              placeholder="Descrie greutatea crudă și gătită, nutriția per 100g crud și porția ta finală..."
                              className="resize-none rounded-2xl border-2 border-secondary/20 bg-white/50 p-4 font-medium focus-visible:ring-secondary/30"
                              rows={5}
                              {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    {result && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="space-y-4"
                    >
                        <h4 className="text-xs font-black uppercase tracking-widest opacity-60 text-center">Nutriție Calculată pentru Porția Ta</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'CALORII', value: `${result.calories.toFixed(0)} kcal`, color: 'bg-primary/20' },
                            { label: 'PROTEINE', value: `${result.protein.toFixed(1)} g`, color: 'bg-blue-100' },
                            { label: 'CARBS', value: `${result.carbs.toFixed(1)} g`, color: 'bg-accent/20' },
                            { label: 'GRĂSIMI', value: `${result.fat.toFixed(1)} g`, color: 'bg-secondary/20' },
                          ].map((macro) => (
                            <div key={macro.label} className={`${macro.color} p-4 rounded-3xl text-center border-2 border-white/50`}>
                              <div className="text-[10px] font-black opacity-50 mb-1">{macro.label}</div>
                              <div className="text-lg font-black">{macro.value}</div>
                            </div>
                          ))}
                        </div>
                        <Button
                          onClick={handleAddToLog}
                          className="w-full h-14 rounded-2xl text-lg font-black shadow-lg shadow-primary/20 bouncy-hover"
                        >
                            <Plus className="mr-2 h-5 w-5" />
                            Adaugă în Jurnal
                        </Button>
                    </motion.div>
                    )}
                    {error && (
                        <div className="mt-4 p-4 rounded-2xl bg-destructive/10 text-destructive text-sm font-bold text-center border-2 border-destructive/20">
                            {error}
                        </div>
                    )}
                </div>
                </form>
            </Form>
          </div>
          <SheetFooter className="p-6 mt-4 border-t border-secondary/10 bg-white/30 backdrop-blur-md">
            <Button
              onClick={form.handleSubmit(onSubmit)}
              type="submit"
              disabled={isLoading}
              className="w-full h-14 rounded-2xl text-lg font-black shadow-lg shadow-secondary/20 bouncy-hover bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
                {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Calculează
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
  );
}
