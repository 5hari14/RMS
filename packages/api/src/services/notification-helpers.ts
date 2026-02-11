import { format } from "date-fns";
import type {
  ReservationNotificationData,
  NotificationPreferences,
} from "./notification.service";

interface ReservationWithRelations {
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
}

export function buildNotificationData(
  reservation: ReservationWithRelations,
  restaurantName: string,
): ReservationNotificationData {
  const { customer } = reservation;
  const customerName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ");

  return {
    reservationId: reservation.id,
    restaurantName,
    customerName,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    date: format(reservation.date, "EEE, d MMM yyyy"),
    time: format(reservation.time, "h:mm a"),
    partySize: reservation.partySize,
  };
}

export async function getNotificationPreferences(
  prisma: { restaurant: { findUnique: Function } },
  restaurantId: string,
): Promise<NotificationPreferences> {
  const restaurant = await (prisma.restaurant.findUnique as Function)({
    where: { id: restaurantId },
    select: {
      enableEmailConfirmations: true,
      enableSmsConfirmations: true,
      enableReminders: true,
    },
  });

  if (!restaurant) {
    return {
      enableEmailConfirmations: true,
      enableSmsConfirmations: true,
      enableReminders: true,
    };
  }

  return restaurant as NotificationPreferences;
}
