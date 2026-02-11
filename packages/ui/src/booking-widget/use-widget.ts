import { useState, useCallback } from "react";
import type {
  WidgetConfig,
  WidgetStep,
  AvailabilityResponse,
  BookingResponse,
  BookingFormData,
} from "./types";

export function useWidget(config: WidgetConfig) {
  const [step, setStep] = useState<WidgetStep>("date");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [restaurantName, setRestaurantName] = useState("");
  const [maxPartySize, setMaxPartySize] = useState(10);
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [form, setForm] = useState<BookingFormData>({
    date: "",
    time: "",
    partySize: 2,
    name: "",
    email: "",
    phone: "",
    specialRequests: "",
  });

  const updateForm = useCallback(
    (updates: Partial<BookingFormData>) => {
      setForm((prev) => ({ ...prev, ...updates }));
      setError(null);
    },
    [],
  );

  const fetchAvailability = useCallback(
    async (date: string, partySize: number) => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL(
          `/api/public/widget/${config.restaurantId}/availability`,
          config.apiBaseUrl,
        );
        url.searchParams.set("date", date);
        url.searchParams.set("partySize", String(partySize));

        const res = await fetch(url.toString());
        const data: AvailabilityResponse & { error?: string } =
          await res.json();

        if (!res.ok) {
          setError(data.error ?? "Failed to fetch availability");
          setSlots([]);
          return;
        }

        setRestaurantName(data.restaurantName);
        if (data.maxPartySize) setMaxPartySize(data.maxPartySize);
        setSlots(data.slots);

        if (data.slots.length === 0) {
          setError(data.message ?? "No available slots for this date");
        }
      } catch {
        setError("Unable to connect. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [config.restaurantId, config.apiBaseUrl],
  );

  const submitBooking = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(
        `/api/public/widget/${config.restaurantId}/book`,
        config.apiBaseUrl,
      );

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          time: form.time,
          partySize: form.partySize,
          name: form.name,
          email: form.email || undefined,
          phone: form.phone || undefined,
          specialRequests: form.specialRequests || undefined,
        }),
      });

      const data: BookingResponse & { error?: string } = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to submit booking");
        return;
      }

      setBooking(data);
      setStep("confirm");
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [config.restaurantId, config.apiBaseUrl, form]);

  const goToStep = useCallback((s: WidgetStep) => {
    setError(null);
    setStep(s);
  }, []);

  const reset = useCallback(() => {
    setStep("date");
    setForm({
      date: "",
      time: "",
      partySize: 2,
      name: "",
      email: "",
      phone: "",
      specialRequests: "",
    });
    setSlots([]);
    setBooking(null);
    setError(null);
  }, []);

  return {
    step,
    goToStep,
    loading,
    error,
    slots,
    restaurantName,
    maxPartySize,
    booking,
    form,
    updateForm,
    fetchAvailability,
    submitBooking,
    reset,
  };
}
