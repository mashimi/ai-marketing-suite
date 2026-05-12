import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Project, Agent, Notification, Workflow, ContentPiece } from '@/types'

interface AppState {
  // Auth
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  login: (user: User) => void
  logout: () => void

  // Projects
  projects: Project[]
  currentProject: Project | null
  setProjects: (projects: Project[]) => void
  setCurrentProject: (project: Project | null) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  removeProject: (id: string) => void

  // Agents
  agents: Agent[]
  setAgents: (agents: Agent[]) => void
  addAgent: (agent: Agent) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
  removeAgent: (id: string) => void

  // Content
  contentPieces: ContentPiece[]
  setContentPieces: (pieces: ContentPiece[]) => void
  addContentPiece: (piece: ContentPiece) => void
  updateContentPiece: (id: string, updates: Partial<ContentPiece>) => void

  // Workflows
  workflows: Workflow[]
  setWorkflows: (workflows: Workflow[]) => void
  addWorkflow: (workflow: Workflow) => void
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void

  // Notifications
  notifications: Notification[]
  addNotification: (notification: Notification) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  removeNotification: (id: string) => void
  setNotifications: (notifications: Notification[]) => void

  // UI State
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  activeTab: string
  setActiveTab: (tab: string) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false, currentProject: null }),

      // Projects
      projects: [],
      currentProject: null,
      setProjects: (projects) => set({ projects }),
      setCurrentProject: (project) => set({ currentProject: project }),
      addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),
      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProject: state.currentProject?.id === id ? null : state.currentProject,
        })),

      // Agents
      agents: [],
      setAgents: (agents) => set({ agents }),
      addAgent: (agent) => set((state) => ({ agents: [...state.agents, agent] })),
      updateAgent: (id, updates) =>
        set((state) => ({
          agents: state.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),
      removeAgent: (id) =>
        set((state) => ({ agents: state.agents.filter((a) => a.id !== id) })),

      // Content
      contentPieces: [],
      setContentPieces: (pieces) => set({ contentPieces: pieces }),
      addContentPiece: (piece) =>
        set((state) => ({ contentPieces: [...state.contentPieces, piece] })),
      updateContentPiece: (id, updates) =>
        set((state) => ({
          contentPieces: state.contentPieces.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      // Workflows
      workflows: [],
      setWorkflows: (workflows) => set({ workflows }),
      addWorkflow: (workflow) => set((state) => ({ workflows: [...state.workflows, workflow] })),
      updateWorkflow: (id, updates) =>
        set((state) => ({
          workflows: state.workflows.map((w) => (w.id === id ? { ...w, ...updates } : w)),
        })),

      // Notifications
      notifications: [],
      setNotifications: (notifications) => set({ notifications }),
      addNotification: (notification) =>
        set((state) => ({ notifications: [notification, ...state.notifications].slice(0, 50) })),
      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      markAllNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      // UI State
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'ai-marketing-suite-storage',
      version: 2, // Bumped to purge stale auth fields from previous versions
      migrate: (persistedState: unknown) => {
        // Remove any stale auth data — auth is always verified via token
        const state = persistedState as Record<string, unknown>
        delete state.user
        delete state.isAuthenticated
        return state
      },
      // Only persist non-auth UI state — auth is always re-verified via token
      partialize: (state) => ({
        projects: state.projects,
        currentProject: state.currentProject,
        agents: state.agents,
        contentPieces: state.contentPieces,
        workflows: state.workflows,
        notifications: state.notifications,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
)
