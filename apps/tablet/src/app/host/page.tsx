import { requireAuth } from "@/lib/require-auth";
import { HostInterface } from "./_components/host-interface";

export default async function HostPage() {
  const session = await requireAuth("HOST");

  return (
    <HostInterface
      restaurantId={session.user.restaurantId}
      restaurantName={session.user.restaurantName}
      userRole={session.user.role}
    />
  );
}
