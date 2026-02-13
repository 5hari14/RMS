import type { Metadata, Viewport } from "next";

import { TRPCProvider } from "@/trpc/provider";
import { Toaster } from "sonner";

import "./globals.css";

export const metadata: Metadata = {
  title: "Bites Host Stand",
  description: "Restaurant host stand interface",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bites Host",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="font-sans antialiased">
        <TRPCProvider>{children}</TRPCProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
