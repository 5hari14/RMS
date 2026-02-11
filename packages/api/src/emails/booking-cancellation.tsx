import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface BookingCancellationProps {
  restaurantName: string;
  customerName: string;
  date: string;
  time: string;
  partySize: number;
}

export function BookingCancellation({
  restaurantName,
  customerName,
  date,
  time,
  partySize,
}: BookingCancellationProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Your booking at {restaurantName} for {date} has been cancelled
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>{restaurantName}</Heading>
          <Text style={text}>Hi {customerName},</Text>
          <Text style={text}>
            Your booking has been cancelled. Here were the details:
          </Text>
          <Section style={detailsBox}>
            <Text style={detailRow}>
              <strong>Date:</strong> {date}
            </Text>
            <Text style={detailRow}>
              <strong>Time:</strong> {time}
            </Text>
            <Text style={detailRow}>
              <strong>Party size:</strong> {partySize}{" "}
              {partySize === 1 ? "guest" : "guests"}
            </Text>
          </Section>
          <Text style={text}>
            We&apos;d love to see you another time. Feel free to make a new
            reservation whenever you&apos;re ready.
          </Text>
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

const hr: React.CSSProperties = {
  borderColor: "#e2e8f0",
  margin: "24px 0",
};

const footer: React.CSSProperties = {
  fontSize: "12px",
  color: "#94a3b8",
  textAlign: "center" as const,
};
