import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Users, Trash2, ShieldCheck, MessageSquare, Target, Sparkles, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { swarmAPI, agentAPI } from '@/services/api'
import { useStore } from '@/store'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'

interface CreateSwarmModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateSwarmModal({ isOpen, onClose }: CreateSwarmModalProps) {
  const { currentProject } = useStore()
  const queryClient = useQueryClient()
  
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [strategy, setStrategy] = useState<'sequential' | 'parallel' | 'debate' | 'hierarchical'>('sequential')
  const [members, setMembers] = useState<Array<{ agentId: string; role: string; order?: number }>>([])

  const { data: agents = [] } = useQuery({
    queryKey: ['agents', currentProject?.id],
    queryFn: () => agentAPI.list(currentProject?.id),
    enabled: isOpen && !!currentProject,
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => swarmAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swarms'] })
      toast.success('Swarm created successfully')
      onClose()
      // Reset form
      setName('')
      setGoal('')
      setStrategy('sequential')
      setMembers([])
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create swarm')
    }
  })

  const handleAddMember = () => {
    setMembers([...members, { agentId: '', role: 'executor' }])
  }

  const handleUpdateMember = (index: number, updates: any) => {
    const newMembers = [...members]
    newMembers[index] = { ...newMembers[index], ...updates }
    setMembers(newMembers)
  }

  const handleRemoveMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name || !goal) return toast.error('Name and goal are required')
    if (members.length < 2) return toast.error('A swarm must have at least 2 members')
    if (members.some(m => !m.agentId || !m.role)) return toast.error('All members must have an agent and role selected')

    createMutation.mutate({
      name,
      goal,
      strategy,
      projectId: currentProject!.id,
      members: members.map((m, i) => ({
        ...m,
        order: strategy === 'sequential' ? i + 1 : undefined
      }))
    })
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-card/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Create New Swarm</h2>
                <p className="text-sm text-muted-foreground">Orchestrate multiple agents to collaborate.</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg text-muted-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            <form id="create-swarm-form" onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Swarm Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Market Research Team"
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Primary Goal</label>
                  <textarea
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="Describe what this swarm should achieve..."
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[80px]"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-3 block">Orchestration Strategy</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'sequential', label: 'Sequential', icon: Target, desc: 'Agents run one after another' },
                      { id: 'parallel', label: 'Parallel', icon: Sparkles, desc: 'Agents run simultaneously' },
                      { id: 'debate', label: 'Debate', icon: MessageSquare, desc: 'Agents discuss and refine' },
                      { id: 'hierarchical', label: 'Hierarchical', icon: ShieldCheck, desc: 'Manager delegates to workers' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setStrategy(s.id as any)}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                          strategy === s.id 
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                            : "border-border hover:border-primary/50 hover:bg-accent/50"
                        )}
                      >
                        <s.icon className={cn("w-5 h-5 mt-0.5", strategy === s.id ? "text-primary" : "text-muted-foreground")} />
                        <div>
                          <p className={cn("font-medium text-sm", strategy === s.id ? "text-primary" : "text-foreground")}>{s.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium">Swarm Members</label>
                    <button
                      type="button"
                      onClick={handleAddMember}
                      className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Member
                    </button>
                  </div>
                  
                  {agents.length === 0 ? (
                    <div className="text-center p-6 border border-dashed border-yellow-500/35 rounded-xl bg-yellow-500/5 flex flex-col items-center gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                      <p className="text-sm font-semibold text-foreground">No agents deployed for this project yet</p>
                      <p className="text-xs text-muted-foreground max-w-md">
                        Swarms require at least 2 agents to collaborate. You can switch to the seeded <strong className="text-primary">SaaS Dashboard</strong> project in the top header to use pre-built agents, or go to the <strong className="text-primary">AI Agents</strong> tab in the sidebar to deploy agents for this project.
                      </p>
                    </div>
                  ) : members.length === 0 ? (
                    <div className="text-center p-6 border border-dashed border-border rounded-xl bg-accent/30">
                      <p className="text-sm text-muted-foreground">No agents added yet. Click 'Add Member' to start building your swarm.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {members.map((member, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 border border-border rounded-xl bg-card/50">
                          <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                            {index + 1}
                          </div>
                          
                          <select
                            value={member.agentId}
                            onChange={(e) => handleUpdateMember(index, { agentId: e.target.value })}
                            className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">Select Agent...</option>
                            {agents.map((a: any) => (
                              <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                            ))}
                          </select>

                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateMember(index, { role: e.target.value })}
                            className="w-36 px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="executor">Executor</option>
                            <option value="researcher">Researcher</option>
                            <option value="critic">Critic</option>
                            <option value="optimizer">Optimizer</option>
                            {strategy === 'hierarchical' && <option value="coordinator">Coordinator</option>}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleRemoveMember(index)}
                            className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border/50 bg-card/50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-swarm-form"
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Swarm'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
