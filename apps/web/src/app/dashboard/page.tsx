import { requireAuth } from "@/lib/require-auth";

export default async function DashboardPage() {
  const session = await requireAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center space-y-2">
      <h1 className="text-4xl font-bold">Welcome, {session.user.name}</h1>
      <p className="text-lg text-muted-foreground">
        Role: {session.user.role} — Restaurant: {session.user.restaurantName}
      </p>
    </main>
  );
}
