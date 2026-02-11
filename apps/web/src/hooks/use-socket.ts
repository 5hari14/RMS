"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  TableStatusChangedPayload,
  ReservationUpdatedPayload,
  ReservationCreatedPayload,
  SOCKET_EVENTS,
} from "@bites-rms/types";

interface UseSocketOptions {
  restaurantId: string;
  onTableStatusChanged?: (payload: TableStatusChangedPayload) => void;
  onReservationUpdated?: (payload: ReservationUpdatedPayload) => void;
  onReservationCreated?: (payload: ReservationCreatedPayload) => void;
  onFloorPlanRefresh?: () => void;
}

export function useSocket({
  restaurantId,
  onTableStatusChanged,
  onReservationUpdated,
  onReservationCreated,
  onFloorPlanRefresh,
}: UseSocketOptions): void {
  const socketRef = useRef<Socket | null>(null);

  // Store callbacks in refs to avoid reconnecting on callback changes
  const callbacksRef = useRef({
    onTableStatusChanged,
    onReservationUpdated,
    onReservationCreated,
    onFloorPlanRefresh,
  });
  callbacksRef.current = {
    onTableStatusChanged,
    onReservationUpdated,
    onReservationCreated,
    onFloorPlanRefresh,
  };

  useEffect(() => {
    if (!restaurantId) return;

    const socket = io({
      path: "/api/socketio",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join:restaurant", restaurantId);
    });

    socket.on("table:statusChanged", (payload: TableStatusChangedPayload) => {
      callbacksRef.current.onTableStatusChanged?.(payload);
    });

    socket.on("reservation:updated", (payload: ReservationUpdatedPayload) => {
      callbacksRef.current.onReservationUpdated?.(payload);
    });

    socket.on("reservation:created", (payload: ReservationCreatedPayload) => {
      callbacksRef.current.onReservationCreated?.(payload);
    });

    socket.on("floorPlan:refresh", () => {
      callbacksRef.current.onFloorPlanRefresh?.();
    });

    return () => {
      socket.emit("leave:restaurant", restaurantId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [restaurantId]);
}
