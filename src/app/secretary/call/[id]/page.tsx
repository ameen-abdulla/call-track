'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, ArrowLeft, ChevronDown } from 'lucide-react'

interface Contact {
  id: string
  name: string
  phone: string
  company: string | null
  topic: string | null
  calls: CallRecord[]
}

interface CallRecord {
  id: string
  callTime: string
  outcome: string
  interestLevel: string | null
  feedbackNotes: string | null
  agent: { name: string }
}

const OUTCOMES = [
  { value: 'connected', label: 'Connected', color: 'bg-green-950 text-green-300 border-green-700' },
  { value: 'no_answer', label: 'No Answer', color: 'bg-gray-800 text-gray-200 border-gray-600' },
  { value: 'busy', label: 'Busy', color: 'bg-yellow-950 text-yellow-300 border-yellow-700' },
  { value: 'wrong_number', label: 'Wrong Number', color: 'bg-red-950 text-red-300 border-red-700' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-red-950 text-red-300 border-red-700' },
  { value: 'callback_requested', label: 'Callback Requested', color: 'bg-blue-950 text-blue-300 border-blue-700' },
]

const INTEREST_LEVELS = [
  { value: 'hot', label: '🔥 Hot', color: 'bg-red-950 text-red-300 border-red-700' },
  { value: 'warm', label: '☀️ Warm', color: 'bg-orange-950 text-orange-300 border-orange-700' },
  { value: 'cold', label: '🧊 Cold', color: 'bg-blue-950 text-blue-300 border-blue-700' },
]

function defaultNextDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  d.setHours(10, 0, 0, 0)
  return d.toISOString().slice(0, 16)
}

export default function CallFeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [outcome, setOutcome] = useState('')
  const [interestLevel, setInterestLevel] = useState('')
  const [feedbackNotes, setFeedbackNotes] = useState('')
  const [activityType, setActivityType] = useState('call')
  const [nextDate, setNextDate] = useState(defaultNextDate())
  const [saved, setSaved] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    let ignore = false
    async function loadContact() {
      try {
        const res = await fetch(`/api/contacts/${id}`)
        if (res.ok && !ignore) {
          const data = await res.json()
          setContact(data)
        }
      } catch {
        // ignore
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadContact()
    return () => {
      ignore = true
    }
  }, [id])

  async function handleSave() {
    if (!outcome) return
    setSaving(true)
    const body: Record<string, unknown> = {
      contactId: id,
      outcome,
      interestLevel: outcome === 'connected' ? interestLevel : null,
      feedbackNotes: outcome === 'connected' ? feedbackNotes : null,
      nextActivity: { type: activityType, dueDate: nextDate },
    }
    const res = await fetch('/api/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => router.push('/secretary'), 1200)
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>
  if (!contact) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Contact not found</div>

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white truncate">{contact.name}</h1>
            {contact.company && <p className="text-xs text-gray-400">{contact.company}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-24">
        {/* Contact card */}
        <div className="bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-800">
          <a
            href={`tel:${contact.phone}`}
            className="flex items-center gap-3 bg-green-500 text-white px-4 py-3 rounded-xl font-semibold min-h-[52px] hover:bg-green-600 transition-colors w-full justify-center"
          >
            <Phone className="w-5 h-5" />
            Call {contact.phone}
          </a>

          {contact.topic && (
            <div className="mt-3 bg-blue-950 border border-blue-800 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Topic to discuss</p>
              <p className="text-sm text-blue-300 mt-1">{contact.topic}</p>
            </div>
          )}
        </div>

        {/* Outcome */}
        <div className="bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-800">
          <h2 className="font-semibold text-white mb-3">Call Outcome *</h2>
          <div className="grid grid-cols-2 gap-2">
            {OUTCOMES.map(o => (
              <button
                key={o.value}
                onClick={() => setOutcome(o.value)}
                className={`py-3 px-3 rounded-xl border text-sm font-medium min-h-[44px] transition-all ${
                  outcome === o.value ? o.color + ' ring-2 ring-blue-500' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-750'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback (only if connected) */}
        {outcome === 'connected' && (
          <div className="bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-800">
            <h2 className="font-semibold text-white mb-3">Feedback</h2>
            <div className="mb-3">
              <p className="text-sm text-gray-400 mb-2">Interest Level</p>
              <div className="flex gap-2">
                {INTEREST_LEVELS.map(l => (
                  <button
                    key={l.value}
                    onClick={() => setInterestLevel(l.value)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium min-h-[44px] transition-all ${
                      interestLevel === l.value ? l.color + ' ring-2 ring-blue-500' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-750'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">Notes</p>
              <textarea
                value={feedbackNotes}
                onChange={e => setFeedbackNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                placeholder="What did they say? Any important details..."
              />
            </div>
          </div>
        )}

        {/* Next Activity */}
        <div className="bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-800">
          <h2 className="font-semibold text-white mb-3">Schedule Next Activity</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400 mb-2">Type</p>
              <div className="flex gap-2">
                {['call', 'email', 'meeting'].map(t => (
                  <button
                    key={t}
                    onClick={() => setActivityType(t)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium min-h-[44px] capitalize transition-all ${
                      activityType === t ? 'bg-blue-950 text-blue-300 border-blue-700 ring-1 ring-blue-500' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-750'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">Date & Time</p>
              <input
                type="datetime-local"
                value={nextDate}
                onChange={e => setNextDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[44px] [color-scheme:dark]"
              />
            </div>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!outcome || saving || saved}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold text-base min-h-[52px] hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saved ? '✅ Saved! Returning...' : saving ? 'Saving...' : 'Save Call Record'}
        </button>

        {/* Call History */}
        {contact.calls && contact.calls.length > 0 && (
          <div className="bg-gray-900 rounded-2xl shadow-sm border border-gray-800 overflow-hidden">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-300 hover:bg-gray-800 min-h-[44px] transition-colors"
            >
              Call History ({contact.calls.length})
              <ChevronDown className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </button>
            {showHistory && (
              <div className="divide-y divide-gray-800">
                {contact.calls.map(call => (
                  <div key={call.id} className="px-4 py-3 bg-gray-800/40">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white capitalize">{call.outcome.replace('_', ' ')}</span>
                      <span className="text-xs text-gray-400">{new Date(call.callTime).toLocaleDateString()}</span>
                    </div>
                    {call.interestLevel && <span className="text-xs text-orange-400 capitalize">{call.interestLevel} interest</span>}
                    {call.feedbackNotes && <p className="text-xs text-gray-300 mt-1">{call.feedbackNotes}</p>}
                    <p className="text-xs text-gray-500 mt-0.5">by {call.agent.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
