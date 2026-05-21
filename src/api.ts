import { getApiUrl, getBackendRoute } from "./config";

export const API_BASE = getApiUrl("");

// Types
interface AuthResponse {
  token: string;
  username: string;
  expiresIn: number;
  organizationId?: number;
  organizationName?: string;
}

interface Organization {
  id: number;
  name: string;
  slug: string;
  ownerId: number;
  ownerUsername?: string;
  createdAt: string;
  role: string;
}

interface Member {
  id: number;
  userId: number;
  username: string;
  role: string;
  joinedAt: string;
}

interface Invite {
  inviteCode: string;
  inviteUrl: string;
  organizationId: number;
}

interface Task {
  id: number;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
  assigneeId?: number;
  assigneeUsername?: string;
  projectId?: number;
  projectName?: string;
  createdAt?: string;
  organizationId?: number;
}

interface TaskPage {
  content: Task[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

interface TaskInput {
  title: string;
  description?: string;
  status?: "TODO" | "IN_PROGRESS" | "DONE";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
  assigneeId?: number;
  projectId?: number;
  organizationId?: number;
}

export interface Notification {
  id: number;
  type:
    | "INVITE_RECEIVED"
    | "JOIN_REQUEST_RECEIVED"
    | "REQUEST_APPROVED"
    | "REQUEST_REJECTED"
    | "TASK_ASSIGNED"
    | "TASK_STARTED"
    | "TASK_COMPLETED"
    | "TASK_UPDATED"
    | "TASK_REASSIGNED";
  title: string;
  message: string;
  referenceId: number;
  referenceType: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationPage {
  content: Notification[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  unreadCount: number;
}

// Request helper
export interface ApiError {
  message: string;
  status?: number;
}

let refreshPromise: Promise<AuthResponse> | null = null;

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = localStorage.getItem("token");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  headers["X-Device-ID"] = getDeviceId();
  return headers;
}

function storeAuthResponse(auth: AuthResponse) {
  localStorage.setItem("token", auth.token);
  localStorage.setItem("username", auth.username);
  if (auth.organizationId !== undefined && auth.organizationId !== null) {
    localStorage.setItem("organizationId", String(auth.organizationId));
  }
  if (auth.organizationName) {
    localStorage.setItem("organizationName", auth.organizationName);
  }
  window.dispatchEvent(new Event("auth-change"));
}

function clearAuthStorage() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("organizationId");
  localStorage.removeItem("organizationName");
  localStorage.removeItem("userRole");
  localStorage.removeItem("personalMode");
  window.dispatchEvent(new Event("auth-change"));
  window.dispatchEvent(new Event("org-change"));
  window.dispatchEvent(new Event("personal-mode-change"));
}

function redirectToLogin() {
  clearAuthStorage();
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

async function refreshAccessToken(): Promise<AuthResponse> {
  if (!refreshPromise) {
    refreshPromise = fetch(getApiUrl("/auth/refresh"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-ID": getDeviceId(),
      },
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw await buildApiError(response);
        }
        return response.json() as Promise<AuthResponse>;
      })
      .then((auth) => {
        storeAuthResponse(auth);
        return auth;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function buildApiError(response: Response): Promise<ApiError> {
  let errorMessage = `Error: ${response.status}`;
  try {
    const errorData = await response.json();
    errorMessage = errorData.message || errorData.error || errorMessage;
  } catch {
    errorMessage = response.statusText || errorMessage;
  }
  const error = new Error(errorMessage) as ApiError;
  error.status = response.status;
  return error;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const isPublicAuthEndpoint =
    (method === "POST" &&
      [
        "/auth/register",
        "/auth/login",
        "/auth/refresh",
        "/auth/logout",
      ].includes(endpoint)) ||
    (method === "GET" && endpoint === "/auth/oauth-config");

  const makeRequest = async () => {
    const headers = {
      ...authHeaders(),
      ...(options.headers as Record<string, string> | undefined),
    };
    return fetch(getApiUrl(endpoint), {
      ...options,
      headers,
      credentials: "include",
    });
  };

  let response = await makeRequest();

  // Expired access tokens can come back as 401 or 403 depending on where Spring
  // rejects the request. Try one refresh for protected API calls, then retry.
  if (
    !isPublicAuthEndpoint &&
    localStorage.getItem("token") &&
    (response.status === 401 || response.status === 403)
  ) {
    try {
      await refreshAccessToken();
      response = await makeRequest();
    } catch (refreshErr) {
      redirectToLogin();
      throw refreshErr;
    }
  }

  if (!response.ok) {
    if (!isPublicAuthEndpoint && response.status === 401) {
      redirectToLogin();
    }
    throw await buildApiError(response);
  }

  if (response.status === 204) return {} as T;
  return response.json();
}

// Auth with refresh token support
export const register = (username: string, password: string) =>
  request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const login = (username: string, password: string) =>
  request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const logout = () => request<void>("/auth/logout", { method: "POST" });

export const refreshToken = () => refreshAccessToken();

// OAuth helpers (redirect to backend endpoints)
export const oauthLogin = (provider: "google" | "github") => {
  window.location.href = getBackendRoute(`/oauth2/authorization/${provider}`);
};

// Check if OAuth is configured from backend
export const checkOAuthConfig = async (): Promise<{
  enabled: boolean;
  message: string;
}> => {
  return request<{ enabled: boolean; message: string }>("/auth/oauth-config");
};

// Organizations
export const createOrganization = (name: string, slug: string) =>
  request<Organization>("/organizations", {
    method: "POST",
    body: JSON.stringify({ name, slug }),
  });

export const getOrganizations = () => request<Organization[]>("/organizations");

export const getAvailableOrganizations = () =>
  request<Organization[]>("/organizations/available");

export const getOrganization = (id: number) =>
  request<Organization>(`/organizations/${id}`);

export const joinRequest = (orgSlug: string) =>
  request("/organizations/join-request", {
    method: "POST",
    body: JSON.stringify({ slug: orgSlug }),
  });

export const getNotifications = (page = 0, size = 20) =>
  request<NotificationPage>(`/notifications?page=${page}&size=${size}`);

export const markNotificationRead = (id: number) =>
  request(`/notifications/${id}/read`, { method: "POST" });

export const markAllNotificationsRead = () =>
  request("/notifications/read-all", { method: "POST" });

export const updateOrganization = (id: number, name: string, slug: string) =>
  request<Organization>(`/organizations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name, slug }),
  });

export const deleteOrganization = (id: number) =>
  request<void>(`/organizations/${id}`, { method: "DELETE" });

export const createInvite = (orgId: number) =>
  request<Invite>(`/organizations/${orgId}/invites`, { method: "POST" });

// Members
export const getMembers = (orgId: number) =>
  request<Member[]>(`/organizations/${orgId}/members`);

export const updateMemberRole = (orgId: number, userId: number, role: string) =>
  request<Member>(`/organizations/${orgId}/members/${userId}?role=${role}`, {
    method: "PATCH",
  });

export const removeMember = (orgId: number, userId: number) =>
  request<void>(`/organizations/${orgId}/members/${userId}`, {
    method: "DELETE",
  });

export const joinOrganization = (inviteCode: string) =>
  request<Organization>(`/organizations/join/${inviteCode}`, {
    method: "POST",
  });

// Tasks (organization-scoped)
export const getOrgTasks = (
  orgId: number,
  page = 0,
  size = 10,
  projectId?: number,
) =>
  request<TaskPage>(
    `/organizations/${orgId}/tasks?page=${page}&size=${size}${projectId ? `&projectId=${projectId}` : ""}`,
  );

export const createOrgTask = (orgId: number, data: TaskInput) =>
  request<Task>(`/organizations/${orgId}/tasks`, {
    method: "POST",
    body: JSON.stringify(data),
  });

// Projects
export interface Project {
  id: number;
  name: string;
  slug: string;
  description?: string;
  organizationId: number;
  ownerId: number;
  createdAt: string;
}

export interface ProjectInput {
  name: string;
  description?: string;
}

export const getProjects = (orgId: number) =>
  request<Project[]>(`/projects/organization/${orgId}`);

export const createProject = (orgId: number, data: ProjectInput) =>
  request<Project>(`/projects/organization/${orgId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateProject = (
  orgId: number,
  projectId: number,
  data: ProjectInput,
) =>
  request<Project>(`/projects/${projectId}/organization/${orgId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteProject = (orgId: number, projectId: number) =>
  request<void>(`/projects/${projectId}/organization/${orgId}`, {
    method: "DELETE",
  });

// Current user
export const getCurrentUser = () => {
  const username = localStorage.getItem("username");
  const orgId = localStorage.getItem("organizationId");
  const role = localStorage.getItem("userRole");
  return username
    ? { username, organizationId: orgId ? parseInt(orgId) : null, role }
    : null;
};

export const setCurrentOrganization = (org: Organization) => {
  localStorage.setItem("organizationId", String(org.id));
  localStorage.setItem("organizationName", org.name);
  localStorage.setItem("userRole", org.role);
  window.dispatchEvent(new Event("org-change"));
};

export const clearCurrentOrganization = () => {
  localStorage.removeItem("organizationId");
  localStorage.removeItem("organizationName");
  localStorage.removeItem("userRole");
};

// User profile endpoints
export interface UserProfile {
  id: number;
  username: string;
  role: string;
  provider: string;
  createdAt?: string;
}

export interface UserOrganization {
  id: number;
  name: string;
  slug: string;
  role: string;
}

export const getUserProfile = () => request<UserProfile>("/users/me");

export const updateUserProfile = (username: string) =>
  request<UserProfile>("/users/me", {
    method: "PUT",
    body: JSON.stringify({ username }),
  });

export const changePassword = (currentPassword: string, newPassword: string) =>
  request<{ message: string }>("/users/me/password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });

export const getUserOrganizations = () =>
  request<UserOrganization[]>("/users/me/organizations");

// Join requests
export interface JoinRequest {
  id: number;
  user: { id: number; username: string };
  organization: { id: number };
  status: string;
  createdAt: string;
  processedAt?: string;
}

export const getJoinRequests = (orgId: number) =>
  request<JoinRequest[]>(`/organizations/${orgId}/join-requests`);

export const approveJoinRequest = (orgId: number, requestId: number) =>
  request<{ message: string }>(
    `/organizations/${orgId}/join-requests/${requestId}/approve`,
    { method: "POST" },
  );

export const rejectJoinRequest = (orgId: number, requestId: number) =>
  request<{ message: string }>(
    `/organizations/${orgId}/join-requests/${requestId}/reject`,
    { method: "POST" },
  );

export const getJoinRequestsCount = (orgId: number) =>
  request<number>(`/organizations/${orgId}/join-requests/count`);

// User's own join requests (to see status of requests they submitted)
export interface UserJoinRequest {
  id: number;
  organization: { id: number; name: string; slug: string };
  status: string;
  createdAt: string;
  processedAt?: string;
}

export const getMyJoinRequests = () =>
  request<UserJoinRequest[]>("/users/me/join-requests");

export const dismissJoinRequest = (requestId: number) =>
  request<{ message: string }>(`/users/me/join-requests/${requestId}/dismiss`, {
    method: "DELETE",
  });

// Task Comments
export interface TaskComment {
  id: number;
  content: string;
  username: string;
  createdAt: string;
}

export const getTaskComments = (taskId: number) =>
  request<TaskComment[]>(`/tasks/${taskId}/comments`);

export const addTaskComment = (taskId: number, content: string) =>
  request<TaskComment>(`/tasks/${taskId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });

export const deleteTaskComment = (commentId: number) =>
  request<void>(`/tasks/comments/${commentId}`, { method: "DELETE" });

// Activity Logs
export interface ActivityLog {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  details: string;
  username: string;
  createdAt: string;
}

export interface ActivityLogPage {
  content: ActivityLog[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const getActivityLogs = (orgId: number, limit = 50) =>
  request<ActivityLog[]>(`/organizations/${orgId}/activity?limit=${limit}`);

export const getActivityLogsPaged = (
  orgId: number,
  page = 0,
  size = 20,
  entityType?: string,
) => {
  let url = `/organizations/${orgId}/activity/paged?page=${page}&size=${size}`;
  if (entityType) url += `&entityType=${entityType}`;
  return request<ActivityLogPage>(url);
};

// Analytics
export interface OrgAnalytics {
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  doneTasks: number;
  totalMembers: number;
  pendingJoinRequests: number;
  totalBoardTasks: number;
  totalProjects: number;
}

export const getOrgAnalytics = (orgId: number) =>
  request<OrgAnalytics>(`/organizations/${orgId}/analytics`);

// Presence API
export interface PresenceMember {
  username: string;
  displayName: string;
  online: boolean;
  lastSeen?: string;
}

export interface PresencePayload {
  organizationId: number;
  members: PresenceMember[];
  onlineCount: number;
}

export const getOnlineMembers = (orgId: number) =>
  request<PresenceMember[]>(`/presence/organizations/${orgId}/online`);

export const getAllMembersPresence = (orgId: number) =>
  request<PresenceMember[]>(`/presence/organizations/${orgId}/all`);

// Legacy task endpoints (for personal tasks)
export const getTasks = (
  page = 0,
  size = 10,
  sortBy = "id",
  direction = "asc",
) =>
  request<TaskPage>(
    `/tasks?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}`,
  );

export const getTask = (id: number) => request<Task>(`/tasks/${id}`);

export const searchTasks = (params: {
  title?: string;
  description?: string;
  status?: string;
  page?: number;
  size?: number;
}) => {
  const query = new URLSearchParams();
  if (params.title) query.append("title", params.title);
  if (params.description) query.append("description", params.description);
  if (params.status) query.append("status", params.status);
  if (params.page !== undefined) query.append("page", String(params.page));
  if (params.size !== undefined) query.append("size", String(params.size));
  return request<TaskPage>(`/tasks/search?${query.toString()}`);
};

export const createTask = (data: TaskInput) =>
  request<Task>("/tasks", { method: "POST", body: JSON.stringify(data) });

export const updateTask = (id: number, data: TaskInput) =>
  request<Task>(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const updateOrgTask = (orgId: number, taskId: number, data: TaskInput) =>
  request<Task>(`/organizations/${orgId}/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteTask = (id: number) =>
  request<void>(`/tasks/${id}`, { method: "DELETE" });

export const deleteOrgTask = (orgId: number, taskId: number) =>
  request<void>(`/organizations/${orgId}/tasks/${taskId}`, {
    method: "DELETE",
  });

// Projects
export interface Project {
  id: number;
  name: string;
  slug: string;
  description?: string;
  organizationId: number;
  ownerId: number;
  createdAt: string;
}

export type { Organization, Member, Invite, Task, TaskPage, TaskInput };

// Board Task types and API
export interface BoardTask {
  id: number;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  boardOrder: number;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
  assigneeId?: number;
  assigneeUsername?: string;
  projectId?: number;
  projectName?: string;
  createdAt?: string;
}

export interface BoardTaskInput {
  title: string;
  description?: string;
  status?: "TODO" | "IN_PROGRESS" | "DONE";
  boardOrder?: number;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
  assigneeId?: number;
  projectId?: number;
}

export const getBoardTasks = (orgId: number) =>
  request<BoardTask[]>(`/board-tasks/organizations/${orgId}`);

export const createBoardTask = (orgId: number, data: BoardTaskInput) =>
  request<BoardTask>(`/board-tasks/organizations/${orgId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateBoardTask = (
  orgId: number,
  taskId: number,
  data: BoardTaskInput,
) =>
  request<BoardTask>(`/board-tasks/${taskId}/organizations/${orgId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteBoardTask = (orgId: number, taskId: number) =>
  request<void>(`/board-tasks/${taskId}/organizations/${orgId}`, {
    method: "DELETE",
  });

// Session Management
export interface Session {
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  lastActive: string;
  createdAt: string;
  isCurrentSession: boolean;
}

export const getSessions = () => request<Session[]>("/auth/sessions");

export const revokeSession = (deviceId: string) =>
  request<void>(`/auth/sessions/${deviceId}`, { method: "DELETE" });

// Device ID management
export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
};

// Labels
export interface Label {
  id: number;
  name: string;
  color: string;
  organizationId: number;
  createdAt: string;
}

export interface LabelInput {
  name: string;
  color: string;
}

export const getLabels = () => request<Label[]>("/labels");

export const createLabel = (data: LabelInput) =>
  request<Label>("/labels", { method: "POST", body: JSON.stringify(data) });

export const updateLabel = (labelId: number, data: LabelInput) =>
  request<Label>(`/labels/${labelId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteLabel = (labelId: number) =>
  request<void>(`/labels/${labelId}`, { method: "DELETE" });

export const getTaskLabels = (taskId: number) =>
  request<Label[]>(`/tasks/${taskId}/labels`);

export const setTaskLabels = (taskId: number, labelIds: number[]) =>
  request<Label[]>(`/tasks/${taskId}/labels`, {
    method: "PUT",
    body: JSON.stringify(labelIds),
  });

// Subtasks
export const getSubtasks = (parentId: number) =>
  request<Task[]>(`/tasks/${parentId}/subtasks`);

// Search
export const searchOrgTasks = (
  orgId: number,
  query: string,
  page = 0,
  size = 10,
) =>
  request<TaskPage>(
    `/organizations/${orgId}/tasks/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}`,
  );

// Bulk Actions
export interface BulkActionRequest {
  taskIds: number[];
  action: "DELETE" | "MOVE" | "ASSIGN" | "CHANGE_STATUS";
  value?: string;
}

export interface BulkResult {
  successCount: number;
  failureCount: number;
  errors: string[];
}

export const bulkAction = (bulkRequest: BulkActionRequest) =>
  request<BulkResult>("/tasks/bulk", {
    method: "POST",
    body: JSON.stringify(bulkRequest),
  });

// Task Activity
export const getTaskActivity = (orgId: number, taskId: number) =>
  request<ActivityLog[]>(`/organizations/${orgId}/activity/task/${taskId}`);
