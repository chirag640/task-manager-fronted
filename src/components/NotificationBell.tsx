import { useState, useEffect } from 'react'
import { Bell, Check } from 'lucide-react'
import { getNotifications, markNotificationRead, Notification } from '../api'

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      const data = await getNotifications()
      setNotifications(data.content || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    }
  }

  const handleMarkRead = async (id: number) => {
    try {
      await markNotificationRead(id)
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  if (!localStorage.getItem('token')) return null

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-white/10 rounded transition-colors"
      >
        <Bell className="w-5 h-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white border-4 border-black shadow-neo-lg z-50">
          <div className="p-4 border-b-4 border-black font-black uppercase bg-black text-white">
            Notifications
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 font-bold">No notifications</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`p-4 border-b-2 border-gray-200 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50' : ''}`}
                >
                  <div className="font-black text-sm uppercase">{n.title}</div>
                  <div className="text-sm text-gray-600 mt-1">{n.message}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="text-sm text-blue-600 mt-2 flex items-center gap-1 font-bold hover:underline"
                    >
                      <Check className="w-4 h-4" /> Mark as read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}