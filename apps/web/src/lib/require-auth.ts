import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@bites-rms/db";

import { authOptions, hasMinRole } from "./auth";

/**
 * Get the authenticated session in a server component or API route.
 * Redirects to /login if not authenticated.
 * Optionally checks that the user has at least the given role level.
 *
 * Role hierarchy: OWNER > MANAGER > HOST > STAFF
 */
export async function requireAuth(minimumRole?: UserRole) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (minimumRole && !hasMinRole(session.user.role, minimumRole)) {
    throw new Error(
      `Insufficient permissions: required ${minimumRole}, got ${session.user.role}`,
    );
  }

  return session;
}
