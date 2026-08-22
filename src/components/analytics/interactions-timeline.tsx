'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface TimelinePoint {
  date: string
  calls: number
  emails: number
  meetings: number
}

interface InteractionsTimelineProps {
  data: TimelinePoint[]
}

export function InteractionsTimeline({ data }: InteractionsTimelineProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-center text-gray-500 text-sm">
        No interaction timeline data recorded yet.
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-base">Interactions by Type Over Time</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Daily volume of Calls, Emails, and Meetings</p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorEmails" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#888888' }} />
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
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Area type="monotone" dataKey="calls" name="Calls" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCalls)" />
            <Area type="monotone" dataKey="emails" name="Emails" stroke="#10b981" fillOpacity={1} fill="url(#colorEmails)" />
            <Area type="monotone" dataKey="meetings" name="Meetings" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorMeetings)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
