'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, ArrowLeft, ChevronDown, CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react'
import { FEEDBACK_OPTIONS, FeedbackOption } from '@/lib/feedback-constants'

interface Contact {
  id: string
  name: string
  phone: string
  phone2?: string | null
  callPriority?: string | null
  company: string | null
  topic: string | null
  tags?: { tag: { id: string; name: string } }[]
  calls: CallRecord[]
}

interface CallRecord {
  id: string
  callTime: string
  outcome: string
  responseLookup?: string | null
  recommendedAction?: string | null
  interestLevel: string | null
  feedbackNotes: string | null
  agent: { name: string }
}

const OUTCOMES = [
  { value: 'connected', label: 'Connected', color: 'bg-green-950 text-green-300 border-green-700' },
  { value: 'no_answer', label: 'No Answer', color: 'bg-gray-800 text-gray-200 border-gray-600' },
  { value: 'busy', label: 'Busy', color: 'bg-yellow-950 text-yellow-300 border-yellow-700' },
  { value: 'wrong_number', label: 'Wrong Number', color: 'bg-red-950 text-red-300 border-red-700' },
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

export default function FreelancerCallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [outcome, setOutcome] = useState('connected')
  const [selectedResponse, setSelectedResponse] = useState<string>('')
  const [interestLevel, setInterestLevel] = useState('warm')
  const [feedbackNotes, setFeedbackNotes] = useState('')
  const [scheduleNext, setScheduleNext] = useState(true)
  const [activityType, setActivityType] = useState('call')
  const [nextDate, setNextDate] = useState(defaultNextDate())
  const [saved, setSaved] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const currentOption = FEEDBACK_OPTIONS.find(o => o.value === selectedResponse)

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

  const handleResponseChange = (value: string) => {
    setSelectedResponse(value)
    const opt = FEEDBACK_OPTIONS.find(o => o.value === value)
    if (opt) {
      if (opt.category === 'hot') setInterestLevel('hot')
      else if (opt.category === 'cold') setInterestLevel('cold')
      else if (opt.category === 'warm') setInterestLevel('warm')

      if (opt.nextActivityRequired === false) {
        setScheduleNext(false)
      } else {
        setScheduleNext(true)
        if (value.toLowerCase().includes('demo')) {
          setActivityType('meeting')
        } else if (value.toLowerCase().includes('email')) {
          setActivityType('email')
        } else {
          setActivityType('call')
        }
      }
    }
  }

  async function handleSave() {
    if (!outcome) return
    setSaving(true)
    const body: Record<string, unknown> = {
      contactId: id,
      outcome,
      responseLookup: outcome === 'connected' ? selectedResponse || null : null,
      recommendedAction: currentOption?.recommendedNextAction || null,
      interestLevel: outcome === 'connected' ? interestLevel : null,
      feedbackNotes: outcome === 'connected' ? feedbackNotes : null,
      nextActivity: scheduleNext ? { type: activityType, dueDate: nextDate } : null,
    }
    const res = await fetch('/api/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => router.push('/freelancer'), 1200)
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>
  if (!contact) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Contact not found</div>

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push('/freelancer')} className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="font-bold text-white truncate">{contact.name}</h1>
              {contact.callPriority && (
                <span className="text-xs font-bold text-blue-400 ml-1">Priority {contact.callPriority}</span>
              )}
            </div>
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

          {/* Second number button (WhatsApp/Mobile) */}
          {contact.phone2 && (
            <a
              href={`tel:${contact.phone2}`}
              className="flex items-center gap-3 bg-teal-600 text-white px-4 py-3 rounded-xl font-semibold min-h-[52px] hover:bg-teal-700 transition-colors w-full justify-center mt-2"
            >
              <Phone className="w-5 h-5" />
              Mobile: {contact.phone2}
            </a>
          )}

          {contact.tags && contact.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-2">
              {contact.tags.map(t => (
                <span key={t.tag.id} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{t.tag.name}</span>
              ))}
            </div>
          )}

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

        {/* Structured Feedback (if connected) */}
        {outcome === 'connected' && (
          <div className="bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-800 space-y-4">
            <div>
              <h2 className="font-semibold text-white mb-1">Feedback Response *</h2>
              <p className="text-xs text-gray-400 mb-3">Select the prospect response category from the standard lookup:</p>
              
              <select
                value={selectedResponse}
                onChange={e => handleResponseChange(e.target.value)}
                className="w-full px-3 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
              >
                <option value="">-- Choose prospect response --</option>
                {FEEDBACK_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Smart Helper Card based on response */}
            {currentOption && (
              <div className="bg-blue-950/40 border border-blue-800/80 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide">Response Description</p>
                    <p className="text-xs text-gray-300 mt-0.5">{currentOption.description}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t border-blue-900/60">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide">Recommended Next Action</p>
                    <p className="text-xs text-gray-200 mt-0.5">{currentOption.recommendedNextAction}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-gray-400">
                  <span>Next Activity Required:</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded ${currentOption.nextActivityRequired ? 'bg-green-950 text-green-300 border border-green-800' : 'bg-gray-800 text-gray-400'}`}>
                    {currentOption.nextActivityRequired ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            )}

            {/* Interest Level */}
            <div>
              <p className="text-sm text-gray-400 mb-2">Interest Level</p>
              <div className="flex gap-2">
                {INTEREST_LEVELS.map(l => (
                  <button
                    key={l.value}
                    type="button"
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

            {/* Notes */}
            <div>
              <p className="text-sm text-gray-400 mb-2">Detailed Notes & Context</p>
              <textarea
                value={feedbackNotes}
                onChange={e => setFeedbackNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                placeholder="What did they say? Fleet size, current provider, decision maker details, etc..."
              />
            </div>
          </div>
        )}

        {/* Next Activity Scheduler */}
        <div className="bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white">Next Activity</h2>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
              <input
                type="checkbox"
                checked={scheduleNext}
                onChange={e => setScheduleNext(e.target.checked)}
                className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-blue-500"
              />
              Schedule follow-up
            </label>
          </div>

          {scheduleNext && (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400 mb-2">Activity Type</p>
                <div className="flex gap-2">
                  {['call', 'email', 'meeting'].map(t => (
                    <button
                      key={t}
                      type="button"
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
          )}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!outcome || (outcome === 'connected' && !selectedResponse) || saving || saved}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold text-base min-h-[52px] hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-950"
        >
          {saved ? '✅ Saved! Returning...' : saving ? 'Saving Call Record...' : 'Save Call Record'}
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
                  <div key={call.id} className="px-4 py-3 bg-gray-800/40 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="text-sm font-medium text-white capitalize">{call.outcome.replace('_', ' ')}</span>
                      <span className="text-xs text-gray-400">{new Date(call.callTime).toLocaleDateString()}</span>
                    </div>
                    {call.responseLookup && (
                      <div className="mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-950 text-blue-300 border border-blue-800">
                          {call.responseLookup}
                        </span>
                      </div>
                    )}
                    {call.recommendedAction && (
                      <p className="text-xs text-amber-300/90 mt-1">💡 Action: {call.recommendedAction}</p>
                    )}
                    {call.interestLevel && <span className="text-xs text-orange-400 capitalize block">{call.interestLevel} interest</span>}
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
