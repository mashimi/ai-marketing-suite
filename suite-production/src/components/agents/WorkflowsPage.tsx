import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Trash2,
  Clock,
  Bot,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Zap,
  Calendar,
} from 'lucide-react'
import { workflowAPI, agentAPI } from '@/services/api'
import { useStore } from '@/store'
import { cn } from '@/utils/cn'
import { formatRelativeTime, formatDate } from '@/utils/format'
import type { Workflow as WorkflowType, Agent } from '@/types'
import toast from 'react-hot-toast'

export default function WorkflowsPage() {
  const { currentProject, workflows, agents } = useStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: workflowList } = useQuery({
    queryKey: ['workflows', currentProject?.id],
    queryFn: () => workflowAPI.list(currentProject?.id),
  })

  const runMutation = useMutation({
    mutationFn: workflowAPI.run,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      toast.success('Workflow started')
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      workflowAPI.update(id, { status: status as WorkflowType['status'] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: workflowAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      toast.success('Workflow deleted')
    },
  })

  const activeWorkflows = workflows.filter((w) => w.status === 'active').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Automate multi-step marketing processes with agent orchestration
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Workflow</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total Workflows</p>
          <p className="text-2xl font-bold mt-1">{workflows.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold mt-1 text-green-400">{activeWorkflows}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Completed Runs</p>
          <p className="text-2xl font-bold mt-1">
            {workflows.reduce((acc, w) => acc + w.runs.filter((r) => r.status === 'completed').length, 0)}
          </p>
        </div>
      </div>

      {/* Workflows List */}
      <div className="space-y-3">
        {workflows.map((workflow) => {
          const isExpanded = expandedWorkflow === workflow.id
          const workflowAgents = agents.filter((a) => workflow.agents.includes(a.id))

          return (
            <motion.div
              key={workflow.id}
              layout
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'p-2.5 rounded-xl',
                    workflow.status === 'active' ? 'bg-green-500/10' :
                    workflow.status === 'paused' ? 'bg-yellow-500/10' : 'bg-slate-500/10'
                  )}>
                    <Workflow className={cn(
                      'w-5 h-5',
                      workflow.status === 'active' ? 'text-green-400' :
                      workflow.status === 'paused' ? 'text-yellow-400' : 'text-slate-400'
                    )} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{workflow.name}</h3>
                    <p className="text-xs text-muted-foreground">{workflow.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runMutation.mutate(workflow.id)}
                    className="p-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Play className="w-4 h-4 text-green-400" />
                  </button>
                  <button
                    onClick={() =>
                      toggleStatusMutation.mutate({
                        id: workflow.id,
                        status: workflow.status === 'active' ? 'paused' : 'active',
                      })
                    }
                    className="p-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    {workflow.status === 'active' ? (
                      <Pause className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <Play className="w-4 h-4 text-green-400" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(workflow.id)}
                    className="p-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                  <button
                    onClick={() => setExpandedWorkflow(isExpanded ? null : workflow.id)}
                    className="p-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-4">
                      {/* Agents */}
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          Agents in Workflow
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {workflowAgents.map((agent) => (
                            <span
                              key={agent.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent rounded-lg text-xs"
                            >
                              <Bot className="w-3 h-3" />
                              {agent.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Schedule */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {workflow.trigger === 'scheduled' ? `Cron: ${workflow.schedule}` : 'Manual trigger'}
                        </span>
                        {workflow.lastRun && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Last run: {formatRelativeTime(workflow.lastRun)}
                          </span>
                        )}
                        {workflow.nextRun && (
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            Next: {formatRelativeTime(workflow.nextRun)}
                          </span>
                        )}
                      </div>

                      {/* Run History */}
                      {workflow.runs.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                            Recent Runs
                          </h4>
                          <div className="space-y-1">
                            {workflow.runs.map((run) => (
                              <div
                                key={run.id}
                                className="flex items-center justify-between p-2 bg-accent/30 rounded-lg"
                              >
                                <div className="flex items-center gap-2">
                                  {run.status === 'completed' ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                  ) : run.status === 'running' ? (
                                    <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                                  ) : (
                                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                                  )}
                                  <span className="text-xs">{run.status}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatRelativeTime(run.startedAt)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateWorkflowModal
            agents={agents}
            onClose={() => setShowCreateModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function CreateWorkflowModal({
  agents,
  onClose,
}: {
  agents: Agent[]
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [trigger, setTrigger] = useState<'manual' | 'scheduled'>('manual')
  const [schedule, setSchedule] = useState('0 9 * * 1')
  const queryClient = useQueryClient()
  const { currentProject } = useStore()

  const createMutation = useMutation({
    mutationFn: workflowAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      toast.success('Workflow created')
      onClose()
    },
  })

  const handleCreate = () => {
    if (!name || selectedAgents.length === 0 || !currentProject) return
    createMutation.mutate({
      name,
      description,
      agents: selectedAgents,
      trigger,
      schedule: trigger === 'scheduled' ? schedule : undefined,
      status: 'active',
    })
  }

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
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
        className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl"
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold">Create Workflow</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Weekly Content Pipeline"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this workflow do?"
              rows={2}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Select Agents</label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                    selectedAgents.includes(agent.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                      selectedAgents.includes(agent.id)
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground'
                    )}
                  >
                    {selectedAgents.includes(agent.id) && (
                      <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">{agent.type}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Trigger</label>
            <div className="flex gap-2">
              {(['manual', 'scheduled'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTrigger(t)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all',
                    trigger === t
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent text-muted-foreground hover:bg-accent/80'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {trigger === 'scheduled' && (
            <div>
              <label className="text-sm font-medium mb-2 block">Schedule (Cron)</label>
              <input
                type="text"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="0 9 * * 1"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format: minute hour day month weekday
              </p>
            </div>
          )}
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
            disabled={!name || selectedAgents.length === 0 || createMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Workflow
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
