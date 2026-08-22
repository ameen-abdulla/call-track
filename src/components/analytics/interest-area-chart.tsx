'use client'

import { PackageCheck } from 'lucide-react'

interface InterestAreaItem {
  name: string
  count: number
}

interface InterestAreaProps {
  data: InterestAreaItem[]
}

export function InterestAreaChart({ data }: InterestAreaProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-6 text-center text-[var(--text-muted)] text-xs">
        No interest area data recorded.
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => b.count - a.count)
  const maxCount = Math.max(...sorted.map(d => d.count), 1)

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-card)] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <PackageCheck className="w-4 h-4 text-[var(--accent)]" />
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] text-sm">Product Interest Areas</h3>
            <p className="text-[11px] text-[var(--text-secondary)]">Demand distribution across solutions</p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-[var(--text-muted)]">
          {sorted.reduce((acc, curr) => acc + curr.count, 0)} Logged
        </span>
      </div>

      <div className="space-y-2 pt-1">
        {sorted.map(item => {
          const widthPercent = Math.max(12, Math.round((item.count / maxCount) * 100))

          return (
            <div key={item.name} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--text-primary)]">{item.name}</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">{item.count}</span>
              </div>

              <div className="h-2 w-full bg-[var(--bg)] rounded-full overflow-hidden border border-[var(--border)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
