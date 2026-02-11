import { render } from "@react-email/render";
import { BookingConfirmation } from "../emails/booking-confirmation";
import { BookingReminder } from "../emails/booking-reminder";
import { BookingCancellation } from "../emails/booking-cancellation";
import {
  confirmationSms,
  reminderSms,
  cancellationSms,
  type SmsData,
} from "./sms-templates";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ReservationNotificationData {
  reservationId: string;
  restaurantName: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  date: string; // formatted, e.g. "Wed, 12 Feb 2026"
  time: string; // formatted, e.g. "7:30 PM"
  partySize: number;
  manageUrl?: string;
}

export interface NotificationPreferences {
  enableEmailConfirmations: boolean;
  enableSmsConfirmations: boolean;
  enableReminders: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Email provider (Resend or mock)
// ─────────────────────────────────────────────────────────────────────────────

interface EmailProvider {
  send(to: string, subject: string, html: string): Promise<void>;
}

function createEmailProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM ?? "bookings@bites.app";

  if (!apiKey) {
    return {
      async send(to, subject, _html) {
        console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
      },
    };
  }

  // Lazy-load resend to avoid import errors when not configured
  let resendClient: { emails: { send: Function } } | null = null;

  return {
    async send(to, subject, html) {
      if (!resendClient) {
        const { Resend } = await import("resend");
        resendClient = new Resend(apiKey);
      }
      await resendClient.emails.send({
        from: fromAddress,
        to,
        subject,
        html,
      });
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SMS provider (Twilio or mock)
// ─────────────────────────────────────────────────────────────────────────────

interface SmsProvider {
  send(to: string, body: string): Promise<void>;
}

function createSmsProvider(): SmsProvider {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return {
      async send(to, body) {
        console.log(`[MOCK SMS] To: ${to} | Body: ${body}`);
      },
    };
  }

  let twilioClient: { messages: { create: Function } } | null = null;

  return {
    async send(to, body) {
      if (!twilioClient) {
        const twilio = await import("twilio");
        twilioClient = twilio.default(accountSid, authToken);
      }
      await twilioClient.messages.create({ body, from: fromNumber, to });
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton providers (lazy-created)
// ─────────────────────────────────────────────────────────────────────────────

let emailProvider: EmailProvider | null = null;
let smsProvider: SmsProvider | null = null;

function getEmailProvider(): EmailProvider {
  if (!emailProvider) emailProvider = createEmailProvider();
  return emailProvider;
}

function getSmsProvider(): SmsProvider {
  if (!smsProvider) smsProvider = createSmsProvider();
  return smsProvider;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export async function sendConfirmation(
  data: ReservationNotificationData,
  prefs: NotificationPreferences,
): Promise<void> {
  const results: Promise<void>[] = [];

  if (prefs.enableEmailConfirmations && data.customerEmail) {
    const html = await render(
      BookingConfirmation({
        restaurantName: data.restaurantName,
        customerName: data.customerName,
        date: data.date,
        time: data.time,
        partySize: data.partySize,
        manageUrl: data.manageUrl,
      }),
    );
    results.push(
      getEmailProvider().send(
        data.customerEmail,
        `Booking confirmed — ${data.restaurantName}`,
        html,
      ),
    );
  }

  if (prefs.enableSmsConfirmations && data.customerPhone) {
    const smsData: SmsData = {
      restaurantName: data.restaurantName,
      date: data.date,
      time: data.time,
      partySize: data.partySize,
      manageUrl: data.manageUrl,
    };
    results.push(
      getSmsProvider().send(data.customerPhone, confirmationSms(smsData)),
    );
  }

  await Promise.allSettled(results);
}

export async function sendReminder(
  data: ReservationNotificationData,
  prefs: NotificationPreferences,
): Promise<void> {
  if (!prefs.enableReminders) return;

  const results: Promise<void>[] = [];

  if (data.customerEmail) {
    const html = await render(
      BookingReminder({
        restaurantName: data.restaurantName,
        customerName: data.customerName,
        time: data.time,
        partySize: data.partySize,
        manageUrl: data.manageUrl,
      }),
    );
    results.push(
      getEmailProvider().send(
        data.customerEmail,
        `Reminder: ${data.restaurantName} tomorrow at ${data.time}`,
        html,
      ),
    );
  }

  if (data.customerPhone) {
    const smsData: SmsData = {
      restaurantName: data.restaurantName,
      date: data.date,
      time: data.time,
      partySize: data.partySize,
    };
    results.push(
      getSmsProvider().send(data.customerPhone, reminderSms(smsData)),
    );
  }

  await Promise.allSettled(results);
}

export async function sendCancellation(
  data: ReservationNotificationData,
  prefs: NotificationPreferences,
): Promise<void> {
  const results: Promise<void>[] = [];

  if (prefs.enableEmailConfirmations && data.customerEmail) {
    const html = await render(
      BookingCancellation({
        restaurantName: data.restaurantName,
        customerName: data.customerName,
        date: data.date,
        time: data.time,
        partySize: data.partySize,
      }),
    );
    results.push(
      getEmailProvider().send(
        data.customerEmail,
        `Booking cancelled — ${data.restaurantName}`,
        html,
      ),
    );
  }

  if (prefs.enableSmsConfirmations && data.customerPhone) {
    const smsData: SmsData = {
      restaurantName: data.restaurantName,
      date: data.date,
      time: data.time,
      partySize: data.partySize,
    };
    results.push(
      getSmsProvider().send(data.customerPhone, cancellationSms(smsData)),
    );
  }

  await Promise.allSettled(results);
}
