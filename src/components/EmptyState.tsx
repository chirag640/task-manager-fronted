import { Plus } from 'lucide-react';

interface EmptyStateProps {
  onCreateTask?: () => void;
  type?: 'kanban' | 'project';
}

export default function EmptyState({ onCreateTask, type = 'kanban' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative mb-6">
        {/* Abstract task illustration */}
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Background circle */}
          <circle cx="60" cy="60" r="50" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="2"/>
          {/* Checkmark box */}
          <rect x="25" y="35" width="30" height="30" rx="4" fill="white" stroke="#374151" strokeWidth="2"/>
          <path d="M35 50L45 60L55 45" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          {/* Document lines */}
          <rect x="65" y="30" width="30" height="35" rx="2" fill="white" stroke="#374151" strokeWidth="2"/>
          <line x1="72" y1="40" x2="88" y2="40" stroke="#d1d5db" strokeWidth="2"/>
          <line x1="72" y1="48" x2="88" y2="48" stroke="#d1d5db" strokeWidth="2"/>
          <line x1="72" y1="56" x2="80" y2="56" stroke="#d1d5db" strokeWidth="2"/>
          {/* Dotted line path */}
          <path d="M40 75 C50 85, 60 70, 75 80" stroke="#9ca3af" strokeWidth="2" strokeDasharray="4 4" fill="none"/>
          {/* Small dots */}
          <circle cx="30" cy="85" r="3" fill="#fbbf24"/>
          <circle cx="45" cy="90" r="2" fill="#60a5fa"/>
          <circle cx="90" cy="75" r="2" fill="#f472b6"/>
        </svg>
      </div>

      <h3 className="text-xl font-bold text-gray-800 mb-2">
        {type === 'kanban' ? 'No tasks yet' : 'No projects yet'}
      </h3>

      <p className="text-gray-500 text-center max-w-sm mb-6">
        {type === 'kanban'
          ? 'Create your first task to get started. Drag it between columns to track progress.'
          : 'Create a project to organize your tasks and collaborate with your team.'}
      </p>

      {onCreateTask && (
        <button
          onClick={onCreateTask}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          {type === 'kanban' ? 'Create your first task' : 'Create your first project'}
        </button>
      )}

      <div className="mt-8 flex items-center gap-4 text-sm text-gray-400">
        <span className="flex items-center gap-1">
          <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">C</kbd>
          <span>new task</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">J/K</kbd>
          <span>navigate</span>
        </span>
      </div>
    </div>
  );
}