import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Search,
  Plus,
  LogOut,
  User,
  ChevronDown,
  Check,
  Zap,
  Building2,
  Coins,
} from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/utils/cn'
import { formatRelativeTime } from '@/utils/format'

export default function Header() {
  const { user, logout, notifications, markNotificationRead, markAllNotificationsRead, currentProject, projects, setCurrentProject, wallet } = useStore()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false)
  const navigate = useNavigate()

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search agents, content, keywords..."
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        {/* Project Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowProjectSwitcher(!showProjectSwitcher)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{currentProject?.name || 'Select Project'}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
          <AnimatePresence>
            {showProjectSwitcher && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute top-full left-0 mt-2 w-64 bg-popover border border-border rounded-lg shadow-xl z-50 py-1"
              >
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setCurrentProject(project)
                      setShowProjectSwitcher(false)
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors',
                      currentProject?.id === project.id && 'bg-accent'
                    )}
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="flex-1 text-left">{project.name}</span>
                    {currentProject?.id === project.id && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
                <div className="border-t border-border mt-1 pt-1">
                  <button
                    onClick={() => {
                      setShowProjectSwitcher(false)
                      navigate('/settings?tab=projects')
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-muted-foreground"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Project</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Token Balance */}
        <button
          onClick={() => navigate('/billing')}
          className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-all group"
        >
          <Coins className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold text-amber-200">
            {wallet?.balance.toLocaleString() || '0'}
          </span>
        </button>

        {/* Quick Actions */}
        <button
          onClick={() => navigate('/agents?create=true')}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Zap className="w-4 h-4" />
          <span>Deploy Agent</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-96 bg-popover border border-border rounded-lg shadow-xl z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  <button
                    onClick={() => markAllNotificationsRead()}
                    className="text-xs text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => {
                          markNotificationRead(notification.id)
                          if (notification.action) {
                            navigate(notification.action.url)
                          }
                          setShowNotifications(false)
                        }}
                        className={cn(
                          'w-full flex gap-3 px-4 py-3 hover:bg-accent transition-colors text-left border-b border-border/50 last:border-0',
                          !notification.read && 'bg-primary/5'
                        )}
                      >
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                            notification.type === 'success' && 'bg-green-500',
                            notification.type === 'warning' && 'bg-yellow-500',
                            notification.type === 'error' && 'bg-red-500',
                            notification.type === 'info' && 'bg-blue-500'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{notification.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {formatRelativeTime(notification.timestamp)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <img
              src={user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
              alt={user?.name}
              className="w-8 h-8 rounded-full bg-accent"
            />
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-lg shadow-xl z-50 py-1"
              >
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    navigate('/settings')
                    setShowProfile(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Profile Settings</span>
                </button>
                <button
                  onClick={() => {
                    logout()
                    localStorage.removeItem('token')
                    setShowProfile(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
