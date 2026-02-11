// SMS templates — all kept under 160 characters for single-segment delivery

export interface SmsData {
  restaurantName: string;
  date: string;
  time: string;
  partySize: number;
  manageUrl?: string;
}

export function confirmationSms(data: SmsData): string {
  const base = `Confirmed: ${data.restaurantName}, ${data.date} ${data.time}, ${data.partySize} guests.`;
  if (data.manageUrl) {
    const msg = `${base} Manage: ${data.manageUrl}`;
    return msg.length <= 160 ? msg : base;
  }
  return base;
}

export function reminderSms(data: SmsData): string {
  return `Reminder: ${data.restaurantName} tomorrow ${data.time}, ${data.partySize} guests. Reply YES to confirm`;
}

export function cancellationSms(data: SmsData): string {
  return `${data.restaurantName}: your booking for ${data.date} at ${data.time} has been cancelled`;
}
