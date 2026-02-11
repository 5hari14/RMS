import { requireAuth } from "@/lib/require-auth";
import { FloorPlanEditor } from "./_components/floor-plan-editor";

export default async function FloorPlanPage() {
  await requireAuth();

  return (
    <div className="h-full flex flex-col">
      <FloorPlanEditor />
    </div>
  );
}
