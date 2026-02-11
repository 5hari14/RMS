export interface WidgetConfig {
  restaurantId: string;
  /** Base URL for the API (e.g., "https://rms.bites.app") */
  apiBaseUrl: string;
  /** Restaurant brand colour (hex), e.g. "#1e293b" */
  primaryColor?: string;
}

export type WidgetStep = "date" | "time" | "details" | "confirm";

export interface AvailabilityResponse {
  restaurantName: string;
  date: string;
  maxPartySize?: number;
  slots: string[];
  message?: string;
}

export interface BookingResponse {
  success: boolean;
  reference: string;
  reservationId: string;
  restaurantName: string;
  date: string;
  time: string;
  partySize: number;
  confirmationMessage: string | null;
}

export interface BookingFormData {
  date: string;
  time: string;
  partySize: number;
  name: string;
  email: string;
  phone: string;
  specialRequests: string;
}
