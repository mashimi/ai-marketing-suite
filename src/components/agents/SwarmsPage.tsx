import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store'
import { 
  Users, 
  Play, 
  History, 
  Plus, 
  Target, 
  Zap, 
  MessageSquare, 
  ShieldCheck, 
  Search,
  Filter,
  MoreVertical,
  Activity,
  CheckCircle2,
  Loader2,
  Sparkles,
  Trash2
} from 'lucide-react'
import { swarmAPI } from '@/services/api'
import { cn } from '@/utils/cn'
import CreateSwarmModal from './CreateSwarmModal'
import SwarmMonitor from './SwarmMonitor'
import toast from 'react-hot-toast'

interface Swarm {
  id: string
  name: string
  description: string
  goal: string
  status: 'idle' | 'running' | 'completed' | 'error' | 'paused'
  strategy: 'sequential' | 'parallel' | 'debate' | 'hierarchical'
  members: any[]
  _count?: { sessions: number }
  createdAt: string
}

export default function SwarmsPage() {
  const { currentProject } = useStore()
  const [swarms, setSwarms] = useState<Swarm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'history'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [monitoringSession, setMonitoringSession] = useState<{ id: string, name: string } | null>(null)

  useEffect(() => {
    if (currentProject) {
      fetchSwarms()
    }
  }, [currentProject])

  const fetchSwarms = async () => {
    try {
      const data = await swarmAPI.listByProject(currentProject!.id)
      setSwarms(data)
    } catch (error) {
      console.error('Failed to fetch swarms', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExecute = async (swarmId: string, swarmName: string) => {
    try {
      const loadingToast = toast.loading('Starting swarm execution...')
      await swarmAPI.execute(swarmId, { 
        goal: "Analyze current market trends and draft a content strategy",
        timestamp: new Date().toISOString()
      })
      toast.dismiss(loadingToast)
      toast.success('Swarm execution started!')
      
      // Refresh list
      await fetchSwarms()

      // Automatically find and open the latest session
      const sessions = await swarmAPI.getSessions(swarmId)
      if (sessions.length > 0) {
        setMonitoringSession({ id: sessions[0].id, name: swarmName })
      }
    } catch (error: any) {
      toast.dismiss()
      console.error('Failed to execute swarm', error)
      toast.error(error.response?.data?.message || 'Failed to execute swarm. Please check the console.')
    }
  }

  const handleMonitor = async (swarmId: string, swarmName: string) => {
    try {
      const sessions = await swarmAPI.getSessions(swarmId)
      const activeSession = sessions.find((s: any) => s.status === 'running') || sessions[0]
      if (activeSession) {
        setMonitoringSession({ id: activeSession.id, name: swarmName })
      } else {
        toast.error('No active sessions found for this swarm')
      }
    } catch (error) {
      toast.error('Failed to load sessions')
    }
  }

  const handleDelete = async (swarmId: string) => {
    if (!confirm('Are you sure you want to delete this swarm?')) return
    
    try {
      await swarmAPI.delete(swarmId)
      toast.success('Swarm deleted successfully')
      fetchSwarms()
    } catch (error) {
      console.error('Failed to delete swarm', error)
      toast.error('Failed to delete swarm')
    }
  }

  const filteredSwarms = swarms.filter(swarm => {
    const matchesSearch = swarm.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         swarm.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (activeTab === 'active') return matchesSearch && swarm.status === 'running'
    if (activeTab === 'history') return matchesSearch && swarm.status === 'completed'
    return matchesSearch
  })

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center max-w-md mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center shadow-inner">
          <Users className="w-10 h-10 text-primary/40" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold tracking-tight">No Project Selected</h3>
          <p className="text-muted-foreground">
            Please select or create a project in the top navigation header to begin orchestrating multi-agent swarms.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Swarm Hub</h1>
          <p className="text-muted-foreground mt-1">
            Orchestrate multiple agents in complex collaboration pipelines.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Swarm
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Swarms', value: swarms.filter(s => s.status === 'running').length, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Total Executions', value: swarms.reduce((acc, s) => acc + (s._count?.sessions || 0), 0), icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
          { label: 'Collaborative Agents', value: swarms.reduce((acc, s) => acc + s.members.length, 0), icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Success Rate', value: '98.4%', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-5 flex items-center gap-4">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', stat.bg)}>
              <stat.icon className={cn('w-6 h-6', stat.color)} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="glass-card overflow-hidden">
        <div className="border-b border-border bg-card/50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {(['all', 'active', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'text-sm font-medium transition-colors relative pb-4 -mb-4',
                  activeTab === tab ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search swarms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
              />
            </div>
            <button className="p-2 hover:bg-accent rounded-lg text-muted-foreground">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-muted-foreground animate-pulse">Initializing swarm network...</p>
            </div>
          ) : swarms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
              <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-6">
                <Users className="w-10 h-10 text-primary/40" />
              </div>
              <h3 className="text-xl font-semibold">No Swarms Found</h3>
              <p className="text-muted-foreground mt-2">
                Swarms allow multiple agents to work together on complex tasks using strategies like Debate or Hierarchical delegation.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all font-medium"
              >
                Create Your First Swarm
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSwarms.map((swarm) => (
                <motion.div
                  key={swarm.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group relative flex flex-col bg-card/40 border border-border rounded-2xl p-5 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        swarm.status === 'running' ? "bg-blue-500/20 text-blue-500 animate-pulse" : "bg-primary/10 text-primary"
                      )}>
                        {swarm.strategy === 'debate' ? <MessageSquare className="w-5 h-5" /> : 
                         swarm.strategy === 'hierarchical' ? <ShieldCheck className="w-5 h-5" /> :
                         <Users className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{swarm.name}</h4>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60">{swarm.strategy}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(swarm.id)}
                      className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete Swarm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-6 min-h-[40px]">
                    {swarm.description}
                  </p>

                  {/* Members */}
                  <div className="flex items-center -space-x-2 mb-6">
                    {swarm.members.map((member, i) => (
                      <div 
                        key={i}
                        className="w-8 h-8 rounded-full border-2 border-card bg-accent flex items-center justify-center overflow-hidden"
                        title={`${member.agent.name} (${member.role})`}
                      >
                        <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-primary">{member.agent.name.charAt(0)}</span>
                        </div>
                      </div>
                    ))}
                    {swarm.members.length > 4 && (
                      <div className="w-8 h-8 rounded-full border-2 border-card bg-accent flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                        +{swarm.members.length - 4}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <History className="w-3 h-3" />
                        {swarm._count?.sessions || 0} runs
                      </span>
                    </div>
                    <button
                      onClick={() => handleExecute(swarm.id, swarm.name)}
                      disabled={swarm.status === 'running'}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                        swarm.status === 'running' 
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                      )}
                    >
                      {swarm.status === 'running' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Launch
                        </>
                      )}
                    </button>

                    {swarm.status === 'running' && (
                      <button
                        onClick={() => handleMonitor(swarm.id, swarm.name)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
                      >
                        <Activity className="w-4 h-4" />
                        Monitor Live
                      </button>
                    )}
                  </div>

                  {/* Status Glow */}
                  {swarm.status === 'running' && (
                    <div className="absolute -inset-px rounded-2xl border border-blue-500/50 pointer-events-none" />
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Features Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { 
            title: 'Hierarchical Orchestration', 
            desc: 'Deploy a Manager agent that delegates subtasks to specialized worker agents for high-accuracy results.',
            icon: Target,
            color: 'from-blue-500 to-indigo-600'
          },
          { 
            title: 'Debate Mechanism', 
            desc: 'Force agents to challenge each other\'s findings. The best insights survive the structured argument process.',
            icon: MessageSquare,
            color: 'from-purple-500 to-pink-600'
          },
          { 
            title: 'Shared Vector Memory', 
            desc: 'All swarm members contribute to a unified session memory, allowing context to flow seamlessly between roles.',
            icon: Sparkles,
            color: 'from-amber-500 to-orange-600'
          }
        ].map((feature, i) => (
          <div key={i} className="glass-card p-6 group">
            <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 text-white shadow-lg", feature.color)}>
              <feature.icon className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{feature.title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {feature.desc}
            </p>
          </div>
        ))}
      </div>

      <CreateSwarmModal 
        isOpen={showCreateModal} 
        onClose={() => {
          setShowCreateModal(false)
          fetchSwarms() // Refresh after potential creation
        }} 
      />

      <AnimatePresence>
        {monitoringSession && (
          <SwarmMonitor
            sessionId={monitoringSession.id}
            swarmName={monitoringSession.name}
            onClose={() => {
              setMonitoringSession(null)
              fetchSwarms() // Refresh to see updated status
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
