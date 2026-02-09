"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/auth-context";

type SocketStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

type PlacementEventPayload = {
  event_id?: number;
  student_id?: number;
  event_type?: string;
  event_at?: string;
  placement_state?: string;
  coordinator_id?: string | number | null;
  manager_id?: string | number | null;
  status_from?: string;
  status_to?: string;
};

type PlacementNotificationPayload = {
  type?: string;
  event?: PlacementEventPayload;
};

export type NotificationAlert = {
  id: string;
  type: string;
  eventAt: string;
  receivedAt: string;
  studentId: number | null;
  eventId: number | null;
  statusFrom: string | null;
  statusTo: string | null;
  placementState: string | null;
  coordinatorId: string | number | null;
  managerId: string | number | null;
  read: boolean;
};

type NotificationsContextValue = {
  socketStatus: SocketStatus;
  unreadCount: number;
  alerts: NotificationAlert[];
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(
  undefined
);

function safeString(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function getNotificationsWsUrl(): string {
  const explicitUrl = process.env.NEXT_PUBLIC_NOTIFICATIONS_WS_URL;
  if (explicitUrl && explicitUrl.trim()) {
    return explicitUrl.trim();
  }

  if (typeof window === "undefined") {
    return "";
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  
  return `${protocol}://${host}/notifications/ws/placements`;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("idle");
  const [alerts, setAlerts] = useState<NotificationAlert[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(false);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const closeSocket = useCallback(() => {
    clearReconnectTimer();
    shouldReconnectRef.current = false;

    if (!socketRef.current) return;

    const socket = socketRef.current;
    socketRef.current = null;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    socket.close();
  }, [clearReconnectTimer]);

  const connect = useCallback(() => {
    if (!isAuthenticated || typeof window === "undefined") return;
    if (socketRef.current) return;

    const wsUrl = getNotificationsWsUrl();
    if (!wsUrl) {
      setSocketStatus("error");
      return;
    }

    setSocketStatus("connecting");

    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      shouldReconnectRef.current = true;

      socket.onopen = () => {
        setSocketStatus("connected");
      };

      socket.onmessage = (messageEvent) => {
        let payload: PlacementNotificationPayload;

        try {
          payload = JSON.parse(messageEvent.data) as PlacementNotificationPayload;
        } catch (error) {
          console.error("Failed to parse notification payload:", error);
          return;
        }

        if (!payload?.type || payload.type !== "student_became_allocated") {
          return;
        }

        const incomingEvent = payload.event ?? {};
        const eventId =
          typeof incomingEvent.event_id === "number" ? incomingEvent.event_id : null;
        const fallbackId =
          eventId !== null
            ? `evt-${eventId}`
            : `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

        setAlerts((previous) => {
          if (eventId !== null && previous.some((alert) => alert.eventId === eventId)) {
            return previous;
          }

          const next: NotificationAlert = {
            id: fallbackId,
            type: safeString(payload.type) ?? "student_became_allocated",
            eventAt: safeString(incomingEvent.event_at) ?? new Date().toISOString(),
            receivedAt: new Date().toISOString(),
            studentId:
              typeof incomingEvent.student_id === "number"
                ? incomingEvent.student_id
                : null,
            eventId,
            statusFrom: safeString(incomingEvent.status_from),
            statusTo: safeString(incomingEvent.status_to),
            placementState: safeString(incomingEvent.placement_state),
            coordinatorId:
              typeof incomingEvent.coordinator_id === "string" ||
              typeof incomingEvent.coordinator_id === "number"
                ? incomingEvent.coordinator_id
                : null,
            managerId:
              typeof incomingEvent.manager_id === "string" ||
              typeof incomingEvent.manager_id === "number"
                ? incomingEvent.manager_id
                : null,
            read: false,
          };

          return [next, ...previous].slice(0, 200);
        });
      };

      socket.onerror = () => {
        setSocketStatus("error");
      };

      socket.onclose = (closeEvent) => {
        socketRef.current = null;
        setSocketStatus("disconnected");

        if (!shouldReconnectRef.current || !isAuthenticated) {
          return;
        }

        // 1008 means auth/cookie policy violation. Do not auto-loop reconnect.
        if (closeEvent.code === 1008) {
          setSocketStatus("error");
          return;
        }

        clearReconnectTimer();
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };
    } catch (error) {
      console.error("Failed to initialize notifications socket:", error);
      setSocketStatus("error");
    }
  }, [clearReconnectTimer, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      closeSocket();
      setSocketStatus("idle");
      setAlerts([]);
      return;
    }

    connect();

    return () => {
      closeSocket();
    };
  }, [closeSocket, connect, isAuthenticated]);

  const markAllAsRead = useCallback(() => {
    setAlerts((previous) =>
      previous.map((alert) => (alert.read ? alert : { ...alert, read: true }))
    );
  }, []);

  const markAsRead = useCallback((id: string) => {
    setAlerts((previous) =>
      previous.map((alert) =>
        alert.id === id && !alert.read ? { ...alert, read: true } : alert
      )
    );
  }, []);

  const unreadCount = useMemo(
    () => alerts.reduce((total, alert) => total + (alert.read ? 0 : 1), 0),
    [alerts]
  );

  const contextValue = useMemo(
    () => ({
      socketStatus,
      unreadCount,
      alerts,
      markAllAsRead,
      markAsRead,
    }),
    [alerts, markAllAsRead, markAsRead, socketStatus, unreadCount]
  );

  return (
    <NotificationsContext.Provider value={contextValue}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return context;
}
