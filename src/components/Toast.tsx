import { useState, useEffect, createContext, useContext, ReactNode } from 'react'

interface Toast {
  id: string
  message: string
  type: 'error' | 'success' | 'warning' | 'info'
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsExiting(true), 3500)
    return () => clearTimeout(timer)
  }, [])

  const bgColors = {
    error: 'bg-red-500 border-4 border-black text-white',
    success: 'bg-green-500 border-4 border-black text-white',
    warning: 'bg-yellow-400 border-4 border-black text-black',
    info: 'bg-blue-500 border-4 border-black text-white',
  }

  return (
    <div
      className={`px-4 py-3 font-bold shadow-neo-lg min-w-[280px] max-w-[400px] ${bgColors[toast.type]} ${isExiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
      onClick={() => onRemove(toast.id)}
    >
      {toast.message}
    </div>
  )
}