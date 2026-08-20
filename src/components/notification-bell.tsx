'use client'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'

interface Notification {
  id: string
  type: string
  message: string
  isRead: boolean
  createdAt: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)

  const unread = notifications.filter(n => !n.isRead).length

  useEffect(() => {
    let ignore = false
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications')
        if (res.ok && !ignore) {
          const json = await res.json()
          setNotifications(json)
        }
      } catch {
        // ignore
      }
    }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => {
      ignore = true
      clearInterval(interval)
    }
  }, [])

  const markRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT' })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <Bell className="w-6 h-6" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-xl border z-50">
          <div className="p-3 border-b font-semibold text-sm">Notifications</div>
          {notifications.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 text-center">No notifications</div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`p-3 border-b text-sm cursor-pointer hover:bg-gray-50 ${!n.isRead ? 'bg-blue-50' : ''}`}
                onClick={() => markRead(n.id)}
              >
                <p className="text-gray-800">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
