import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@bites-rms/db";
import {
  parse,
  format,
  startOfDay,
  endOfDay,
  addMinutes,
  isBefore,
  isAfter,
  isEqual,
} from "date-fns";

interface Params {
  params: { restaurantId: string };
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { restaurantId } = params;
    const { searchParams } = request.nextUrl;
    const dateParam = searchParams.get("date");
    const partySizeParam = searchParams.get("partySize");

    if (!dateParam || !partySizeParam) {
      return NextResponse.json(
        { error: "date and partySize query parameters are required" },
        { status: 400 },
      );
    }

    const date = parse(dateParam, "yyyy-MM-dd", new Date());
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 },
      );
    }

    const partySize = parseInt(partySizeParam, 10);
    if (isNaN(partySize) || partySize < 1) {
      return NextResponse.json(
        { error: "partySize must be a positive integer" },
        { status: 400 },
      );
    }

    // Fetch restaurant with widget config
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        timezone: true,
        bookingWidget: {
          select: {
            isEnabled: true,
            maxPartySize: true,
            minAdvanceMinutes: true,
            maxAdvanceDays: true,
            slotIntervalMinutes: true,
            defaultDurationMinutes: true,
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

    // Check date is within booking window
    const now = new Date();
    const minBookingTime = addMinutes(now, widget.minAdvanceMinutes);
    const maxBookingDate = new Date();
    maxBookingDate.setDate(maxBookingDate.getDate() + widget.maxAdvanceDays);

    if (isAfter(date, endOfDay(maxBookingDate))) {
      return NextResponse.json(
        { error: `Cannot book more than ${widget.maxAdvanceDays} days ahead` },
        { status: 400 },
      );
    }

    if (isBefore(endOfDay(date), now)) {
      return NextResponse.json(
        { error: "Cannot book in the past" },
        { status: 400 },
      );
    }

    // Get operating hours for this day of week
    const dayNames = [
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ] as const;
    const dayOfWeek = dayNames[date.getDay()]!;

    const operatingHours = await prisma.operatingHours.findUnique({
      where: {
        restaurantId_dayOfWeek: {
          restaurantId,
          dayOfWeek,
        },
      },
    });

    // Check for special date overrides
    const specialDate = await prisma.specialDate.findUnique({
      where: {
        restaurantId_date: {
          restaurantId,
          date: startOfDay(date),
        },
      },
    });

    if (specialDate?.isClosed) {
      return NextResponse.json({
        restaurantName: restaurant.name,
        date: dateParam,
        slots: [],
        message: specialDate.description ?? "Restaurant is closed on this date",
      });
    }

    const openTime = specialDate?.openTime ?? operatingHours?.openTime;
    const closeTime = specialDate?.closeTime ?? operatingHours?.closeTime;

    if (!openTime || !closeTime || operatingHours?.isClosed) {
      return NextResponse.json({
        restaurantName: restaurant.name,
        date: dateParam,
        slots: [],
        message: "Restaurant is closed on this day",
      });
    }

    // Get all tables that can accommodate this party size
    const tables = await prisma.table.findMany({
      where: {
        floorPlan: { restaurantId, isActive: true },
        isActive: true,
        maxCovers: { gte: partySize },
      },
      select: { id: true, maxCovers: true },
    });

    if (tables.length === 0) {
      return NextResponse.json({
        restaurantName: restaurant.name,
        date: dateParam,
        slots: [],
        message: "No tables available for this party size",
      });
    }

    // Get existing reservations for this date
    const existingReservations = await prisma.reservation.findMany({
      where: {
        restaurantId,
        date: startOfDay(date),
        status: { in: ["PENDING", "CONFIRMED", "SEATED"] },
      },
      select: { tableId: true, time: true, duration: true },
    });

    // Generate time slots
    const openParts = openTime.split(":").map(Number);
    const closeParts = closeTime.split(":").map(Number);
    const openH = openParts[0] ?? 0;
    const openM = openParts[1] ?? 0;
    const closeH = closeParts[0] ?? 23;
    const closeM = closeParts[1] ?? 0;

    const dayStart = new Date(date);
    dayStart.setHours(openH, openM, 0, 0);

    // Last slot should allow the full duration before closing
    const dayEnd = new Date(date);
    dayEnd.setHours(closeH, closeM, 0, 0);
    const lastSlotTime = addMinutes(dayEnd, -widget.defaultDurationMinutes);

    const interval = widget.slotIntervalMinutes;
    const duration = widget.defaultDurationMinutes;
    const slots: { time: string; available: boolean }[] = [];

    let slotTime = new Date(dayStart);
    while (
      isBefore(slotTime, lastSlotTime) ||
      isEqual(slotTime, lastSlotTime)
    ) {
      // Skip slots that are in the past (too soon to book)
      if (isBefore(slotTime, minBookingTime)) {
        slotTime = addMinutes(slotTime, interval);
        continue;
      }

      const slotEnd = addMinutes(slotTime, duration);

      // Check how many tables are free during this slot
      const occupiedTableIds = new Set<string>();
      for (const res of existingReservations) {
        if (!res.tableId) continue;
        const resEnd = addMinutes(res.time, res.duration);
        // Overlap check: res.start < slot.end AND res.end > slot.start
        if (isBefore(res.time, slotEnd) && isAfter(resEnd, slotTime)) {
          occupiedTableIds.add(res.tableId);
        }
      }

      const freeTableCount = tables.filter(
        (t) => !occupiedTableIds.has(t.id),
      ).length;

      slots.push({
        time: format(slotTime, "HH:mm"),
        available: freeTableCount > 0,
      });

      slotTime = addMinutes(slotTime, interval);
    }

    return NextResponse.json({
      restaurantName: restaurant.name,
      date: dateParam,
      maxPartySize: widget.maxPartySize,
      slots: slots.filter((s) => s.available).map((s) => s.time),
    });
  } catch (err) {
    console.error("[widget/availability] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
