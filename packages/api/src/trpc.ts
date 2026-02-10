import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

export interface Context {
  userId: string | null;
  restaurantId: string | null;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createRouter = t.router;
export const publicProcedure = t.procedure;
