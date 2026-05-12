import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Building2,
  Bell,
  Shield,
  CreditCard,
  Key,
  Globe,
  Mail,
  Smartphone,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'projects', label: 'Projects', icon: Building2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'Integrations', icon: Key },
  { id: 'billing', label: 'Billing', icon: CreditCard },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const { user, projects, currentProject, setCurrentProject } = useStore()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account, projects, and preferences
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'projects' && <ProjectSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'integrations' && <IntegrationSettings />}
          {activeTab === 'billing' && <BillingSettings />}
        </div>
      </div>
    </div>
  )
}

function ProfileSettings() {
  const { user } = useStore()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 800))
    toast.success('Profile updated')
    setSaving(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-6 space-y-6"
    >
      <h2 className="text-lg font-semibold">Profile Settings</h2>

      <div className="flex items-center gap-4">
        <img
          src={user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
          alt={user?.name}
          className="w-16 h-16 rounded-full bg-accent"
        />
        <div>
          <p className="text-sm font-medium">Profile Picture</p>
          <p className="text-xs text-muted-foreground">Update your avatar</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </motion.div>
  )
}

function ProjectSettings() {
  const { projects, currentProject, setCurrentProject } = useStore()
  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Projects</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Project
        </button>
      </div>

      <div className="space-y-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className={cn(
              'bg-card border rounded-xl p-5 transition-all',
              currentProject?.id === project.id
                ? 'border-primary/50 bg-primary/5'
                : 'border-border hover:border-primary/20'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{project.name}</h3>
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {project.url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentProject?.id !== project.id && (
                  <button
                    onClick={() => setCurrentProject(project)}
                    className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-accent transition-colors"
                  >
                    Switch
                  </button>
                )}
                <button className="p-2 rounded-lg hover:bg-accent transition-colors">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Traffic</p>
                <p className="text-sm font-semibold">{project.metrics.totalTraffic.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Authority</p>
                <p className="text-sm font-semibold">{project.metrics.domainAuthority}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Keywords</p>
                <p className="text-sm font-semibold">{project.metrics.keywordRankings}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Backlinks</p>
                <p className="text-sm font-semibold">{project.metrics.backlinks.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <AddProjectModal onClose={() => setShowAddModal(false)} />
      )}
    </motion.div>
  )
}

function AddProjectModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    toast.success('Project added')
    setSaving(false)
    onClose()
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-2xl"
      >
        <h2 className="text-xl font-bold mb-4">Add New Project</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My SaaS Product"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Website URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              rows={2}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name || !url || saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Add Project
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function NotificationSettings() {
  const [settings, setSettings] = useState({
    emailAlerts: true,
    pushNotifications: false,
    weeklyReports: true,
    agentCompletion: true,
    rankingChanges: true,
    socialMentions: true,
    competitorAlerts: false,
  })

  const toggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-6 space-y-6"
    >
      <h2 className="text-lg font-semibold">Notification Preferences</h2>

      <div className="space-y-4">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
            <div>
              <p className="text-sm font-medium">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}</p>
              <p className="text-xs text-muted-foreground">Receive notifications for {key.replace(/([A-Z])/g, ' $1').toLowerCase()}</p>
            </div>
            <button
              onClick={() => toggle(key as keyof typeof settings)}
              className={cn(
                'w-11 h-6 rounded-full transition-colors relative',
                value ? 'bg-primary' : 'bg-muted'
              )}
            >
              <div
                className={cn(
                  'w-4 h-4 rounded-full bg-white absolute top-1 transition-transform',
                  value ? 'left-6' : 'left-1'
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function IntegrationSettings() {
  const integrations = [
    { name: 'Google Search Console', icon: Globe, connected: true, status: 'active' },
    { name: 'Google Analytics 4', icon: BarChart3, connected: true, status: 'active' },
    { name: 'Ahrefs API', icon: Key, connected: false, status: 'disconnected' },
    { name: 'Semrush API', icon: Key, connected: false, status: 'disconnected' },
    { name: 'OpenAI API', icon: Key, connected: true, status: 'active' },
    { name: 'Slack', icon: Mail, connected: true, status: 'active' },
    { name: 'Zapier', icon: Zap, connected: false, status: 'disconnected' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <h2 className="text-lg font-semibold">Integrations</h2>

      <div className="space-y-3">
        {integrations.map((integration) => {
          const Icon = integration.icon
          return (
            <div
              key={integration.name}
              className="bg-card border border-border rounded-xl p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{integration.name}</p>
                  <p className={cn(
                    'text-xs',
                    integration.status === 'active' ? 'text-green-400' : 'text-muted-foreground'
                  )}>
                    {integration.status === 'active' ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              <button
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  integration.connected
                    ? 'border border-border hover:bg-accent'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                {integration.connected ? 'Configure' : 'Connect'}
              </button>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

function BillingSettings() {
  const { user } = useStore()
  const plan = user?.plan || 'free'

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      features: ['1 Project', '3 Agents', '1 Workflow', '5 Content Pieces', '50 Keywords'],
      current: plan === 'free',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 49,
      features: ['5 Projects', '15 Agents', '10 Workflows', '50 Content Pieces', '500 Keywords', 'Priority Support'],
      current: plan === 'pro',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 199,
      features: ['Unlimited Projects', 'Unlimited Agents', 'Unlimited Workflows', 'Unlimited Content', 'Unlimited Keywords', 'Dedicated Support', 'Custom Integrations'],
      current: plan === 'enterprise',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <h2 className="text-lg font-semibold">Billing & Plans</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => (
          <div
            key={p.id}
            className={cn(
              'bg-card border rounded-xl p-6 transition-all',
              p.current
                ? 'border-primary/50 bg-primary/5'
                : 'border-border hover:border-primary/20'
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{p.name}</h3>
              {p.current && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                  Current
                </span>
              )}
            </div>
            <div className="mb-4">
              <span className="text-3xl font-bold">${p.price}</span>
              <span className="text-muted-foreground text-sm">/month</span>
            </div>
            <ul className="space-y-2 mb-6">
              {p.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              disabled={p.current}
              className={cn(
                'w-full py-2 rounded-lg text-sm font-medium transition-colors',
                p.current
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              {p.current ? 'Current Plan' : 'Upgrade'}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-medium mb-4">Usage This Month</h3>
        <div className="space-y-4">
          {[
            { label: 'API Calls', used: 3420, limit: 10000 },
            { label: 'Content Pieces', used: 12, limit: 50 },
            { label: 'Keywords', used: 234, limit: 500 },
          ].map((usage) => (
            <div key={usage.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">{usage.label}</span>
                <span className="text-xs text-muted-foreground">
                  {usage.used.toLocaleString()} / {usage.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${(usage.used / usage.limit) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
