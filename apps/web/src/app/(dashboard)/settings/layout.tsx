"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@bites-rms/ui";

const navItems = [
  { href: "/settings/general", label: "General" },
  { href: "/settings/hours", label: "Operating Hours" },
  { href: "/settings/reservations", label: "Reservations" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/payments", label: "Payments" },
  { href: "/settings/booking-widget", label: "Booking Widget" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r bg-muted/30 p-4 gap-1">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-2">Settings</h2>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
              pathname === item.href
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </aside>

      {/* Horizontal nav — mobile */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <nav className="flex md:hidden overflow-x-auto border-b px-4 gap-1 py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
                pathname === item.href
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
