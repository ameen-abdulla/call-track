'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface ResponseItem {
  name: string
  count: number
  group: string
}

interface ResponseAnalyticsProps {
  data: ResponseItem[]
}

const GROUP_COLORS: Record<string, string> = {
  'Positive Outcome': '#10b981', // green
  'Follow-Up Required': '#3b82f6', // blue
  'Objection': '#f59e0b', // amber
  'Contact Issue': '#8b5cf6', // purple
  'Negative Outcome': '#ef4444', // red
  'Other': '#6b7280',
}

export function ResponseAnalyticsChart({ data }: ResponseAnalyticsProps) {
  const filtered = data.filter(d => d.count > 0)

  if (filtered.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-center text-gray-500 text-sm">
        No response analytics recorded in this period.
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-base">Response / Outcome Breakdown</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Distribution of prospect responses by outcome category</p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filtered} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: '#888888' }} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 10, fill: '#888888' }}
              width={140}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                borderColor: '#374151',
                borderRadius: '0.75rem',
                color: '#fff',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="count" name="Responses" radius={[0, 4, 4, 0]}>
              {filtered.map(entry => (
                <Cell key={entry.name} fill={GROUP_COLORS[entry.group] || '#3b82f6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px]">
        {Object.entries(GROUP_COLORS).filter(([g]) => g !== 'Other').map(([group, color]) => (
          <div key={group} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-gray-600 dark:text-gray-400">{group}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
