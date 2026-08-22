'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface ResponseItem {
  name: string
  count: number
  group: string
}

interface ResponseAnalyticsProps {
  data: ResponseItem[]
}

const GROUP_COLORS: Record<string, string> = {
  'Positive Outcome': 'bg-emerald-500 text-white',
  'Follow-Up Required': 'bg-blue-500 text-white',
  'Objection': 'bg-amber-500 text-white',
  'Contact Issue': 'bg-slate-500 text-white',
  'Negative Outcome': 'bg-red-500 text-white',
  'Other': 'bg-gray-400 text-white',
}

export function ResponseAnalyticsChart({ data }: ResponseAnalyticsProps) {
  const [showAll, setShowAll] = useState(false)

  if (!data || data.length === 0) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-6 text-center text-[var(--text-muted)] text-xs">
        No response outcome data logged yet.
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => b.count - a.count)
  const maxCount = Math.max(...sorted.map(d => d.count), 1)
  const displayed = showAll ? sorted : sorted.slice(0, 6)

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-card)] space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Response & Outcome Taxonomy</h3>
          <p className="text-[11px] text-[var(--text-secondary)]">Standardized prospect outcomes grouped by category</p>
        </div>
        <span className="text-[11px] font-mono text-[var(--text-muted)]">
          {sorted.reduce((acc, curr) => acc + curr.count, 0)} Outcomes
        </span>
      </div>

      <div className="space-y-2 pt-1">
        {displayed.map(item => {
          const widthPercent = Math.max(12, Math.round((item.count / maxCount) * 100))
          const badgeColor = GROUP_COLORS[item.group] || 'bg-gray-500 text-white'

          return (
            <div key={item.name} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-medium text-[var(--text-primary)] truncate">{item.name}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] shrink-0 font-mono">
                    {item.group}
                  </span>
                </div>
                <span className="font-mono font-bold text-[var(--text-primary)] pl-2">{item.count}</span>
              </div>

              <div className="h-2 w-full bg-[var(--bg)] rounded-full overflow-hidden border border-[var(--border)]">
                <div
                  className={`h-full rounded-full ${badgeColor} transition-all duration-300`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          )
        })}

        {sorted.length > 6 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="w-full pt-2 flex items-center justify-center gap-1 text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors"
          >
            <span>{showAll ? 'Show top responses' : `View all ${sorted.length} response types`}</span>
            {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  )
}
