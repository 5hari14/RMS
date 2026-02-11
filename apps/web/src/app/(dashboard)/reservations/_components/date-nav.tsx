"use client";

import { format, addDays, subDays, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import {
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Calendar,
} from "@bites-rms/ui";

interface DateNavProps {
  date: Date;
  onDateChange: (date: Date) => void;
}

export function DateNav({ date, onDateChange }: DateNavProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => onDateChange(subDays(date, 1))}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[200px] justify-start gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="font-medium">{format(date, "EEEE, MMM d, yyyy")}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar selected={date} onSelect={(d) => onDateChange(d)} />
        </PopoverContent>
      </Popover>

      <Button variant="outline" size="icon" onClick={() => onDateChange(addDays(date, 1))}>
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isToday(date) && (
        <Button variant="ghost" size="sm" onClick={() => onDateChange(new Date())}>
          Today
        </Button>
      )}
    </div>
  );
}
