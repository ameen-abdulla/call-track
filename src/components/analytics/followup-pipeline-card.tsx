'use client'

import { Calendar, Clock, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react'

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
      label: 'Overdue',
      count: data.overdue,
      subtext: 'Immediate action needed',
      variant: 'danger',
      icon: AlertTriangle,
    },
    {
      key: 'dueToday',
      label: 'Due Today',
      count: data.dueToday,
      subtext: 'Scheduled for today',
      variant: 'warning',
      icon: Clock,
    },
    {
      key: 'next7Days',
      label: 'Next 7 Days',
      count: data.next7Days,
      subtext: 'This week',
      variant: 'accent',
      icon: Calendar,
    },
    {
      key: 'days8to30',
      label: '8 – 30 Days',
      count: data.days8to30,
      subtext: 'This month',
      variant: 'neutral',
      icon: Calendar,
    },
    {
      key: 'days31Plus',
      label: '31+ Days',
      count: data.days31Plus,
      subtext: 'Longer term',
      variant: 'neutral',
      icon: Calendar,
    },
    {
      key: 'noFollowup',
      label: 'No Follow-up',
      count: data.noFollowup,
      subtext: 'Unscheduled prospects',
      variant: 'muted',
      icon: CheckCircle,
    },
  ]

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-card)] space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Follow-up Pipeline Horizon</h3>
          <p className="text-[11px] text-[var(--text-secondary)]">Urgency breakdown of scheduled caller activities</p>
        </div>
        {data.overdue > 0 && (
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-1 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            {data.overdue} Overdue
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {buckets.map(b => {
          let cardStyle = 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-primary)]'
          let countColor = 'text-[var(--text-primary)]'
          let iconColor = 'text-[var(--text-secondary)]'

          if (b.variant === 'danger') {
            cardStyle = b.count > 0
              ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 ring-1 ring-red-500/30'
              : 'bg-[var(--bg)] border-[var(--border)]'
            countColor = b.count > 0 ? 'text-red-600 dark:text-red-400 font-extrabold' : 'text-[var(--text-muted)]'
            iconColor = b.count > 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-muted)]'
          } else if (b.variant === 'warning') {
            cardStyle = b.count > 0 ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300' : 'bg-[var(--bg)] border-[var(--border)]'
            countColor = b.count > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-[var(--text-muted)]'
            iconColor = b.count > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--text-muted)]'
          } else if (b.variant === 'accent') {
            cardStyle = 'bg-[var(--accent)]/5 border-[var(--accent)]/20'
            countColor = 'text-[var(--accent)] font-bold'
            iconColor = 'text-[var(--accent)]'
          }

          const Icon = b.icon

          return (
            <button
              key={b.key}
              type="button"
              onClick={() => onSelectBucket?.(b.key)}
              className={`p-3 rounded-[var(--radius-sm)] border text-left flex flex-col justify-between transition-all hover:border-[var(--accent)] ${cardStyle} group`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-[11px] font-semibold">{b.label}</span>
                <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
              </div>
              <div className={`text-xl font-mono ${countColor}`}>
                {b.count.toLocaleString()}
              </div>
              <span className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">
                {b.subtext}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
