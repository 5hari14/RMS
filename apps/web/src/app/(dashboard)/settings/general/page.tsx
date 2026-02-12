"use client";

import * as React from "react";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@bites-rms/ui";

const CUISINE_TYPES = [
  "Italian",
  "French",
  "Japanese",
  "Chinese",
  "Indian",
  "Mexican",
  "Thai",
  "Mediterranean",
  "American",
  "Korean",
  "Spanish",
  "Vietnamese",
  "Greek",
  "Turkish",
  "Other",
];

const PRICE_RANGES = ["$", "$$", "$$$", "$$$$"] as const;
const CURRENCIES = ["EUR", "GBP", "USD"] as const;

export default function GeneralSettingsPage() {
  const utils = trpc.useUtils();
  const { data: restaurant, isLoading } = trpc.settings.getRestaurant.useQuery();

  const updateMutation = trpc.settings.updateGeneral.useMutation({
    onSuccess: () => {
      utils.settings.getRestaurant.invalidate();
      toast.success("Settings saved");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const [form, setForm] = React.useState({
    name: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    city: "",
    state: "",
    postcode: "",
    country: "",
    cuisineType: "",
    priceRange: "" as string,
    timezone: "",
    currency: "USD" as string,
    logoUrl: "",
  });

  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    if (restaurant) {
      setForm({
        name: restaurant.name ?? "",
        phone: restaurant.phone ?? "",
        email: restaurant.email ?? "",
        website: restaurant.website ?? "",
        address: restaurant.address ?? "",
        city: restaurant.city ?? "",
        state: restaurant.state ?? "",
        postcode: restaurant.postcode ?? "",
        country: restaurant.country ?? "",
        cuisineType: restaurant.cuisineType ?? "",
        priceRange: restaurant.priceRange ?? "",
        timezone: restaurant.timezone ?? "UTC",
        currency: restaurant.currency ?? "USD",
        logoUrl: restaurant.logoUrl ?? "",
      });
      setDirty(false);
    }
  }, [restaurant]);

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  }

  function handleSave() {
    updateMutation.mutate({
      name: form.name || undefined,
      phone: form.phone || null,
      email: form.email || null,
      website: form.website || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      postcode: form.postcode || null,
      country: form.country || null,
      cuisineType: form.cuisineType || null,
      priceRange: (form.priceRange as "$" | "$$" | "$$$" | "$$$$") || null,
      timezone: form.timezone || undefined,
      currency: form.currency as "EUR" | "GBP" | "USD",
      logoUrl: form.logoUrl || null,
    });
    setDirty(false);
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">General Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Basic information about your restaurant.
          </p>
        </div>
        <Button onClick={handleSave} disabled={!dirty || updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Restaurant Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Restaurant Information</CardTitle>
          <CardDescription>Name, contact details, and address.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Restaurant Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={form.website}
              placeholder="https://"
              onChange={(e) => updateField("website", e.target.value)}
            />
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="state">State / Region</Label>
              <Input
                id="state"
                value={form.state}
                onChange={(e) => updateField("state", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                value={form.postcode}
                onChange={(e) => updateField("postcode", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={form.country}
              onChange={(e) => updateField("country", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Cuisine type, price range, and logo.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Cuisine Type</Label>
              <Select
                value={form.cuisineType}
                onValueChange={(v) => updateField("cuisineType", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cuisine" />
                </SelectTrigger>
                <SelectContent>
                  {CUISINE_TYPES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Price Range</Label>
              <Select
                value={form.priceRange}
                onValueChange={(v) => updateField("priceRange", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_RANGES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              value={form.logoUrl}
              placeholder="/images/logo.png"
              onChange={(e) => updateField("logoUrl", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Place your logo in the public folder and enter the path here.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Regional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Regional Settings</CardTitle>
          <CardDescription>Timezone and currency for your restaurant.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              value={form.timezone}
              placeholder="Europe/London"
              onChange={(e) => updateField("timezone", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Currency</Label>
            <Select
              value={form.currency}
              onValueChange={(v) => updateField("currency", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
