import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Bot,
  Search,
  FileText,
  Share2,
  Key,
  BarChart3,
  Workflow,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
  Target,
} from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/utils/cn'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/agents', label: 'AI Agents', icon: Bot },
  { path: '/seo-audit', label: 'SEO Audit', icon: Search },
  { path: '/content', label: 'Content', icon: FileText },
  { path: '/social', label: 'Social Monitor', icon: Share2 },
  { path: '/keywords', label: 'Keywords', icon: Key },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/workflows', label: 'Workflows', icon: Workflow },
  { path: '/swarms', label: 'Swarm Hub', icon: Users },
  { path: '/competitors', label: 'Competitors', icon: Target },
  { path: '/geo', label: 'GEO Engine', icon: Search },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useStore()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <motion.aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-card border-r border-border z-50 flex flex-col',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
      initial={false}
      animate={{ width: sidebarOpen ? 256 : 64 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <span className="font-bold text-lg gradient-text">AI Marketing</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-primary')} />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!sidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-border shadow-lg">
                  {item.label}
                </div>
              )}
            </button>
          )
        })}
      </nav>

      {/* Toggle */}
      <div className="p-2 border-t border-border">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-accent transition-colors"
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </motion.aside>
  )
}
