'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface TagData {
  id: string
  name: string
  total: number
  assigned: number
  unassigned: number
}

interface TagCoverageProps {
  data: TagData[]
}

export function TagCoverageChart({ data }: TagCoverageProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-center text-gray-500 text-sm">
        No tag coverage data available.
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-base">Coverage by Tag / Category</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Assigned vs Unassigned prospects across categories</p>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 40 }}
            barGap={4}
          >
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#888888' }}
              interval={0}
              angle={-15}
              textAnchor="end"
              height={50}
            />
            <YAxis tick={{ fontSize: 11, fill: '#888888' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                borderColor: '#374151',
                borderRadius: '0.75rem',
                color: '#fff',
                fontSize: '12px',
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ fontSize: '12px', paddingBottom: '12px' }}
            />
            <Bar dataKey="assigned" name="Assigned" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={44} />
            <Bar dataKey="unassigned" name="Unassigned" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
