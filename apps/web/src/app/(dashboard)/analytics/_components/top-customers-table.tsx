"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
} from "@bites-rms/ui";

interface Customer {
  name: string;
  isVip: boolean;
  visits: number;
  covers: number;
  totalSpend: number;
}

interface Props {
  data: Customer[];
  loading?: boolean;
}

export function TopCustomersTable({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 rounded bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No customer data for this period
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">#</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead className="text-right">Visits</TableHead>
          <TableHead className="text-right">Covers</TableHead>
          <TableHead className="text-right">Spend</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((customer, i) => (
          <TableRow key={i}>
            <TableCell className="text-muted-foreground text-xs">
              {i + 1}
            </TableCell>
            <TableCell className="text-sm font-medium">
              {customer.name}
              {customer.isVip && (
                <Badge
                  variant="secondary"
                  className="ml-1.5 text-[10px] px-1 py-0"
                >
                  VIP
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right text-sm">
              {customer.visits}
            </TableCell>
            <TableCell className="text-right text-sm">
              {customer.covers}
            </TableCell>
            <TableCell className="text-right text-sm">
              {customer.totalSpend > 0
                ? `$${(customer.totalSpend / 100).toFixed(2)}`
                : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
