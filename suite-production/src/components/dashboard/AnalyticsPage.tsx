import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  MousePointer,
  DollarSign,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from 'lucide-react'
import { analyticsAPI } from '@/services/api'
import { useStore } from '@/store'
import { cn } from '@/utils/cn'
import { formatNumber, formatCurrency, formatPercent } from '@/utils/format'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

export default function AnalyticsPage() {
  const { currentProject } = useStore()
  const [days, setDays] = useState(30)

  const { data: analyticsData } = useQuery({
    queryKey: ['analytics', currentProject?.id, days],
    queryFn: () => analyticsAPI.get(currentProject?.id || '1', days),
    enabled: !!currentProject,
  })

  const latest = analyticsData?.[analyticsData.length - 1]
  const previous = analyticsData?.[analyticsData.length - 8]

  const stats = latest ? [
    {
      label: 'Total Traffic',
      value: latest.traffic,
      change: previous ? ((latest.traffic - previous.traffic) / previous.traffic * 100) : 0,
      icon: Eye,
      color: 'blue',
    },
    {
      label: 'Organic Traffic',
      value: latest.organic,
      change: previous ? ((latest.organic - previous.organic) / previous.organic * 100) : 0,
      icon: Users,
      color: 'green',
    },
    {
      label: 'Conversions',
      value: latest.conversions,
      change: previous ? ((latest.conversions - previous.conversions) / previous.conversions * 100) : 0,
      icon: MousePointer,
      color: 'purple',
    },
    {
      label: 'Revenue',
      value: latest.revenue,
      change: previous ? ((latest.revenue - previous.revenue) / previous.revenue * 100) : 0,
      icon: DollarSign,
      color: 'amber',
      isCurrency: true,
    },
    {
      label: 'Bounce Rate',
      value: latest.bounceRate,
      change: previous ? (latest.bounceRate - previous.bounceRate) : 0,
      icon: TrendingDown,
      color: 'red',
      isPercent: true,
      inverse: true,
    },
    {
      label: 'Avg Session',
      value: latest.avgSessionDuration,
      change: previous ? ((latest.avgSessionDuration - previous.avgSessionDuration) / previous.avgSessionDuration * 100) : 0,
      icon: Clock,
      color: 'sky',
      isTime: true,
    },
  ] : []

  const channelData = latest ? [
    { name: 'Organic', value: latest.organic, color: '#3b82f6' },
    { name: 'Direct', value: latest.direct, color: '#a855f7' },
    { name: 'Referral', value: latest.referral, color: '#22c55e' },
    { name: 'Social', value: latest.social, color: '#f59e0b' },
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Deep dive into your website performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                days === d
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-muted-foreground hover:bg-accent/80'
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          const isPositive = stat.inverse ? stat.change < 0 : stat.change >= 0
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-5 card-hover"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">
                    {stat.isCurrency
                      ? formatCurrency(stat.value)
                      : stat.isPercent
                      ? formatPercent(stat.value)
                      : stat.isTime
                      ? `${Math.floor(stat.value / 60)}m ${Math.floor(stat.value % 60)}s`
                      : formatNumber(stat.value)}
                  </p>
                </div>
                <div className={cn('p-2 rounded-lg', `bg-${stat.color}-500/10`)}>
                  <Icon className={cn('w-5 h-5', `text-${stat.color}-400`)} />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3">
                {isPositive ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                )}
                <span className={cn('text-xs font-medium', isPositive ? 'text-green-400' : 'text-red-400')}>
                  {isPositive ? '+' : ''}{stat.change.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">vs previous period</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Traffic Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyticsData || []}>
              <defs>
                <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload) return null
                  return (
                    <div className="bg-popover border border-border rounded-lg p-3 shadow-xl">
                      {payload.map((entry) => (
                        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-muted-foreground capitalize">{entry.dataKey}:</span>
                          <span className="font-medium">{entry.value?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )
                }}
              />
              <Area type="monotone" dataKey="traffic" stroke="#3b82f6" strokeWidth={2} fill="url(#trafficGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Channel Distribution */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Channel Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={channelData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {channelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const data = payload[0].payload
                  return (
                    <div className="bg-popover border border-border rounded-lg p-2 shadow-xl text-xs">
                      <span className="font-medium">{data.name}:</span>{' '}
                      {data.value.toLocaleString()}
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {channelData.map((channel) => (
              <div key={channel.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: channel.color }} />
                <span className="text-xs text-muted-foreground">{channel.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conversions & Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Conversions</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analyticsData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload) return null
                  return (
                    <div className="bg-popover border border-border rounded-lg p-3 shadow-xl text-xs">
                      <span className="font-medium">Conversions: {payload[0]?.value}</span>
                    </div>
                  )
                }}
              />
              <Bar dataKey="conversions" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Revenue</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={analyticsData || []}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload) return null
                  return (
                    <div className="bg-popover border border-border rounded-lg p-3 shadow-xl text-xs">
                      <span className="font-medium">Revenue: ${payload[0]?.value}</span>
                    </div>
                  )
                }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} fill="url(#revenueGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
