import "server-only";

import { getServerSession } from "next-auth";
import { cache } from "react";
import { appRouter, createCallerFactory, type CreateContextOptions } from "@bites-rms/api";
import { prisma } from "@bites-rms/db";

import { authOptions } from "@/lib/auth";

const createCallerContext = cache(async (): Promise<CreateContextOptions> => {
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
});

const createCaller = createCallerFactory(appRouter);

export const api = {
  ...createCaller(createCallerContext),
};
