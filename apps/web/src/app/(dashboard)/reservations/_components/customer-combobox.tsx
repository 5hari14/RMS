"use client";

import * as React from "react";
import { Search, Plus, Star, Ban, X } from "lucide-react";
import { Input, Button, Badge, Label, cn } from "@bites-rms/ui";
import { trpc } from "@/trpc/client";
import type { CustomerSearchResult } from "./types";

interface CustomerComboboxProps {
  selectedCustomer: CustomerSearchResult | null;
  onSelect: (customer: CustomerSearchResult | null) => void;
  /** For creating a new customer inline */
  newCustomer: { name: string; email: string; phone: string } | null;
  onNewCustomerChange: (data: { name: string; email: string; phone: string } | null) => void;
}

export function CustomerCombobox({
  selectedCustomer,
  onSelect,
  newCustomer,
  onNewCustomerChange,
}: CustomerComboboxProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const { data: results = [] } = trpc.customer.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 1 },
  );

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // If a customer is selected, show their info
  if (selectedCustomer) {
    const fullName =
      `${selectedCustomer.firstName} ${selectedCustomer.lastName ?? ""}`.trim();
    return (
      <div className="rounded-md border p-3 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{fullName}</span>
            {selectedCustomer.isVip && (
              <Star className="h-3.5 w-3.5 text-purple-600 fill-purple-600" />
            )}
            {selectedCustomer.isBlacklisted && (
              <Ban className="h-3.5 w-3.5 text-red-600" />
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onSelect(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        {selectedCustomer.email && (
          <p className="text-xs text-muted-foreground">{selectedCustomer.email}</p>
        )}
        {selectedCustomer.phone && (
          <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
        )}
        {selectedCustomer._count.reservations > 0 && (
          <p className="text-xs text-muted-foreground">
            {selectedCustomer._count.reservations} previous{" "}
            {selectedCustomer._count.reservations === 1 ? "visit" : "visits"}
          </p>
        )}
        {(selectedCustomer.allergies.length > 0 || selectedCustomer.dietaryRequirements) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {selectedCustomer.allergies.map((a) => (
              <Badge
                key={a}
                variant="outline"
                className="bg-red-50 text-red-700 border-red-200 text-[10px]"
              >
                {a}
              </Badge>
            ))}
            {selectedCustomer.dietaryRequirements && (
              <Badge
                variant="outline"
                className="bg-red-50 text-red-700 border-red-200 text-[10px]"
              >
                {selectedCustomer.dietaryRequirements}
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  }

  // If creating a new customer inline
  if (newCustomer) {
    return (
      <div className="rounded-md border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">New customer</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onNewCustomerChange(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div>
          <Label htmlFor="new-cust-name" className="text-xs">
            Name *
          </Label>
          <Input
            id="new-cust-name"
            value={newCustomer.name}
            onChange={(e) =>
              onNewCustomerChange({ ...newCustomer, name: e.target.value })
            }
            placeholder="John Smith"
            className="h-8 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="new-cust-email" className="text-xs">
              Email
            </Label>
            <Input
              id="new-cust-email"
              type="email"
              value={newCustomer.email}
              onChange={(e) =>
                onNewCustomerChange({ ...newCustomer, email: e.target.value })
              }
              placeholder="john@example.com"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="new-cust-phone" className="text-xs">
              Phone
            </Label>
            <Input
              id="new-cust-phone"
              type="tel"
              value={newCustomer.phone}
              onChange={(e) =>
                onNewCustomerChange({ ...newCustomer, phone: e.target.value })
              }
              placeholder="+44 7700 900000"
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>
    );
  }

  // Search state
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => searchQuery.length >= 1 && setIsOpen(true)}
          placeholder="Search customer by name, email, or phone..."
          className="pl-8 h-9 text-sm"
        />
      </div>

      {isOpen && searchQuery.length >= 1 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="max-h-60 overflow-auto p-1">
            {results.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">
                No customers found
              </p>
            ) : (
              results.map((customer) => {
                const fullName =
                  `${customer.firstName} ${customer.lastName ?? ""}`.trim();
                return (
                  <button
                    key={customer.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer",
                    )}
                    onClick={() => {
                      onSelect(customer);
                      setSearchQuery("");
                      setIsOpen(false);
                    }}
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{fullName}</span>
                        {customer.isVip && (
                          <Star className="h-3 w-3 text-purple-600 fill-purple-600" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {customer.email ?? customer.phone ?? "No contact info"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {customer._count.reservations} visits
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <div className="border-t p-1">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
              onClick={() => {
                onNewCustomerChange({ name: searchQuery, email: "", phone: "" });
                setSearchQuery("");
                setIsOpen(false);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add new customer
              {searchQuery && (
                <span className="text-muted-foreground">
                  &ldquo;{searchQuery}&rdquo;
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
