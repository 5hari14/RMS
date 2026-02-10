import { requireAuth } from "@/lib/require-auth";
import { api } from "@/trpc/server";

export default async function DashboardPage() {
  const session = await requireAuth();
  const restaurant = await api.settings.getRestaurant();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center space-y-2">
      <h1 className="text-4xl font-bold">Welcome, {session.user.name}</h1>
      <p className="text-lg text-muted-foreground">
        Role: {session.user.role} — Restaurant: {restaurant.name}
      </p>
      {restaurant.address && (
        <p className="text-sm text-muted-foreground">
          {restaurant.address}, {restaurant.city} {restaurant.postcode}
        </p>
      )}
    </main>
  );
}
