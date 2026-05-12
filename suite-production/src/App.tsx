import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from '@/store'
import { authAPI } from '@/services/api'
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

function App() {
  const { isAuthenticated, login, logout } = useStore()
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    let cancelled = false

    const initAuth = async () => {
      const token = localStorage.getItem('token')
      
      if (!token) {
        if (!cancelled) setIsInitializing(false)
        return
      }

      try {
        const user = await authAPI.me()
        if (!cancelled) {
          login(user)
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
        if (!cancelled) {
          logout()
        }
      } finally {
        if (!cancelled) {
          setIsInitializing(false)
        }
      }
    }

    initAuth()
    return () => { cancelled = true }
  }, [login, logout])

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
