import axios from 'axios'
import type {
  User,
  Project,
  Agent,
  SEOAudit,
  ContentPiece,
  SocialMonitor,
  KeywordData,
  AnalyticsData,
  Notification,
  Workflow,
} from '@/types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
    const { data } = await api.post('/auth/login', { email, password })
    return data
  },
  register: async (email: string, password: string, name: string): Promise<{ user: User; token: string }> => {
    const { data } = await api.post('/auth/register', { email, password, name })
    return data
  },
  me: async (): Promise<User> => {
    const { data } = await api.get('/auth/me')
    return data
  },
}

export const projectAPI = {
  list: async (): Promise<Project[]> => {
    const { data } = await api.get('/projects')
    return data
  },
  get: async (id: string): Promise<Project> => {
    const { data } = await api.get(`/projects/${id}`)
    return data
  },
  create: async (project: { name: string; url: string; description?: string }): Promise<Project> => {
    const { data } = await api.post('/projects', project)
    return data
  },
  update: async (id: string, updates: Partial<Project>): Promise<Project> => {
    const { data } = await api.patch(`/projects/${id}`, updates)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`)
  },
}

export const agentAPI = {
  list: async (projectId?: string): Promise<Agent[]> => {
    const { data } = await api.get('/agents', { params: { projectId } })
    return data
  },
  get: async (id: string): Promise<Agent> => {
    const { data } = await api.get(`/agents/${id}`)
    return data
  },
  create: async (agent: Omit<Agent, 'id' | 'metrics' | 'results'>): Promise<Agent> => {
    const { data } = await api.post('/agents', agent)
    return data
  },
  update: async (id: string, updates: Partial<Agent>): Promise<Agent> => {
    const { data } = await api.patch(`/agents/${id}`, updates)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/agents/${id}`)
  },
  run: async (id: string): Promise<{ success: boolean; jobId: string }> => {
    const { data } = await api.post(`/agents/${id}/run`)
    return data
  },
  stop: async (id: string): Promise<void> => {
    await api.post(`/agents/${id}/stop`)
  },
}

export const seoAPI = {
  audit: async (projectId: string): Promise<{ success: boolean; jobId: string; agentId: string }> => {
    const { data } = await api.post('/seo/audit', { projectId })
    return data
  },
  getAudit: async (auditId: string): Promise<SEOAudit> => {
    const { data } = await api.get(`/seo/audit/${auditId}`)
    return data
  },
  getAudits: async (projectId?: string): Promise<SEOAudit[]> => {
    const { data } = await api.get('/seo/audits', { params: { projectId } })
    return data
  },
}

export const contentAPI = {
  list: async (projectId: string): Promise<ContentPiece[]> => {
    const { data } = await api.get('/content', { params: { projectId } })
    return data
  },
  create: async (piece: Omit<ContentPiece, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContentPiece> => {
    const { data } = await api.post('/content', piece)
    return data
  },
  generate: async (params: {
    topic: string
    type: ContentPiece['type']
    tone: string
    keywords: string[]
    projectId: string
  }): Promise<{ success: boolean; jobId: string; message: string }> => {
    const { data } = await api.post('/content/generate', params)
    return data
  },
  update: async (id: string, updates: Partial<ContentPiece>): Promise<ContentPiece> => {
    const { data } = await api.patch(`/content/${id}`, updates)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/content/${id}`)
  },
}

export const socialAPI = {
  monitor: async (projectId: string, platform: string): Promise<SocialMonitor> => {
    const { data } = await api.get('/social/monitor', { params: { projectId, platform } })
    return data
  },
  mentions: async (projectId: string, platform?: string): Promise<SocialMonitor['mentions']> => {
    const { data } = await api.get('/social/mentions', { params: { projectId, platform } })
    return data
  },
  startMonitor: async (projectId: string, platform: string, keywords: string[]): Promise<{ success: boolean; jobId: string }> => {
    const { data } = await api.post('/social/monitor', { projectId, platform, keywords })
    return data
  },
}

export const keywordAPI = {
  list: async (projectId: string): Promise<KeywordData[]> => {
    const { data } = await api.get('/keywords', { params: { projectId } })
    return data
  },
  research: async (projectId: string, seed: string): Promise<{ success: boolean; jobId: string }> => {
    const { data } = await api.post('/keywords/research', { projectId, seed })
    return data
  },
}

export const analyticsAPI = {
  get: async (projectId: string, days = 30): Promise<AnalyticsData[]> => {
    const { data } = await api.get('/analytics', { params: { projectId, days } })
    return data
  },
}

export const notificationAPI = {
  list: async (): Promise<Notification[]> => {
    const { data } = await api.get('/notifications')
    return data
  },
  markRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`)
  },
  markAllRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all')
  },
}

export const workflowAPI = {
  list: async (projectId?: string): Promise<Workflow[]> => {
    const { data } = await api.get('/workflows', { params: { projectId } })
    return data
  },
  create: async (workflow: Omit<Workflow, 'id' | 'runs'>): Promise<Workflow> => {
    const { data } = await api.post('/workflows', workflow)
    return data
  },
  update: async (id: string, updates: Partial<Workflow>): Promise<Workflow> => {
    const { data } = await api.patch(`/workflows/${id}`, updates)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/workflows/${id}`)
  },
  run: async (id: string): Promise<{ success: boolean; jobId: string }> => {
    const { data } = await api.post(`/workflows/${id}/run`)
    return data
  },
}

export default api
