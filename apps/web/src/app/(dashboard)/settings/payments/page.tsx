import { requireAuth } from "@/lib/require-auth";
import { PaymentSettings } from "./_components/payment-settings";

export default async function PaymentSettingsPage() {
  await requireAuth();

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Payment Settings</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Connect Stripe, configure deposits, and manage no-show fees.
      </p>
      <PaymentSettings />
    </div>
  );
}
