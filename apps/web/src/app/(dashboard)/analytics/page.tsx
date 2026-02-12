import { requireAuth } from "@/lib/require-auth";
import { AnalyticsDashboard } from "./_components/analytics-dashboard";

export default async function AnalyticsPage() {
  await requireAuth();

  return (
    <div className="p-6">
      <AnalyticsDashboard />
    </div>
  );
}
