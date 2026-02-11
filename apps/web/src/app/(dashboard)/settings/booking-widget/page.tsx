import { requireAuth } from "@/lib/require-auth";
import { BookingWidgetSettings } from "./booking-widget-settings";

export default async function BookingWidgetPage() {
  await requireAuth();

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Booking Widget</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Configure the embeddable booking widget for your website.
      </p>
      <BookingWidgetSettings />
    </div>
  );
}
