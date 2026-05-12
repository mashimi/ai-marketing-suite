import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useStore } from '@/store'
import { authAPI, projectAPI } from '@/services/api'
import Layout from '@/components/Layout'
import Dashboard from '@/components/dashboard/Dashboard'
import AgentsPage from '@/components/agents/AgentsPage'
import SEOAuditPage from '@/components/agents/SEOAuditPage'
import ContentPage from '@/components/agents/ContentPage'
import SocialPage from '@/components/agents/SocialPage'
import KeywordsPage from '@/components/agents/KeywordsPage'
import AnalyticsPage from '@/components/dashboard/AnalyticsPage'
import WorkflowsPage from '@/components/agents/WorkflowsPage'
import SettingsPage from '@/components/SettingsPage'
import LoginPage from '@/components/LoginPage'
import { Loader2, Sparkles } from 'lucide-react'

function App() {
  const { isAuthenticated, login, logout, setProjects, currentProject, setCurrentProject } = useStore()
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    let cancelled = false

    const checkAuth = async () => {
      const token = localStorage.getItem('token')

      if (!token) {
        if (!cancelled) {
          logout()
          setIsInitializing(false)
        }
        return
      }

      try {
        const user = await authAPI.me()
        if (!cancelled) {
          login(user)
          setIsInitializing(false)
        }
      } catch {
        if (!cancelled) {
          logout()
          localStorage.removeItem('token')
          setIsInitializing(false)
        }
      }
    }

    checkAuth()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      projectAPI.list().then(projects => {
        setProjects(projects)
        if (projects.length > 0 && !currentProject) {
          setCurrentProject(projects[0])
        }
      }).catch(console.error)

      // Add welcome notification if none exist
      if (useStore.getState().notifications.length === 0) {
        useStore.getState().addNotification({
          id: 'welcome',
          type: 'info',
          title: 'Welcome to AI Marketing Suite',
          message: 'Explore your projects and deploy AI agents to boost your SEO and content strategy.',
          timestamp: new Date().toISOString(),
          read: false,
          action: { label: 'Quick Start Guide', url: '/dashboard' }
        })
      }
    }
  }, [isAuthenticated, currentProject, setCurrentProject, setProjects])

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">AI Marketing Suite</h1>
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/seo-audit" element={<SEOAuditPage />} />
        <Route path="/content" element={<ContentPage />} />
        <Route path="/social" element={<SocialPage />} />
        <Route path="/keywords" element={<KeywordsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/workflows" element={<WorkflowsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
