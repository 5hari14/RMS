import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface BookingReminderProps {
  restaurantName: string;
  customerName: string;
  time: string;
  partySize: number;
  manageUrl?: string;
}

export function BookingReminder({
  restaurantName,
  customerName,
  time,
  partySize,
  manageUrl,
}: BookingReminderProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Reminder: your booking at {restaurantName} is tomorrow at {time}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>{restaurantName}</Heading>
          <Text style={text}>Hi {customerName},</Text>
          <Text style={text}>
            Friendly reminder — your booking is tomorrow!
          </Text>
          <Section style={detailsBox}>
            <Text style={detailRow}>
              <strong>Time:</strong> {time}
            </Text>
            <Text style={detailRow}>
              <strong>Party size:</strong> {partySize}{" "}
              {partySize === 1 ? "guest" : "guests"}
            </Text>
          </Section>
          <Text style={text}>
            Reply YES to confirm your booking.
          </Text>
          {manageUrl && (
            <Text style={text}>
              Need to change something?{" "}
              <Link href={manageUrl} style={link}>
                Manage booking
              </Link>
            </Text>
          )}
          <Hr style={hr} />
          <Text style={footer}>
            {restaurantName} — Powered by Bites
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container: React.CSSProperties = {
  margin: "0 auto",
  padding: "32px 24px",
  maxWidth: "480px",
};

const heading: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  color: "#1e293b",
  marginBottom: "24px",
};

const text: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#334155",
  marginBottom: "12px",
};

const detailsBox: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "16px 20px",
  marginBottom: "20px",
};

const detailRow: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "28px",
  color: "#334155",
  margin: 0,
};

const link: React.CSSProperties = {
  color: "#2563eb",
  textDecoration: "underline",
};

const hr: React.CSSProperties = {
  borderColor: "#e2e8f0",
  margin: "24px 0",
};

const footer: React.CSSProperties = {
  fontSize: "12px",
  color: "#94a3b8",
  textAlign: "center" as const,
};
