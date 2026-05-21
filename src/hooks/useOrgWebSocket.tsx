"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { Client, IMessage } from "@stomp/stompjs";
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
  action: "CREATED" | "UPDATED" | "DELETED" | "STATUS_CHANGED" | string;
  taskId?: number;
  task?: {
    id: number;
    title: string;
    description?: string;
    status: "TODO" | "IN_PROGRESS" | "DONE";
    boardOrder?: number;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    dueDate?: string;
    assigneeId?: number;
    assigneeUsername?: string;
    projectId?: number;
    projectName?: string;
    createdAt?: string;
  };
  oldStatus?: string;
  newStatus?: string;
  username?: string;
  [key: string]: unknown;
}

export interface PresencePayload {
  organizationId: number;
  members: Array<{ username: string; displayName?: string; online: boolean }>;
  onlineCount: number;
}

type Listener<T> = (data: T) => void;

interface OrgWsContextValue {
  connected: boolean;
  error: string | null;
  subscribeActivity: (listener: Listener<OrgActivityEvent>) => () => void;
  subscribeTaskEvent: (listener: Listener<TaskEvent>) => () => void;
  subscribePresence: (listener: Listener<PresencePayload>) => () => void;
}

const OrgWsContext = createContext<OrgWsContextValue | null>(null);

// Singleton state shared across all provider instances
let sharedClient: Client | null = null;
let sharedOrgId: number | null = null;
const sharedActivityListeners = new Set<Listener<OrgActivityEvent>>();
const sharedTaskListeners = new Set<Listener<TaskEvent>>();
const sharedPresenceListeners = new Set<Listener<PresencePayload>>();
let sharedSetConnected: ((v: boolean) => void) | null = null;
let sharedSetError: ((v: string | null) => void) | null = null;

const fallbackOrgWsContext: OrgWsContextValue = {
  connected: false,
  error: null,
  subscribeActivity: (listener) => {
    sharedActivityListeners.add(listener);
    return () => sharedActivityListeners.delete(listener);
  },
  subscribeTaskEvent: (listener) => {
    sharedTaskListeners.add(listener);
    return () => sharedTaskListeners.delete(listener);
  },
  subscribePresence: (listener) => {
    sharedPresenceListeners.add(listener);
    return () => sharedPresenceListeners.delete(listener);
  },
};

function ensureSharedConnection(orgId: number) {
  if (sharedClient && sharedOrgId === orgId) return;

  // Cleanup old connection if org changed
  if (sharedClient) {
    sharedClient.deactivate();
    sharedClient = null;
    sharedOrgId = null;
  }

  const token = localStorage.getItem("token");
  if (!token) return;

  sharedOrgId = orgId;
  sharedClient = new Client({
    webSocketFactory: () => new WebSocket(getWebSocketUrl()),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
      organizationId: String(orgId),
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
  });

  sharedClient.onConnect = () => {
    console.log("[OrgWs] Connected to /topic/org/" + orgId);
    if (sharedSetConnected) sharedSetConnected(true);
    if (sharedSetError) sharedSetError(null);

    sharedClient!.subscribe(
      `/topic/org/${orgId}/activity`,
      (message: IMessage) => {
        try {
          const activity = JSON.parse(message.body) as OrgActivityEvent;
          sharedActivityListeners.forEach((l) => l(activity));
        } catch (e) {
          console.error("[OrgWs] Activity parse error:", e);
        }
      },
    );

    sharedClient!.subscribe(
      `/topic/org/${orgId}/tasks`,
      (message: IMessage) => {
        try {
          const event = JSON.parse(message.body) as TaskEvent;
          sharedTaskListeners.forEach((l) => l(event));
        } catch (e) {
          console.error("[OrgWs] Task event parse error:", e);
        }
      },
    );

    // Subscribe to presence updates
    sharedClient!.subscribe(
      `/topic/org/${orgId}/presence`,
      (message: IMessage) => {
        try {
          const presence = JSON.parse(message.body) as PresencePayload;
          sharedPresenceListeners.forEach((l) => l(presence));
        } catch (e) {
          console.error("[OrgWs] Presence parse error:", e);
        }
      },
    );
  };

  sharedClient.onDisconnect = () => {
    if (sharedSetConnected) sharedSetConnected(false);
  };

  sharedClient.onStompError = (frame: { body: string }) => {
    console.error("[OrgWs] STOMP error:", frame.body);
    if (sharedSetError) sharedSetError("Connection error");
  };

  sharedClient.activate();
}

export function OrgWebSocketProvider({
  organizationId,
  children,
}: {
  organizationId: number;
  children: React.ReactNode;
}) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Register shared setState callbacks
  sharedSetConnected = setConnected;
  sharedSetError = setError;

  useEffect(() => {
    ensureSharedConnection(organizationId);
    return () => {
      // Don't cleanup on unmount - keep connection alive for other consumers
    };
  }, [organizationId]);

  const subscribeActivity = useCallback(
    (listener: Listener<OrgActivityEvent>) => {
      sharedActivityListeners.add(listener);
      return () => sharedActivityListeners.delete(listener);
    },
    [],
  );

  const subscribeTaskEvent = useCallback((listener: Listener<TaskEvent>) => {
    sharedTaskListeners.add(listener);
    return () => sharedTaskListeners.delete(listener);
  }, []);

  const subscribePresence = useCallback(
    (listener: Listener<PresencePayload>) => {
      sharedPresenceListeners.add(listener);
      return () => sharedPresenceListeners.delete(listener);
    },
    [],
  );

  return (
    <OrgWsContext.Provider
      value={{
        connected,
        error,
        subscribeActivity,
        subscribeTaskEvent,
        subscribePresence,
      }}
    >
      {children}
    </OrgWsContext.Provider>
  );
}

export function useOrgActivity() {
  const ctx = useContext(OrgWsContext);
  return ctx ?? fallbackOrgWsContext;
}
