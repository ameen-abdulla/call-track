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
  { value: 'connected', label: 'Connected', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'no_answer', label: 'No Answer', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { value: 'busy', label: 'Busy', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'wrong_number', label: 'Wrong Number', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'callback_requested', label: 'Callback Requested', color: 'bg-blue-100 text-blue-700 border-blue-200' },
]

const INTEREST_LEVELS = [
  { value: 'hot', label: '🔥 Hot', color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'warm', label: '☀️ Warm', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'cold', label: '🧊 Cold', color: 'bg-blue-50 text-blue-700 border-blue-200' },
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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>
  if (!contact) return <div className="min-h-screen flex items-center justify-center text-gray-400">Contact not found</div>

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 truncate">{contact.name}</h1>
            {contact.company && <p className="text-xs text-gray-400">{contact.company}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-24">
        {/* Contact card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border">
          <a
            href={`tel:${contact.phone}`}
            className="flex items-center gap-3 bg-green-500 text-white px-4 py-3 rounded-xl font-semibold min-h-[52px] hover:bg-green-600 transition-colors w-full justify-center"
          >
            <Phone className="w-5 h-5" />
            Call {contact.phone}
          </a>

          {contact.topic && (
            <div className="mt-3 bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Topic to discuss</p>
              <p className="text-sm text-blue-800 mt-1">{contact.topic}</p>
            </div>
          )}
        </div>

        {/* Outcome */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border">
          <h2 className="font-semibold text-gray-900 mb-3">Call Outcome *</h2>
          <div className="grid grid-cols-2 gap-2">
            {OUTCOMES.map(o => (
              <button
                key={o.value}
                onClick={() => setOutcome(o.value)}
                className={`py-3 px-3 rounded-xl border text-sm font-medium min-h-[44px] transition-all ${
                  outcome === o.value ? o.color + ' ring-2 ring-offset-1 ring-blue-400' : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback (only if connected) */}
        {outcome === 'connected' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border">
            <h2 className="font-semibold text-gray-900 mb-3">Feedback</h2>
            <div className="mb-3">
              <p className="text-sm text-gray-600 mb-2">Interest Level</p>
              <div className="flex gap-2">
                {INTEREST_LEVELS.map(l => (
                  <button
                    key={l.value}
                    onClick={() => setInterestLevel(l.value)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium min-h-[44px] transition-all ${
                      interestLevel === l.value ? l.color + ' ring-2 ring-offset-1 ring-blue-400' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Notes</p>
              <textarea
                value={feedbackNotes}
                onChange={e => setFeedbackNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                placeholder="What did they say? Any important details..."
              />
            </div>
          </div>
        )}

        {/* Next Activity */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border">
          <h2 className="font-semibold text-gray-900 mb-3">Schedule Next Activity</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 mb-2">Type</p>
              <div className="flex gap-2">
                {['call', 'email', 'meeting'].map(t => (
                  <button
                    key={t}
                    onClick={() => setActivityType(t)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium min-h-[44px] capitalize transition-all ${
                      activityType === t ? 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-300' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Date & Time</p>
              <input
                type="datetime-local"
                value={nextDate}
                onChange={e => setNextDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[44px]"
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
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-700 min-h-[44px]"
            >
              Call History ({contact.calls.length})
              <ChevronDown className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </button>
            {showHistory && (
              <div className="divide-y">
                {contact.calls.map(call => (
                  <div key={call.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{call.outcome.replace('_', ' ')}</span>
                      <span className="text-xs text-gray-400">{new Date(call.callTime).toLocaleDateString()}</span>
                    </div>
                    {call.interestLevel && <span className="text-xs text-orange-600 capitalize">{call.interestLevel} interest</span>}
                    {call.feedbackNotes && <p className="text-xs text-gray-500 mt-1">{call.feedbackNotes}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">by {call.agent.name}</p>
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
