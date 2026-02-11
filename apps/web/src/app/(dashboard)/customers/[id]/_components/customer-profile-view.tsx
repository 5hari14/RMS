"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Star,
  Ban,
  Pencil,
  ArrowLeft,
  AlertTriangle,
  CalendarDays,
  TrendingUp,
  UserX,
  Clock,
} from "lucide-react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  Separator,
} from "@bites-rms/ui";
import { trpc } from "@/trpc/client";
import { VisitHistoryTab } from "./visit-history-tab";
import { PreferencesTab } from "./preferences-tab";
import { NotesTab } from "./notes-tab";
import { EditCustomerPanel } from "./edit-customer-panel";

interface Props {
  customerId: string;
}

type TabValue = "visits" | "preferences" | "notes";

export function CustomerProfileView({ customerId }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<TabValue>("visits");
  const [editOpen, setEditOpen] = React.useState(false);

  const utils = trpc.useUtils();
  const { data: customer, isLoading } = trpc.customer.getById.useQuery({ id: customerId });

  const toggleVipMutation = trpc.customer.toggleVip.useMutation({
    onSuccess: () => void utils.customer.getById.invalidate({ id: customerId }),
  });

  const blacklistMutation = trpc.customer.blacklist.useMutation({
    onSuccess: () => void utils.customer.getById.invalidate({ id: customerId }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-lg text-muted-foreground">Customer not found</p>
        <Button variant="outline" onClick={() => router.push("/customers")}>
          Back to Customers
        </Button>
      </div>
    );
  }

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ");
  const hasAllergies = customer.allergies.length > 0 || !!customer.dietaryRequirements;

  const tabs: { value: TabValue; label: string }[] = [
    { value: "visits", label: "Visit History" },
    { value: "preferences", label: "Preferences" },
    { value: "notes", label: `Notes (${customer.customerNotes.length})` },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back button + header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="mt-1"
          onClick={() => router.push("/customers")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{fullName}</h1>
            {customer.isVip && (
              <Badge className="gap-1 bg-purple-100 text-purple-800 border-purple-200">
                <Star className="h-3 w-3 fill-purple-600" />
                VIP
              </Badge>
            )}
            {customer.isBlacklisted && (
              <Badge variant="destructive" className="gap-1">
                <Ban className="h-3 w-3" />
                Blacklisted
              </Badge>
            )}
            {hasAllergies && (
              <Badge className="gap-1 bg-amber-100 text-amber-800 border-amber-200">
                <AlertTriangle className="h-3 w-3" />
                Allergy Alert
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            {customer.email && <span>{customer.email}</span>}
            {customer.phone && <span>{customer.phone}</span>}
            <span>Customer since {format(new Date(customer.createdAt), "MMM yyyy")}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => toggleVipMutation.mutate({ id: customerId })}
            disabled={toggleVipMutation.isPending}
          >
            <Star className={`h-3.5 w-3.5 ${customer.isVip ? "fill-purple-600 text-purple-600" : ""}`} />
            {customer.isVip ? "Remove VIP" : "Mark VIP"}
          </Button>
          <Button
            variant={customer.isBlacklisted ? "outline" : "destructive"}
            size="sm"
            className="gap-1.5"
            onClick={() =>
              blacklistMutation.mutate({
                id: customerId,
                blacklist: !customer.isBlacklisted,
              })
            }
            disabled={blacklistMutation.isPending}
          >
            <Ban className="h-3.5 w-3.5" />
            {customer.isBlacklisted ? "Unblock" : "Blacklist"}
          </Button>
        </div>
      </div>

      {/* Allergy/Dietary alert banner */}
      {hasAllergies && (
        <div className="flex items-start gap-3 rounded-lg border-2 border-red-300 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Allergy &amp; Dietary Alert</p>
            {customer.allergies.length > 0 && (
              <p className="text-sm text-red-700">
                <span className="font-medium">Allergies:</span>{" "}
                {customer.allergies.join(", ")}
              </p>
            )}
            {customer.dietaryRequirements && (
              <p className="text-sm text-red-700">
                <span className="font-medium">Dietary:</span>{" "}
                {customer.dietaryRequirements}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{customer.stats.totalVisits}</p>
              <p className="text-xs text-muted-foreground">Total Visits</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{customer.stats.totalReservations}</p>
              <p className="text-xs text-muted-foreground">Total Reservations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">
                {customer.stats.lastVisit
                  ? format(new Date(customer.stats.lastVisit), "MMM d")
                  : "\u2014"}
              </p>
              <p className="text-xs text-muted-foreground">Last Visit</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <UserX className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{customer.stats.noShowCount}</p>
              <p className="text-xs text-muted-foreground">No-Shows</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "visits" && (
        <VisitHistoryTab reservations={customer.reservations} />
      )}
      {activeTab === "preferences" && (
        <PreferencesTab customer={customer} />
      )}
      {activeTab === "notes" && (
        <NotesTab
          customerId={customerId}
          notes={customer.customerNotes}
          onNoteAdded={() => void utils.customer.getById.invalidate({ id: customerId })}
        />
      )}

      {/* Edit panel */}
      <EditCustomerPanel
        open={editOpen}
        customer={customer}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false);
          void utils.customer.getById.invalidate({ id: customerId });
        }}
      />
    </div>
  );
}
