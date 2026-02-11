import { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";

// ─────────────────────────────────────────────────────────────────────────────
// Event types (keep in sync with packages/types/src/socket.ts)
// ─────────────────────────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  "table:statusChanged": (payload: {
    tableId: string;
    status: "AVAILABLE" | "RESERVED" | "SEATED" | "LATE" | "BLOCKED";
    reservation?: {
      id: string;
      guestName: string;
      partySize: number;
      time: string;
      seatedAt?: string;
    };
  }) => void;
  "reservation:updated": (payload: {
    reservationId: string;
    tableId: string | null;
    status: string;
  }) => void;
  "reservation:created": (payload: {
    reservationId: string;
    tableId: string | null;
    status: string;
    guestName: string;
    partySize: number;
  }) => void;
  "floorPlan:refresh": () => void;
}

export interface ClientToServerEvents {
  "join:restaurant": (restaurantId: string) => void;
  "leave:restaurant": (restaurantId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Socket.io server singleton
// ─────────────────────────────────────────────────────────────────────────────

let io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

export function getSocketServer(): Server<ClientToServerEvents, ServerToClientEvents> | null {
  return io;
}

export function createSocketServer(
  httpServer: HttpServer,
): Server<ClientToServerEvents, ServerToClientEvents> {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      methods: ["GET", "POST"],
    },
    path: "/api/socketio",
  });

  io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`[socket] Client connected: ${socket.id}`);

    socket.on("join:restaurant", (restaurantId: string) => {
      if (typeof restaurantId === "string" && restaurantId.length > 0) {
        void socket.join(`restaurant:${restaurantId}`);
        console.log(`[socket] ${socket.id} joined restaurant:${restaurantId}`);
      }
    });

    socket.on("leave:restaurant", (restaurantId: string) => {
      if (typeof restaurantId === "string" && restaurantId.length > 0) {
        void socket.leave(`restaurant:${restaurantId}`);
        console.log(`[socket] ${socket.id} left restaurant:${restaurantId}`);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[socket] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper to emit events to a restaurant room
// ─────────────────────────────────────────────────────────────────────────────

export function emitToRestaurant<E extends keyof ServerToClientEvents>(
  restaurantId: string,
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
): void {
  const server = getSocketServer();
  if (!server) return;
  server.to(`restaurant:${restaurantId}`).emit(event, ...args);
}
