'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, Clock, AlertCircle, Plus, Pencil } from 'lucide-react'
import { NotificationBell } from '@/components/notification-bell'
import { signOut, useSession } from 'next-auth/react'

interface Contact {
  id: string
  name: string
  phone: string
  topic: string | null
  status: string
  company: string | null
}

interface Activity {
  id: string
  activityType: string
  dueDate: string
  status: string
  contact: Contact
}

interface DashboardData {
  todaysCalls: Activity[]
  queue: Contact[]
  followUps: Activity[]
  unreadCount: number
}

function ContactCard({ contact, onCall }: { contact: Contact; onCall: (id: string) => void }) {
  return (
    <div className="bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{contact.name}</p>
          {contact.company && <p className="text-xs text-gray-400 mt-0.5">{contact.company}</p>}
          {contact.topic && (
            <div className="mt-2 bg-blue-950 border border-blue-800 rounded-lg p-2">
              <p className="text-xs font-medium text-blue-300">Topic to discuss:</p>
              <p className="text-xs text-blue-300 mt-0.5">{contact.topic}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => onCall(contact.id)}
          className="ml-3 flex items-center gap-1.5 bg-green-500 text-white px-3 py-2 rounded-xl text-sm font-medium min-h-[44px] min-w-[70px] hover:bg-green-600 transition-colors flex-shrink-0"
        >
          <Phone className="w-4 h-4" />
          Call
        </button>
      </div>
      <p className="text-sm text-gray-400 mt-2">{contact.phone}</p>
    </div>
  )
}

export default function SecretaryDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [activeTab, setActiveTab] = useState<'calls' | 'queue' | 'followups'>('queue')
  const [loading, setLoading] = useState(true)
  const [showEditName, setShowEditName] = useState(false)
  const [newName, setNewName] = useState('')
  const [savingName, setSavingName] = useState(false)

  async function editName() {
    if (!newName.trim()) return
    setSavingName(true)
    const res = await fetch('/api/users/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    setSavingName(false)
    if (res.ok) {
      setShowEditName(false)
      // Reload the page to refresh the session display name
      window.location.reload()
    }
  }

  useEffect(() => {
    let ignore = false
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/agent/dashboard')
        if (res.ok && !ignore) {
          const json = await res.json()
          setData(json)
        }
      } catch {
        // ignore
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    fetchDashboard()
    const interval = setInterval(fetchDashboard, 60000)
    return () => {
      ignore = true
      clearInterval(interval)
    }
  }, [])

  const handleCall = (contactId: string) => {
    router.push(`/secretary/call/${contactId}`)
  }

  const topQueueItem = data?.queue?.[0]

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <h1 className="font-bold text-white">Good day, {session?.user?.name?.split(' ')[0]}</h1>
              <button
                onClick={() => { setNewName(session?.user?.name || ''); setShowEditName(true) }}
                className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
                title="Edit name"
              >
                <Pencil className="w-3.5 h-3.5 text-gray-400 hover:text-gray-200" />
              </button>
            </div>
            <p className="text-xs text-gray-400">{new Date().toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-xs text-gray-500 hover:text-gray-400 px-2 py-1 min-h-[44px]">Sign out</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-lg mx-auto px-4 flex gap-0 border-t border-gray-800 bg-gray-900">
          {[
            { key: 'queue', label: 'My Queue', count: data?.queue?.length },
            { key: 'calls', label: "Today's Calls", count: data?.todaysCalls?.length },
            { key: 'followups', label: 'Follow-ups', count: data?.followUps?.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors min-h-[44px] ${
                activeTab === tab.key ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-400'
              }`}
            >
              {tab.label}
              {(tab.count ?? 0) > 0 && (
                <span className={`ml-1 text-xs rounded-full px-1.5 py-0.5 ${
                  tab.key === 'followups' && (data?.followUps?.some(f => f.status === 'overdue') ?? false)
                    ? 'bg-red-950 text-red-400 border border-red-800'
                    : 'bg-gray-800 text-gray-400'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 pb-24">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : (
          <>
            {activeTab === 'queue' && (
              <div className="space-y-3">
                {(!data?.queue || data.queue.length === 0) ? (
                  <div className="text-center py-12 text-gray-500">
                    <Phone className="w-12 h-12 mx-auto mb-2 text-gray-700" />
                    <p>Your queue is empty</p>
                  </div>
                ) : (
                  data.queue.map(contact => (
                    <ContactCard key={contact.id} contact={contact} onCall={handleCall} />
                  ))
                )}
              </div>
            )}

            {activeTab === 'calls' && (
              <div className="space-y-3">
                {(!data?.todaysCalls || data.todaysCalls.length === 0) ? (
                  <div className="text-center py-12 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-2 text-gray-700" />
                    <p>No calls scheduled for today</p>
                  </div>
                ) : (
                  data.todaysCalls.map(activity => (
                    <div key={activity.id} className="bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-800">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-white">{activity.contact.name}</p>
                          <p className="text-sm text-gray-400">{activity.contact.phone}</p>
                          {activity.contact.topic && (
                            <div className="mt-2 bg-blue-950 border border-blue-800 rounded-lg p-2">
                              <p className="text-xs font-medium text-blue-300">Topic:</p>
                              <p className="text-xs text-blue-300">{activity.contact.topic}</p>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Due: {new Date(activity.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCall(activity.contact.id)}
                          className="ml-3 flex items-center gap-1 bg-green-500 text-white px-3 py-2 rounded-xl text-sm font-medium min-h-[44px] hover:bg-green-600"
                        >
                          <Phone className="w-4 h-4" /> Call
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'followups' && (
              <div className="space-y-3">
                {(!data?.followUps || data.followUps.length === 0) ? (
                  <div className="text-center py-12 text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-700" />
                    <p>No follow-ups due</p>
                  </div>
                ) : (
                  data.followUps.map(activity => (
                    <div key={activity.id} className={`bg-gray-900 rounded-xl p-4 shadow-sm border ${
                      activity.status === 'overdue' ? 'border-red-900' : 'border-gray-800'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white">{activity.contact.name}</p>
                            {activity.status === 'overdue' && (
                              <span className="text-xs bg-red-950 text-red-400 border border-red-800 px-1.5 py-0.5 rounded-full">Overdue</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{activity.contact.phone}</p>
                          <p className="text-xs text-gray-500 mt-1">Due: {new Date(activity.dueDate).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={() => handleCall(activity.contact.id)}
                          className="ml-3 flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-medium min-h-[44px] hover:bg-blue-700"
                        >
                          <Phone className="w-4 h-4" /> Call
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Change Name Modal */}
      {showEditName && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-bold text-white">Change Name</h2>
              <button onClick={() => setShowEditName(false)} className="p-2 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg min-h-[44px]">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-300">Your name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your name"
                  autoFocus
                />
              </div>
              <button
                onClick={editName}
                disabled={!newName.trim() || savingName}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm min-h-[44px] hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {savingName ? 'Saving...' : 'Save Name'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      {topQueueItem && (
        <button
          onClick={() => handleCall(topQueueItem.id)}
          className="fixed bottom-6 right-4 bg-blue-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 font-semibold text-sm hover:bg-blue-700 transition-colors z-50"
        >
          <Plus className="w-5 h-5" />
          Call Next
        </button>
      )}
    </main>
  )
}
