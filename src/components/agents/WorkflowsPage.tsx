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
import { workflowAPI } from '@/services/api'
import { useStore } from '@/store'
import { cn } from '@/utils/cn'
import { formatRelativeTime } from '@/utils/format'
import type { Workflow as WorkflowType, Agent } from '@/types'
import toast from 'react-hot-toast'
import WorkflowBuilder from '@/components/workflows/WorkflowBuilder'

export default function WorkflowsPage() {
  const { currentProject, workflows, agents } = useStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null)
  const queryClient = useQueryClient()

  useQuery({
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
          <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex flex-col p-6 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Workflow Architect</h2>
                <p className="text-sm text-muted-foreground">Design your autonomous agent orchestration</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-3 hover:bg-accent rounded-2xl border border-border transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden rounded-3xl border border-border/50 shadow-2xl">
              <WorkflowBuilder 
                onSave={(data) => {
                  // Handle save logic here
                  console.log('Graph Data:', data)
                  setShowCreateModal(false)
                }} 
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
