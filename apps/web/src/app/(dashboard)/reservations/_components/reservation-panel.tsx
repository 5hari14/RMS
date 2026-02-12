"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, startOfDay } from "date-fns";
import {
  Clock,
  Users,
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  StickyNote,
  Pencil,
  Star,
  Ban,
  AlertTriangle,
  CreditCard,
  DollarSign,
  Loader2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Button,
  Separator,
  Badge,
  ScrollArea,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Calendar,
  Checkbox,
  cn,
} from "@bites-rms/ui";
import { trpc } from "@/trpc/client";

import { StatusBadge } from "./status-badge";
import { SourceIcon } from "./source-icon";
import { CustomerCombobox } from "./customer-combobox";
import { AuditTimeline } from "./audit-timeline";
import { TIME_SLOTS } from "./time-slots";
import {
  reservationFormSchema,
  type ReservationFormValues,
  getDefaultValues,
} from "./reservation-form-schema";
import type { Reservation, PanelMode, CustomerSearchResult } from "./types";
import { TAG_OPTIONS as TAGS, SOURCE_OPTIONS as SOURCES } from "./types";
import { DepositDialog, SetupCardDialog } from "./deposit-dialog";

// ─────────────────────────────────────────────────────────────────────────────
// Status action config
// ─────────────────────────────────────────────────────────────────────────────

type ButtonVariant = "default" | "destructive" | "outline" | "secondary";

const STATUS_ACTIONS: Record<
  string,
  { label: string; next: string; variant: ButtonVariant }[]
> = {
  PENDING: [
    { label: "Confirm", next: "CONFIRMED", variant: "default" },
    { label: "Cancel", next: "CANCELLED", variant: "destructive" },
  ],
  CONFIRMED: [
    { label: "Seat", next: "SEATED", variant: "default" },
    { label: "Mark No-Show", next: "NO_SHOW", variant: "destructive" },
    { label: "Cancel", next: "CANCELLED", variant: "outline" },
  ],
  SEATED: [{ label: "Complete", next: "COMPLETED", variant: "default" }],
};

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface ReservationPanelProps {
  mode: PanelMode;
  reservation: Reservation | null;
  open: boolean;
  onClose: () => void;
  onModeChange: (mode: PanelMode) => void;
  onMutationSuccess: () => void;
  defaultDate: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ReservationPanel({
  mode,
  reservation,
  open,
  onClose,
  onModeChange,
  onMutationSuccess,
  defaultDate,
}: ReservationPanelProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <SheetContent className="sm:max-w-lg overflow-hidden flex flex-col p-0">
        {mode === "view" && reservation ? (
          <ViewMode
            reservation={reservation}
            onEdit={() => onModeChange("edit")}
            onMutationSuccess={onMutationSuccess}
          />
        ) : (
          <FormMode
            mode={mode === "view" ? "edit" : mode}
            reservation={reservation}
            defaultDate={defaultDate}
            onClose={onClose}
            onMutationSuccess={onMutationSuccess}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW MODE
// ─────────────────────────────────────────────────────────────────────────────

function ViewMode({
  reservation,
  onEdit,
  onMutationSuccess,
}: {
  reservation: Reservation;
  onEdit: () => void;
  onMutationSuccess: () => void;
}) {
  const utils = trpc.useUtils();

  const updateStatus = trpc.reservation.updateStatus.useMutation({
    onMutate: async ({ id, status }) => {
      // Optimistic update: immediately update the cached date-query
      await utils.reservation.getByDate.cancel();
      const dateKey = { date: startOfDay(new Date(reservation.date)) };
      const previous = utils.reservation.getByDate.getData(dateKey);

      utils.reservation.getByDate.setData(dateKey, (old) => {
        if (!old) return old;
        return old.map((r) =>
          r.id === id ? { ...r, status: status as typeof r.status } : r,
        );
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Roll back on error
      if (context?.previous) {
        const dateKey = { date: startOfDay(new Date(reservation.date)) };
        utils.reservation.getByDate.setData(dateKey, context.previous);
      }
    },
    onSettled: () => {
      onMutationSuccess();
    },
  });

  // Deposit / payment queries
  const { data: deposits = [] } = trpc.payment.getByReservation.useQuery(
    { reservationId: reservation.id },
  );
  const { data: paymentStatus } = trpc.payment.getStripeStatus.useQuery();

  const [showDepositDialog, setShowDepositDialog] = React.useState(false);
  const [showSetupCardDialog, setShowSetupCardDialog] = React.useState(false);
  const [showNoShowConfirm, setShowNoShowConfirm] = React.useState(false);

  const chargeNoShow = trpc.payment.chargeNoShow.useMutation({
    onSuccess: () => {
      setShowNoShowConfirm(false);
      utils.payment.getByReservation.invalidate({ reservationId: reservation.id });
    },
  });

  const refundDeposit = trpc.payment.refund.useMutation({
    onSuccess: () => {
      utils.payment.getByReservation.invalidate({ reservationId: reservation.id });
    },
  });

  const capturedDeposit = deposits.find(
    (d) => d.status === "CAPTURED" && d.type === "deposit",
  );
  const hasCardOnFile = deposits.some((d) => d.stripePaymentMethodId !== null);
  const hasDeposit = deposits.some(
    (d) => d.type === "deposit" && d.status !== "REFUNDED",
  );
  const isStripeConnected = paymentStatus?.liveStatus?.status === "active";
  const depositAmountCents = paymentStatus?.depositAmountCents ?? 0;
  const noShowFeeCents = paymentStatus?.noShowFeeCents ?? 0;

  const customerName = reservation.customer
    ? `${reservation.customer.firstName} ${reservation.customer.lastName ?? ""}`.trim()
    : "Walk-in";

  const actions = STATUS_ACTIONS[reservation.status] ?? [];
  const isTerminal = ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(
    reservation.status,
  );

  return (
    <>
      <div className="p-6 pb-0">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SheetTitle className="text-xl">{customerName}</SheetTitle>
              <StatusBadge status={reservation.status} />
            </div>
            {!isTerminal && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={onEdit}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>
          <SheetDescription>
            {format(new Date(reservation.date), "EEEE, MMM d, yyyy")} at{" "}
            {format(new Date(reservation.time), "HH:mm")}
          </SheetDescription>
        </SheetHeader>
      </div>

      <ScrollArea className="flex-1 px-6">
        <div className="space-y-5 py-4">
          {/* Quick details grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>
                {format(new Date(reservation.time), "HH:mm")} (
                {reservation.duration} min)
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>
                {reservation.partySize}{" "}
                {reservation.partySize === 1 ? "cover" : "covers"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>
                {reservation.table
                  ? reservation.table.name ?? `Table #${reservation.table.number}`
                  : "Unassigned"}
                {reservation.table?.section && ` (${reservation.table.section})`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <SourceIcon source={reservation.source} />
              <span className="capitalize">
                {reservation.source.toLowerCase().replace("_", " ")}
              </span>
            </div>
          </div>

          <Separator />

          {/* Customer card */}
          {reservation.customer && (
            <>
              <div>
                <h4 className="text-sm font-semibold mb-2">Customer</h4>
                <div className="rounded-md border p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{customerName}</span>
                    {reservation.customer.isVip && (
                      <Star className="h-3.5 w-3.5 text-purple-600 fill-purple-600" />
                    )}
                    {reservation.customer.isBlacklisted && (
                      <Badge variant="destructive" className="text-[10px] gap-1">
                        <Ban className="h-3 w-3" />
                        Blacklisted
                      </Badge>
                    )}
                  </div>
                  {reservation.customer.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span>{reservation.customer.email}</span>
                    </div>
                  )}
                  {reservation.customer.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{reservation.customer.phone}</span>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Allergy / Dietary Alert */}
          {reservation.customer &&
            (reservation.customer.allergies.length > 0 ||
              reservation.customer.dietaryRequirements) && (
              <>
                <div className="flex items-start gap-3 rounded-lg border-2 border-red-300 bg-red-50 p-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-red-800">
                      Allergy &amp; Dietary Alert
                    </p>
                    {reservation.customer.allergies.length > 0 && (
                      <p className="text-xs text-red-700">
                        <span className="font-medium">Allergies:</span>{" "}
                        {reservation.customer.allergies.join(", ")}
                      </p>
                    )}
                    {reservation.customer.dietaryRequirements && (
                      <p className="text-xs text-red-700">
                        <span className="font-medium">Dietary:</span>{" "}
                        {reservation.customer.dietaryRequirements}
                      </p>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

          {/* Deposit / Payment Info */}
          {isStripeConnected && (
            <>
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" /> Payment
                </h4>
                {deposits.length > 0 ? (
                  <div className="space-y-2">
                    {deposits.map((deposit) => (
                      <div
                        key={deposit.id}
                        className="flex items-center justify-between rounded-md border p-2.5 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>
                            {deposit.type === "no_show_fee"
                              ? "No-show fee"
                              : "Deposit"}
                          </span>
                          <span className="font-medium">
                            ${(deposit.amount / 100).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              deposit.status === "CAPTURED"
                                ? "default"
                                : deposit.status === "REFUNDED"
                                  ? "outline"
                                  : "secondary"
                            }
                            className="text-xs"
                          >
                            {deposit.status}
                          </Badge>
                          {deposit.status === "CAPTURED" &&
                            deposit.type === "deposit" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                disabled={refundDeposit.isPending}
                                onClick={() =>
                                  refundDeposit.mutate({ depositId: deposit.id })
                                }
                              >
                                Refund
                              </Button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No deposit collected
                  </p>
                )}

                {/* Action buttons for deposits */}
                {!isTerminal && (
                  <div className="flex gap-2 mt-2">
                    {!hasDeposit && depositAmountCents > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setShowDepositDialog(true)}
                      >
                        <DollarSign className="h-3 w-3 mr-1" />
                        Collect Deposit
                      </Button>
                    )}
                    {!hasCardOnFile && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setShowSetupCardDialog(true)}
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        Save Card
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Tags */}
          {reservation.tags.length > 0 && (
            <>
              <div>
                <h4 className="text-sm font-semibold mb-2">Tags</h4>
                <div className="flex gap-1.5 flex-wrap">
                  {reservation.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Special requests */}
          {reservation.specialRequests && (
            <>
              <div>
                <h4 className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Special Requests
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-md bg-muted/50 p-2.5">
                  {reservation.specialRequests}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Internal notes */}
          {reservation.internalNotes && (
            <>
              <div>
                <h4 className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                  <StickyNote className="h-3.5 w-3.5" /> Internal Notes
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-md bg-muted/50 p-2.5">
                  {reservation.internalNotes}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Audit timeline */}
          <AuditTimeline reservationId={reservation.id} />

          {/* Created by */}
          {reservation.createdBy && (
            <p className="text-xs text-muted-foreground pt-2">
              Created by {reservation.createdBy.name ?? "Unknown"}
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Action buttons */}
      {actions.length > 0 && (
        <div className="flex gap-2 p-4 border-t bg-background">
          {actions.map((action) => (
            <Button
              key={action.next}
              variant={action.variant}
              size="sm"
              disabled={updateStatus.isPending}
              onClick={() => {
                if (action.next === "NO_SHOW" && hasCardOnFile && noShowFeeCents > 0) {
                  // Show no-show confirm dialog instead of immediate status change
                  updateStatus.mutate({
                    id: reservation.id,
                    status: "NO_SHOW",
                  });
                  setShowNoShowConfirm(true);
                } else {
                  updateStatus.mutate({
                    id: reservation.id,
                    status: action.next as
                      | "PENDING"
                      | "CONFIRMED"
                      | "SEATED"
                      | "COMPLETED"
                      | "CANCELLED"
                      | "NO_SHOW",
                  });
                }
              }}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* No-show charge confirmation */}
      {reservation.status === "NO_SHOW" && hasCardOnFile && noShowFeeCents > 0 && !showNoShowConfirm && (
        <div className="flex gap-2 p-4 border-t bg-background">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowNoShowConfirm(true)}
          >
            <DollarSign className="h-3.5 w-3.5 mr-1" />
            Charge No-Show Fee
          </Button>
        </div>
      )}

      {showNoShowConfirm && (
        <div className="p-4 border-t bg-amber-50 space-y-3">
          <p className="text-sm font-medium">
            Charge ${(noShowFeeCents / 100).toFixed(2)} no-show fee to the card on file?
          </p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={chargeNoShow.isPending}
              onClick={() =>
                chargeNoShow.mutate({
                  reservationId: reservation.id,
                  amount: noShowFeeCents,
                })
              }
            >
              {chargeNoShow.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <DollarSign className="h-3.5 w-3.5 mr-1" />
              )}
              Charge
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNoShowConfirm(false)}
            >
              Skip
            </Button>
          </div>
          {chargeNoShow.isError && (
            <p className="text-xs text-destructive">
              {chargeNoShow.error.message}
            </p>
          )}
        </div>
      )}

      {/* Deposit collection dialog */}
      <DepositDialog
        open={showDepositDialog}
        onClose={() => setShowDepositDialog(false)}
        reservationId={reservation.id}
        amount={depositAmountCents}
        onSuccess={() => {
          utils.payment.getByReservation.invalidate({ reservationId: reservation.id });
        }}
      />

      {/* Save card dialog */}
      <SetupCardDialog
        open={showSetupCardDialog}
        onClose={() => setShowSetupCardDialog(false)}
        reservationId={reservation.id}
        onSuccess={() => {
          utils.payment.getByReservation.invalidate({ reservationId: reservation.id });
        }}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FORM MODE (CREATE & EDIT)
// ─────────────────────────────────────────────────────────────────────────────

function FormMode({
  mode,
  reservation,
  defaultDate,
  onClose,
  onMutationSuccess,
}: {
  mode: "create" | "edit";
  reservation: Reservation | null;
  defaultDate: Date;
  onClose: () => void;
  onMutationSuccess: () => void;
}) {
  const isEdit = mode === "edit" && reservation !== null;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: isEdit
      ? getDefaultValues("edit", reservation)
      : getDefaultValues("create", undefined, defaultDate),
  });

  const [selectedCustomer, setSelectedCustomer] =
    React.useState<CustomerSearchResult | null>(null);
  const [newCustomer, setNewCustomer] = React.useState<{
    name: string;
    email: string;
    phone: string;
  } | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [depositReservationId, setDepositReservationId] = React.useState<string | null>(null);

  const { data: paymentStatus } = trpc.payment.getStripeStatus.useQuery();

  // Watch values needed for table availability query
  const watchDate = watch("date");
  const watchTime = watch("time");
  const watchDuration = watch("duration");
  const watchPartySize = watch("partySize");

  // Build a Date from date + time for the table query
  const timeDate = React.useMemo(() => {
    if (!watchDate || !watchTime) return null;
    const [hh, mm] = watchTime.split(":").map(Number);
    const d = new Date(watchDate);
    d.setHours(hh ?? 19, mm ?? 0, 0, 0);
    return d;
  }, [watchDate, watchTime]);

  // Query available tables when date/time/partySize are set
  const { data: availableTables = [] } = trpc.table.getAvailable.useQuery(
    {
      date: startOfDay(watchDate),
      time: timeDate!,
      duration: watchDuration,
      partySize: watchPartySize,
      excludeReservationId: isEdit ? reservation.id : undefined,
    },
    { enabled: !!timeDate && watchPartySize > 0 },
  );

  // If editing, set the selected customer from reservation data
  React.useEffect(() => {
    if (isEdit && reservation.customer && !selectedCustomer && !newCustomer) {
      setSelectedCustomer({
        id: reservation.customer.id,
        firstName: reservation.customer.firstName,
        lastName: reservation.customer.lastName,
        email: reservation.customer.email,
        phone: reservation.customer.phone,
        isVip: reservation.customer.isVip,
        isBlacklisted: reservation.customer.isBlacklisted,
        allergies: [],
        dietaryRequirements: null,
        _count: { reservations: 0 },
      });
    }
  }, [isEdit]); // Only run when switching to edit mode

  const requireDepositValue = watch("requireDeposit");

  const createMutation = trpc.reservation.create.useMutation({
    onSuccess: (data) => {
      onMutationSuccess();
      if (requireDepositValue && paymentStatus?.depositAmountCents) {
        setDepositReservationId(data.id);
      } else {
        onClose();
      }
    },
    onError: (err) => setFormError(err.message),
  });

  const updateMutation = trpc.reservation.update.useMutation({
    onSuccess: () => {
      onMutationSuccess();
      onClose();
    },
    onError: (err) => setFormError(err.message),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: ReservationFormValues) {
    setFormError(null);

    // Build time Date from date + time string
    const [hh, mm] = values.time.split(":").map(Number);
    const reservationTime = new Date(values.date);
    reservationTime.setHours(hh ?? 19, mm ?? 0, 0, 0);

    if (isEdit) {
      updateMutation.mutate({
        id: reservation.id,
        date: startOfDay(values.date),
        time: reservationTime,
        partySize: values.partySize,
        duration: values.duration,
        tableId: values.tableId,
        specialRequests: values.specialRequests || null,
        internalNotes: values.internalNotes || null,
        tags: values.tags,
      });
    } else {
      // Create mode — need customer
      if (!selectedCustomer && !newCustomer) {
        setFormError("Please select or add a customer");
        return;
      }

      createMutation.mutate({
        date: startOfDay(values.date),
        time: reservationTime,
        partySize: values.partySize,
        duration: values.duration,
        source: values.source,
        customerId: selectedCustomer?.id,
        customerName: newCustomer?.name,
        customerEmail: newCustomer?.email || undefined,
        customerPhone: newCustomer?.phone || undefined,
        tableId: values.tableId ?? undefined,
        specialRequests: values.specialRequests || undefined,
        internalNotes: values.internalNotes || undefined,
        tags: values.tags.length > 0 ? values.tags : undefined,
      });
    }
  }

  return (
    <>
      <div className="p-6 pb-0">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Reservation" : "New Reservation"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? `Editing reservation for ${format(new Date(reservation.date), "MMM d, yyyy")}`
              : format(defaultDate, "EEEE, MMM d, yyyy")}
          </SheetDescription>
        </SheetHeader>
      </div>

      <ScrollArea className="flex-1 px-6">
        <form
          id="reservation-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 py-4"
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              e.target instanceof HTMLElement &&
              e.target.tagName !== "TEXTAREA"
            ) {
              e.preventDefault();
              handleSubmit(onSubmit)();
            }
          }}
        >
          {formError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              {formError}
            </div>
          )}

          {/* Customer section */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Customer</Label>
            {isEdit ? (
              // In edit mode, customer is already linked — show read-only
              reservation.customer && (
                <div className="rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {reservation.customer.firstName}{" "}
                      {reservation.customer.lastName ?? ""}
                    </span>
                    {reservation.customer.isVip && (
                      <Star className="h-3.5 w-3.5 text-purple-600 fill-purple-600" />
                    )}
                  </div>
                  {reservation.customer.email && (
                    <p className="text-xs text-muted-foreground">
                      {reservation.customer.email}
                    </p>
                  )}
                </div>
              )
            ) : (
              <CustomerCombobox
                selectedCustomer={selectedCustomer}
                onSelect={(c) => {
                  setSelectedCustomer(c);
                  setValue("customerId", c?.id ?? null);
                  if (c) setNewCustomer(null);
                }}
                newCustomer={newCustomer}
                onNewCustomerChange={(nc) => {
                  setNewCustomer(nc);
                  if (nc) {
                    setSelectedCustomer(null);
                    setValue("customerId", null);
                    setValue("customerName", nc.name);
                    setValue("customerEmail", nc.email);
                    setValue("customerPhone", nc.phone);
                  }
                }}
              />
            )}
          </div>

          <Separator />

          {/* Date & Time */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Date & Time</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="form-date" className="text-xs text-muted-foreground">
                  Date
                </Label>
                <Controller
                  name="date"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-9 text-sm",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value
                            ? format(field.value, "MMM d, yyyy")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          selected={field.value}
                          onSelect={(d) => field.onChange(d)}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.date && (
                  <p className="text-xs text-destructive mt-0.5">
                    {errors.date.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="form-time" className="text-xs text-muted-foreground">
                  Time
                </Label>
                <Controller
                  name="time"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((slot) => (
                          <SelectItem key={slot.value} value={slot.value}>
                            {slot.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.time && (
                  <p className="text-xs text-destructive mt-0.5">
                    {errors.time.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Party size & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="form-partySize" className="text-xs text-muted-foreground">
                Party size
              </Label>
              <Input
                id="form-partySize"
                type="number"
                min={1}
                max={20}
                className="h-9 text-sm"
                {...register("partySize", { valueAsNumber: true })}
              />
              {errors.partySize && (
                <p className="text-xs text-destructive mt-0.5">
                  {errors.partySize.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="form-duration" className="text-xs text-muted-foreground">
                Duration (min)
              </Label>
              <Input
                id="form-duration"
                type="number"
                min={15}
                max={480}
                step={15}
                className="h-9 text-sm"
                {...register("duration", { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Table assignment */}
          <div>
            <Label className="text-xs text-muted-foreground">Table</Label>
            <Controller
              name="tableId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select table" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {availableTables.map((table) => (
                      <SelectItem key={table.id} value={table.id}>
                        {table.name ?? `Table #${table.number}`} ({table.section}) —{" "}
                        {table.minCovers}-{table.maxCovers} covers
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {availableTables.length === 0 && timeDate && (
              <p className="text-xs text-muted-foreground mt-1">
                No available tables for this time and party size
              </p>
            )}
          </div>

          {/* Source (create only) */}
          {!isEdit && (
            <div>
              <Label className="text-xs text-muted-foreground">Source</Label>
              <Controller
                name="source"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <Separator />

          {/* Tags */}
          <div>
            <Label className="text-sm font-semibold">Tags</Label>
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {TAGS.map((tag) => {
                    const checked = field.value.includes(tag);
                    return (
                      <label
                        key={tag}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => {
                            if (c) {
                              field.onChange([...field.value, tag]);
                            } else {
                              field.onChange(
                                field.value.filter((t) => t !== tag),
                              );
                            }
                          }}
                        />
                        {tag}
                      </label>
                    );
                  })}
                </div>
              )}
            />
          </div>

          <Separator />

          {/* Deposit toggle (create mode only) */}
          {!isEdit && (
            <Controller
              name="requireDeposit"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={(c) => field.onChange(!!c)}
                  />
                  <div>
                    <span className="text-sm font-medium">
                      Require deposit
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Collect a deposit after creating this reservation
                    </p>
                  </div>
                </label>
              )}
            />
          )}

          <Separator />

          {/* Notes */}
          <div className="space-y-3">
            <div>
              <Label
                htmlFor="form-specialRequests"
                className="text-xs text-muted-foreground"
              >
                Special Requests
              </Label>
              <textarea
                id="form-specialRequests"
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Allergies, accessibility, celebrations..."
                {...register("specialRequests")}
              />
            </div>
            <div>
              <Label
                htmlFor="form-internalNotes"
                className="text-xs text-muted-foreground"
              >
                Internal Notes
              </Label>
              <textarea
                id="form-internalNotes"
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Staff-only notes..."
                {...register("internalNotes")}
              />
            </div>
          </div>
        </form>
      </ScrollArea>

      {/* Submit footer */}
      <div className="flex gap-2 p-4 border-t bg-background">
        <Button
          type="submit"
          form="reservation-form"
          disabled={isPending}
          className="flex-1"
        >
          {isPending
            ? isEdit
              ? "Saving..."
              : "Creating..."
            : isEdit
              ? "Save Changes"
              : "Create Reservation"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>

      {/* Deposit collection after creation */}
      {depositReservationId && paymentStatus?.depositAmountCents && (
        <DepositDialog
          open={!!depositReservationId}
          onClose={() => {
            setDepositReservationId(null);
            onClose();
          }}
          reservationId={depositReservationId}
          amount={paymentStatus.depositAmountCents}
          onSuccess={() => {
            setDepositReservationId(null);
            onClose();
          }}
        />
      )}
    </>
  );
}
