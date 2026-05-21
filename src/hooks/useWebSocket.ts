"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import { getWebSocketUrl } from "../config";

export interface OrgActivityEvent {
  organizationId: number;
  action: string;
  entityType: string;
  details: string;
  username: string;
  timestamp: string;
}

export interface TaskEvent {
  action: string;
  taskId?: number;
  oldStatus?: string;
  newStatus?: string;
  username?: string;
  [key: string]: unknown;
}

export interface UserNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  referenceId: number;
  referenceType: string;
  read: boolean;
  createdAt: string;
}

interface UseOrganizationWebSocketOptions {
  organizationId: number | null;
  onActivity?: (activity: OrgActivityEvent) => void;
  onTaskEvent?: (event: TaskEvent) => void;
  enabled?: boolean;
}

interface UseUserWebSocketOptions {
  username: string | null;
  onNotification?: (notification: UserNotification) => void;
  enabled?: boolean;
}

export function useOrganizationWebSocket({
  organizationId,
  onActivity,
  onTaskEvent,
  enabled = true,
}: UseOrganizationWebSocketOptions) {
  const clientRef = useRef<Client | null>(null);
  const subscriptionsRef = useRef<StompSubscription[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (!organizationId || !enabled) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => {
        return new WebSocket(getWebSocketUrl());
      },
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      console.log(
        "[WS] Connected to organization WebSocket:",
        `/topic/org/${organizationId}`,
      );
      setConnected(true);
      setError(null);

      // Subscribe to org activity
      const activitySub = client.subscribe(
        `/topic/org/${organizationId}/activity`,
        (message: IMessage) => {
          try {
            const activity = JSON.parse(message.body) as OrgActivityEvent;
            onActivity?.(activity);
          } catch (e) {
            console.error("Failed to parse activity:", e);
          }
        },
      );
      subscriptionsRef.current.push(activitySub);

      // Subscribe to task events
      const taskSub = client.subscribe(
        `/topic/org/${organizationId}/tasks`,
        (message: IMessage) => {
          try {
            const event = JSON.parse(message.body) as TaskEvent;
            onTaskEvent?.(event);
          } catch (e) {
            console.error("Failed to parse task event:", e);
          }
        },
      );
      subscriptionsRef.current.push(taskSub);
    };

    client.onDisconnect = () => {
      setConnected(false);
    };

    client.onStompError = (frame: { body: string }) => {
      console.error("[WS] STOMP error:", frame.body);
      setError("Connection error");
    };

    client.onWebSocketError = (event: Event) => {
      console.error("[WS] WebSocket error:", event);
    };

    client.onUnhandledFrame = (frame: unknown) => {
      console.warn("[WS] Unhandled frame:", frame);
    };

    client.activate();
    console.log("[WS] Activating WebSocket connection...");
    clientRef.current = client;
  }, [organizationId, enabled, onActivity, onTaskEvent]);

  const disconnect = useCallback(() => {
    subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
    subscriptionsRef.current = [];
    clientRef.current?.deactivate();
    clientRef.current = null;
    setConnected(false);
  }, []);

  useEffect(() => {
    if (enabled && organizationId) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [enabled, organizationId, connect, disconnect]);

  return { connected, error, reconnect: connect };
}

export function useUserWebSocket({
  username,
  onNotification,
  enabled = true,
}: UseUserWebSocketOptions) {
  const clientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<StompSubscription | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (!username || !enabled) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => {
        return new WebSocket(getWebSocketUrl());
      },
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      console.log(
        "[WS] Connected to user WebSocket:",
        `/topic/user/${username}`,
      );
      setConnected(true);
      setError(null);

      const sub = client.subscribe(
        `/topic/user/${username}`,
        (message: IMessage) => {
          try {
            const notification = JSON.parse(message.body) as UserNotification;
            onNotification?.(notification);
          } catch (e) {
            console.error("Failed to parse notification:", e);
          }
        },
      );
      subscriptionRef.current = sub;
    };

    client.onDisconnect = () => {
      setConnected(false);
    };

    client.activate();
    clientRef.current = client;
  }, [username, enabled, onNotification]);

  const disconnect = useCallback(() => {
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;
    clientRef.current?.deactivate();
    clientRef.current = null;
    setConnected(false);
  }, []);

  useEffect(() => {
    if (enabled && username) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [enabled, username, connect, disconnect]);

  return { connected, error, reconnect: connect };
}
