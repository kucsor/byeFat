'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { collection, doc, serverTimestamp, increment } from 'firebase/firestore';
import type { DailyLog, UserProfile } from '@/lib/types';
import { triggerHapticFeedback } from '@/lib/haptics';
import { PlateCutlery } from './animated-icons';
import { motion } from 'framer-motion';

const manualLogSchema = z.object({
  name: z.string().min(2, { message: 'Numele trebuie să aibă cel puțin 2 caractere.' }),
  calories: z.coerce.number().min(0),
  protein: z.coerce.number().min(0),
  fat: z.coerce.number().min(0),
  carbs: z.coerce.number().min(0),
  grams: z.coerce.number().min(1, { message: 'Greutatea trebuie să fie minim 1g.' }),
});

type AddManualLogSheetProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  selectedDate: string;
  userProfile: UserProfile;
  selectedLog: DailyLog | null;
}

export function AddManualLogSheet({ isOpen, setIsOpen, selectedDate, userProfile, selectedLog }: AddManualLogSheetProps) {
  const { firestore, user } = useFirebase();
  const isMobile = useIsMobile();

  const form = useForm<z.infer<typeof manualLogSchema>>({
    resolver: zodResolver(manualLogSchema),
    defaultValues: {
      name: '',
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      grams: 100,
    },
  });

  const onSubmit = (values: z.infer<typeof manualLogSchema>) => {
    if (!user || !userProfile) return;

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
      productId: `manual-${Date.now()}`,
      productName: values.name,
      grams: values.grams,
      calories: values.calories,
      protein: values.protein,
      fat: values.fat,
      carbs: values.carbs,
      createdAt: serverTimestamp(),
    };

    addDocumentNonBlocking(logItemsCollection, newLogItem);
    updateDocumentNonBlocking(dailyLogRef, { consumedCalories: increment(newLogItem.calories) });

    triggerHapticFeedback();
    setIsOpen(false);
    form.reset();
  };

  const handleSheetOpen = (open: boolean) => {
    if(!open) {
      form.reset();
    }
    setIsOpen(open);
  }

  return (
      <Sheet open={isOpen} onOpenChange={handleSheetOpen}>
        <SheetContent side={isMobile ? 'bottom' : 'right'} className="flex flex-col gap-0 p-0 rounded-t-[2.5rem] md:rounded-l-[2.5rem] md:rounded-tr-none border-none glass overflow-hidden min-h-[85vh]">
          <SheetHeader className="p-6 pb-2">
            <div className="flex items-center gap-3 mb-2">
                <div className="bg-primary/20 p-2 rounded-2xl">
                  <PlateCutlery />
                </div>
                <SheetTitle className="text-2xl font-black text-primary-foreground">Adăugare Manuală</SheetTitle>
            </div>
            <SheetDescription className="font-bold opacity-70">
              Introdu detaliile mesei tale. Această intrare este privată.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Form {...form}>
              <form className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest opacity-60">Nume Masă</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Ciorbă de văcuță"
                          {...field}
                          className="h-12 rounded-2xl border-2 border-primary/20 bg-white/50 font-bold focus-visible:ring-primary/30"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="grams"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest opacity-60">Greutate (g)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          className="h-12 rounded-2xl border-2 border-primary/20 bg-white/50 font-bold focus-visible:ring-primary/30"
                          onFocus={(e) => e.target.select()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="calories"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-widest opacity-60">Calorii (kcal)</FormLabel>
                        <FormControl>
                            <Input
                              type="number"
                              {...field}
                              className="h-12 rounded-2xl border-2 border-primary/20 bg-white/50 font-bold focus-visible:ring-primary/30"
                              onFocus={(e) => e.target.select()}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="protein"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-widest opacity-60">Proteine (g)</FormLabel>
                        <FormControl>
                            <Input
                              type="number"
                              {...field}
                              className="h-12 rounded-2xl border-2 border-primary/20 bg-white/50 font-bold focus-visible:ring-primary/30"
                              onFocus={(e) => e.target.select()}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="carbs"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-widest opacity-60">Carbohidrați (g)</FormLabel>
                        <FormControl>
                            <Input
                              type="number"
                              {...field}
                              className="h-12 rounded-2xl border-2 border-primary/20 bg-white/50 font-bold focus-visible:ring-primary/30"
                              onFocus={(e) => e.target.select()}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="fat"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-widest opacity-60">Grăsimi (g)</FormLabel>
                        <FormControl>
                            <Input
                              type="number"
                              {...field}
                              className="h-12 rounded-2xl border-2 border-primary/20 bg-white/50 font-bold focus-visible:ring-primary/30"
                              onFocus={(e) => e.target.select()}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
              </form>
            </Form>
          </div>
          <SheetFooter className="p-6 mt-4 border-t border-primary/10 bg-white/30 backdrop-blur-md">
            <Button
              onClick={form.handleSubmit(onSubmit)}
              type="submit"
              className="w-full h-14 rounded-2xl text-lg font-black shadow-lg shadow-primary/20 bouncy-hover"
            >
              Salvează Masă
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
  );
}
