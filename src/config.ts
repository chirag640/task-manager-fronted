const DEFAULT_BACKEND_URL = "https://task-manager-backend-tndx.onrender.com";

function normalizeBackendUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function getBackendUrl() {
  const configuredUrl = import.meta.env.VITE_BACKEND_URL as string | undefined;
  const fallbackUrl = import.meta.env.DEV
    ? "http://localhost:8080"
    : DEFAULT_BACKEND_URL;
  return normalizeBackendUrl(configuredUrl || fallbackUrl);
}

export function getApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getBackendUrl()}/api${normalizedPath}`;
}

export function getWebSocketUrl() {
  return `${getBackendUrl()
    .replace(/^https:/, "wss:")
    .replace(/^http:/, "ws:")}/ws`;
}

export function getBackendRoute(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getBackendUrl()}${normalizedPath}`;
}
