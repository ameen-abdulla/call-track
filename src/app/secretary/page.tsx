'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, Clock, AlertCircle, Plus } from 'lucide-react'
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
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{contact.name}</p>
          {contact.company && <p className="text-xs text-gray-400 mt-0.5">{contact.company}</p>}
          {contact.topic && (
            <div className="mt-2 bg-blue-50 rounded-lg p-2">
              <p className="text-xs font-medium text-blue-700">Topic to discuss:</p>
              <p className="text-xs text-blue-600 mt-0.5">{contact.topic}</p>
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
      <p className="text-sm text-gray-500 mt-2">{contact.phone}</p>
    </div>
  )
}

export default function SecretaryDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [activeTab, setActiveTab] = useState<'calls' | 'queue' | 'followups'>('queue')
  const [loading, setLoading] = useState(true)

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
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">Good day, {session?.user?.name?.split(' ')[0]}</h1>
            <p className="text-xs text-gray-400">{new Date().toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-xs text-gray-400 px-2 py-1 min-h-[44px]">Sign out</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-lg mx-auto px-4 flex gap-0 border-t">
          {[
            { key: 'queue', label: 'My Queue', count: data?.queue?.length },
            { key: 'calls', label: "Today's Calls", count: data?.todaysCalls?.length },
            { key: 'followups', label: 'Follow-ups', count: data?.followUps?.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors min-h-[44px] ${
                activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
              }`}
            >
              {tab.label}
              {(tab.count ?? 0) > 0 && (
                <span className={`ml-1 text-xs rounded-full px-1.5 py-0.5 ${
                  tab.key === 'followups' && (data?.followUps?.some(f => f.status === 'overdue') ?? false)
                    ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 pb-24">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <>
            {activeTab === 'queue' && (
              <div className="space-y-3">
                {(!data?.queue || data.queue.length === 0) ? (
                  <div className="text-center py-12 text-gray-400">
                    <Phone className="w-12 h-12 mx-auto mb-2 opacity-30" />
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
                  <div className="text-center py-12 text-gray-400">
                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No calls scheduled for today</p>
                  </div>
                ) : (
                  data.todaysCalls.map(activity => (
                    <div key={activity.id} className="bg-white rounded-xl p-4 shadow-sm border">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">{activity.contact.name}</p>
                          <p className="text-sm text-gray-500">{activity.contact.phone}</p>
                          {activity.contact.topic && (
                            <div className="mt-2 bg-blue-50 rounded-lg p-2">
                              <p className="text-xs font-medium text-blue-700">Topic:</p>
                              <p className="text-xs text-blue-600">{activity.contact.topic}</p>
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
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
                  <div className="text-center py-12 text-gray-400">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No follow-ups due</p>
                  </div>
                ) : (
                  data.followUps.map(activity => (
                    <div key={activity.id} className={`bg-white rounded-xl p-4 shadow-sm border ${
                      activity.status === 'overdue' ? 'border-red-200 bg-red-50' : ''
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{activity.contact.name}</p>
                            {activity.status === 'overdue' && (
                              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Overdue</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{activity.contact.phone}</p>
                          <p className="text-xs text-gray-400 mt-1">Due: {new Date(activity.dueDate).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={() => handleCall(activity.contact.id)}
                          className="ml-3 flex items-center gap-1 bg-blue-500 text-white px-3 py-2 rounded-xl text-sm font-medium min-h-[44px] hover:bg-blue-600"
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
