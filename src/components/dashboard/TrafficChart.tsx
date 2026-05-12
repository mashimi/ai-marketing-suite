import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatDate } from '@/utils/format'
import type { AnalyticsData } from '@/types'

interface Props {
  data: AnalyticsData[]
}

export default function TrafficChart({ data }: Props) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      date: formatDate(d.date, { month: 'short', day: 'numeric' }),
      organic: d.organic,
      direct: d.direct,
      referral: d.referral,
      social: d.social,
      total: d.traffic,
    }))
  }, [data])

  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="organicGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="directGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
        <XAxis
          dataKey="date"
          stroke="#64748b"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          minTickGap={30}
        />
        <YAxis
          stroke="#64748b"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}`}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload) return null
            return (
              <div className="bg-popover border border-border rounded-lg p-3 shadow-xl">
                <p className="text-sm font-medium mb-2">{label}</p>
                {payload.map((entry) => (
                  <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-muted-foreground capitalize">{entry.dataKey}:</span>
                    <span className="font-medium">{entry.value?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )
          }}
        />
        <Area
          type="monotone"
          dataKey="organic"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#organicGradient)"
        />
        <Area
          type="monotone"
          dataKey="direct"
          stroke="#a855f7"
          strokeWidth={2}
          fill="url(#directGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
