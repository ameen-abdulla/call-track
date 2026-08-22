'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { ShieldCheck, ShieldAlert } from 'lucide-react'

interface ConnectedData {
  connected: number
  notConnected: number
  unknown: number
  unverifiedCount: number
}

interface ConnectedChartProps {
  data: ConnectedData
}

export function ConnectedChart({ data }: ConnectedChartProps) {
  const chartData = [
    { name: 'Connected (Answered)', value: data.connected, color: '#10b981' },
    { name: 'Not Connected (No Answer/Busy)', value: data.notConnected, color: '#ef4444' },
    ...(data.unknown > 0 ? [{ name: 'Unknown / Not Logged', value: data.unknown, color: '#6b7280' }] : []),
  ].filter(item => item.value > 0)

  const totalCalls = data.connected + data.notConnected + data.unknown

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-base">Calls: Connected vs Not Connected</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Prospect answer rates & click-to-call verification</p>
        </div>
      </div>

      {totalCalls === 0 ? (
        <div className="h-56 flex items-center justify-center text-gray-500 text-sm">
          No call data recorded in this period.
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {chartData.map(entry => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  borderColor: '#374151',
                  borderRadius: '0.75rem',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Verification Summary Banner */}
      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">Verification Status:</span>
        {data.unverifiedCount > 0 ? (
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
            <ShieldAlert className="w-4 h-4" />
            {data.unverifiedCount} unverified call log(s)
          </span>
        ) : (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            All calls verified by click-to-call
          </span>
        )}
      </div>
    </div>
  )
}
