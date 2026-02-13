import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import type { UserRole } from "@bites-rms/db";

import { authOptions, hasMinRole } from "./auth";

export async function requireAuth(minimumRole?: UserRole): Promise<Session> {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (minimumRole && !hasMinRole(session.user.role as UserRole, minimumRole)) {
    throw new Error(`Requires ${minimumRole} role or higher`);
  }

  return session;
}
