'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase, addDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
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
import { useMemo, useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    isLogLoading?: boolean;
}

export function AddActivitySheet({ isOpen, setIsOpen, selectedDate, userProfile, selectedLog, isLogLoading }: AddActivitySheetProps) {
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
    
    // Create or update the daily log
    setDocumentNonBlocking(dailyLogRef, logDataToSet, { merge: true });

    // Update the total active calories on the daily log
    updateDocumentNonBlocking(dailyLogRef, {
        activeCalories: increment(values.calories)
    });

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
        <SheetContent side={isMobile ? 'bottom' : 'right'} className="flex flex-col gap-0 p-0">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle>Log Activity</SheetTitle>
            <SheetDescription>
              Search for an activity, select it, and enter the calories burned.
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
                      <FormLabel>Activity</FormLabel>
                      {!selectedActivityName ? (
                        <Command shouldFilter={false}>
                          <CommandInput 
                            placeholder="Search for an activity..." 
                            value={searchValue}
                            onValueChange={setSearchValue}
                          />
                          <ScrollArea className="h-48 rounded-md border">
                            <CommandList>
                              {filteredActivities.length === 0 && <CommandEmpty>No activity found.</CommandEmpty>}
                              <CommandGroup>
                                {filteredActivities.map((activity) => (
                                  <CommandItem
                                    key={activity}
                                    value={activity}
                                    onSelect={() => {
                                      form.setValue("name", activity, { shouldValidate: true });
                                    }}
                                  >
                                    <span>{activity}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </ScrollArea>
                        </Command>
                      ) : (
                        <div className="flex items-center justify-between rounded-md border bg-muted p-3">
                            <div>
                                <p className="font-medium">{selectedActivityName}</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => form.setValue('name', '')}>Change</Button>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {selectedActivityName && (
                    <FormField
                      control={form.control}
                      name="calories"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Calories Burned</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="300" {...field} onFocus={(e) => e.target.select()} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                )}
              </form>
            </Form>
          </div>
          <SheetFooter className="bg-card p-6 mt-4 border-t">
            <Button onClick={form.handleSubmit(onSubmit)} type="submit" className="w-full" disabled={!selectedActivityName || isLogLoading}>
              Log Activity
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
  );
}
