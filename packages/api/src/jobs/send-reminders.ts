import { addDays, startOfDay, endOfDay, format } from "date-fns";
import { sendReminder } from "../services/notification.service";
import { buildNotificationData } from "../services/notification-helpers";

interface PrismaClient {
  restaurant: { findMany: Function };
  reservation: { findMany: Function };
}

interface ReminderStats {
  processed: number;
  sent: number;
  skipped: number;
  errors: number;
}

/**
 * Sends 24-hour reminders for all confirmed reservations tomorrow.
 *
 * Designed to be called once daily via a cron endpoint
 * (e.g. GET /api/cron/send-reminders) or a scheduled job runner.
 */
export async function sendDailyReminders(
  prisma: PrismaClient,
): Promise<ReminderStats> {
  const stats: ReminderStats = { processed: 0, sent: 0, skipped: 0, errors: 0 };

  const tomorrow = addDays(new Date(), 1);
  const tomorrowStart = startOfDay(tomorrow);
  const tomorrowEnd = endOfDay(tomorrow);

  // Find all restaurants with reminders enabled
  const restaurants = await (prisma.restaurant.findMany as Function)({
    where: { enableReminders: true },
    select: { id: true, name: true },
  }) as Array<{ id: string; name: string }>;

  for (const restaurant of restaurants) {
    // Find all confirmed reservations for tomorrow
    const reservations = await (prisma.reservation.findMany as Function)({
      where: {
        restaurantId: restaurant.id,
        status: "CONFIRMED",
        date: { gte: tomorrowStart, lte: tomorrowEnd },
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    }) as Array<{
      id: string;
      date: Date;
      time: Date;
      partySize: number;
      customer: {
        firstName: string;
        lastName: string | null;
        email: string | null;
        phone: string | null;
      };
    }>;

    for (const reservation of reservations) {
      stats.processed++;

      // Skip if customer has no contact info
      if (!reservation.customer.email && !reservation.customer.phone) {
        stats.skipped++;
        continue;
      }

      try {
        const data = buildNotificationData(reservation, restaurant.name);
        await sendReminder(data, {
          enableEmailConfirmations: true,
          enableSmsConfirmations: true,
          enableReminders: true,
        });
        stats.sent++;
      } catch (err) {
        stats.errors++;
        console.error(
          `[reminders] Failed for reservation ${reservation.id}:`,
          err,
        );
      }
    }
  }

  console.log(
    `[reminders] ${format(tomorrow, "yyyy-MM-dd")} — ` +
      `processed: ${stats.processed}, sent: ${stats.sent}, ` +
      `skipped: ${stats.skipped}, errors: ${stats.errors}`,
  );

  return stats;
}
