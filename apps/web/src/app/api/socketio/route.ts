import { NextResponse } from "next/server";

// Socket.io integration note:
// The Socket.io server runs on the same HTTP server as Next.js.
// It's initialized in the Next.js custom server (server.ts) or via
// instrumentation.ts. This route exists as a placeholder to ensure
// the /api/socketio path is reserved and to provide a health check.

export function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Socket.io endpoint — connect via WebSocket client",
  });
}
