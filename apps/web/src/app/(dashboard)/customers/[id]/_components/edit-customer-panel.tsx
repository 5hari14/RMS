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

interface CustomerData {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  dietaryRequirements: string | null;
  allergies: string[];
  notes: string | null;
  favouriteTableId: string | null;
}

interface Props {
  open: boolean;
  customer: CustomerData;
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

export function EditCustomerPanel({ open, customer, onClose, onSuccess }: Props) {
  const [firstName, setFirstName] = React.useState(customer.firstName);
  const [lastName, setLastName] = React.useState(customer.lastName ?? "");
  const [email, setEmail] = React.useState(customer.email ?? "");
  const [phone, setPhone] = React.useState(customer.phone ?? "");
  const [dietaryRequirements, setDietaryRequirements] = React.useState(
    customer.dietaryRequirements ?? "",
  );
  const [allergies, setAllergies] = React.useState<string[]>(customer.allergies);
  const [notes, setNotes] = React.useState(customer.notes ?? "");
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when customer changes
  React.useEffect(() => {
    setFirstName(customer.firstName);
    setLastName(customer.lastName ?? "");
    setEmail(customer.email ?? "");
    setPhone(customer.phone ?? "");
    setDietaryRequirements(customer.dietaryRequirements ?? "");
    setAllergies(customer.allergies);
    setNotes(customer.notes ?? "");
    setError(null);
  }, [customer]);

  const updateMutation = trpc.customer.update.useMutation({
    onSuccess,
    onError: (err) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!firstName.trim()) {
      setError("First name is required");
      return;
    }

    updateMutation.mutate({
      id: customer.id,
      firstName: firstName.trim(),
      lastName: lastName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      dietaryRequirements: dietaryRequirements.trim() || null,
      allergies,
      notes: notes.trim() || null,
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
        if (!isOpen) onClose();
      }}
    >
      <SheetContent className="sm:max-w-lg overflow-hidden flex flex-col p-0">
        <div className="p-6 pb-0">
          <SheetHeader>
            <SheetTitle>Edit Customer</SheetTitle>
            <SheetDescription>
              Update {customer.firstName}&apos;s profile
            </SheetDescription>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 px-6">
          <form id="edit-customer-form" onSubmit={handleSubmit} className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-firstName" className="text-xs text-muted-foreground">
                  First name *
                </Label>
                <Input
                  id="edit-firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <Label htmlFor="edit-lastName" className="text-xs text-muted-foreground">
                  Last name
                </Label>
                <Input
                  id="edit-lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-email" className="text-xs text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <Label htmlFor="edit-phone" className="text-xs text-muted-foreground">
                  Phone
                </Label>
                <Input
                  id="edit-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <Separator />

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

            <div>
              <Label htmlFor="edit-dietary" className="text-xs text-muted-foreground">
                Dietary requirements
              </Label>
              <Input
                id="edit-dietary"
                value={dietaryRequirements}
                onChange={(e) => setDietaryRequirements(e.target.value)}
                placeholder="e.g., Vegetarian, Halal, Kosher"
                className="h-9"
              />
            </div>

            <Separator />

            <div>
              <Label htmlFor="edit-notes" className="text-xs text-muted-foreground">
                General notes
              </Label>
              <textarea
                id="edit-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </form>
        </ScrollArea>

        <div className="flex gap-2 p-4 border-t bg-background">
          <Button
            type="submit"
            form="edit-customer-form"
            disabled={updateMutation.isPending}
            className="flex-1"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
