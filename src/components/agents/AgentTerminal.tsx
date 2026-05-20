// src/components/agents/AgentTerminal.tsx
// Real-time "Live Agent Process" terminal that shows WebSocket log events.

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Wifi, WifiOff, Loader2 } from 'lucide-react'
import { socket } from '@/lib/socket'

interface AgentLog {
  agentId: string
  message: string
  timestamp: string
  level?: 'info' | 'warn' | 'success' | 'error'
}

interface AgentTerminalProps {
  projectId: string
  maxLogs?: number
  className?: string
}

export function AgentTerminal({ projectId, maxLogs = 12, className = '' }: AgentTerminalProps) {
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [connected, setConnected] = useState(socket.connected)
  const [isActive, setIsActive] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!projectId) return

    // Join the project room so we only receive logs for this project
    socket.emit('join_project', projectId)

    const handleLog = (log: AgentLog) => {
      setIsActive(true)
      setLogs(prev => [...prev, log].slice(-maxLogs))
    }

    const handleConnect = () => setConnected(true)
    const handleDisconnect = () => setConnected(false)

    socket.on('agent-log', handleLog)
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)

    // Reset activity indicator after 5 seconds of silence
    let activityTimer: ReturnType<typeof setTimeout>
    if (isActive) {
      activityTimer = setTimeout(() => setIsActive(false), 5000)
    }

    return () => {
      socket.off('agent-log', handleLog)
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      clearTimeout(activityTimer)
    }
  }, [projectId, maxLogs, isActive])

  // Auto-scroll to bottom when new log arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const levelColor: Record<string, string> = {
    info: 'text-green-400',
    warn: 'text-yellow-400',
    success: 'text-emerald-400',
    error: 'text-red-400',
  }

  const levelPrefix: Record<string, string> = {
    info: '●',
    warn: '▲',
    success: '✔',
    error: '✖',
  }

  return (
    <div className={`rounded-xl overflow-hidden border border-white/10 shadow-2xl ${className}`}>
      {/* Terminal title bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-white/5">
        <div className="flex items-center gap-2">
          {/* macOS-style traffic lights */}
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
          <Terminal className="w-3.5 h-3.5 text-white/40 ml-2" />
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
            Live Agent Process
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1 text-[10px] text-green-400 font-mono"
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>running</span>
            </motion.div>
          )}
          <div className={`flex items-center gap-1 text-[10px] font-mono ${connected ? 'text-green-500' : 'text-red-500'}`}>
            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{connected ? 'live' : 'offline'}</span>
          </div>
        </div>
      </div>

      {/* Log output area */}
      <div className="bg-black/80 p-4 font-mono text-xs h-48 overflow-y-auto space-y-1 scroll-smooth">
        <AnimatePresence initial={false}>
          {logs.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-white/20 select-none"
            >
              <span className="animate-pulse">█</span>{' '}
              Waiting for agent activity...
            </motion.div>
          ) : (
            logs.map((log, i) => {
              const level = log.level || 'info'
              const color = levelColor[level] || 'text-green-400'
              const prefix = levelPrefix[level] || '●'
              return (
                <motion.div
                  key={`${log.timestamp}-${i}`}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex gap-2 leading-relaxed"
                >
                  <span className="text-white/30 shrink-0">
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>
                  <span className={`shrink-0 ${color}`}>{prefix}</span>
                  <span className="text-white/80">{log.message}</span>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

export default AgentTerminal
