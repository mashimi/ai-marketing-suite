import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Play,
  Pause,
  Trash2,
  Settings,
  Loader2,
  Search,
  Brain,
  PenTool,
  MessageSquare,
  Terminal,
  Twitter,
  Linkedin,
  Target,
  Key,
  Link,
  Wrench,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  BarChart3,
  X,
} from 'lucide-react'
import { useStore } from '@/store'
import { agentAPI } from '@/services/api'
import { AGENT_TYPES } from '@/utils/constants'
import { cn } from '@/utils/cn'
import { formatRelativeTime, formatNumber } from '@/utils/format'
import type { Agent } from '@/types'
import toast from 'react-hot-toast'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Search, Brain, PenTool, MessageSquare, Terminal, Twitter, Linkedin, Target, Key, Link, Wrench, Sparkles,
}

const statusConfig = {
  idle: { icon: Pause, color: 'text-slate-400', bg: 'bg-slate-500/10', label: 'Idle' },
  running: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Running' },
  completed: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Completed' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Error' },
  paused: { icon: Pause, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Paused' },
}

export default function AgentsPage() {
  const { agents, currentProject, setAgents } = useStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const queryClient = useQueryClient()

  const { data: agentList } = useQuery({
    queryKey: ['agents', currentProject?.id],
    queryFn: () => agentAPI.list(currentProject?.id),
  })

  const runMutation = useMutation({
    mutationFn: agentAPI.run,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      toast.success('Agent started successfully')
    },
    onError: () => toast.error('Failed to start agent'),
  })

  const stopMutation = useMutation({
    mutationFn: agentAPI.stop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      toast.success('Agent stopped')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: agentAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      toast.success('Agent deleted')
    },
  })

  const filteredAgents = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const runningCount = agents.filter((a) => a.status === 'running').length
  const completedCount = agents.filter((a) => a.status === 'completed').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Agents</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage and monitor your marketing automation agents
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Deploy Agent</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total Agents</p>
          <p className="text-2xl font-bold mt-1">{agents.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Running</p>
          <p className="text-2xl font-bold mt-1 text-blue-400">{runningCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Completed Today</p>
          <p className="text-2xl font-bold mt-1 text-green-400">{completedCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Avg Success Rate</p>
          <p className="text-2xl font-bold mt-1">
            {agents.length > 0
              ? (agents.reduce((acc, a) => acc + a.metrics.successRate, 0) / agents.length).toFixed(1)
              : 0}
            %
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search agents..."
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredAgents.map((agent) => {
            const Icon = iconMap[agent.icon] || Sparkles
            const status = statusConfig[agent.status]
            const StatusIcon = status.icon

            return (
              <motion.div
                key={agent.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border rounded-xl p-5 card-hover group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2.5 rounded-xl', status.bg)}>
                      <Icon className={cn('w-5 h-5', status.color)} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{agent.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusIcon
                          className={cn(
                            'w-3 h-3',
                            status.color,
                            agent.status === 'running' && 'animate-spin'
                          )}
                        />
                        <span className={cn('text-xs', status.color)}>{status.label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {agent.status === 'running' ? (
                      <button
                        onClick={() => stopMutation.mutate(agent.id)}
                        className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                      >
                        <Pause className="w-4 h-4 text-yellow-400" />
                      </button>
                    ) : (
                      <button
                        onClick={() => runMutation.mutate(agent.id)}
                        className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                      >
                        <Play className="w-4 h-4 text-green-400" />
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedAgent(agent)}
                      className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                    >
                      <Settings className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(agent.id)}
                      className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">{agent.description}</p>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-accent/30 rounded-lg p-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tasks</p>
                    <p className="text-sm font-semibold">{formatNumber(agent.metrics.tasksCompleted)}</p>
                  </div>
                  <div className="bg-accent/30 rounded-lg p-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Success</p>
                    <p className="text-sm font-semibold">{agent.metrics.successRate}%</p>
                  </div>
                  <div className="bg-accent/30 rounded-lg p-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Impact</p>
                    <p className="text-sm font-semibold">{agent.metrics.impactScore}/100</p>
                  </div>
                  <div className="bg-accent/30 rounded-lg p-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Time</p>
                    <p className="text-sm font-semibold">{agent.metrics.avgExecutionTime}s</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{agent.frequency}</span>
                  </div>
                  {agent.lastRun && (
                    <span>Last: {formatRelativeTime(agent.lastRun)}</span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateAgentModal onClose={() => setShowCreateModal(false)} />
        )}
      </AnimatePresence>

      {/* Agent Detail Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <AgentDetailModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function CreateAgentModal({ onClose }: { onClose: () => void }) {
  const [selectedType, setSelectedType] = useState<string>('')
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState<'manual' | 'hourly' | 'daily' | 'weekly'>('daily')
  const queryClient = useQueryClient()
  const { currentProject } = useStore()

  const createMutation = useMutation({
    mutationFn: agentAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      toast.success('Agent deployed successfully')
      onClose()
    },
    onError: () => toast.error('Failed to deploy agent'),
  })

  const handleCreate = () => {
    if (!selectedType || !name || !currentProject) return
    const agentType = AGENT_TYPES[selectedType as keyof typeof AGENT_TYPES]
    createMutation.mutate({
      name,
      type: selectedType as Agent['type'],
      status: 'idle',
      description: agentType.description,
      icon: agentType.icon,
      frequency,
      projectId: currentProject.id,
      config: {},
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold">Deploy New Agent</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Agent Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Weekly SEO Auditor"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-3 block">Select Agent Type</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(AGENT_TYPES).map(([type, config]) => {
                const Icon = iconMap[config.icon] || Sparkles
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all text-left',
                      selectedType === type
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    )}
                  >
                    <Icon className={cn('w-6 h-6 mb-2', `text-${config.color}-400`)} />
                    <p className="text-sm font-medium">{config.label}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{config.description}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Frequency</label>
            <div className="flex gap-2">
              {(['manual', 'hourly', 'daily', 'weekly'] as const).map((freq) => (
                <button
                  key={freq}
                  onClick={() => setFrequency(freq)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all',
                    frequency === freq
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent text-muted-foreground hover:bg-accent/80'
                  )}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedType || !name || createMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Deploy Agent
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function AgentDetailModal({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const Icon = iconMap[agent.icon] || Sparkles
  const status = statusConfig[agent.status]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl"
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2.5 rounded-xl', status.bg)}>
              <Icon className={cn('w-5 h-5', status.color)} />
            </div>
            <div>
              <h2 className="text-lg font-bold">{agent.name}</h2>
              <p className="text-xs text-muted-foreground">{agent.type}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-2">Description</h3>
            <p className="text-sm text-muted-foreground">{agent.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-accent/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Tasks Completed</span>
              </div>
              <p className="text-xl font-bold">{formatNumber(agent.metrics.tasksCompleted)}</p>
            </div>
            <div className="bg-accent/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-xs text-muted-foreground">Success Rate</span>
              </div>
              <p className="text-xl font-bold">{agent.metrics.successRate}%</p>
            </div>
            <div className="bg-accent/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Avg Execution</span>
              </div>
              <p className="text-xl font-bold">{agent.metrics.avgExecutionTime}s</p>
            </div>
            <div className="bg-accent/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-muted-foreground">Impact Score</span>
              </div>
              <p className="text-xl font-bold">{agent.metrics.impactScore}/100</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Configuration</h3>
            <pre className="bg-accent/30 rounded-lg p-3 text-xs overflow-x-auto">
              {JSON.stringify(agent.config, null, 2)}
            </pre>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
