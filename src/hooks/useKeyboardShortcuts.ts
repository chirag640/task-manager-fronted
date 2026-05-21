import { useEffect, useCallback } from 'react';

interface KeyboardShortcutHandlers {
  onNewTask?: () => void;
  onEditTask?: () => void;
  onDeleteTask?: () => void;
  onShowHelp?: () => void;
  onSetStatus?: (status: 'TODO' | 'IN_PROGRESS' | 'DONE') => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in input/textarea
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    // Ignore if modifier keys pressed (except for help)
    if (e.metaKey || e.ctrlKey || e.altKey) {
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'c':
        handlers.onNewTask?.();
        break;
      case 'e':
        handlers.onEditTask?.();
        break;
      case 'delete':
      case 'backspace':
        handlers.onDeleteTask?.();
        break;
      case '?':
        handlers.onShowHelp?.();
        break;
      case '1':
        handlers.onSetStatus?.('TODO');
        break;
      case '2':
        handlers.onSetStatus?.('IN_PROGRESS');
        break;
      case '3':
        handlers.onSetStatus?.('DONE');
        break;
    }
  }, [handlers]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Help modal content
export const KEYBOARD_SHORTCUTS = [
  { key: 'C', description: 'Create new task' },
  { key: 'E', description: 'Edit selected task' },
  { key: 'Del', description: 'Delete selected task' },
  { key: '1', description: 'Set status: To Do' },
  { key: '2', description: 'Set status: In Progress' },
  { key: '3', description: 'Set status: Done' },
  { key: '?', description: 'Show keyboard shortcuts' },
  { key: 'Esc', description: 'Close modal / Clear selection' },
];