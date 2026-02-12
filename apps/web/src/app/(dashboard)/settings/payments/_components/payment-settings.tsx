"use client";

import * as React from "react";
import { trpc } from "@/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Separator,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@bites-rms/ui";
import { format } from "date-fns";
import {
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  CreditCard,
} from "lucide-react";

export function PaymentSettings() {
  const utils = trpc.useUtils();

  const { data: status, isLoading } = trpc.payment.getStripeStatus.useQuery();
  const connectStripe = trpc.payment.connectStripe.useMutation({
    onSuccess: (data) => {
      window.location.href = data.onboardingUrl;
    },
  });
  const getDashboard = trpc.payment.getDashboardLink.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
    },
  });
  const updateSettings = trpc.payment.updateSettings.useMutation({
    onSuccess: () => {
      utils.payment.getStripeStatus.invalidate();
    },
  });

  const { data: depositsData } = trpc.payment.listDeposits.useQuery(
    { page: 1, pageSize: 10 },
    { enabled: !!status?.stripeAccountId },
  );

  // Local form state
  const [depositAmountCents, setDepositAmountCents] = React.useState(0);
  const [noShowFeeCents, setNoShowFeeCents] = React.useState(0);
  const [depositPolicy, setDepositPolicy] = React.useState("never");
  const [depositMinPartySize, setDepositMinPartySize] = React.useState(6);

  // Sync from server
  React.useEffect(() => {
    if (status) {
      setDepositAmountCents(status.depositAmountCents);
      setNoShowFeeCents(status.noShowFeeCents);
      setDepositPolicy(status.depositPolicy);
      setDepositMinPartySize(status.depositMinPartySize);
    }
  }, [status]);

  const handleSaveSettings = () => {
    updateSettings.mutate({
      depositAmountCents,
      noShowFeeCents,
      depositPolicy: depositPolicy as "never" | "all" | "partySize" | "custom",
      depositMinPartySize,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading payment settings...
      </div>
    );
  }

  const isConnected = status?.liveStatus?.status === "active";
  const isPending = status?.stripeAccountId && !isConnected;

  return (
    <div className="space-y-6">
      {/* Stripe Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Stripe Connection
          </CardTitle>
          <CardDescription>
            Connect your Stripe account to accept deposits and process payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Stripe account connected
                </span>
                <Badge variant="secondary" className="text-xs">
                  {status?.stripeAccountId}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Charges:{" "}
                  {status?.liveStatus?.chargesEnabled ? "Enabled" : "Disabled"}
                </span>
                <span>|</span>
                <span>
                  Payouts:{" "}
                  {status?.liveStatus?.payoutsEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => getDashboard.mutate()}
                disabled={getDashboard.isPending}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Open Stripe Dashboard
              </Button>
            </div>
          ) : isPending ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-medium text-amber-700">
                  Onboarding incomplete
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your Stripe account setup is not finished. Complete onboarding
                to start accepting payments.
              </p>
              <Button
                onClick={() => connectStripe.mutate()}
                disabled={connectStripe.isPending}
              >
                {connectStripe.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : null}
                Complete Onboarding
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                No Stripe account connected. Connect your account to start
                collecting deposits and charging no-show fees.
              </p>
              <Button
                onClick={() => connectStripe.mutate()}
                disabled={connectStripe.isPending}
              >
                {connectStripe.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : null}
                Connect Stripe Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deposit Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deposit Settings</CardTitle>
          <CardDescription>
            Configure when and how much to charge for deposits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Deposit amount ($)</Label>
              <Input
                type="number"
                min={0}
                max={1000}
                step={0.01}
                value={(depositAmountCents / 100).toFixed(2)}
                onChange={(e) =>
                  setDepositAmountCents(
                    Math.round(Number(e.target.value) * 100),
                  )
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Amount charged per reservation
              </p>
            </div>
            <div>
              <Label>No-show fee ($)</Label>
              <Input
                type="number"
                min={0}
                max={1000}
                step={0.01}
                value={(noShowFeeCents / 100).toFixed(2)}
                onChange={(e) =>
                  setNoShowFeeCents(Math.round(Number(e.target.value) * 100))
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Charged when a guest doesn&apos;t show up
              </p>
            </div>
          </div>

          <div>
            <Label>Deposit policy</Label>
            <Select value={depositPolicy} onValueChange={setDepositPolicy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never require deposits</SelectItem>
                <SelectItem value="all">All reservations</SelectItem>
                <SelectItem value="partySize">
                  Parties of {depositMinPartySize}+
                </SelectItem>
                <SelectItem value="custom">Custom (per reservation)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {depositPolicy === "partySize" && (
            <div>
              <Label>Minimum party size for deposit</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={depositMinPartySize}
                onChange={(e) =>
                  setDepositMinPartySize(Number(e.target.value))
                }
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveSettings}
              disabled={updateSettings.isPending || !isConnected}
            >
              {updateSettings.isPending ? "Saving..." : "Save Settings"}
            </Button>
            {updateSettings.isSuccess && (
              <span className="text-sm text-green-600">Saved!</span>
            )}
            {!isConnected && (
              <span className="text-xs text-muted-foreground">
                Connect Stripe first to update settings
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          <CardDescription>
            Deposits and no-show fees processed through Stripe
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!depositsData?.deposits.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No transactions yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depositsData.deposits.map((deposit) => (
                  <TableRow key={deposit.id}>
                    <TableCell className="text-sm">
                      {format(new Date(deposit.createdAt), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {deposit.reservation?.customer
                        ? `${deposit.reservation.customer.firstName} ${deposit.reservation.customer.lastName ?? ""}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          deposit.type === "no_show_fee"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {deposit.type === "no_show_fee"
                          ? "No-show fee"
                          : "Deposit"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      ${(deposit.amount / 100).toFixed(2)}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
