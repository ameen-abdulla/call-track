'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, ArrowLeft, ChevronDown, CheckCircle2, AlertCircle, Info, Sparkles, ShieldCheck, ShieldAlert, Mail, Users } from 'lucide-react'
import { FEEDBACK_OPTIONS, FeedbackOption, INTEREST_AREAS } from '@/lib/feedback-constants'

interface Contact {
  id: string
  name: string
  phone: string
  phone2?: string | null
  callPriority?: string | null
  company: string | null
  topic: string | null
  tags?: { tag: { id: string; name: string } }[]
  calls?: CallRecord[]
  interactions?: InteractionRecord[]
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

interface InteractionRecord {
  id: string
  type: string
  connected: boolean | null
  response: string | null
  interestArea: string | null
  notes: string | null
  occurredAt: string
  freelancer: { name: string }
}

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
  const [saved, setSaved] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Verification state
  const [verifiedAttempt, setVerifiedAttempt] = useState<{ id: string; triggeredAt: string } | null>(null)
  const [checkingVerification, setCheckingVerification] = useState(true)

  // Interaction Form state
  const [interactionType, setInteractionType] = useState<'CALL' | 'EMAIL' | 'MEETING'>('CALL')
  const [isConnected, setIsConnected] = useState<boolean>(true)
  const [selectedResponse, setSelectedResponse] = useState<string>('')
  const [selectedInterestArea, setSelectedInterestArea] = useState<string>('')
  const [feedbackNotes, setFeedbackNotes] = useState('')
  const [scheduleNext, setScheduleNext] = useState(true)
  const [activityType, setActivityType] = useState('call')
  const [nextDate, setNextDate] = useState(defaultNextDate())

  const currentOption = FEEDBACK_OPTIONS.find(o => o.value === selectedResponse)

  // Load contact and check call attempt verification
  useEffect(() => {
    let ignore = false
    async function loadData() {
      try {
        const [contactRes, attemptRes] = await Promise.all([
          fetch(`/api/contacts/${id}`),
          fetch(`/api/call-attempts?contactId=${id}`),
        ])

        if (contactRes.ok && !ignore) {
          const contactData = await contactRes.json()
          setContact(contactData)
        }

        if (attemptRes.ok && !ignore) {
          const attemptData = await attemptRes.json()
          if (attemptData.verified && attemptData.callAttempt) {
            setVerifiedAttempt(attemptData.callAttempt)
          }
        }
      } catch (err) {
        console.error('Error loading contact or attempt data:', err)
      } finally {
        if (!ignore) {
          setLoading(false)
          setCheckingVerification(false)
        }
      }
    }

    loadData()
    return () => {
      ignore = true
    }
  }, [id])

  // Handle tap-to-call click and record CallAttempt
  const handleCallTap = (phoneToCall: string) => {
    try {
      const payload = JSON.stringify({ contactId: id })
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/api/call-attempts', blob)
      } else {
        fetch('/api/call-attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {})
      }
      // Optimistically mark as verified
      setVerifiedAttempt({ id: 'just-tapped', triggeredAt: new Date().toISOString() })
    } catch {
      // Fallback non-blocking
    }
  }

  const handleResponseChange = (value: string) => {
    setSelectedResponse(value)
    const opt = FEEDBACK_OPTIONS.find(o => o.value === value)
    if (opt) {
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
    setSaving(true)
    try {
      const body = {
        contactId: id,
        type: interactionType,
        connected: interactionType === 'CALL' ? isConnected : null,
        callAttemptId: interactionType === 'CALL' && verifiedAttempt && verifiedAttempt.id !== 'just-tapped' ? verifiedAttempt.id : null,
        response: (interactionType === 'CALL' && !isConnected) ? 'No Answer / Unreachable' : selectedResponse || null,
        interestArea: selectedInterestArea || null,
        notes: feedbackNotes || null,
        nextActivityRequired: scheduleNext,
        nextActivityDate: scheduleNext ? nextDate : null,
        nextActivity: scheduleNext ? activityType : null,
      }

      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => router.push('/freelancer'), 1200)
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to save interaction')
      }
    } catch (e) {
      alert('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center text-gray-500">Loading contact details...</div>
  if (!contact) return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center text-gray-500">Contact not found</div>

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      {/* Top Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push('/freelancer')}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="font-bold text-gray-900 dark:text-white text-base truncate">{contact.name}</h1>
              {contact.callPriority && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  Priority {contact.callPriority}
                </span>
              )}
            </div>
            {contact.company && <p className="text-xs text-gray-500 dark:text-gray-400">{contact.company}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-24">
        {/* Contact info card with click-to-call buttons */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-800 space-y-3">
          <div className="flex flex-col gap-2">
            <a
              href={`tel:${contact.phone}`}
              onClick={() => handleCallTap(contact.phone)}
              className="flex items-center justify-center gap-2.5 bg-green-600 hover:bg-green-700 text-white px-4 py-3.5 rounded-xl font-semibold min-h-[50px] transition-all shadow-md shadow-green-600/20"
            >
              <Phone className="w-5 h-5" />
              <span>Call Primary: {contact.phone}</span>
            </a>

            {contact.phone2 && (
              <a
                href={`tel:${contact.phone2}`}
                onClick={() => handleCallTap(contact.phone2!)}
                className="flex items-center justify-center gap-2.5 bg-teal-600 hover:bg-teal-700 text-white px-4 py-3.5 rounded-xl font-semibold min-h-[50px] transition-all shadow-md shadow-teal-600/20"
              >
                <Phone className="w-5 h-5" />
                <span>Call Mobile/WhatsApp: {contact.phone2}</span>
              </a>
            )}
          </div>

          {/* Verification Badge */}
          {interactionType === 'CALL' && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              {verifiedAttempt ? (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-xs">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-green-600 dark:text-green-400" />
                  <div>
                    <span className="font-semibold">Call Verified</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-1">
                      (Tapped call button at {new Date(verifiedAttempt.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="font-semibold">Unverified Call</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-1">
                      (No recent call tap detected. You can still log your notes.)
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {contact.tags && contact.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap pt-1">
              {contact.tags.map(t => (
                <span key={t.tag.id} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                  {t.tag.name}
                </span>
              ))}
            </div>
          )}

          {contact.topic && (
            <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Topic to discuss</p>
              <p className="text-sm text-blue-900 dark:text-blue-200 mt-0.5">{contact.topic}</p>
            </div>
          )}
        </div>

        {/* Interaction Type Selection Tabs */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-1.5 shadow-sm border border-gray-200 dark:border-gray-800 grid grid-cols-3 gap-1">
          {[
            { key: 'CALL', label: 'Call Log', icon: Phone },
            { key: 'EMAIL', label: 'Email Sent', icon: Mail },
            { key: 'MEETING', label: 'Meeting / Demo', icon: Users },
          ].map(tab => {
            const Icon = tab.icon
            const active = interactionType === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setInteractionType(tab.key as typeof interactionType)}
                className={`py-2.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Call Specific: Connected or Unanswered Switch */}
        {interactionType === 'CALL' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-800 space-y-2.5">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Did the prospect answer? *</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsConnected(true)}
                className={`py-3 px-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  isConnected
                    ? 'bg-green-50 dark:bg-green-950/60 border-green-500 text-green-700 dark:text-green-300 ring-2 ring-green-500'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>Yes — Connected</span>
              </button>

              <button
                type="button"
                onClick={() => setIsConnected(false)}
                className={`py-3 px-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  !isConnected
                    ? 'bg-red-50 dark:bg-red-950/60 border-red-500 text-red-700 dark:text-red-300 ring-2 ring-red-500'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                }`}
              >
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>No Answer / Busy</span>
              </button>
            </div>
          </div>
        )}

        {/* Structured Feedback & Interest Area (if connected or email/meeting) */}
        {(interactionType !== 'CALL' || isConnected) && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-800 space-y-4">
            {/* Standard Response Lookup */}
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Response Lookup *</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Select the standardized outcome for this prospect:</p>
              <select
                value={selectedResponse}
                onChange={e => handleResponseChange(e.target.value)}
                className="w-full px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
              >
                <option value="">-- Select prospect response --</option>
                {FEEDBACK_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Smart Helper Card */}
            {currentOption && (
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wide">Context: </span>
                    <span className="text-gray-700 dark:text-gray-300">{currentOption.description}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t border-blue-200/60 dark:border-blue-900/60">
                  <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide">Recommended Action: </span>
                    <span className="text-gray-800 dark:text-gray-200">{currentOption.recommendedNextAction}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Interest Area Selection */}
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Interest Area (optional)</h2>
              <select
                value={selectedInterestArea}
                onChange={e => setSelectedInterestArea(e.target.value)}
                className="w-full px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
              >
                <option value="">-- Select product interest area --</option>
                {INTEREST_AREAS.map(area => (
                  <option key={area.value} value={area.value}>
                    {area.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Interaction Notes</h2>
              <textarea
                value={feedbackNotes}
                onChange={e => setFeedbackNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                placeholder="What was discussed? Fleet size, current provider, decision maker details..."
              />
            </div>
          </div>
        )}

        {/* Next Activity Scheduler */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Next Follow-up Activity</h2>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={scheduleNext}
                onChange={e => setScheduleNext(e.target.checked)}
                className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500"
              />
              <span>Schedule follow-up</span>
            </label>
          </div>

          {scheduleNext && (
            <div className="space-y-3 pt-1">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Activity Type</p>
                <div className="flex gap-2">
                  {['call', 'email', 'meeting'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActivityType(t)}
                      className={`flex-1 py-2 rounded-xl border text-xs font-semibold capitalize transition-all ${
                        activityType === t
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-500 ring-1 ring-blue-500'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Due Date & Time</p>
                <input
                  type="datetime-local"
                  value={nextDate}
                  onChange={e => setNextDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[44px]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || saved || (interactionType === 'CALL' && isConnected && !selectedResponse)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-semibold text-base min-h-[52px] disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20"
        >
          {saved ? '✅ Saved! Returning to Queue...' : saving ? 'Saving Interaction Record...' : 'Save Interaction Record'}
        </button>

        {/* Past Interaction & Call History */}
        {((contact.interactions && contact.interactions.length > 0) || (contact.calls && contact.calls.length > 0)) && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full px-4 py-3.5 flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 min-h-[44px] transition-colors"
            >
              <span>Interaction History ({contact.interactions?.length || contact.calls?.length || 0})</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </button>

            {showHistory && (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {(contact.interactions || []).map(item => (
                  <div key={item.id} className="px-4 py-3 bg-gray-50/50 dark:bg-gray-800/30 space-y-1 text-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-gray-900 dark:text-white capitalize">
                        {item.type} {item.connected !== null ? (item.connected ? '— Connected' : '— No Answer') : ''}
                      </span>
                      <span className="text-gray-400">{new Date(item.occurredAt).toLocaleDateString()}</span>
                    </div>

                    {item.response && (
                      <span className="inline-block px-2 py-0.5 rounded-full font-medium bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {item.response}
                      </span>
                    )}

                    {item.interestArea && (
                      <p className="text-purple-600 dark:text-purple-300">📦 {item.interestArea}</p>
                    )}

                    {item.notes && <p className="text-gray-600 dark:text-gray-300 mt-1">{item.notes}</p>}
                    <p className="text-[11px] text-gray-400 pt-0.5">by {item.freelancer?.name || 'Caller'}</p>
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
