import type { Metadata } from "next";

import { TRPCProvider } from "@/trpc/provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Bites RMS",
  description: "Restaurant Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
