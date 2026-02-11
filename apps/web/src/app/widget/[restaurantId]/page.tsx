import type { Metadata } from "next";
import { prisma } from "@bites-rms/db";
import { notFound } from "next/navigation";
import { WidgetShell } from "./widget-shell";

interface Props {
  params: { restaurantId: string };
  searchParams: { color?: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: params.restaurantId },
    select: { name: true },
  });

  return {
    title: restaurant ? `Book a table — ${restaurant.name}` : "Book a table",
    description: restaurant
      ? `Reserve a table at ${restaurant.name}`
      : "Reserve a table online",
  };
}

export default async function WidgetPage({ params, searchParams }: Props) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: params.restaurantId },
    select: {
      id: true,
      name: true,
      bookingWidget: { select: { isEnabled: true, primaryColor: true } },
    },
  });

  if (!restaurant || !restaurant.bookingWidget?.isEnabled) {
    notFound();
  }

  const color =
    searchParams.color ?? restaurant.bookingWidget.primaryColor ?? "#1e293b";

  return (
    <WidgetShell
      restaurantId={restaurant.id}
      primaryColor={color}
    />
  );
}
