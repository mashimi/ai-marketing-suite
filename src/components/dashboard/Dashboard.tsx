import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  Users,
  Eye,
  MousePointer,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Bot,
  FileText,
  Share2,
} from 'lucide-react'
import { useStore } from '@/store'
import { projectAPI, agentAPI, analyticsAPI, notificationAPI } from '@/services/api'
import { formatNumber, formatCurrency, formatPercent } from '@/utils/format'
import { cn } from '@/utils/cn'
import TrafficChart from './TrafficChart'
import AgentStatusCard from './AgentStatusCard'
import RecentActivity from './RecentActivity'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function Dashboard() {
  const { currentProject, setProjects, setAgents, setNotifications, projects, agents } = useStore()

  const { data: projectList } = useQuery({
    queryKey: ['projects'],
    queryFn: projectAPI.list,
  })

  const { data: agentList } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentAPI.list(),
  })

  const { data: analyticsData } = useQuery({
    queryKey: ['analytics', currentProject?.id],
    queryFn: () => analyticsAPI.get(currentProject?.id || '1'),
    enabled: !!currentProject,
  })

  const { data: notificationList } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationAPI.list,
  })

  useEffect(() => {
    if (projectList) setProjects(projectList)
    if (agentList) setAgents(agentList)
    if (notificationList) setNotifications(notificationList)
  }, [projectList, agentList, notificationList, setProjects, setAgents, setNotifications])

  const project = currentProject || (projects && projects.length > 0 ? projects[0] : null)
  const metrics = project?.metrics

  const latestAnalytics = analyticsData?.[analyticsData.length - 1]

  const stats = [
    {
      label: 'Total Traffic',
      value: metrics?.totalTraffic || 0,
      change: 12.5,
      icon: Eye,
      color: 'blue',
    },
    {
      label: 'Organic Traffic',
      value: metrics?.organicTraffic || 0,
      change: 8.3,
      icon: Users,
      color: 'green',
    },
    {
      label: 'Conversion Rate',
      value: metrics?.conversionRate || 0,
      change: -2.1,
      icon: MousePointer,
      color: 'purple',
      isPercent: true,
    },
    {
      label: 'Revenue',
      value: latestAnalytics?.revenue || 0,
      change: 15.7,
      icon: DollarSign,
      color: 'amber',
      isCurrency: true,
    },
  ]

  const activeAgents = agents.filter((a) => a.status === 'running').length
  const completedTasks = agents.reduce((acc, a) => acc + a.metrics.tasksCompleted, 0)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back! Here's what's happening with {project?.name}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {activeAgents} agents running
          </span>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          const isPositive = stat.change >= 0
          return (
            <div
              key={stat.label}
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
                <span
                  className={cn(
                    'text-xs font-medium',
                    isPositive ? 'text-green-400' : 'text-red-400'
                  )}
                >
                  {isPositive ? '+' : ''}
                  {stat.change}%
                </span>
                <span className="text-xs text-muted-foreground">vs last week</span>
              </div>
            </div>
          )
        })}
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Traffic Overview</h2>
              <p className="text-sm text-muted-foreground">Last 30 days performance</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs text-muted-foreground">Organic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-xs text-muted-foreground">Direct</span>
              </div>
            </div>
          </div>
          <TrafficChart data={analyticsData || []} />
        </motion.div>

        {/* Agent Status */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Agent Status</h2>
              <Bot className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {agents.slice(0, 5).map((agent) => (
                <AgentStatusCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Quick Stats</h2>
              <Activity className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-accent/50 rounded-lg">
                <p className="text-2xl font-bold">{agents.length}</p>
                <p className="text-xs text-muted-foreground">Total Agents</p>
              </div>
              <div className="text-center p-3 bg-accent/50 rounded-lg">
                <p className="text-2xl font-bold">{formatNumber(completedTasks)}</p>
                <p className="text-xs text-muted-foreground">Tasks Done</p>
              </div>
              <div className="text-center p-3 bg-accent/50 rounded-lg">
                <p className="text-2xl font-bold">{metrics?.keywordRankings || 0}</p>
                <p className="text-xs text-muted-foreground">Keywords</p>
              </div>
              <div className="text-center p-3 bg-accent/50 rounded-lg">
                <p className="text-2xl font-bold">{metrics?.backlinks || 0}</p>
                <p className="text-xs text-muted-foreground">Backlinks</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Content</h2>
            <FileText className="w-5 h-5 text-muted-foreground" />
          </div>
          <RecentActivity type="content" />
        </motion.div>

        <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Social Mentions</h2>
            <Share2 className="w-5 h-5 text-muted-foreground" />
          </div>
          <RecentActivity type="social" />
        </motion.div>
      </div>
    </motion.div>
  )
}
