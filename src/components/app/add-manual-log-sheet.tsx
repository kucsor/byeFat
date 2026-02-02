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

const manualLogSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  calories: z.coerce.number().min(0),
  protein: z.coerce.number().min(0),
  fat: z.coerce.number().min(0),
  carbs: z.coerce.number().min(0),
  grams: z.coerce.number().min(1, { message: 'Weight must be at least 1g.' }),
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
        <SheetContent side={isMobile ? 'bottom' : 'right'} className="flex flex-col gap-0 p-0">
          <SheetHeader className="p-6 pb-2">
            <div className="flex items-center gap-2">
                <PlateCutlery />
                <SheetTitle>Logare Manuală</SheetTitle>
            </div>
            <SheetDescription>
              Introdu detaliile mesei tale. Această intrare este privată și nu va apărea în lista publică.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Form {...form}>
              <form className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nume Masă</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Ciorbă de văcuță" {...field} className="rounded-full" />
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
                      <FormLabel>Greutate (g)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="rounded-full" onFocus={(e) => e.target.select()} />
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
                        <FormLabel>Calorii (kcal)</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} className="rounded-full" onFocus={(e) => e.target.select()} />
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
                        <FormLabel>Proteine (g)</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} className="rounded-full" onFocus={(e) => e.target.select()} />
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
                        <FormLabel>Carbohidrați (g)</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} className="rounded-full" onFocus={(e) => e.target.select()} />
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
                        <FormLabel>Grăsimi (g)</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} className="rounded-full" onFocus={(e) => e.target.select()} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
              </form>
            </Form>
          </div>
          <SheetFooter className="bg-card p-6 mt-4 border-t">
            <Button onClick={form.handleSubmit(onSubmit)} type="submit" className="w-full h-12 rounded-full text-lg font-bold bouncy-hover">
              Salvează Masă
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
  );
}
