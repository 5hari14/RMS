import { createRouter } from "./trpc";
import { reservationRouter } from "./routers/reservation.router";
import { tableRouter } from "./routers/table.router";
import { customerRouter } from "./routers/customer.router";
import { floorPlanRouter } from "./routers/floor-plan.router";
import { paymentRouter } from "./routers/payment.router";
import { waitlistRouter } from "./routers/waitlist.router";
import { analyticsRouter } from "./routers/analytics.router";
import { settingsRouter } from "./routers/settings.router";
import { userRouter } from "./routers/user.router";
import { liveTableRouter } from "./routers/live-table.router";

export const appRouter = createRouter({
  reservation: reservationRouter,
  table: tableRouter,
  customer: customerRouter,
  floorPlan: floorPlanRouter,
  payment: paymentRouter,
  waitlist: waitlistRouter,
  analytics: analyticsRouter,
  settings: settingsRouter,
  user: userRouter,
  liveTable: liveTableRouter,
});

export type AppRouter = typeof appRouter;
