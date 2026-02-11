import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@bites-rms/db";
import { z } from "zod";
import {
  parse,
  startOfDay,
  addMinutes,
  isBefore,
  isAfter,
  endOfDay,
} from "date-fns";
import {
  sendConfirmation,
} from "@bites-rms/api/src/services/notification.service";
import {
  buildNotificationData,
  getNotificationPreferences,
} from "@bites-rms/api/src/services/notification-helpers";

interface Params {
  params: { restaurantId: string };
}

const bookingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  partySize: z.number().int().min(1),
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().min(1).max(30).optional(),
  specialRequests: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { restaurantId } = params;
    const body = await request.json();

    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { date: dateStr, time: timeStr, partySize, name, email, phone, specialRequests } = parsed.data;

    if (!email && !phone) {
      return NextResponse.json(
        { error: "Either email or phone is required" },
        { status: 400 },
      );
    }

    // Fetch restaurant + widget config
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        bookingWidget: {
          select: {
            isEnabled: true,
            maxPartySize: true,
            minAdvanceMinutes: true,
            maxAdvanceDays: true,
            defaultDurationMinutes: true,
            confirmationMessage: true,
          },
        },
      },
    });

    if (!restaurant || !restaurant.bookingWidget?.isEnabled) {
      return NextResponse.json(
        { error: "Online booking is not available for this restaurant" },
        { status: 404 },
      );
    }

    const widget = restaurant.bookingWidget;

    if (partySize > widget.maxPartySize) {
      return NextResponse.json(
        { error: `Maximum party size is ${widget.maxPartySize}` },
        { status: 400 },
      );
    }

    // Parse date and time
    const date = parse(dateStr, "yyyy-MM-dd", new Date());
    const timeParts = timeStr.split(":").map(Number);
    const hours = timeParts[0] ?? 0;
    const minutes = timeParts[1] ?? 0;
    const reservationTime = new Date(date);
    reservationTime.setHours(hours, minutes, 0, 0);

    // Validate booking window
    const now = new Date();
    const minBookingTime = addMinutes(now, widget.minAdvanceMinutes);
    const maxBookingDate = new Date();
    maxBookingDate.setDate(maxBookingDate.getDate() + widget.maxAdvanceDays);

    if (isBefore(reservationTime, minBookingTime)) {
      return NextResponse.json(
        { error: "This time slot is no longer available" },
        { status: 400 },
      );
    }

    if (isAfter(date, endOfDay(maxBookingDate))) {
      return NextResponse.json(
        { error: `Cannot book more than ${widget.maxAdvanceDays} days ahead` },
        { status: 400 },
      );
    }

    const duration = widget.defaultDurationMinutes;
    const slotEnd = addMinutes(reservationTime, duration);

    // Find an available table
    const tables = await prisma.table.findMany({
      where: {
        floorPlan: { restaurantId, isActive: true },
        isActive: true,
        maxCovers: { gte: partySize },
      },
      select: { id: true, maxCovers: true },
      orderBy: { maxCovers: "asc" }, // best fit: smallest suitable table first
    });

    if (tables.length === 0) {
      return NextResponse.json(
        { error: "No tables available for this party size" },
        { status: 400 },
      );
    }

    // Check which tables are occupied at this time
    const existingReservations = await prisma.reservation.findMany({
      where: {
        restaurantId,
        date: startOfDay(date),
        status: { in: ["PENDING", "CONFIRMED", "SEATED"] },
      },
      select: { tableId: true, time: true, duration: true },
    });

    const occupiedTableIds = new Set<string>();
    for (const res of existingReservations) {
      if (!res.tableId) continue;
      const resEnd = addMinutes(res.time, res.duration);
      if (isBefore(res.time, slotEnd) && isAfter(resEnd, reservationTime)) {
        occupiedTableIds.add(res.tableId);
      }
    }

    const availableTable = tables.find((t) => !occupiedTableIds.has(t.id));
    if (!availableTable) {
      return NextResponse.json(
        { error: "No tables available at this time. Please choose another slot." },
        { status: 409 },
      );
    }

    // Resolve or create customer
    const nameParts = name.split(" ");
    const firstName = nameParts[0] ?? "Guest";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

    const reservation = await prisma.$transaction(async (tx) => {
      // Find existing customer by email or phone
      let customer = null;

      if (email) {
        customer = await tx.customer.findFirst({
          where: { email, restaurantId },
        });
      }
      if (!customer && phone) {
        customer = await tx.customer.findFirst({
          where: { phone, restaurantId },
        });
      }

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            firstName,
            lastName,
            email: email ?? null,
            phone: phone ?? null,
            restaurantId,
          },
        });
      }

      // Find or create a system user for widget bookings
      let systemUser = await tx.user.findFirst({
        where: { restaurantId, email: `widget@${restaurantId}.system` },
      });

      if (!systemUser) {
        systemUser = await tx.user.create({
          data: {
            email: `widget@${restaurantId}.system`,
            name: "Online Booking",
            passwordHash: "SYSTEM_USER_NO_LOGIN",
            role: "STAFF",
            restaurantId,
            isActive: false,
          },
        });
      }

      const created = await tx.reservation.create({
        data: {
          date: startOfDay(date),
          time: reservationTime,
          partySize,
          duration,
          source: "WEBSITE",
          specialRequests: specialRequests ?? null,
          tableId: availableTable.id,
          customerId: customer.id,
          restaurantId,
          createdById: systemUser.id,
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
      });

      await tx.auditLog.create({
        data: {
          action: "reservation.create",
          entityType: "Reservation",
          entityId: created.id,
          userId: systemUser.id,
          restaurantId,
          details: {
            source: "WEBSITE",
            partySize,
            date: dateStr,
            time: timeStr,
          },
        },
      });

      return created;
    });

    // Send confirmation notification (fire-and-forget)
    getNotificationPreferences(prisma, restaurantId)
      .then((prefs) =>
        sendConfirmation(
          buildNotificationData(reservation, restaurant.name),
          prefs,
        ),
      )
      .catch((err) =>
        console.error("[widget/book] Failed to send confirmation:", err),
      );

    // Generate a short reference from the reservation ID
    const reference = reservation.id.slice(-8).toUpperCase();

    return NextResponse.json({
      success: true,
      reference,
      reservationId: reservation.id,
      restaurantName: restaurant.name,
      date: dateStr,
      time: timeStr,
      partySize,
      confirmationMessage: widget.confirmationMessage ?? null,
    });
  } catch (err) {
    console.error("[widget/book] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
