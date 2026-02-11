"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Search, Star, Ban, AlertTriangle } from "lucide-react";
import {
  Button,
  Input,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@bites-rms/ui";
import { trpc } from "@/trpc/client";
import { CreateCustomerPanel } from "./create-customer-panel";

type FilterTab = "all" | "vip" | "blacklisted" | "new";
type SortBy = "name" | "visitCount" | "lastVisit" | "createdAt";
type SortDir = "asc" | "desc";

export function CustomerListView() {
  const router = useRouter();
  const [filter, setFilter] = React.useState<FilterTab>("all");
  const [sortBy, setSortBy] = React.useState<SortBy>("name");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [page, setPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filter/sort changes
  React.useEffect(() => {
    setPage(1);
  }, [filter, sortBy, sortDir]);

  // Main paginated query
  const customersQuery = trpc.customer.getAll.useQuery(
    { page, pageSize: 20, sortBy, sortDir, filter },
    { enabled: !debouncedSearch },
  );

  // Search query
  const searchResults = trpc.customer.search.useQuery(
    { query: debouncedSearch },
    { enabled: debouncedSearch.length > 0 },
  );

  const isSearching = debouncedSearch.length > 0;
  const customers = isSearching
    ? searchResults.data ?? []
    : customersQuery.data?.customers ?? [];
  const isLoading = isSearching ? searchResults.isLoading : customersQuery.isLoading;
  const totalPages = isSearching ? 1 : (customersQuery.data?.totalPages ?? 1);
  const total = isSearching
    ? (searchResults.data?.length ?? 0)
    : (customersQuery.data?.total ?? 0);

  const utils = trpc.useUtils();

  function handleSort(column: SortBy) {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  function sortIndicator(column: SortBy) {
    if (sortBy !== column) return null;
    return sortDir === "asc" ? " \u2191" : " \u2193";
  }

  const filterTabs: { value: FilterTab; label: string }[] = [
    { value: "all", label: "All" },
    { value: "vip", label: "VIPs" },
    { value: "blacklisted", label: "Blacklisted" },
    { value: "new", label: "New (30d)" },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-1">
          {filterTabs.map((tab) => (
            <Button
              key={tab.value}
              variant={filter === tab.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(tab.value)}
              className="h-9"
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {isSearching
          ? `${total} result${total !== 1 ? "s" : ""} for "${debouncedSearch}"`
          : `${total} customer${total !== 1 ? "s" : ""}`}
      </p>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-lg">No customers found</p>
          <p className="text-sm">
            {isSearching ? "Try a different search term" : "Add your first customer to get started"}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("name")}
                >
                  Name{sortIndicator("name")}
                </TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead
                  className="cursor-pointer select-none text-center"
                  onClick={() => handleSort("visitCount")}
                >
                  Visits{sortIndicator("visitCount")}
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("lastVisit")}
                >
                  Last Visit{sortIndicator("lastVisit")}
                </TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => {
                const name = [customer.firstName, customer.lastName]
                  .filter(Boolean)
                  .join(" ");
                const hasAllergies =
                  customer.allergies.length > 0 || !!customer.dietaryRequirements;
                const lastVisit = "lastVisit" in customer ? (customer as { lastVisit: Date | null }).lastVisit : null;

                return (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/customers/${customer.id}`)}
                  >
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.email ?? "\u2014"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.phone ?? "\u2014"}
                    </TableCell>
                    <TableCell className="text-center">
                      {customer._count.reservations}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lastVisit ? format(new Date(lastVisit), "MMM d, yyyy") : "\u2014"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {customer.isVip && (
                          <Badge className="gap-1 bg-purple-100 text-purple-800 border-purple-200">
                            <Star className="h-3 w-3 fill-purple-600" />
                            VIP
                          </Badge>
                        )}
                        {customer.isBlacklisted && (
                          <Badge variant="destructive" className="gap-1">
                            <Ban className="h-3 w-3" />
                            Blocked
                          </Badge>
                        )}
                        {hasAllergies && (
                          <Badge className="gap-1 bg-amber-100 text-amber-800 border-amber-200">
                            <AlertTriangle className="h-3 w-3" />
                            Allergies
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {!isSearching && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create customer panel */}
      <CreateCustomerPanel
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          setCreateOpen(false);
          void utils.customer.getAll.invalidate();
        }}
      />
    </div>
  );
}
