"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Button,
  Input,
  Label,
  ScrollArea,
  Separator,
  Checkbox,
} from "@bites-rms/ui";
import { trpc } from "@/trpc/client";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_ALLERGIES = [
  "Nuts",
  "Shellfish",
  "Dairy",
  "Gluten",
  "Eggs",
  "Soy",
  "Fish",
  "Sesame",
];

export function CreateCustomerPanel({ open, onClose, onSuccess }: Props) {
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [dietaryRequirements, setDietaryRequirements] = React.useState("");
  const [allergies, setAllergies] = React.useState<string[]>([]);
  const [notes, setNotes] = React.useState("");
  const [isVip, setIsVip] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const createMutation = trpc.customer.create.useMutation({
    onSuccess: () => {
      resetForm();
      onSuccess();
    },
    onError: (err) => setError(err.message),
  });

  function resetForm() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setDietaryRequirements("");
    setAllergies([]);
    setNotes("");
    setIsVip(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!firstName.trim()) {
      setError("First name is required");
      return;
    }

    createMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      dietaryRequirements: dietaryRequirements.trim() || undefined,
      allergies: allergies.length > 0 ? allergies : undefined,
      notes: notes.trim() || undefined,
      isVip,
    });
  }

  function toggleAllergy(allergy: string) {
    setAllergies((prev) =>
      prev.includes(allergy)
        ? prev.filter((a) => a !== allergy)
        : [...prev, allergy],
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetForm();
          onClose();
        }
      }}
    >
      <SheetContent className="sm:max-w-lg overflow-hidden flex flex-col p-0">
        <div className="p-6 pb-0">
          <SheetHeader>
            <SheetTitle>Add Customer</SheetTitle>
            <SheetDescription>
              Create a new customer profile
            </SheetDescription>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 px-6">
          <form id="create-customer-form" onSubmit={handleSubmit} className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName" className="text-xs text-muted-foreground">
                  First name *
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-9"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-xs text-muted-foreground">
                  Last name
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="email" className="text-xs text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-xs text-muted-foreground">
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <Separator />

            {/* Allergies */}
            <div>
              <Label className="text-sm font-semibold">Allergies</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {COMMON_ALLERGIES.map((allergy) => (
                  <label
                    key={allergy}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={allergies.includes(allergy)}
                      onCheckedChange={() => toggleAllergy(allergy)}
                    />
                    {allergy}
                  </label>
                ))}
              </div>
            </div>

            {/* Dietary */}
            <div>
              <Label htmlFor="dietary" className="text-xs text-muted-foreground">
                Dietary requirements
              </Label>
              <Input
                id="dietary"
                value={dietaryRequirements}
                onChange={(e) => setDietaryRequirements(e.target.value)}
                placeholder="e.g., Vegetarian, Halal, Kosher"
                className="h-9"
              />
            </div>

            <Separator />

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-xs text-muted-foreground">
                Notes
              </Label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Preferences, special occasions, etc."
              />
            </div>

            {/* VIP */}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={isVip}
                onCheckedChange={(c) => setIsVip(!!c)}
              />
              Mark as VIP
            </label>
          </form>
        </ScrollArea>

        <div className="flex gap-2 p-4 border-t bg-background">
          <Button
            type="submit"
            form="create-customer-form"
            disabled={createMutation.isPending}
            className="flex-1"
          >
            {createMutation.isPending ? "Creating..." : "Create Customer"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
