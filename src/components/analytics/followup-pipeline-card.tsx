'use client'

import { Clock, AlertTriangle, Calendar, CalendarDays, CheckCircle2, ShieldQuestion } from 'lucide-react'

interface FollowupPipelineData {
  overdue: number
  dueToday: number
  next7Days: number
  days8to30: number
  days31Plus: number
  noFollowup: number
}

interface FollowupPipelineProps {
  data: FollowupPipelineData
  onSelectBucket?: (bucket: string) => void
}

export function FollowupPipelineCard({ data, onSelectBucket }: FollowupPipelineProps) {
  const buckets = [
    {
      key: 'overdue',
      label: 'Overdue Follow-ups',
      count: data.overdue,
      icon: AlertTriangle,
      bg: 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
      badgeBg: 'bg-red-600 text-white',
      urgent: true,
    },
    {
      key: 'dueToday',
      label: 'Due Today',
      count: data.dueToday,
      icon: Clock,
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
      badgeBg: 'bg-amber-500 text-white',
      urgent: false,
    },
    {
      key: 'next7Days',
      label: 'Next 7 Days',
      count: data.next7Days,
      icon: Calendar,
      bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
      badgeBg: 'bg-blue-600 text-white',
      urgent: false,
    },
    {
      key: 'days8to30',
      label: '8 – 30 Days',
      count: data.days8to30,
      icon: CalendarDays,
      bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300',
      badgeBg: 'bg-indigo-600 text-white',
      urgent: false,
    },
    {
      key: 'days31Plus',
      label: '31+ Days',
      count: data.days31Plus,
      icon: CheckCircle2,
      bg: 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300',
      badgeBg: 'bg-gray-600 text-white',
      urgent: false,
    },
    {
      key: 'noFollowup',
      label: 'No Follow-up Scheduled',
      count: data.noFollowup,
      icon: ShieldQuestion,
      bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
      badgeBg: 'bg-purple-600 text-white',
      urgent: false,
    },
  ]

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-base">Follow-up Pipeline</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Scheduled callback and follow-up activities by due horizon</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {buckets.map(b => {
          const Icon = b.icon
          return (
            <div
              key={b.key}
              onClick={() => onSelectBucket?.(b.key)}
              className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-transform hover:scale-[1.02] ${b.bg}`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-4 h-4" />
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${b.badgeBg}`}>
                  {b.count}
                </span>
              </div>
              <p className="text-xs font-semibold leading-tight">{b.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
