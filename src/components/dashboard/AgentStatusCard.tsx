import { motion } from 'framer-motion'
import {
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
  Play,
  Pause,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import type { Agent } from '@/types'
import { cn } from '@/utils/cn'
import { formatRelativeTime } from '@/utils/format'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
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
}

const statusConfig = {
  idle: { icon: Pause, color: 'text-slate-400', bg: 'bg-slate-500/10' },
  running: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  completed: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  paused: { icon: Pause, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
}

interface Props {
  agent: Agent
}

export default function AgentStatusCard({ agent }: Props) {
  const Icon = iconMap[agent.icon] || Sparkles
  const status = statusConfig[agent.status]
  const StatusIcon = status.icon

  return (
    <motion.div
      layout
      className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors cursor-pointer group"
    >
      <div className={cn('p-2 rounded-lg', status.bg)}>
        <Icon className={cn('w-4 h-4', status.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{agent.name}</p>
        <p className="text-xs text-muted-foreground">
          {agent.status === 'running'
            ? 'Processing...'
            : agent.lastRun
            ? `Last run ${formatRelativeTime(agent.lastRun)}`
            : 'Never run'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <StatusIcon
          className={cn('w-4 h-4', status.color, agent.status === 'running' && 'animate-spin')}
        />
      </div>
    </motion.div>
  )
}
