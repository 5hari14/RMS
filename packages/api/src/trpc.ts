import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { PrismaClient, UserRole } from "@bites-rms/db";

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

export interface Session {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    restaurantId: string;
    restaurantName: string;
  };
}

export interface CreateContextOptions {
  session: Session | null;
  prisma: PrismaClient;
}

export type Context = CreateContextOptions;

// ─────────────────────────────────────────────────────────────────────────────
// tRPC init
// ─────────────────────────────────────────────────────────────────────────────

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
export const createCallerFactory = t.createCallerFactory;

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<UserRole, number> = {
  OWNER: 4,
  MANAGER: 3,
  HOST: 2,
  STAFF: 1,
};

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  return next({
    ctx: {
      session: ctx.session,
      user: ctx.session.user,
      restaurantId: ctx.session.user.restaurantId,
    },
  });
});

function requireRole(minimumRole: UserRole) {
  return isAuthenticated.unstable_pipe(({ ctx, next }) => {
    if (ROLE_HIERARCHY[ctx.user.role] < ROLE_HIERARCHY[minimumRole]) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Requires ${minimumRole} role or higher`,
      });
    }
    return next({ ctx });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Procedures
// ─────────────────────────────────────────────────────────────────────────────

/** No auth required. */
export const publicProcedure = t.procedure;

/** Requires any authenticated user. Provides ctx.user and ctx.restaurantId. */
export const protectedProcedure = t.procedure.use(isAuthenticated);

/** Requires HOST or higher. */
export const hostProcedure = t.procedure.use(requireRole("HOST"));

/** Requires MANAGER or higher. */
export const managerProcedure = t.procedure.use(requireRole("MANAGER"));

/** Requires OWNER. */
export const ownerProcedure = t.procedure.use(requireRole("OWNER"));
