import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Terminal, 
  Bot, 
  User, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Box,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react'
import { swarmAPI } from '@/services/api'
import { cn } from '@/utils/cn'
import { formatRelativeTime } from '@/utils/format'

interface Message {
  id: string
  fromAgentId: string
  toAgentId?: string
  type: string
  content: string
  payload: any
  createdAt: string
}

interface SwarmMonitorProps {
  sessionId: string
  swarmName: string
  onClose: () => void
}

export default function SwarmMonitor({ sessionId, swarmName, onClose }: SwarmMonitorProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [session, setSession] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLive, setIsLive] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchSession()
    const eventSource = new EventSource(`${import.meta.env.VITE_API_URL}/api/swarms/sessions/${sessionId}/stream`, {
      withCredentials: true
    })

    eventSource.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data)
      if (type === 'message') {
        setMessages(prev => {
          if (prev.find(m => m.id === data.id)) return prev
          return [...prev, data]
        })
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error)
      setIsLive(false)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [sessionId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const fetchSession = async () => {
    try {
      const data = await swarmAPI.getSession(sessionId)
      setSession(data)
      if (data.status !== 'running') setIsLive(false)
    } catch (error) {
      console.error('Failed to fetch session', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl h-[80vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-card/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{swarmName}</h2>
              <div className="flex items-center gap-2 text-sm">
                <span className={cn(
                  "flex items-center gap-1.5",
                  isLive ? "text-blue-400" : "text-muted-foreground"
                )}>
                  {isLive ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Live Execution
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Execution Finished
                    </>
                  )}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">Session: {sessionId.slice(0, 8)}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Feed */}
          <div className="flex-1 flex flex-col min-w-0 bg-black/20">
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
            >
              {messages.length === 0 && !isLoading && (
                <div className="h-full flex flex-col items-center justify-center text-center p-12">
                  <Activity className="w-12 h-12 text-muted-foreground/20 mb-4 animate-pulse" />
                  <p className="text-muted-foreground">Waiting for swarm activity...</p>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-4"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg shrink-0 flex items-center justify-center",
                    msg.type === 'observation' ? "bg-blue-500/10 text-blue-400" :
                    msg.type === 'critique' ? "bg-yellow-500/10 text-yellow-400" :
                    msg.type === 'delegate' ? "bg-purple-500/10 text-purple-400" : "bg-primary/10 text-primary"
                  )}>
                    {msg.fromAgentId ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {msg.fromAgentId || 'System'}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl rounded-tl-none border text-sm leading-relaxed",
                      msg.type === 'observation' ? "bg-blue-500/5 border-blue-500/10" :
                      msg.type === 'critique' ? "bg-yellow-500/5 border-yellow-500/10" :
                      msg.type === 'delegate' ? "bg-purple-500/5 border-purple-500/10" : "bg-card border-border"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-72 border-l border-border bg-card/30 p-6 overflow-y-auto hidden lg:block custom-scrollbar">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
              Session Artifacts
            </h3>
            <div className="space-y-3">
              {session?.artifacts?.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No artifacts generated yet.</p>
              )}
              {session?.artifacts?.map((art: any) => (
                <div key={art.id} className="p-3 bg-accent/30 rounded-xl border border-border/50 group cursor-pointer hover:bg-accent/50 transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium truncate">{art.name}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase">{art.type}</p>
                </div>
              ))}
            </div>

            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-8 mb-4">
              Participants
            </h3>
            <div className="space-y-3">
              {session?.swarm?.members?.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Bot className="w-4 h-4" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-3 h-3 border-2 border-card bg-green-500 rounded-full" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">{m.agent.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{m.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        {session?.output && (
          <div className="p-4 bg-primary/5 border-t border-primary/10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-primary">
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold">Synthesis Ready</span>
            </div>
            <button className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
              View Final Result
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
