'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
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
  SheetTrigger,
} from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { useIsMobile } from '@/hooks/use-mobile';
import { doc } from 'firebase/firestore';
import { triggerHapticFeedback } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const weightEntrySchema = z.object({
  date: z.date({
    required_error: 'A date is required.',
  }),
  weight: z.coerce.number().min(1, { message: 'Weight must be greater than 0.' }),
});

type AddWeightSheetProps = {
    children: React.ReactNode;
}

export function AddWeightEntrySheet({ children }: AddWeightSheetProps) {
  const { firestore, user } = useFirebase();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  
  const form = useForm<z.infer<typeof weightEntrySchema>>({
    resolver: zodResolver(weightEntrySchema),
    defaultValues: {
        date: new Date(),
        weight: 0,
    },
  });

  const onSubmit = (values: z.infer<typeof weightEntrySchema>) => {
    if (!user) return;
    
    const dateString = format(values.date, 'yyyy-MM-dd');
    const weightHistoryRef = doc(firestore, `users/${user.uid}/weightHistory`, dateString);

    setDocumentNonBlocking(weightHistoryRef, {
        id: dateString,
        date: dateString,
        weight: values.weight,
    }, { merge: true });
    
    triggerHapticFeedback();
    
    setIsOpen(false);
    form.reset({ date: new Date(), weight: 0 });
  };
  
  const handleSheetOpen = (open: boolean) => {
    if(!open) {
      form.reset({ date: new Date(), weight: 0 });
    }
    setIsOpen(open);
  }

  return (
      <Sheet open={isOpen} onOpenChange={handleSheetOpen}>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent side={isMobile ? 'bottom' : 'right'} className="flex flex-col gap-0 p-0">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle>Add Weight Entry</SheetTitle>
            <SheetDescription>
              Add a historical weight measurement. This will update your progress chart.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Form {...form}>
              <form className="space-y-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="75.5" {...field} onFocus={(e) => e.target.select()} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
          <SheetFooter className="bg-card p-6 mt-4 border-t">
            <Button onClick={form.handleSubmit(onSubmit)} type="submit" className="w-full">
              Save Entry
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
  );
}
