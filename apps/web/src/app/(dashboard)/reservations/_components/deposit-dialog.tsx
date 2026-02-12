"use client";

import * as React from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import { trpc } from "@/trpc/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Button,
  Badge,
  Separator,
} from "@bites-rms/ui";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Stripe instance cache (per connected account)
// ─────────────────────────────────────────────────────────────────────────────

const stripePromises = new Map<string, Promise<StripeJs | null>>();

function getStripePromise(connectedAccountId: string): Promise<StripeJs | null> {
  const key = connectedAccountId;
  if (!stripePromises.has(key)) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
    stripePromises.set(
      key,
      loadStripe(publishableKey, { stripeAccount: connectedAccountId }),
    );
  }
  return stripePromises.get(key)!;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deposit Dialog
// ─────────────────────────────────────────────────────────────────────────────

interface DepositDialogProps {
  open: boolean;
  onClose: () => void;
  reservationId: string;
  amount: number; // cents
  onSuccess?: () => void;
}

export function DepositDialog({
  open,
  onClose,
  reservationId,
  amount,
  onSuccess,
}: DepositDialogProps) {
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [stripeAccountId, setStripeAccountId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const createDeposit = trpc.payment.createDeposit.useMutation({
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      setStripeAccountId(data.stripeAccountId);
    },
    onError: (err) => setError(err.message),
  });

  // Create the payment intent when dialog opens
  React.useEffect(() => {
    if (open && !clientSecret && !createDeposit.isPending) {
      setError(null);
      createDeposit.mutate({ reservationId, amount });
    }
    if (!open) {
      setClientSecret(null);
      setStripeAccountId(null);
      setError(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent className="sm:max-w-md flex flex-col p-0">
        <div className="p-6 pb-0">
          <SheetHeader>
            <SheetTitle>Collect Deposit</SheetTitle>
            <SheetDescription>
              Charge ${(amount / 100).toFixed(2)} deposit for this reservation
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 px-6 py-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <XCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {createDeposit.isPending && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {clientSecret && stripeAccountId && (
            <Elements
              stripe={getStripePromise(stripeAccountId)}
              options={{
                clientSecret,
                appearance: { theme: "stripe" },
              }}
            >
              <DepositForm
                amount={amount}
                onSuccess={() => {
                  onSuccess?.();
                  onClose();
                }}
                onError={setError}
              />
            </Elements>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Deposit Form (inside Elements provider)
// ─────────────────────────────────────────────────────────────────────────────

function DepositForm({
  amount,
  onSuccess,
  onError,
}: {
  amount: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/reservations`,
      },
      redirect: "if_required",
    });

    if (error) {
      onError(error.message ?? "Payment failed");
      setIsProcessing(false);
    } else {
      setIsComplete(true);
      setTimeout(onSuccess, 1500);
    }
  };

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <CheckCircle2 className="h-12 w-12 text-green-600" />
        <p className="text-sm font-medium">Deposit collected successfully!</p>
        <Badge variant="secondary">${(amount / 100).toFixed(2)}</Badge>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Separator />
      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || !elements || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            Processing...
          </>
        ) : (
          `Pay $${(amount / 100).toFixed(2)}`
        )}
      </Button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup Intent Dialog (save card for no-show protection)
// ─────────────────────────────────────────────────────────────────────────────

interface SetupCardDialogProps {
  open: boolean;
  onClose: () => void;
  reservationId: string;
  onSuccess?: () => void;
}

export function SetupCardDialog({
  open,
  onClose,
  reservationId,
  onSuccess,
}: SetupCardDialogProps) {
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [stripeAccountId, setStripeAccountId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const createSetup = trpc.payment.createSetupIntent.useMutation({
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      setStripeAccountId(data.stripeAccountId);
    },
    onError: (err) => setError(err.message),
  });

  React.useEffect(() => {
    if (open && !clientSecret && !createSetup.isPending) {
      setError(null);
      createSetup.mutate({ reservationId });
    }
    if (!open) {
      setClientSecret(null);
      setStripeAccountId(null);
      setError(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent className="sm:max-w-md flex flex-col p-0">
        <div className="p-6 pb-0">
          <SheetHeader>
            <SheetTitle>Save Card on File</SheetTitle>
            <SheetDescription>
              Save a card for no-show protection. The card will only be charged
              if the guest doesn&apos;t show up.
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 px-6 py-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <XCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {createSetup.isPending && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {clientSecret && stripeAccountId && (
            <Elements
              stripe={getStripePromise(stripeAccountId)}
              options={{
                clientSecret,
                appearance: { theme: "stripe" },
              }}
            >
              <SetupForm
                onSuccess={() => {
                  onSuccess?.();
                  onClose();
                }}
                onError={setError}
              />
            </Elements>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SetupForm({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/reservations`,
      },
      redirect: "if_required",
    });

    if (error) {
      onError(error.message ?? "Failed to save card");
      setIsProcessing(false);
    } else {
      setIsComplete(true);
      setTimeout(onSuccess, 1500);
    }
  };

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <CheckCircle2 className="h-12 w-12 text-green-600" />
        <p className="text-sm font-medium">Card saved successfully!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Separator />
      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || !elements || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            Saving...
          </>
        ) : (
          "Save Card"
        )}
      </Button>
    </form>
  );
}
