import { useState, useEffect, useCallback } from "react";
import {
  getOrgTasks,
  createOrgTask,
  updateOrgTask,
  deleteOrgTask,
  searchTasks,
  searchOrgTasks,
  getTasks,
  createTask,
  updateTask as updatePersonalTask,
  deleteTask as deletePersonalTask,
  getMyJoinRequests,
  dismissJoinRequest,
  UserJoinRequest,
  getTaskComments,
  addTaskComment,
  deleteTaskComment,
  TaskComment,
  getProjects,
  Project,
  getActivityLogsPaged,
  ActivityLog,
  getOrgAnalytics,
  OrgAnalytics,
  getMembers,
  Member,
  getNotifications,
  Notification,
  PresenceMember,
  getTaskLabels,
  Label,
} from "../api";
import { OrgWebSocketProvider, useOrgActivity } from "../hooks/useOrgWebSocket";
import KanbanBoard, { BoardTaskStats } from "../components/KanbanBoard";
import NewProjectModal from "../components/NewProjectModal";
import {
  Plus,
  Check,
  Trash2,
  Edit3,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  Building2,
  MessageCircle,
  Bell,
  Moon,
  Sun,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
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

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

interface DashboardProps {
  onLogout: () => void;
  isPersonalMode?: boolean;
}

export default function Dashboard({
  onLogout,
  isPersonalMode = false,
}: DashboardProps) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [joinRequests, setJoinRequests] = useState<UserJoinRequest[]>([]);
  const [boardRefresh, setBoardRefresh] = useState(0);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityPage, setActivityPage] = useState(0);
  const [activityTotalPages, setActivityTotalPages] = useState(0);
  const [activityFilter, setActivityFilter] = useState<string | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [analytics, setAnalytics] = useState<OrgAnalytics | null>(null);
  const [boardTaskStats, setBoardTaskStats] = useState<BoardTaskStats>({
    total: 0,
    todo: 0,
    inProgress: 0,
    done: 0,
  });
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [onlineMembers, setOnlineMembers] = useState<PresenceMember[]>([]);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark",
  );
  const [taskLabelsMap, setTaskLabelsMap] = useState<Record<number, Label[]>>(
    {},
  );

  // Toggle dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "TODO" as TaskStatus,
    priority: "MEDIUM" as TaskPriority,
    dueDate: "",
    projectId: undefined as number | undefined,
    assigneeId: undefined as number | undefined,
  });
  const [orgId, setOrgId] = useState<string | null>(null);
  const orgName = localStorage.getItem("organizationName");
  const userRole = localStorage.getItem("userRole");
  const currentUsername = localStorage.getItem("username");
  const numericOrgId = orgId ? Number(orgId) : NaN;
  const hasValidOrgId =
    !isPersonalMode && Number.isInteger(numericOrgId) && numericOrgId > 0;
  const headerTaskStats =
    viewMode === "kanban"
      ? boardTaskStats
      : {
          total: totalElements,
          todo: tasks.filter((task) => task.status === "TODO").length,
          inProgress: tasks.filter((task) => task.status === "IN_PROGRESS")
            .length,
          done: tasks.filter((task) => task.status === "DONE").length,
        };
  const handleBoardStatsChange = useCallback((stats: BoardTaskStats) => {
    setBoardTaskStats((prev) =>
      prev.total === stats.total &&
      prev.todo === stats.todo &&
      prev.inProgress === stats.inProgress &&
      prev.done === stats.done
        ? prev
        : stats,
    );
  }, []);

  // Single, authoritative orgId initialization
  useEffect(() => {
    if (isPersonalMode) {
      setOrgId(null);
      return;
    }
    const storedOrgId = localStorage.getItem("organizationId");
    if (!storedOrgId || storedOrgId === "null" || storedOrgId === "0") {
      localStorage.removeItem("organizationId");
      localStorage.removeItem("organizationName");
      localStorage.removeItem("userRole");
      window.dispatchEvent(new Event("org-change"));
      navigate("/select-org");
      return;
    }
    setOrgId(storedOrgId);
  }, [navigate, isPersonalMode]);

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    [],
  );

  const loadTasks = async () => {
    // Skip if no valid orgId in org mode
    if (!isPersonalMode && !hasValidOrgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let res: TaskPage;
      if (searchQuery || filterStatus !== null) {
        if (isPersonalMode) {
          res = await searchTasks({
            title: searchQuery || undefined,
            status: filterStatus || undefined,
            page,
            size: 8,
          });
        } else {
          // Use org-scoped search
          const q = searchQuery || "";
          const statusFilter = filterStatus || undefined;
          // Fetch and filter by status (backend search doesn't support status filter)
          const searchRes = await searchOrgTasks(numericOrgId, q, page, 8);
          let filtered = searchRes.content;
          if (statusFilter) {
            filtered = filtered.filter((t) => t.status === statusFilter);
          }
          res = { ...searchRes, content: filtered };
        }
      } else if (isPersonalMode) {
        res = await getTasks(page, 8);
      } else {
        res = await getOrgTasks(
          numericOrgId,
          page,
          8,
          selectedProject || undefined,
        );
      }
      setTasks(res.content);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
      // load labels for fetched tasks
      try {
        const labelResults = await Promise.all(
          res.content.map(async (t) => ({
            id: t.id,
            labels: await getTaskLabels(t.id),
          })),
        );
        const map: Record<number, Label[]> = {};
        labelResults.forEach((r) => {
          map[r.id] = r.labels;
        });
        setTaskLabelsMap(map);
      } catch (err) {
        console.error("Failed to load task labels:", err);
        setTaskLabelsMap({});
      }
    } catch (err: unknown) {
      console.error("Failed to load tasks:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load tasks";
      setError(errorMsg);
      if (errorMsg.includes("403") || errorMsg.includes("Unauthorized")) {
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    if (!hasValidOrgId) return;
    try {
      const data = await getProjects(numericOrgId);
      setProjects(data);
    } catch (err) {
      console.error("Failed to load projects:", err);
    }
  };

  const loadActivityLogs = async (
    options: {
      resetPage?: boolean;
      page?: number;
      filter?: string | null;
    } = {},
  ) => {
    if (!hasValidOrgId) return;
    try {
      setLoadingActivity(true);
      const requestedPage = options.resetPage
        ? 0
        : (options.page ?? activityPage);
      const requestedFilter =
        options.filter !== undefined ? options.filter : activityFilter;
      const data = await getActivityLogsPaged(
        numericOrgId,
        requestedPage,
        20,
        requestedFilter || undefined,
      );
      setActivityLogs(data.content);
      setActivityTotalPages(data.totalPages);
      setActivityPage(requestedPage);
    } catch (err) {
      console.error("Failed to load activity:", err);
      setActivityLogs([]);
      setActivityTotalPages(0);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleActivityFilterChange = (filter: string | null) => {
    setActivityFilter(filter);
    loadActivityLogs({ resetPage: true, filter });
  };

  const loadBoardTasks = () => {
    setBoardRefresh((r) => r + 1);
  };

  const loadAnalytics = async () => {
    if (!hasValidOrgId) return;
    try {
      const data = await getOrgAnalytics(numericOrgId);
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    }
  };

  useEffect(() => {
    if (!isPersonalMode) {
      loadProjects();
      loadAnalytics();
      loadMembers();
    }
  }, [orgId, isPersonalMode]);

  const loadMembers = async () => {
    if (!hasValidOrgId) return;
    try {
      const data = await getMembers(numericOrgId);
      setMembers(data);
    } catch (err) {
      console.error("Failed to load members:", err);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [page, searchQuery, filterStatus, orgId, isPersonalMode, selectedProject]);

  useEffect(() => {
    const handleOrgChange = () => {
      const newOrgId = localStorage.getItem("organizationId");
      if (newOrgId && newOrgId !== "null" && newOrgId !== "0") {
        setOrgId(newOrgId);
      } else {
        setOrgId(null);
      }
    };
    window.addEventListener("org-change", handleOrgChange);
    return () => window.removeEventListener("org-change", handleOrgChange);
  }, []);

  useEffect(() => {
    loadJoinRequests();
  }, []);

  // WebSocket: Organization activity
  const { subscribeActivity, subscribeTaskEvent, subscribePresence } =
    useOrgActivity();
  useEffect(() => {
    if (!hasValidOrgId) return;

    const unsubActivity = subscribeActivity((activity) => {
      const realtimeLog: ActivityLog = {
        id: Date.now(),
        action: activity.action,
        entityType: activity.entityType,
        entityId: 0,
        details: activity.details,
        username: activity.username,
        createdAt: activity.timestamp || new Date().toISOString(),
      };
      setActivityLogs((prev) => [realtimeLog, ...prev.slice(0, 49)]);
      if (activity.action === "COMPLETED" || activity.action === "STARTED") {
        loadAnalytics();
        setBoardRefresh((r) => r + 1);
      }
    });
    const unsubTask = subscribeTaskEvent((event) => {
      if (event.action === "STATUS_CHANGED") {
        showToast(
          `Task ${event.newStatus?.toLowerCase().replace("_", " ")}!`,
          "success",
        );
        loadBoardTasks();
        loadAnalytics();
      }
    });
    const unsubPresence = subscribePresence((presence) => {
      setOnlineMembers(
        presence.members
          .filter((m) => m.online)
          .map((m) => ({ ...m, displayName: m.displayName || m.username })),
      );
    });
    return () => {
      unsubActivity();
      unsubTask();
      unsubPresence();
    };
  }, [
    subscribeActivity,
    subscribeTaskEvent,
    subscribePresence,
    orgId,
    isPersonalMode,
  ]);

  // Load initial notifications
  useEffect(() => {
    if (currentUsername) {
      loadNotifications();
    }
  }, [currentUsername]);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications(0, 20);
      setNotifications(data.content);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  const loadJoinRequests = async () => {
    try {
      const requests = await getMyJoinRequests();
      setJoinRequests(requests);
    } catch (err) {
      console.error("Failed to load join requests:", err);
    }
  };

  const dismissRequest = async (requestId: number) => {
    try {
      await dismissJoinRequest(requestId);
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error("Failed to dismiss request:", err);
    }
  };

  const openTaskDetail = async (task: Task) => {
    setViewingTask(task);
    setLoadingComments(true);
    setNewComment("");
    try {
      const comments = await getTaskComments(task.id);
      setTaskComments(comments);
    } catch (err) {
      console.error("Failed to load comments:", err);
      setTaskComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !viewingTask) return;
    try {
      const comment = await addTaskComment(viewingTask.id, newComment);
      setTaskComments((prev) => [...prev, comment]);
      setNewComment("");
      showToast("Comment added!");
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await deleteTaskComment(commentId);
      setTaskComments((prev) => prev.filter((c) => c.id !== commentId));
      showToast("Comment deleted!");
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  const handleFilterChange = (value: string | null) => {
    setFilterStatus(value);
    setPage(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setActionLoading(-1);
    setError(null);
    try {
      if (editingTask) {
        if (isPersonalMode) {
          await updatePersonalTask(editingTask.id, formData);
        } else {
          await updateOrgTask(numericOrgId, editingTask.id, formData);
        }
        showToast("Task updated!");
      } else {
        if (isPersonalMode) {
          await createTask(formData);
        } else {
          await createOrgTask(numericOrgId, formData);
        }
        showToast("Task created!");
      }
      setShowForm(false);
      setEditingTask(null);
      setFormData({
        title: "",
        description: "",
        status: "TODO" as TaskStatus,
        priority: "MEDIUM" as TaskPriority,
        dueDate: "",
        projectId: undefined,
        assigneeId: undefined,
      });
      setBoardRefresh((r) => r + 1);
      await loadTasks();
      if (!isPersonalMode && showActivity) {
        await loadActivityLogs({ resetPage: true });
      }
    } catch (err: unknown) {
      console.error("Failed to save task:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Failed to save task";
      setError(errorMsg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggle = async (task: Task) => {
    setActionLoading(task.id);
    setError(null);
    try {
      // Cycle: TODO -> IN_PROGRESS -> DONE -> TODO
      let newStatus: TaskStatus;
      if (task.status === "TODO") {
        newStatus = "IN_PROGRESS";
      } else if (task.status === "IN_PROGRESS") {
        newStatus = "DONE";
      } else {
        newStatus = "TODO";
      }
      if (isPersonalMode) {
        await updatePersonalTask(task.id, {
          title: task.title,
          description: task.description,
          status: newStatus,
        });
      } else {
        await updateOrgTask(numericOrgId, task.id, {
          title: task.title,
          description: task.description,
          status: newStatus,
        });
      }
      showToast(
        newStatus === "DONE"
          ? "Task completed!"
          : newStatus === "IN_PROGRESS"
            ? "Task in progress!"
            : "Task reopened!",
      );
      setBoardRefresh((r) => r + 1);
      await loadTasks();
    } catch (err: unknown) {
      console.error("Failed to toggle task:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Failed to toggle task";
      setError(errorMsg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this task?")) return;
    setActionLoading(id);
    setError(null);
    try {
      if (isPersonalMode) {
        await deletePersonalTask(id);
      } else {
        await deleteOrgTask(numericOrgId, id);
      }
      showToast("Task deleted!");
      setBoardRefresh((r) => r + 1);
      await loadTasks();
    } catch (err: unknown) {
      console.error("Failed to delete task:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Failed to delete task";
      setError(errorMsg);
    } finally {
      setActionLoading(null);
    }
  };

  const startEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority || "MEDIUM",
      dueDate: task.dueDate ? task.dueDate.slice(0, 16) : "",
      projectId: task.projectId,
      assigneeId: task.assigneeId,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingTask(null);
    setFormData({
      title: "",
      description: "",
      status: "TODO" as TaskStatus,
      priority: "MEDIUM" as TaskPriority,
      dueDate: "",
      projectId: undefined,
      assigneeId: undefined,
    });
    setError(null);
  };

  return (
    <div
      className="min-h-screen bg-cream"
      style={{
        backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 border-4 border-black shadow-neo-md animate-float ${
              toast.type === "success"
                ? "bg-neo-secondary"
                : "bg-neo-accent text-white"
            }`}
          >
            <CheckCircle className="w-5 h-5" />
            <span className="font-bold">{toast.message}</span>
            <button
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
              className="ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="bg-black text-white border-b-8 border-black">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-neo-accent border-4 border-white p-2">
              <CheckSquare className="w-6 h-6 text-white" strokeWidth={3} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black uppercase">
                Task Manager
              </h1>
              {!isPersonalMode && (
                <span className="text-xs font-bold text-white/60">
                  {orgName} • {userRole}
                </span>
              )}
              {currentUsername && (
                <span className="text-xs font-bold text-neo-accent ml-2">
                  @{currentUsername}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {/* Online Members */}
            {!isPersonalMode && onlineMembers.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="flex -space-x-2">
                  {onlineMembers.slice(0, 3).map((member) => (
                    <div
                      key={member.username}
                      className="w-7 h-7 rounded-full bg-neo-accent border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                      title={member.displayName || member.username}
                    >
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
                {onlineMembers.length > 3 && (
                  <span className="text-xs text-white/70 font-bold">
                    +{onlineMembers.length - 3}
                  </span>
                )}
                <span className="text-xs text-white/70 font-bold ml-1">
                  {onlineMembers.length} online
                </span>
              </div>
            )}
            {currentUsername && (
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="btn btn-outline text-xs md:text-sm relative"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            )}
            {!isPersonalMode && (
              <button
                onClick={() => {
                  setShowActivity(true);
                  loadActivityLogs({ resetPage: true });
                }}
                className="btn btn-outline text-xs md:text-sm"
              >
                Activity
              </button>
            )}
            {!isPersonalMode &&
              (userRole === "OWNER" || userRole === "ADMIN") && (
                <button
                  onClick={() => navigate("/organization-settings")}
                  className="btn btn-outline text-xs md:text-sm"
                >
                  Org
                </button>
              )}
            <button
              onClick={() => navigate("/settings")}
              className="btn btn-outline text-xs md:text-sm"
            >
              Profile
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="btn btn-outline text-xs md:text-sm"
              title={darkMode ? "Light mode" : "Dark mode"}
            >
              {darkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onLogout}
              className="btn btn-outline text-xs md:text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Notifications Panel */}
        {showNotifications && (
          <div className="fixed top-20 right-4 w-80 bg-white border-4 border-black shadow-neo-xl z-50 max-h-[60vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b-4 border-black">
              <h3 className="font-black uppercase text-sm">Notifications</h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="p-1 border-2 border-black hover:bg-black hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-black/20">
              {notifications.length === 0 ? (
                <p className="p-4 text-center text-black/50 font-bold">
                  No notifications
                </p>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-cream cursor-pointer ${!notification.read ? "bg-yellow-50" : ""}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-2 py-0.5 font-bold border-2 border-black ${
                          notification.type === "TASK_ASSIGNED"
                            ? "bg-blue-400"
                            : notification.type === "TASK_COMPLETED"
                              ? "bg-green-500 text-white"
                              : notification.type === "TASK_STARTED"
                                ? "bg-yellow-400"
                                : notification.type === "TASK_UPDATED"
                                  ? "bg-blue-400"
                                  : notification.type === "REQUEST_APPROVED"
                                    ? "bg-green-500 text-white"
                                    : notification.type === "REQUEST_REJECTED"
                                      ? "bg-red-500 text-white"
                                      : "bg-gray-300"
                        }`}
                      >
                        {notification.type.replace(/_/g, " ")}
                      </span>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      )}
                    </div>
                    <p className="font-bold text-sm">{notification.title}</p>
                    <p className="text-xs text-black/60">
                      {notification.message}
                    </p>
                    <p className="text-xs text-black/40 mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="bg-neo-accent border-4 border-black p-4 mb-6 text-white font-bold flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="px-3 py-1 bg-black border-2 border-white hover:bg-white hover:text-black font-bold"
            >
              X
            </button>
          </div>
        )}

        {/* Stats Bar - shows count based on view mode */}
        <div
          className={`border-4 border-black p-4 mb-8 flex flex-wrap gap-4 justify-between items-center ${
            darkMode
              ? "bg-slate-800 text-slate-100 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.55)]"
              : "bg-neo-secondary text-black"
          }`}
        >
          <div className="flex items-center gap-6">
            <div>
              <span className="text-3xl font-black">
                {headerTaskStats.total}
              </span>
              <span className="font-bold uppercase text-xs ml-2">
                {viewMode === "kanban" ? "Board Tasks" : "Tasks"}
              </span>
            </div>
            {!isPersonalMode && analytics && (
              <>
                <div className="border-l-4 border-black pl-4">
                  <span className="text-2xl font-black text-yellow-700">
                    {headerTaskStats.todo}
                  </span>
                  <span className="font-bold uppercase text-xs ml-1">
                    To Do
                  </span>
                </div>
                <div className="border-l-4 border-black pl-4">
                  <span className="text-2xl font-black text-blue-600">
                    {headerTaskStats.inProgress}
                  </span>
                  <span className="font-bold uppercase text-xs ml-1">
                    In Progress
                  </span>
                </div>
                <div className="border-l-4 border-black pl-4">
                  <span className="text-2xl font-black text-green-600">
                    {headerTaskStats.done}
                  </span>
                  <span className="font-bold uppercase text-xs ml-1">Done</span>
                </div>
                <div className="border-l-4 border-black pl-4">
                  <span className="text-2xl font-black">
                    {analytics.totalMembers}
                  </span>
                  <span className="font-bold uppercase text-xs ml-1">
                    Members
                  </span>
                </div>
              </>
            )}
          </div>
          {!isPersonalMode && (
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("kanban")}
                className={`btn ${viewMode === "kanban" ? "btn-primary" : "btn-outline"}`}
              >
                Board
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`btn ${viewMode === "list" ? "btn-primary" : "btn-outline"}`}
              >
                List
              </button>
            </div>
          )}
        </div>

        {/* Join Requests Section */}
        {joinRequests.length > 0 && (
          <div className="bg-yellow-50 border-4 border-black p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black uppercase text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Your Join Requests
              </h3>
              <span className="badge badge-muted">
                {joinRequests.filter((r) => r.status === "PENDING").length}{" "}
                pending
              </span>
            </div>
            <div className="space-y-2">
              {joinRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between bg-white border-2 border-black px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <div>
                      <span className="font-bold">
                        {request.organization.name}
                      </span>
                      <div className="text-xs text-gray-500">
                        @{request.organization.slug}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`badge text-xs ${
                        request.status === "PENDING"
                          ? "bg-yellow-400"
                          : request.status === "APPROVED"
                            ? "bg-green-500 text-white"
                            : "bg-red-500 text-white"
                      }`}
                    >
                      {request.status === "PENDING" && (
                        <Clock className="w-3 h-3 mr-1" />
                      )}
                      {request.status === "APPROVED" && (
                        <Check className="w-3 h-3 mr-1" />
                      )}
                      {request.status === "REJECTED" && (
                        <XCircle className="w-3 h-3 mr-1" />
                      )}
                      {request.status}
                    </span>
                    {request.status !== "PENDING" && (
                      <button
                        onClick={() => dismissRequest(request.id)}
                        className="p-1 hover:bg-black/10 border border-black"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search, Project Filter & Add */}
        {viewMode === "list" && (
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {viewMode === "list" && (
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Search tasks..."
                  className="input pl-12"
                />
              </div>
            )}
            {!isPersonalMode && projects.length > 0 && (
              <select
                value={selectedProject || ""}
                onChange={(e) => {
                  if (e.target.value === "__new_project__") {
                    setShowNewProjectModal(true);
                  } else {
                    setSelectedProject(
                      e.target.value ? Number(e.target.value) : null,
                    );
                    setPage(0);
                  }
                }}
                className="input"
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
                <option value="__new_project__">+ New Project</option>
              </select>
            )}
            {viewMode === "list" && (
              <button
                onClick={() => {
                  setShowForm(true);
                  setEditingTask(null);
                  setFormData({
                    title: "",
                    description: "",
                    status: "TODO",
                    priority: "MEDIUM" as TaskPriority,
                    dueDate: "",
                    projectId: undefined,
                    assigneeId: undefined,
                  });
                  setError(null);
                }}
                className="btn btn-primary flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                New Task
              </button>
            )}
          </div>
        )}

        {/* Filter Buttons - Only for List View */}
        {(isPersonalMode || viewMode === "list") && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => handleFilterChange(null)}
              className={`btn text-xs ${filterStatus === null ? "btn-primary" : "btn-outline"}`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange("TODO")}
              className={`btn text-xs ${filterStatus === "TODO" ? "btn-primary" : "btn-outline"}`}
            >
              To Do
            </button>
            <button
              onClick={() => handleFilterChange("IN_PROGRESS")}
              className={`btn text-xs ${filterStatus === "IN_PROGRESS" ? "btn-primary" : "btn-outline"}`}
            >
              In Progress
            </button>
            <button
              onClick={() => handleFilterChange("DONE")}
              className={`btn text-xs ${filterStatus === "DONE" ? "btn-primary" : "btn-outline"}`}
            >
              Done
            </button>
          </div>
        )}

        {/* Task Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white border-4 border-black p-8 w-full max-w-lg shadow-neo-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black uppercase">
                  {editingTask ? "Edit Task" : "New Task"}
                </h2>
                <button
                  onClick={closeForm}
                  className="p-2 border-4 border-black hover:bg-black hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block font-bold uppercase text-sm tracking-widest mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="input"
                    placeholder="Task title"
                    required
                    disabled={actionLoading === -1}
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-sm tracking-widest mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="input min-h-[100px] resize-y"
                    placeholder="Task description (optional)"
                    disabled={actionLoading === -1}
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-sm tracking-widest mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as TaskStatus,
                      })
                    }
                    className="input"
                    disabled={actionLoading === -1}
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold uppercase text-sm tracking-widest mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: e.target.value as TaskPriority,
                      })
                    }
                    className="input"
                    disabled={actionLoading === -1}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold uppercase text-sm tracking-widest mb-2">
                    Due Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    className="input"
                    disabled={actionLoading === -1}
                  />
                </div>
                {!isPersonalMode && projects.length > 0 && (
                  <div>
                    <label className="block font-bold uppercase text-sm tracking-widest mb-2">
                      Project
                    </label>
                    <select
                      value={formData.projectId || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          projectId: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      className="input"
                      disabled={actionLoading === -1}
                    >
                      <option value="">No Project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {!isPersonalMode &&
                  viewMode === "kanban" &&
                  members.length > 0 && (
                    <div>
                      <label className="block font-bold uppercase text-sm tracking-widest mb-2">
                        Assignee
                      </label>
                      <select
                        value={formData.assigneeId || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            assigneeId: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                        className="input"
                        disabled={actionLoading === -1}
                      >
                        <option value="">Unassigned</option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.username}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                    disabled={actionLoading === -1}
                  >
                    {actionLoading === -1 ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : editingTask ? (
                      "Update"
                    ) : (
                      "Create"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={closeForm}
                    className="btn btn-outline"
                    disabled={actionLoading === -1}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Task View */}
        {!isPersonalMode && viewMode === "kanban" && hasValidOrgId ? (
          <OrgWebSocketProvider organizationId={numericOrgId}>
            <KanbanBoard
              key={`board-${orgId}`}
              organizationId={numericOrgId}
              refreshKey={boardRefresh}
              projects={projects}
              members={members}
              projectId={selectedProject}
              onStatsChange={handleBoardStatsChange}
              onTaskCreated={() => {
                loadProjects();
                loadAnalytics();
                if (showActivity) loadActivityLogs({ resetPage: true });
              }}
            />
          </OrgWebSocketProvider>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white border-4 border-black p-6 animate-pulse"
              >
                <div className="h-6 bg-black/10 w-3/4 mb-4"></div>
                <div className="h-4 bg-black/10 w-full mb-2"></div>
                <div className="h-4 bg-black/10 w-2/3 mb-4"></div>
                <div className="h-8 bg-black/10 w-full"></div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-block bg-white border-4 border-black p-8 shadow-neo-lg rotate-1">
              <p className="text-2xl font-black uppercase">No tasks found</p>
              <p className="font-bold text-black/50 mt-2">
                Create your first task above
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`card group relative transition-all duration-200 ${task.status === "DONE" ? "opacity-60" : ""}`}
              >
                <div className="absolute -top-3 -right-3">
                  {task.status === "DONE" && (
                    <span className="badge badge-success rotate-3">Done</span>
                  )}
                </div>

                <h3
                  className={`text-xl font-black mb-2 ${task.status === "DONE" ? "line-through" : ""}`}
                >
                  {task.title}
                </h3>

                {task.description && (
                  <p className="text-sm font-medium text-black/70 mb-4 line-clamp-2">
                    {task.description}
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs font-bold text-black/60 uppercase tracking-wide mb-4">
                  {task.status === "TODO" && (
                    <span className="badge bg-yellow-400">To Do</span>
                  )}
                  {task.status === "IN_PROGRESS" && (
                    <span className="badge bg-blue-500 text-white">
                      In Progress
                    </span>
                  )}
                  {task.status === "DONE" && (
                    <span className="badge bg-green-500 text-white">Done</span>
                  )}
                  {task.priority && (
                    <span
                      className={`badge ${
                        task.priority === "URGENT"
                          ? "bg-red-600 text-white"
                          : task.priority === "HIGH"
                            ? "bg-orange-500 text-white"
                            : task.priority === "MEDIUM"
                              ? "bg-blue-400"
                              : "bg-gray-300"
                      }`}
                    >
                      {task.priority}
                    </span>
                  )}
                </div>

                {task.dueDate && (
                  <div
                    className={`text-xs font-bold mb-2 ${
                      new Date(task.dueDate) < new Date() &&
                      task.status !== "DONE"
                        ? "text-red-600"
                        : "text-black/50"
                    }`}
                  >
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                    {new Date(task.dueDate) < new Date() &&
                      task.status !== "DONE" &&
                      " (OVERDUE)"}
                  </div>
                )}

                {task.assigneeUsername && (
                  <div className="text-xs font-bold text-black/50 mb-2">
                    Assigned to: {task.assigneeUsername}
                  </div>
                )}

                {task.projectName && (
                  <div className="text-xs font-bold text-black/50 mb-2">
                    Project: {task.projectName}
                  </div>
                )}

                {task.createdAt && (
                  <p className="text-xs font-bold text-black/40 uppercase tracking-wide mb-4">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </p>
                )}

                {/* Labels - show below description and above the action divider */}
                {taskLabelsMap[task.id] &&
                  taskLabelsMap[task.id].length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {taskLabelsMap[task.id].map((label) => (
                        <span
                          key={label.id}
                          className="text-xs px-2 py-1 font-bold rounded"
                          style={{
                            backgroundColor: label.color,
                            color: "#fff",
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}

                <div className="flex gap-2 mt-auto pt-4 border-t-4 border-black">
                  {task.status === "TODO" && (
                    <button
                      onClick={() => handleToggle(task)}
                      disabled={actionLoading !== null}
                      className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      {actionLoading === task.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Start
                    </button>
                  )}
                  {task.status === "IN_PROGRESS" && (
                    <button
                      onClick={() => handleToggle(task)}
                      disabled={actionLoading !== null}
                      className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      {actionLoading === task.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Done
                    </button>
                  )}
                  {task.status === "DONE" && (
                    <button
                      onClick={() => handleToggle(task)}
                      disabled={actionLoading !== null}
                      className="btn btn-outline flex-1 flex items-center justify-center gap-2"
                    >
                      {actionLoading === task.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      Reopen
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(task)}
                    disabled={actionLoading !== null}
                    className="btn btn-secondary p-2"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openTaskDetail(task)}
                    className="btn btn-secondary p-2"
                    title="Comments"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    disabled={actionLoading !== null}
                    className="btn bg-red-500 hover:bg-red-600 text-white p-2"
                    title="Delete"
                  >
                    {actionLoading === task.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Task Detail Modal with Comments */}
        {viewingTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white border-4 border-black p-8 w-full max-w-2xl shadow-neo-xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black uppercase">Task Details</h2>
                <button
                  onClick={() => setViewingTask(null)}
                  className="p-2 border-4 border-black hover:bg-black hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <span className="text-xs font-bold text-black/50 uppercase">
                    Title
                  </span>
                  <p className="text-xl font-black">{viewingTask.title}</p>
                </div>

                {viewingTask.description && (
                  <div>
                    <span className="text-xs font-bold text-black/50 uppercase">
                      Description
                    </span>
                    <p className="text-sm">{viewingTask.description}</p>
                  </div>
                )}

                <div className="flex gap-4">
                  <div>
                    <span className="text-xs font-bold text-black/50 uppercase">
                      Status
                    </span>
                    <span
                      className={`badge ${
                        viewingTask.status === "TODO"
                          ? "bg-yellow-400"
                          : viewingTask.status === "IN_PROGRESS"
                            ? "bg-blue-500 text-white"
                            : "bg-green-500 text-white"
                      }`}
                    >
                      {viewingTask.status}
                    </span>
                  </div>
                  {viewingTask.priority && (
                    <div>
                      <span className="text-xs font-bold text-black/50 uppercase">
                        Priority
                      </span>
                      <span
                        className={`badge ${
                          viewingTask.priority === "URGENT"
                            ? "bg-red-600 text-white"
                            : viewingTask.priority === "HIGH"
                              ? "bg-orange-500 text-white"
                              : viewingTask.priority === "MEDIUM"
                                ? "bg-blue-400"
                                : "bg-gray-300"
                        }`}
                      >
                        {viewingTask.priority}
                      </span>
                    </div>
                  )}
                </div>

                {viewingTask.dueDate && (
                  <div>
                    <span className="text-xs font-bold text-black/50 uppercase">
                      Due Date
                    </span>
                    <p
                      className={`text-sm font-bold ${new Date(viewingTask.dueDate) < new Date() && viewingTask.status !== "DONE" ? "text-red-600" : ""}`}
                    >
                      {new Date(viewingTask.dueDate).toLocaleString()}
                      {new Date(viewingTask.dueDate) < new Date() &&
                        viewingTask.status !== "DONE" &&
                        " (OVERDUE)"}
                    </p>
                  </div>
                )}

                {viewingTask.assigneeUsername && (
                  <div>
                    <span className="text-xs font-bold text-black/50 uppercase">
                      Assigned To
                    </span>
                    <p className="text-sm">{viewingTask.assigneeUsername}</p>
                  </div>
                )}
              </div>

              {/* Comments Section */}
              <div className="border-t-4 border-black pt-6">
                <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Comments ({taskComments.length})
                </h3>

                {loadingComments ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                    {taskComments.length === 0 ? (
                      <p className="text-sm text-black/50 font-bold">
                        No comments yet. Be the first to comment!
                      </p>
                    ) : (
                      taskComments.map((comment) => (
                        <div
                          key={comment.id}
                          className="bg-gray-50 border-2 border-black p-3"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-sm">
                                {comment.username}
                              </span>
                              <span className="text-xs text-black/50 ml-2">
                                {new Date(comment.createdAt).toLocaleString()}
                              </span>
                            </div>
                            {comment.username ===
                              localStorage.getItem("username") && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <p className="text-sm mt-1">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Add Comment Form */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                    placeholder="Add a comment..."
                    className="input flex-1"
                  />
                  <button
                    onClick={handleAddComment}
                    className="btn btn-primary"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="btn btn-outline disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-black text-lg px-4 py-2 bg-white border-4 border-black">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="btn btn-outline disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Activity Log Modal */}
        {showActivity && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white border-4 border-black p-6 w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-4 pb-4 border-b-4 border-black">
                <h2 className="text-xl font-black uppercase">Activity</h2>
                <button
                  onClick={() => setShowActivity(false)}
                  className="p-2 border-4 border-black hover:bg-black hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Activity Filters */}
              <div className="flex gap-2 mb-4 flex-wrap">
                <button
                  onClick={() => handleActivityFilterChange(null)}
                  className={`btn text-xs ${activityFilter === null ? "btn-primary" : "btn-outline"}`}
                >
                  All
                </button>
                <button
                  onClick={() => handleActivityFilterChange("BOARD_TASK")}
                  className={`btn text-xs ${activityFilter === "BOARD_TASK" ? "btn-primary" : "btn-outline"}`}
                >
                  Tasks
                </button>
                <button
                  onClick={() => handleActivityFilterChange("PROJECT")}
                  className={`btn text-xs ${activityFilter === "PROJECT" ? "btn-primary" : "btn-outline"}`}
                >
                  Projects
                </button>
                <button
                  onClick={() => handleActivityFilterChange("MEMBER")}
                  className={`btn text-xs ${activityFilter === "MEMBER" ? "btn-primary" : "btn-outline"}`}
                >
                  Members
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {loadingActivity ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : activityLogs.length === 0 ? (
                  <p className="text-center font-bold text-black/50 py-8">
                    No activity yet
                  </p>
                ) : (
                  activityLogs.map((log) => (
                    <div
                      key={log.id}
                      className="border-2 border-black p-3 bg-cream"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-black text-sm">
                          {log.username}
                        </span>
                        <span className="text-xs text-black/50">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-black/70">{log.details}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`text-xs px-2 py-1 border-2 border-black font-bold ${
                            log.action === "CREATED"
                              ? "bg-green-400"
                              : log.action === "UPDATED"
                                ? "bg-blue-400"
                                : log.action === "DELETED"
                                  ? "bg-red-400"
                                  : log.action === "COMPLETED"
                                    ? "bg-green-500 text-white"
                                    : log.action === "STARTED"
                                      ? "bg-yellow-400"
                                      : "bg-gray-300"
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="text-xs px-2 py-1 bg-black text-white font-bold">
                          {log.entityType}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Activity Pagination */}
              {activityTotalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-4 pt-4 border-t-4 border-black">
                  <button
                    onClick={() =>
                      loadActivityLogs({ page: Math.max(0, activityPage - 1) })
                    }
                    disabled={activityPage === 0 || loadingActivity}
                    className="btn btn-outline disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-black text-sm px-3 py-1 bg-white border-2 border-black">
                    {activityPage + 1} / {activityTotalPages}
                  </span>
                  <button
                    onClick={() =>
                      loadActivityLogs({
                        page: Math.min(
                          activityTotalPages - 1,
                          activityPage + 1,
                        ),
                      })
                    }
                    disabled={
                      activityPage >= activityTotalPages - 1 || loadingActivity
                    }
                    className="btn btn-outline disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <NewProjectModal
          isOpen={showNewProjectModal && hasValidOrgId}
          onClose={() => setShowNewProjectModal(false)}
          onSuccess={(project) => {
            setProjects((prev) => [...prev, project]);
            setSelectedProject(project.id);
            setShowNewProjectModal(false);
          }}
          organizationId={numericOrgId}
        />
      </main>
    </div>
  );
}
