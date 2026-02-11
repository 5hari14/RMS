"use client";

import { Search } from "lucide-react";
import {
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@bites-rms/ui";

interface FilterBarProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  periodFilter: string;
  onPeriodFilterChange: (value: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function FilterBar({
  statusFilter,
  onStatusFilterChange,
  periodFilter,
  onPeriodFilterChange,
  searchQuery,
  onSearchChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by customer name..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="CONFIRMED">Confirmed</SelectItem>
          <SelectItem value="SEATED">Seated</SelectItem>
          <SelectItem value="COMPLETED">Completed</SelectItem>
          <SelectItem value="NO_SHOW">No-show</SelectItem>
          <SelectItem value="CANCELLED">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <Select value={periodFilter} onValueChange={onPeriodFilterChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All day" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All day</SelectItem>
          <SelectItem value="lunch">Lunch (11-15)</SelectItem>
          <SelectItem value="dinner">Dinner (17-23)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
