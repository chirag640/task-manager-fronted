import {
  Plus,
  X,
  GripVertical,
  Loader2,
  Check,
  ArrowRight,
  RotateCcw,
  Trash2,
  UserPlus,
  MoveRight,
} from "lucide-react";
import {
  getBoardTasks,
  updateBoardTask,
  deleteBoardTask,
  bulkAction,
  deleteOrgTask,
  getTaskLabels,
  BoardTask,
  Project,
  Member,
  Label,
} from "../api";
import { useOrgActivity } from "../hooks/useOrgWebSocket";
import TaskFormModal from "./TaskFormModal";
import {
  useKeyboardShortcuts,
  KEYBOARD_SHORTCUTS,
} from "../hooks/useKeyboardShortcuts";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";

type BoardTaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

interface Column {
  id: string;
  title: string;
  status: BoardTaskStatus;
  color: string;
}

const COLUMNS: Column[] = [
  { id: "todo", title: "To Do", status: "TODO", color: "bg-yellow-50" },
  {
    id: "inprogress",
    title: "In Progress",
    status: "IN_PROGRESS",
    color: "bg-blue-50",
  },
  { id: "done", title: "Done", status: "DONE", color: "bg-green-50" },
];

const STATUS_ORDER: Record<BoardTaskStatus, number> = {
  TODO: 0,
  IN_PROGRESS: 1,
  DONE: 2,
};

const sortBoardTasks = (items: BoardTask[]) =>
  [...items].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      (a.boardOrder ?? 0) - (b.boardOrder ?? 0) ||
      a.id - b.id,
  );

export interface BoardTaskStats {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
}

export default function KanbanBoard({
  organizationId,
  refreshKey,
  projects = [],
  members = [],
  projectId,
  onTaskCreated,
  onStatsChange,
}: {
  organizationId: number;
  refreshKey?: number;
  projects?: Project[];
  members?: Member[];
  projectId?: number | null;
  onTaskCreated?: () => void;
  onStatsChange?: (stats: BoardTaskStats) => void;
}) {
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [draggedTask, setDraggedTask] = useState<BoardTask | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<BoardTask | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [focusedTaskId, setFocusedTaskId] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [taskLabelsMap, setTaskLabelsMap] = useState<Record<number, Label[]>>(
    {},
  );
  const dropInFlightRef = useRef(false);
  const visibleTasks = useMemo(
    () =>
      projectId ? tasks.filter((task) => task.projectId === projectId) : tasks,
    [tasks, projectId],
  );

  useEffect(() => {
    onStatsChange?.({
      total: visibleTasks.length,
      todo: visibleTasks.filter((task) => task.status === "TODO").length,
      inProgress: visibleTasks.filter((task) => task.status === "IN_PROGRESS")
        .length,
      done: visibleTasks.filter((task) => task.status === "DONE").length,
    });
  }, [visibleTasks, onStatsChange]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewTask: () => {
      setEditingTask(null);
      setShowTaskModal(true);
    },
    onEditTask: () => {
      if (focusedTaskId) {
        const task = tasks.find((t) => t.id === focusedTaskId);
        if (task) {
          setEditingTask(task);
          setShowTaskModal(true);
        }
      }
    },
    onDeleteTask: async () => {
      if (focusedTaskId) {
        if (confirm("Delete this task?")) {
          await deleteOrgTask(organizationId, focusedTaskId);
          setTasks(tasks.filter((t) => t.id !== focusedTaskId));
          setFocusedTaskId(null);
        }
      }
    },
    onShowHelp: () => setShowHelp(true),
    onSetStatus: async (status) => {
      if (focusedTaskId) {
        const task = tasks.find((t) => t.id === focusedTaskId);
        if (task) {
          await updateBoardTask(organizationId, focusedTaskId, {
            title: task.title,
            description: task.description,
            status,
          });
          setTasks(
            tasks.map((t) => (t.id === focusedTaskId ? { ...t, status } : t)),
          );
        }
      }
    },
  });

  // Toggle selection for a task
  const toggleSelect = useCallback((taskId: number) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  // Select all in column
  const selectAllInColumn = useCallback(
    (status: BoardTaskStatus) => {
      const columnTaskIds = visibleTasks
        .filter((t) => t.status === status)
        .map((t) => t.id);
      setSelectedTasks((prev) => {
        const next = new Set(prev);
        columnTaskIds.forEach((id) => next.add(id));
        return next;
      });
    },
    [visibleTasks],
  );

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedTasks(new Set());
  }, []);

  // Bulk delete
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedTasks.size} tasks?`)) return;
    setBulkActionLoading(true);
    try {
      await bulkAction({
        taskIds: Array.from(selectedTasks),
        action: "DELETE",
      });
      setTasks(tasks.filter((t) => !selectedTasks.has(t.id)));
      clearSelection();
    } catch (err) {
      console.error("Bulk delete failed:", err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk change status
  const handleBulkStatusChange = async (status: BoardTaskStatus) => {
    setBulkActionLoading(true);
    try {
      await bulkAction({
        taskIds: Array.from(selectedTasks),
        action: "CHANGE_STATUS",
        value: status,
      });
      setTasks(
        tasks.map((t) => (selectedTasks.has(t.id) ? { ...t, status } : t)),
      );
      clearSelection();
    } catch (err) {
      console.error("Bulk status change failed:", err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk assign
  const handleBulkAssign = async (userId: number) => {
    setBulkActionLoading(true);
    try {
      await bulkAction({
        taskIds: Array.from(selectedTasks),
        action: "ASSIGN",
        value: String(userId),
      });
      const member = members.find((m) => m.id === userId);
      setTasks(
        tasks.map((t) =>
          selectedTasks.has(t.id)
            ? { ...t, assigneeId: userId, assigneeUsername: member?.username }
            : t,
        ),
      );
      clearSelection();
      setShowAssignMenu(false);
    } catch (err) {
      console.error("Bulk assign failed:", err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk move to project
  const handleBulkMove = async (projectId: number) => {
    setBulkActionLoading(true);
    try {
      await bulkAction({
        taskIds: Array.from(selectedTasks),
        action: "MOVE",
        value: String(projectId),
      });
      const project = projects.find((p) => p.id === projectId);
      setTasks(
        tasks.map((t) =>
          selectedTasks.has(t.id)
            ? { ...t, projectId, projectName: project?.name }
            : t,
        ),
      );
      clearSelection();
      setShowMoveMenu(false);
    } catch (err) {
      console.error("Bulk move failed:", err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [organizationId, refreshKey]);

  // WebSocket real-time updates
  const { subscribeTaskEvent } = useOrgActivity();
  useEffect(() => {
    const unsubscribe = subscribeTaskEvent((event) => {
      const action = event.action || (event.task ? "UPDATED" : null);

      if ((action === "CREATED" || action === "UPDATED") && event.task) {
        const incomingTask = event.task as BoardTask;
        setTasks((prev) => {
          const exists = prev.some((task) => task.id === incomingTask.id);
          const next = exists
            ? prev.map((task) =>
                task.id === incomingTask.id
                  ? { ...task, ...incomingTask }
                  : task,
              )
            : [...prev, incomingTask];
          return sortBoardTasks(next);
        });
        // update labels for incoming task
        (async () => {
          try {
            const labels = await getTaskLabels(incomingTask.id);
            setTaskLabelsMap((prev) => ({
              ...prev,
              [incomingTask.id]: labels,
            }));
          } catch (err) {
            console.error("Failed to load labels for incoming task:", err);
          }
        })();
        return;
      }

      if (action === "DELETED" && event.taskId) {
        setTasks((prev) => prev.filter((task) => task.id !== event.taskId));
        return;
      }

      if (action === "STATUS_CHANGED" && event.taskId && event.newStatus) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === event.taskId
              ? { ...task, status: event.newStatus as BoardTaskStatus }
              : task,
          ),
        );
      }
    });
    return unsubscribe;
  }, [subscribeTaskEvent]);

  const loadTasks = async () => {
    try {
      const data = await getBoardTasks(organizationId);
      setTasks(data);
      // load labels for tasks
      try {
        const labelResults = await Promise.all(
          data.map(async (t) => ({
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
        console.error("Failed to load task labels for board:", err);
      }
    } catch (err) {
      console.error("Failed to load board tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTasksByColumn = (columnStatus: BoardTaskStatus) => {
    return visibleTasks.filter((t) => t.status === columnStatus);
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("Delete this task?")) return;
    setActionLoading(taskId);
    try {
      await deleteBoardTask(organizationId, taskId);
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error("Failed to delete board task:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMoveTask = async (
    task: BoardTask,
    newStatus: BoardTaskStatus,
  ) => {
    setActionLoading(task.id);
    try {
      const updated = await updateBoardTask(organizationId, task.id, {
        title: task.title,
        description: task.description,
        status: newStatus,
      });
      setTasks(tasks.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      console.error("Failed to move board task:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTaskSuccess = (task: BoardTask) => {
    if (editingTask) {
      setTasks(tasks.map((t) => (t.id === task.id ? task : t)));
    } else {
      setTasks([...tasks, task]);
    }
    setShowTaskModal(false);
    setEditingTask(null);
    onTaskCreated?.();
    // refresh labels for this task
    (async () => {
      try {
        const labels = await getTaskLabels(task.id);
        setTaskLabelsMap((prev) => ({ ...prev, [task.id]: labels }));
      } catch (err) {
        console.error("Failed to load labels for task after save:", err);
      }
    })();
  };

  const openAddTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const openEditTask = (task: BoardTask) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, task: BoardTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(task.id));
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (
    e: React.DragEvent,
    column: Column,
    dropIndex?: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumn(null);
    if (!draggedTask) return;
    if (dropInFlightRef.current) return;
    dropInFlightRef.current = true;

    try {
      const columnTasks = tasks.filter((t) => t.status === column.status);
      const targetIndex = dropIndex ?? columnTasks.length;

      // Same column - reorder within
      if (draggedTask.status === column.status) {
        // Find current index
        const currentIndex = columnTasks.findIndex(
          (t) => t.id === draggedTask.id,
        );
        if (
          currentIndex === -1 ||
          currentIndex === targetIndex ||
          currentIndex === targetIndex - 1
        ) {
          return;
        }

        // Calculate new boardOrder
        let newOrder: number;
        if (targetIndex === 0) {
          // Dropped at top - order = first task - 1000
          newOrder = (columnTasks[0]?.boardOrder ?? 0) - 1000;
        } else if (targetIndex >= columnTasks.length) {
          // Dropped at bottom - order = last task + 1000
          newOrder =
            (columnTasks[columnTasks.length - 1]?.boardOrder ?? 0) + 1000;
        } else {
          // Dropped in middle - order = average of neighbors
          const before =
            columnTasks[
              targetIndex > currentIndex ? targetIndex : targetIndex - 1
            ];
          const after =
            columnTasks[
              targetIndex > currentIndex ? targetIndex - 1 : targetIndex
            ];
          newOrder = Math.floor(
            ((before?.boardOrder ?? 0) + (after?.boardOrder ?? 0)) / 2,
          );
        }

        setActionLoading(draggedTask.id);
        const updated = await updateBoardTask(organizationId, draggedTask.id, {
          title: draggedTask.title,
          description: draggedTask.description,
          boardOrder: newOrder,
        });
        setTasks((prev) =>
          sortBoardTasks(prev.map((t) => (t.id === updated.id ? updated : t))),
        );
      } else {
        // Different column - move to column
        await handleMoveTask(draggedTask, column.status);
      }
    } catch (err) {
      console.error("Failed to update board task from drop:", err);
    } finally {
      setActionLoading(null);
      setDraggedTask(null);
      dropInFlightRef.current = false;
    }
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const getButtonConfig = (task: BoardTask, columnId: string) => {
    // Task in To Do column: show "Move to Progress" button
    if (task.status === "TODO" && columnId === "todo") {
      return {
        label: "Move to Progress",
        icon: <ArrowRight className="w-3 h-3" />,
        action: () => handleMoveTask(task, "IN_PROGRESS"),
        className: "bg-neo-accent text-white hover:bg-black",
      };
    }
    // Task in In Progress: show "Mark Done"
    if (task.status === "IN_PROGRESS" && columnId === "inprogress") {
      return {
        label: "Mark Done",
        icon: <Check className="w-3 h-3" />,
        action: () => handleMoveTask(task, "DONE"),
        className: "bg-green-500 text-white hover:bg-green-600",
      };
    }
    // Task in Done: show "Reopen"
    if (task.status === "DONE" && columnId === "done") {
      return {
        label: "Reopen",
        icon: <RotateCcw className="w-3 h-3" />,
        action: () => handleMoveTask(task, "TODO"),
        className: "bg-yellow-400 hover:bg-yellow-500",
      };
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-neo-accent" />
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((column) => {
        const columnTasks = getTasksByColumn(column.status);
        const isDragOver = dragOverColumn === column.id;

        return (
          <div
            key={column.id}
            className={`flex-shrink-0 w-80 ${column.color} border-4 border-black rounded-lg p-4 min-h-[400px] transition-all ${isDragOver ? "ring-4 ring-neo-accent ring-offset-2" : ""}`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column)}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={
                    columnTasks.length > 0 &&
                    columnTasks.every((t) => selectedTasks.has(t.id))
                  }
                  onChange={() => selectAllInColumn(column.status)}
                  className="w-4 h-4 cursor-pointer accent-neo-accent"
                  title="Select all in column"
                />
                <h3 className="font-black uppercase text-sm">{column.title}</h3>
              </div>
              <span className="bg-black text-white font-bold text-xs px-2 py-1">
                {columnTasks.length}
              </span>
            </div>

            <div
              className="space-y-3 min-h-[100px]"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColumn(column.id);
              }}
              onDrop={(e) => handleDrop(e, column, columnTasks.length)}
            >
              {columnTasks.map((task, idx) => {
                const buttonConfig = getButtonConfig(task, column.id);

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.stopPropagation();
                      handleDrop(e, column, idx);
                    }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (
                        target.tagName !== "INPUT" &&
                        target.tagName !== "BUTTON"
                      ) {
                        setFocusedTaskId(task.id);
                      }
                    }}
                    className={`bg-white border-4 border-black p-3 hover:shadow-neo-md transition-all group cursor-pointer ${draggedTask?.id === task.id ? "opacity-50" : ""} ${selectedTasks.has(task.id) ? "ring-2 ring-neo-accent" : ""} ${focusedTaskId === task.id ? "ring-2 ring-yellow-400" : ""}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={() => toggleSelect(task.id)}
                        className="w-4 h-4 mt-1 cursor-pointer accent-neo-accent"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`font-bold text-sm ${task.status === "DONE" ? "line-through text-gray-400" : "text-black"}`}
                          >
                            {task.title}
                          </span>

                          {task.priority && (
                            <span
                              className={`text-xs px-1 py-0.5 font-bold ${
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
                        {task.description && (
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        {task.dueDate && (
                          <p
                            className={`text-xs mt-1 ${
                              new Date(task.dueDate) < new Date() &&
                              task.status !== "DONE"
                                ? "text-red-600 font-bold"
                                : "text-gray-400"
                            }`}
                          >
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </p>
                        )}
                        {task.assigneeUsername && (
                          <p className="text-xs text-gray-400 mt-1">
                            → {task.assigneeUsername}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        disabled={actionLoading === task.id}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1"
                      >
                        {actionLoading === task.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X size={14} />
                        )}
                      </button>
                    </div>

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

                    {buttonConfig && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t-2 border-black">
                        <button
                          onClick={buttonConfig.action}
                          disabled={actionLoading === task.id}
                          className={`text-xs font-bold uppercase px-2 py-1 border-2 border-black flex items-center gap-1 ${buttonConfig.className}`}
                        >
                          {actionLoading === task.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              {buttonConfig.icon}
                              {buttonConfig.label}
                            </>
                          )}
                        </button>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditTask(task)}
                            disabled={actionLoading === task.id}
                            className="text-xs font-bold uppercase px-2 py-1 border-2 border-black hover:bg-black hover:text-white"
                          >
                            Edit
                          </button>
                          <GripVertical className="w-4 h-4 text-gray-300" />
                        </div>
                      </div>
                    )}
                    {!buttonConfig && (
                      <div className="flex items-center justify-end mt-2 pt-2 border-t-2 border-black">
                        <button
                          onClick={() => openEditTask(task)}
                          disabled={actionLoading === task.id}
                          className="text-xs font-bold uppercase px-2 py-1 border-2 border-black hover:bg-black hover:text-white"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Only To Do column has Add task button */}
            {column.id === "todo" && (
              <button
                onClick={openAddTask}
                className="mt-4 flex items-center justify-center gap-2 w-full py-3 border-4 border-black border-dashed hover:bg-white hover:border-solid transition-all font-bold text-sm uppercase"
              >
                <Plus className="w-4 h-4" />
                Add task
              </button>
            )}
          </div>
        );
      })}

      {/* Bulk Action Bar */}
      {selectedTasks.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-3 rounded-lg shadow-lg border-4 border-neo-accent flex items-center gap-4 z-50">
          <span className="font-bold text-sm">
            {selectedTasks.size} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkDelete}
              disabled={bulkActionLoading}
              className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-xs font-bold uppercase border-2 border-white disabled:opacity-50"
            >
              {bulkActionLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
              Delete
            </button>
            <div className="relative">
              <button
                onClick={() => setShowAssignMenu(!showAssignMenu)}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-xs font-bold uppercase border-2 border-white"
              >
                <UserPlus className="w-3 h-3" />
                Assign
              </button>
              {showAssignMenu && (
                <div className="absolute bottom-full mb-2 left-0 bg-white text-black border-4 border-black rounded-lg min-w-[150px] max-h-[200px] overflow-auto">
                  {members.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleBulkAssign(member.id)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-xs font-bold"
                    >
                      {member.username}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setShowMoveMenu(!showMoveMenu)}
                className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-xs font-bold uppercase border-2 border-white"
              >
                <MoveRight className="w-3 h-3" />
                Move
              </button>
              {showMoveMenu && (
                <div className="absolute bottom-full mb-2 left-0 bg-white text-black border-4 border-black rounded-lg min-w-[150px] max-h-[200px] overflow-auto">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleBulkMove(project.id)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-xs font-bold"
                    >
                      {project.name}
                    </button>
                  ))}
                  {projects.length === 0 && (
                    <div className="px-3 py-2 text-xs text-gray-500">
                      No projects
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setShowBulkMenu(!showBulkMenu)}
                className="flex items-center gap-1 px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-xs font-bold uppercase border-2 border-white"
              >
                Change Status
              </button>
              {showBulkMenu && (
                <div className="absolute bottom-full mb-2 left-0 bg-white text-black border-4 border-black rounded-lg min-w-[150px]">
                  <button
                    onClick={() => handleBulkStatusChange("TODO")}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-xs font-bold"
                  >
                    To Do
                  </button>
                  <button
                    onClick={() => handleBulkStatusChange("IN_PROGRESS")}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-xs font-bold"
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => handleBulkStatusChange("DONE")}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-xs font-bold"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={clearSelection}
            className="text-xs font-bold uppercase hover:text-gray-300"
          >
            Clear
          </button>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-white border-4 border-black p-6 rounded-lg max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-lg">Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {KEYBOARD_SHORTCUTS.map(({ key, description }) => (
                <div
                  key={key}
                  className="flex justify-between items-center border-b border-gray-100 py-2"
                >
                  <span className="font-mono bg-gray-100 px-2 py-1 text-sm font-bold">
                    {key}
                  </span>
                  <span className="text-sm text-gray-600">{description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <TaskFormModal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(null);
        }}
        onSuccess={handleTaskSuccess}
        initialData={editingTask || undefined}
        organizationId={organizationId}
        projects={projects}
        members={members}
        taskId={editingTask?.id}
      />
    </div>
  );
}
