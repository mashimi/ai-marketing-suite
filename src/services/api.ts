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
  Swarm,
  SwarmSession,
  Competitor
} from '@/types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3002/api',
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
    return data.map((agent: any) => ({
      ...agent,
      type: agent.type ? agent.type.replace(/_/g, '-') : agent.type,
    }))
  },
  get: async (id: string): Promise<Agent> => {
    const { data } = await api.get(`/agents/${id}`)
    return {
      ...data,
      type: data.type ? data.type.replace(/_/g, '-') : data.type,
    }
  },
  create: async (agent: Omit<Agent, 'id' | 'metrics' | 'results'>): Promise<Agent> => {
    const backendAgent = {
      ...agent,
      type: agent.type ? agent.type.replace(/-/g, '_') : agent.type,
    }
    const { data } = await api.post('/agents', backendAgent)
    return {
      ...data,
      type: data.type ? data.type.replace(/_/g, '-') : data.type,
    }
  },
  update: async (id: string, updates: Partial<Agent>): Promise<Agent> => {
    const backendUpdates = {
      ...updates,
      type: updates.type ? updates.type.replace(/-/g, '_') : updates.type,
    }
    const { data } = await api.patch(`/agents/${id}`, backendUpdates)
    return {
      ...data,
      type: data.type ? data.type.replace(/_/g, '-') : data.type,
    }
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
  startMonitor: async (params: { 
    projectId: string; 
    platform: string; 
    keywords: string[];
    hashtags?: string[];
    competitorProfiles?: string[];
  }): Promise<{ success: boolean; jobId: string }> => {
    const { data } = await api.post('/social/monitor', params)
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

export const reportAPI = {
  downloadSEOReport: async (projectId: string): Promise<void> => {
    const response = await api.get(`/reports/seo/${projectId}`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `seo-report-${projectId}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  },
}

export const aiAPI = {
  generate: async (params: any): Promise<any> => {
    const { data } = await api.post('/ai/generate', params)
    return data
  },
  // Streaming is handled differently via direct URL in EventSource or fetch
}


export const swarmAPI = {
  listByProject: async (projectId: string): Promise<Swarm[]> => {
    const { data } = await api.get(`/swarms/project/${projectId}`)
    return data
  },
  create: async (swarm: Partial<Swarm>): Promise<Swarm> => {
    const { data } = await api.post('/swarms', swarm)
    return data
  },
  execute: async (swarmId: string, input: Record<string, unknown>): Promise<{ message: string; jobId: string }> => {
    const { data } = await api.post(`/swarms/${swarmId}/execute`, { input })
    return data
  },
  getSessions: async (swarmId: string): Promise<SwarmSession[]> => {
    const { data } = await api.get(`/swarms/${swarmId}/sessions`)
    return data
  },
  getSession: async (sessionId: string): Promise<SwarmSession> => {
    const { data } = await api.get(`/swarms/sessions/${sessionId}`)
    return data
  },
  delete: async (swarmId: string): Promise<void> => {
    await api.delete(`/swarms/${swarmId}`)
  },
}

export const competitorAPI = {
  list: async (projectId: string): Promise<Competitor[]> => {
    const { data } = await api.get('/competitors', { params: { projectId } })
    return data
  },
  get: async (id: string): Promise<Competitor> => {
    const { data } = await api.get(`/competitors/${id}`)
    return data
  },
  add: async (projectId: string, domain: string): Promise<Competitor> => {
    const { data } = await api.post(`/competitors?projectId=${projectId}`, { domain })
    return data
  },
  analyze: async (id: string): Promise<Competitor> => {
    const { data } = await api.post(`/competitors/${id}/analyze`)
    return data
  },
  compare: async (projectId: string, competitorIds: string[]): Promise<any> => {
    const { data } = await api.post('/competitors/compare', { projectId, competitorIds })
    return data
  },
  trends: async (id: string, days = 90): Promise<any[]> => {
    const { data } = await api.get(`/competitors/${id}/trends`, { params: { days } })
    return data
  },
  updateGap: async (gapId: string, data: { status?: string; resolvedBy?: string }): Promise<void> => {
    await api.patch(`/competitors/gaps/${gapId}`, data)
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/competitors/${id}`)
  },
}

export const geoAPI = {
  // Original endpoints
  getDashboard: async (projectId: string): Promise<any> => {
    const { data } = await api.get(`/geo/dashboard/${projectId}`)
    return data
  },
  checkRankings: async (projectId: string, queries: string[], platforms?: string[]): Promise<any> => {
    const { data } = await api.post('/geo/check-rankings', { projectId, queries, platforms })
    return data
  },
  getRecommendations: async (projectId: string, query: string, platform?: string): Promise<any> => {
    const { data } = await api.get('/geo/recommendations', { params: { projectId, query, platform } })
    return data
  },
  applyOptimization: async (projectId: string, contentId: string, query: string): Promise<any> => {
    const { data } = await api.post('/geo/optimize/apply', { projectId, contentId, query })
    return data
  },
  autoOptimizeAll: async (projectId: string, limit?: number): Promise<any> => {
    const { data } = await api.post('/geo/optimize/auto', { projectId, limit })
    return data
  },

  // --- New Citation Index Endpoints ---
  getCitationIndex: async (projectId: string): Promise<any> => {
    const { data } = await api.get(`/geo/citations/${projectId}`)
    return data
  },
  scrapeCitations: async (projectId: string, query: string, platform?: string): Promise<any> => {
    const { data } = await api.post('/geo/citations/scrape', { projectId, query, platform })
    return data
  },

  // --- New Entity Analysis Endpoints ---
  getEntityCoverage: async (projectId: string): Promise<any> => {
    const { data } = await api.get(`/geo/entities/${projectId}`)
    return data
  },
  updateEntityCoverage: async (projectId: string): Promise<any> => {
    const { data } = await api.post('/geo/entities/update', { projectId })
    return data
  },

  // --- New A/B Testing Endpoints ---
  getABTests: async (projectId: string): Promise<any> => {
    const { data } = await api.get(`/geo/ab-tests/${projectId}`)
    return data
  },
  runABTestMeasurement: async (projectId: string): Promise<any> => {
    const { data } = await api.post('/geo/ab-tests/measure', { projectId })
    return data
  },
  createABTest: async (params: {
    projectId: string
    contentId: string
    query: string
    originalContent: string
    optimizedContent: string
    changesApplied?: Record<string, unknown>
    variantName?: string
  }): Promise<any> => {
    const { data } = await api.post('/geo/ab-tests/create', params)
    return data
  },

  // --- New Review Queue Endpoints ---
  getReviews: async (projectId: string, severity?: string): Promise<any> => {
    const params: any = { projectId }
    if (severity) params.severity = severity
    const { data } = await api.get(`/geo/reviews/${projectId}`, { params: { severity } })
    return data
  },
  reviewItem: async (itemId: string, action: 'approve' | 'reject', notes?: string): Promise<any> => {
    const { data } = await api.post('/geo/reviews/review', { itemId, action, notes })
    return data
  },
  getDiffSummary: async (itemId: string): Promise<any> => {
    const { data } = await api.get(`/geo/reviews/diff/${itemId}`)
    return data
  },

  // --- Query Clustering ---
  clusterQueries: async (projectId: string): Promise<any> => {
    const { data } = await api.post('/geo/cluster', { projectId })
    return data
  },
  getClusters: async (projectId: string): Promise<any> => {
    const { data } = await api.get(`/geo/clusters/${projectId}`)
    return data
  }
}

export default api
