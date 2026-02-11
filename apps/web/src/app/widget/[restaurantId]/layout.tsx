import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Table",
};

/**
 * Standalone layout for the embeddable widget page.
 * Does NOT include the dashboard chrome or TRPCProvider.
 */
export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}
