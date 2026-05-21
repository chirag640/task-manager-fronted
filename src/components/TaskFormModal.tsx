import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createBoardTask, updateBoardTask, BoardTask, Project, Member, Label, getLabels, setTaskLabels, getTaskLabels } from '../api';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (task: BoardTask) => void;
  initialData?: BoardTask;
  organizationId: number;
  projects: Project[];
  members: Member[];
  taskId?: number;
}

export default function TaskFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  organizationId,
  projects,
  members,
  taskId,
}: TaskFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<number[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
      setPriority(initialData.priority || 'MEDIUM');
      setDueDate(initialData.dueDate ? initialData.dueDate.slice(0, 16) : '');
      setProjectId(initialData.projectId ? String(initialData.projectId) : '');
      setAssigneeId(initialData.assigneeId ? String(initialData.assigneeId) : '');
    } else {
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setDueDate('');
      setProjectId('');
      setAssigneeId('');
    }
    setError(null);
    setSelectedLabels([]);
  }, [initialData, isOpen]);

  // Load labels when modal opens
  useEffect(() => {
    if (isOpen) {
      loadLabels();
    }
  }, [isOpen]);

  const loadLabels = async () => {
    try {
      setLoadingLabels(true);
      const orgLabels = await getLabels();
      setLabels(orgLabels);
      // If editing, load task's labels
      if (taskId) {
        const taskLabels = await getTaskLabels(taskId);
        setSelectedLabels(taskLabels.map(l => l.id));
      }
    } catch (err) {
      console.error('Failed to load labels:', err);
    } finally {
      setLoadingLabels(false);
    }
  };

  const toggleLabel = (labelId: number) => {
    setSelectedLabels(prev =>
      prev.includes(labelId)
        ? prev.filter(id => id !== labelId)
        : [...prev, labelId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const taskData = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        projectId: projectId ? parseInt(projectId) : undefined,
        assigneeId: assigneeId ? parseInt(assigneeId) : undefined,
        status: initialData?.status || 'TODO',
      };

      let result: BoardTask;
      if (initialData) {
        result = await updateBoardTask(organizationId, initialData.id, taskData);
      } else {
        result = await createBoardTask(organizationId, taskData);
      }

      // Save labels after task is created/updated
      if (selectedLabels.length > 0 || taskId) {
        await setTaskLabels(result.id, selectedLabels);
      }

      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      console.error('Failed to save task:', err);
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border-4 border-black p-6 w-full max-w-md shadow-neo-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black uppercase">
            {initialData ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 border-4 border-black hover:bg-black hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-neo-accent text-white font-bold px-4 py-2 mb-4 border-2 border-black">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-bold uppercase text-xs tracking-widest mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="input"
              placeholder="Task title"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label className="block font-bold uppercase text-xs tracking-widest mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="input min-h-[80px] resize-y"
              placeholder="Task description (optional)"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold uppercase text-xs tracking-widest mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="input"
                disabled={loading}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase text-xs tracking-widest mb-1">
                Due Date
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="input"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase text-xs tracking-widest mb-1">
              Project
            </label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="input"
              disabled={loading}
            >
              <option value="">No Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold uppercase text-xs tracking-widest mb-1">
              Assignee
            </label>
            <select
              value={assigneeId}
              onChange={e => setAssigneeId(e.target.value)}
              className="input"
              disabled={loading}
            >
              <option value="">Unassigned</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.username}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold uppercase text-xs tracking-widest mb-1">
              Labels {loadingLabels && '(Loading...)'}
            </label>
            <div className="flex flex-wrap gap-2">
              {labels.map(label => (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => toggleLabel(label.id)}
                  className={`px-3 py-1 text-xs font-bold border-2 transition-all ${
                    selectedLabels.includes(label.id)
                      ? 'border-black bg-black text-white'
                      : 'border-gray-300 bg-white hover:border-black'
                  }`}
                  style={{
                    backgroundColor: selectedLabels.includes(label.id)
                      ? label.color
                      : undefined,
                    borderColor: label.color,
                    color: selectedLabels.includes(label.id) ? 'white' : label.color
                  }}
                >
                  {label.name}
                </button>
              ))}
              {labels.length === 0 && !loadingLabels && (
                <span className="text-xs text-gray-500">No labels created yet</span>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading || !title.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                initialData ? 'Update' : 'Create'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}