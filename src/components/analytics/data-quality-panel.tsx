'use client'

import { AlertCircle, CheckCircle2, ShieldAlert, FileQuestion, PhoneOff, Mail } from 'lucide-react'

interface DataQualityData {
  neverCalledCount: number
  noResponseCount: number
  missingPhoneOrEmail: number
  unverifiedCallLogs: number
}

interface DataQualityProps {
  data: DataQualityData
}

export function DataQualityPanel({ data }: DataQualityProps) {
  const items = [
    {
      title: 'Uncontacted Leads',
      description: 'Prospects with 0 logged interactions',
      count: data.neverCalledCount,
      icon: PhoneOff,
      severity: data.neverCalledCount > 0 ? 'warning' : 'ok',
      actionHint: 'Assign to callers',
    },
    {
      title: 'Missing Response Outcome',
      description: 'Interactions logged without categorized outcome',
      count: data.noResponseCount,
      icon: FileQuestion,
      severity: data.noResponseCount > 0 ? 'warning' : 'ok',
      actionHint: 'Review with team',
    },
    {
      title: 'Missing Contact Details',
      description: 'Prospects missing either phone or email',
      count: data.missingPhoneOrEmail,
      icon: Mail,
      severity: data.missingPhoneOrEmail > 0 ? 'neutral' : 'ok',
      actionHint: 'Enrich lead data',
    },
    {
      title: 'Unverified Call Logs',
      description: 'Logged without mobile tap detection',
      count: data.unverifiedCallLogs,
      icon: ShieldAlert,
      severity: data.unverifiedCallLogs > 0 ? 'warning' : 'ok',
      actionHint: 'Audit tap tracking',
    },
  ]

  const totalIssues = data.neverCalledCount + data.noResponseCount + data.unverifiedCallLogs

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-card)] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-[var(--radius-sm)] bg-[var(--accent)]/10 text-[var(--accent)]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] text-sm">Data Hygiene & Health Checklist</h3>
            <p className="text-[11px] text-[var(--text-secondary)]">Actionable data quality gaps requiring administrative attention</p>
          </div>
        </div>

        <span className={`text-[11px] font-semibold font-mono px-2.5 py-1 rounded-[var(--radius-sm)] border ${
          totalIssues === 0
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
        }`}>
          {totalIssues === 0 ? '100% Pipeline Health' : `${totalIssues} Items to Review`}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {items.map(item => {
          const Icon = item.icon
          const hasIssues = item.count > 0

          let statusBg = 'bg-[var(--bg)] border-[var(--border)]'
          let countClass = 'text-[var(--text-secondary)]'

          if (item.severity === 'warning' && hasIssues) {
            statusBg = 'bg-amber-500/5 border-amber-500/20'
            countClass = 'text-amber-600 dark:text-amber-400 font-bold'
          } else if (item.severity === 'ok') {
            statusBg = 'bg-emerald-500/5 border-emerald-500/20'
            countClass = 'text-emerald-600 dark:text-emerald-400 font-bold'
          }

          return (
            <div
              key={item.title}
              className={`p-3 rounded-[var(--radius-sm)] border ${statusBg} flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-semibold text-[var(--text-primary)] truncate">{item.title}</span>
                  <Icon className={`w-3.5 h-3.5 ${hasIssues ? 'text-amber-500' : 'text-emerald-500'} shrink-0`} />
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)]">{item.actionHint}</span>
                <span className={`text-base font-mono ${countClass}`}>
                  {item.count}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
