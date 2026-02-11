import Link from "next/link";
import { requireAuth } from "@/lib/require-auth";
import {
  CalendarDays,
  LayoutDashboard,
  Map,
  MapPin,
  Users,
  UtensilsCrossed,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reservations", label: "Reservations", icon: CalendarDays },
  { href: "/floor-plan", label: "Floor Plan", icon: Map },
  { href: "/floor-plan/live", label: "Live View", icon: MapPin },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/tables", label: "Tables", icon: UtensilsCrossed },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 border-r bg-muted/30 md:block">
        <div className="flex h-14 items-center border-b px-4">
          <span className="text-lg font-bold">Bites RMS</span>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t p-4">
          <p className="text-xs text-muted-foreground truncate">{session.user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{session.user.role}</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
