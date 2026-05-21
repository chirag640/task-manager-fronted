import { useState } from 'react';
import { X, Loader2, Plus } from 'lucide-react';
import { createProject, Project } from '../api';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: Project) => void;
  organizationId: number;
}

export default function NewProjectModal({
  isOpen,
  onClose,
  onSuccess,
  organizationId,
}: NewProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const project = await createProject(organizationId, {
        name: name.trim(),
        description: description.trim() || undefined,
      });

      onSuccess(project);
      onClose();
      setName('');
      setDescription('');
    } catch (err: unknown) {
      console.error('Failed to create project:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border-4 border-black p-6 w-full max-w-md shadow-neo-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black uppercase">New Project</h2>
          <button
            onClick={handleClose}
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
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input"
              placeholder="Project name"
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
              placeholder="Project description (optional)"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading || !name.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Project
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
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