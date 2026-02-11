import { requireAuth } from "@/lib/require-auth";
import { LiveFloorPlanView } from "./_components/live-floor-plan-view";

export default async function LiveFloorPlanPage() {
  const session = await requireAuth();

  return (
    <div className="h-full flex flex-col">
      <LiveFloorPlanView restaurantId={session.user.restaurantId} />
    </div>
  );
}
