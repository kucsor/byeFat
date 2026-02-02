'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
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
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import type { DailyLog, UserProfile } from '@/lib/types';
import { triggerHapticFeedback } from '@/lib/haptics';
import { useMemo, useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlayfulFlame } from './animated-icons';
import { motion } from 'framer-motion';

const activitySchema = z.object({
  name: z.string().min(2, { message: 'Activity name must be at least 2 characters.' }),
  calories: z.coerce.number().min(1, { message: 'Calories must be greater than 0.' }),
});

const PREDEFINED_ACTIVITIES = [
  "Walking", "Running", "Strength Training", "Indoor Biking", "Indoor Running", "Indoor Walking", "Cycling", "Swimming", "Yoga", "HIIT", "Weightlifting", "Hiking", "Dancing", "Rowing", "Pilates", "Soccer", "Basketball", "Tennis", "Jumping Rope", "Elliptical Trainer", "Stair Climbing", "Stretching"
];

type AddActivitySheetProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    selectedDate: string;
    userProfile: UserProfile;
    selectedLog: DailyLog | null;
}

export function AddActivitySheet({ isOpen, setIsOpen, selectedDate, userProfile, selectedLog }: AddActivitySheetProps) {
  const [searchValue, setSearchValue] = useState('');
  const { firestore, user } = useFirebase();
  const isMobile = useIsMobile();
  
  const form = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      name: '',
      calories: 0,
    },
  });

  const selectedActivityName = form.watch('name');

  const onSubmit = (values: z.infer<typeof activitySchema>) => {
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

    const activitiesCollection = collection(dailyLogRef, 'activities');
    
    addDocumentNonBlocking(activitiesCollection, {
      ...values,
      createdAt: serverTimestamp(),
    });
    
    triggerHapticFeedback();
    setIsOpen(false);
  };
  
  const handleSheetOpen = (open: boolean) => {
    if(!open) {
      form.reset({ name: '', calories: 0 });
      setSearchValue('');
    }
    setIsOpen(open);
  }

  const filteredActivities = useMemo(() => {
    if (!searchValue) return PREDEFINED_ACTIVITIES;
    const lowercasedSearch = searchValue.toLowerCase();
    return PREDEFINED_ACTIVITIES.filter((activity) => 
        activity.toLowerCase().includes(lowercasedSearch)
    );
  }, [searchValue]);

  return (
      <Sheet open={isOpen} onOpenChange={handleSheetOpen}>
        <SheetContent side={isMobile ? 'bottom' : 'right'} className="flex flex-col gap-0 p-0 rounded-t-[2.5rem] md:rounded-l-[2.5rem] md:rounded-tr-none border-none glass overflow-hidden">
          <SheetHeader className="p-6 pb-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-accent/20 p-2 rounded-2xl">
                <PlayfulFlame />
              </div>
              <SheetTitle className="text-2xl font-black text-accent-foreground">Log Activitate</SheetTitle>
            </div>
            <SheetDescription className="font-bold opacity-70">
              Caută o activitate și introdu caloriile arse.
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
                      <FormLabel className="text-xs font-black uppercase tracking-widest opacity-60">Activitate</FormLabel>
                      {!selectedActivityName ? (
                        <Command shouldFilter={false} className="rounded-3xl border-2 border-accent/20 overflow-hidden bg-white/50">
                          <CommandInput 
                            placeholder="Caută activitate..."
                            value={searchValue}
                            onValueChange={setSearchValue}
                            className="border-none focus:ring-0"
                          />
                          <ScrollArea className="h-48">
                            <CommandList>
                              {filteredActivities.length === 0 && <CommandEmpty className="p-4 text-center font-bold opacity-50">Nu am găsit activitatea.</CommandEmpty>}
                              <CommandGroup>
                                {filteredActivities.map((activity) => (
                                  <CommandItem
                                    key={activity}
                                    value={activity}
                                    onSelect={() => {
                                      form.setValue("name", activity, { shouldValidate: true });
                                    }}
                                    className="p-3 aria-selected:bg-accent/10 rounded-xl cursor-pointer"
                                  >
                                    <span className="font-bold">{activity}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </ScrollArea>
                        </Command>
                      ) : (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="flex items-center justify-between rounded-3xl border-2 border-accent/20 bg-accent/10 p-4"
                        >
                            <div>
                                <p className="font-black text-accent-foreground">{selectedActivityName}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => form.setValue('name', '')}
                              className="rounded-full hover:bg-accent/20 font-bold"
                            >
                              Schimbă
                            </Button>
                        </motion.div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {selectedActivityName && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <FormField
                        control={form.control}
                        name="calories"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-black uppercase tracking-widest opacity-60">Calorii Arse</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="300"
                                {...field}
                                onFocus={(e) => e.target.select()}
                                className="h-14 rounded-2xl border-2 border-accent/20 bg-white/50 text-xl font-black text-center focus-visible:ring-accent/30"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>
                )}
              </form>
            </Form>
          </div>
          <SheetFooter className="p-6 mt-4 border-t border-accent/10 bg-white/30 backdrop-blur-md">
            <Button
              onClick={form.handleSubmit(onSubmit)}
              type="submit"
              className="w-full h-14 rounded-2xl text-lg font-black shadow-lg shadow-accent/20 bouncy-hover bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={!selectedActivityName}
            >
              Log Activitate
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
  );
}
