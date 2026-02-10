import { createRouter } from "./trpc";

export const appRouter = createRouter({});

export type AppRouter = typeof appRouter;
