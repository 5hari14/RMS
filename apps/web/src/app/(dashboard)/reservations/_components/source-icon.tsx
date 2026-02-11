"use client";

import { Phone, Globe, Smartphone, Footprints } from "lucide-react";

const sourceConfig: Record<string, { icon: React.ElementType; label: string }> = {
  PHONE: { icon: Phone, label: "Phone" },
  WEBSITE: { icon: Globe, label: "Website" },
  BITES_APP: { icon: Smartphone, label: "Bites App" },
  WALK_IN: { icon: Footprints, label: "Walk-in" },
  GOOGLE: { icon: Globe, label: "Google" },
  FACEBOOK: { icon: Globe, label: "Facebook" },
  INSTAGRAM: { icon: Globe, label: "Instagram" },
};

export function SourceIcon({ source }: { source: string }) {
  const config = sourceConfig[source] ?? { icon: Globe, label: source };
  const Icon = config.icon;
  return (
    <span title={config.label} className="inline-flex items-center text-muted-foreground">
      <Icon className="h-4 w-4" />
    </span>
  );
}
