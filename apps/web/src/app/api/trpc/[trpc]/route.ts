import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { getServerSession } from "next-auth";
import { appRouter, type CreateContextOptions } from "@bites-rms/api";
import { prisma } from "@bites-rms/db";

import { authOptions } from "@/lib/auth";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async (): Promise<CreateContextOptions> => {
      const session = await getServerSession(authOptions);

      return {
        session: session
          ? {
              user: {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
                role: session.user.role,
                restaurantId: session.user.restaurantId,
                restaurantName: session.user.restaurantName,
              },
            }
          : null,
        prisma,
      };
    },
  });
}

export { handler as GET, handler as POST };
