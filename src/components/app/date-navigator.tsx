'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamically import the Calendar component to reduce initial bundle size
const Calendar = dynamic(() => import('@/components/ui/calendar').then((mod) => mod.Calendar), {
  loading: () => <Skeleton className="h-[300px] w-full" />,
  ssr: false,
});

interface DateNavigatorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function DateNavigator({ selectedDate, onDateChange }: DateNavigatorProps) {
  const today = new Date();
  const isToday = isSameDay(selectedDate, today);

  const handlePreviousDay = () => onDateChange(subDays(selectedDate, 1));
  const handleNextDay = () => onDateChange(addDays(selectedDate, 1));
  const handleToday = () => onDateChange(today);

  return (
    <div className="w-full bg-card rounded-2xl border border-border/50 shadow-sm p-4 flex items-center justify-between gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePreviousDay}
        className="h-10 w-10 rounded-full hover:bg-secondary text-muted-foreground"
      >
        <ChevronLeft className="h-6 w-6" />
        <span className="sr-only">Previous Day</span>
      </Button>

      <div className="flex-1 flex flex-col items-center justify-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
             <Button variant="ghost" className="h-auto p-0 hover:bg-transparent text-foreground">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold font-sans">
                        {format(selectedDate, 'MMMM d, yyyy')}
                    </span>
                    <CalendarIcon className="h-4 w-4 text-primary opacity-50" />
                </div>
             </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && onDateChange(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {!isToday && (
            <Button
                variant="ghost"
                size="sm"
                onClick={handleToday}
                className="h-6 px-3 rounded-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary text-xs font-bold"
            >
                Return to Today
            </Button>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleNextDay}
        className={cn(
            "h-10 w-10 rounded-full hover:bg-secondary text-muted-foreground",
            isToday && "invisible"
        )}
      >
        <ChevronRight className="h-6 w-6" />
        <span className="sr-only">Next Day</span>
      </Button>
    </div>
  );
}
