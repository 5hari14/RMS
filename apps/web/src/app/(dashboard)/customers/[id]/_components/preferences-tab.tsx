"use client";

import { AlertTriangle, Utensils, Heart, StickyNote } from "lucide-react";
import { Card, CardContent, Badge } from "@bites-rms/ui";

interface CustomerData {
  allergies: string[];
  dietaryRequirements: string | null;
  favouriteTableId: string | null;
  notes: string | null;
}

interface Props {
  customer: CustomerData;
}

export function PreferencesTab({ customer }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Allergies */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold">Allergies</h3>
          </div>
          {customer.allergies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {customer.allergies.map((allergy) => (
                <Badge
                  key={allergy}
                  variant="outline"
                  className="bg-red-50 text-red-700 border-red-200"
                >
                  {allergy}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No allergies recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Dietary requirements */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Utensils className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold">Dietary Requirements</h3>
          </div>
          {customer.dietaryRequirements ? (
            <p className="text-sm">{customer.dietaryRequirements}</p>
          ) : (
            <p className="text-sm text-muted-foreground">None specified</p>
          )}
        </CardContent>
      </Card>

      {/* Favourite table */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-4 w-4 text-pink-600" />
            <h3 className="text-sm font-semibold">Favourite Table</h3>
          </div>
          {customer.favouriteTableId ? (
            <p className="text-sm">Table ID: {customer.favouriteTableId}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No favourite table set</p>
          )}
        </CardContent>
      </Card>

      {/* General notes */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold">General Notes</h3>
          </div>
          {customer.notes ? (
            <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No notes</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
