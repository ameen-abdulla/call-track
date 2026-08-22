'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, Clock, AlertCircle, Plus, Pencil } from 'lucide-react'
import { NotificationBell } from '@/components/notification-bell'
import { ThemeToggle } from '@/components/theme-toggle'
import { signOut, useSession } from 'next-auth/react'

interface Contact {
  id: string
  name: string
  phone: string
  phone2?: string | null
  topic: string | null
  status: string
  company: string | null
  callPriority?: string | null
  tags?: { tag: { id: string; name: string } }[]
  assignedToId?: string | null
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
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-gray-900 dark:text-white truncate">{contact.name}</p>
            {contact.callPriority && (
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 ml-1">Priority {contact.callPriority}</span>
            )}
          </div>
          {contact.company && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{contact.company}</p>}
          {contact.topic && (
            <div className="mt-2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl p-2.5">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Topic to discuss:</p>
              <p className="text-xs text-blue-800 dark:text-blue-200 mt-0.5">{contact.topic}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => onCall(contact.id)}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold min-h-[44px] min-w-[75px] transition-colors shrink-0 shadow-md shadow-green-600/20"
        >
          <Phone className="w-4 h-4" />
          Call
        </button>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-2.5">
        <span>📞 {contact.phone}</span>
        {contact.phone2 && <span>📱 {contact.phone2}</span>}
      </div>
    </div>
  )
}

function ActivityCard({
  activity,
  onComplete,
  onCall,
}: {
  activity: Activity
  onComplete: (id: string) => void
  onCall: (contactId: string) => void
}) {
  const isOverdue = new Date(activity.dueDate) < new Date()

  return (
    <div
      className={`rounded-2xl p-4 shadow-sm border transition-colors ${
        isOverdue
          ? 'bg-red-50/60 dark:bg-gray-900 border-red-200 dark:border-red-900/80'
          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-gray-900 dark:text-white truncate">{activity.contact.name}</p>
            {activity.contact.callPriority && (
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 ml-1">Priority {activity.contact.callPriority}</span>
            )}
          </div>
          {activity.contact.company && <p className="text-xs text-gray-500 dark:text-gray-400">{activity.contact.company}</p>}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.contact.phone}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`} />
            <span className={`text-xs font-medium ${isOverdue ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
              {activity.activityType.toUpperCase()} — {new Date(activity.dueDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              {isOverdue && ' (OVERDUE)'}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            onClick={() => onCall(activity.contact.id)}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold min-h-[38px] transition-colors"
          >
            <Phone className="w-3.5 h-3.5" /> Call
          </button>
          <button
            onClick={() => onComplete(activity.id)}
            className="text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white px-2 py-1"
          >
            Done ✓
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FreelancerDashboard() {
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
      window.location.reload()
    }
  }

  useEffect(() => {
    let ignore = false
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/agent/dashboard')
        if (res.ok && !ignore) {
          const d = await res.json()
          setData(d)
        }
      } catch (err) {
        console.error('Error fetching freelancer dashboard:', err)
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
    router.push(`/freelancer/call/${contactId}`)
  }

  const handleComplete = async (activityId: string) => {
    await fetch(`/api/activities/${activityId}/complete`, { method: 'PUT' })
    if (data) {
      setData({
        ...data,
        todaysCalls: data.todaysCalls.filter(a => a.id !== activityId),
        followUps: data.followUps.filter(a => a.id !== activityId),
      })
    }
  }

  const topQueueItem = data?.queue?.[0]

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-gray-900 dark:text-white text-base">
                Good day, {session?.user?.name?.split(' ')[0]}
              </h1>
              <button
                onClick={() => { setNewName(session?.user?.name || ''); setShowEditName(true) }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400"
                title="Edit name"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signed-out' })}
              className="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 px-2 py-1 min-h-[36px] transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-lg mx-auto px-4 flex gap-0 border-t border-gray-200 dark:border-gray-800">
          {[
            { key: 'queue', label: 'My Leads', count: data?.queue?.length },
            { key: 'calls', label: "Today's Schedule", count: data?.todaysCalls?.length },
            { key: 'followups', label: 'Follow-ups', count: data?.followUps?.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-all min-h-[44px] ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
              {(tab.count ?? 0) > 0 && (
                <span className={`ml-1 text-[11px] rounded-full px-1.5 py-0.5 font-bold ${
                  tab.key === 'followups' && (data?.followUps?.some(f => f.status === 'overdue') ?? false)
                    ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 pb-24 space-y-3">
        {/* Next Contact Banner (if in queue) */}
        {activeTab === 'queue' && topQueueItem && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-5 text-white shadow-lg shadow-blue-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                Next Lead to Call
              </span>
              {topQueueItem.callPriority && (
                <span className="text-xs font-bold bg-white text-blue-700 px-2 py-0.5 rounded-full">
                  Priority {topQueueItem.callPriority}
                </span>
              )}
            </div>

            <h3 className="font-bold text-lg">{topQueueItem.name}</h3>
            {topQueueItem.company && <p className="text-xs text-blue-100">{topQueueItem.company}</p>}

            {topQueueItem.topic && (
              <p className="text-xs text-blue-100 mt-2 bg-black/20 p-2.5 rounded-xl line-clamp-2">
                📋 {topQueueItem.topic}
              </p>
            )}

            <button
              onClick={() => handleCall(topQueueItem.id)}
              className="mt-4 w-full bg-white hover:bg-gray-100 text-blue-600 font-bold py-3.5 rounded-2xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" />
              <span>Start Call Session</span>
            </button>
          </div>
        )}

        {/* Tab contents */}
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Loading queue...</div>
        ) : (
          <>
            {activeTab === 'queue' && (
              <div className="space-y-2.5">
                {data?.queue?.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 space-y-2">
                    <Phone className="w-10 h-10 mx-auto opacity-30" />
                    <p className="font-semibold text-gray-800 dark:text-gray-200">Your queue is clear</p>
                    <p className="text-xs text-gray-400">All assigned leads have been contacted.</p>
                  </div>
                ) : (
                  data?.queue?.map(contact => (
                    <ContactCard key={contact.id} contact={contact} onCall={handleCall} />
                  ))
                )}
              </div>
            )}

            {activeTab === 'calls' && (
              <div className="space-y-2.5">
                {data?.todaysCalls?.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8">
                    <p className="font-semibold text-gray-800 dark:text-gray-200">No calls scheduled for today</p>
                  </div>
                ) : (
                  data?.todaysCalls?.map(activity => (
                    <ActivityCard key={activity.id} activity={activity} onComplete={handleComplete} onCall={handleCall} />
                  ))
                )}
              </div>
            )}

            {activeTab === 'followups' && (
              <div className="space-y-2.5">
                {data?.followUps?.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8">
                    <p className="font-semibold text-gray-800 dark:text-gray-200">No overdue follow-ups</p>
                  </div>
                ) : (
                  data?.followUps?.map(activity => (
                    <ActivityCard key={activity.id} activity={activity} onComplete={handleComplete} onCall={handleCall} />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Name Modal */}
      {showEditName && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <h2 className="font-bold text-gray-900 dark:text-white text-base">Edit Display Name</h2>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your name"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowEditName(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={editName}
                disabled={savingName || !newName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-md shadow-blue-500/20"
              >
                {savingName ? 'Saving...' : 'Save Name'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
