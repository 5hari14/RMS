import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Socket.io endpoint — connect via WebSocket client",
  });
}
