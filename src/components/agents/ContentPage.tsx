import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  FileText,
  Loader2,
  Search,
  Filter,
  Edit3,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  BarChart3,
  MessageSquare,
  Share2,
  ArrowUpRight,
} from 'lucide-react'
import { contentAPI } from '@/services/api'
import { useStore } from '@/store'
import { cn } from '@/utils/cn'
import { formatRelativeTime, formatNumber } from '@/utils/format'
import type { ContentPiece } from '@/types'
import toast from 'react-hot-toast'

export default function ContentPage() {
  const { currentProject, contentPieces, setContentPieces } = useStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPiece, setSelectedPiece] = useState<ContentPiece | null>(null)
  const queryClient = useQueryClient()

  const { data: pieces } = useQuery({
    queryKey: ['content', currentProject?.id],
    queryFn: () => contentAPI.list(currentProject?.id || '1'),
    enabled: !!currentProject,
  })

  const generateMutation = useMutation({
    mutationFn: contentAPI.generate,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content'] })
      toast.success('Content generated successfully')
      setShowCreateModal(false)
    },
    onError: () => toast.error('Failed to generate content'),
  })

  const deleteMutation = useMutation({
    mutationFn: contentAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content'] })
      toast.success('Content deleted')
    },
  })

  const filteredPieces = contentPieces.filter((piece) => {
    const matchesSearch = piece.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || piece.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: contentPieces.length,
    published: contentPieces.filter((p) => p.status === 'published').length,
    draft: contentPieces.filter((p) => p.status === 'draft').length,
    review: contentPieces.filter((p) => p.status === 'review').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Studio</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create, manage, and optimize your marketing content
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate Content</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total Pieces</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Published</p>
          <p className="text-2xl font-bold mt-1 text-green-400">{stats.published}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">In Review</p>
          <p className="text-2xl font-bold mt-1 text-yellow-400">{stats.review}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Drafts</p>
          <p className="text-2xl font-bold mt-1 text-slate-400">{stats.draft}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search content..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {(['all', 'published', 'draft', 'review'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all',
                statusFilter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-muted-foreground hover:bg-accent/80'
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredPieces.map((piece) => (
            <motion.div
              key={piece.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-xl p-5 card-hover group cursor-pointer"
              onClick={() => setSelectedPiece(piece)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn(
                  'px-2 py-1 rounded-full text-[10px] font-medium uppercase',
                  piece.status === 'published' && 'bg-green-500/10 text-green-400',
                  piece.status === 'draft' && 'bg-slate-500/10 text-slate-400',
                  piece.status === 'review' && 'bg-yellow-500/10 text-yellow-400',
                  piece.status === 'approved' && 'bg-blue-500/10 text-blue-400'
                )}>
                  {piece.status}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                    <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteMutation.mutate(piece.id)
                    }}
                    className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                {piece.title}
              </h3>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground uppercase">
                  {piece.type}
                </span>
                {piece.keywords.slice(0, 2).map((kw) => (
                  <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded bg-accent/50 text-muted-foreground">
                    {kw}
                  </span>
                ))}
              </div>

              {piece.seoScore > 0 && (
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1">
                    <BarChart3 className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">SEO: {piece.seoScore}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Read: {piece.readabilityScore}</span>
                  </div>
                </div>
              )}

              {piece.engagement && (
                <div className="flex items-center gap-3 pt-3 border-t border-border">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="w-3 h-3" />
                    {formatNumber(piece.engagement.views)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowUpRight className="w-3 h-3" />
                    {formatNumber(piece.engagement.clicks)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Share2 className="w-3 h-3" />
                    {formatNumber(piece.engagement.shares)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageSquare className="w-3 h-3" />
                    {formatNumber(piece.engagement.comments)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <span>{formatRelativeTime(piece.createdAt)}</span>
                {piece.publishedAt && <span>Published {formatRelativeTime(piece.publishedAt)}</span>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <GenerateContentModal
            onClose={() => setShowCreateModal(false)}
            onGenerate={(params) => generateMutation.mutate(params)}
            isLoading={generateMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedPiece && (
          <ContentDetailModal piece={selectedPiece} onClose={() => setSelectedPiece(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function GenerateContentModal({
  onClose,
  onGenerate,
  isLoading,
}: {
  onClose: () => void
  onGenerate: (params: {
    topic: string
    type: ContentPiece['type']
    tone: string
    keywords: string[]
    projectId: string
  }) => void
  isLoading: boolean
}) {
  const { currentProject } = useStore()
  const [topic, setTopic] = useState('')
  const [type, setType] = useState<ContentPiece['type']>('blog')
  const [tone, setTone] = useState('professional')
  const [keywords, setKeywords] = useState('')

  const handleSubmit = () => {
    if (!topic || !currentProject) return
    onGenerate({
      topic,
      type,
      tone,
      keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      projectId: currentProject.id,
    })
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
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl"
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold">Generate Content</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., SaaS Analytics Best Practices"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Content Type</label>
            <div className="flex gap-2">
              {(['blog', 'social', 'email', 'landing'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all',
                    type === t
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent text-muted-foreground hover:bg-accent/80'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Tone</label>
            <div className="flex gap-2 flex-wrap">
              {['professional', 'casual', 'technical', 'persuasive', 'educational'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all',
                    tone === t
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent text-muted-foreground hover:bg-accent/80'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Keywords (comma separated)</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="saas, analytics, dashboard"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!topic || isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Sparkles className="w-4 h-4" />
            Generate
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ContentDetailModal({ piece, onClose }: { piece: ContentPiece; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{piece.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase',
                piece.status === 'published' && 'bg-green-500/10 text-green-400',
                piece.status === 'draft' && 'bg-slate-500/10 text-slate-400',
                piece.status === 'review' && 'bg-yellow-500/10 text-yellow-400'
              )}>
                {piece.status}
              </span>
              <span className="text-xs text-muted-foreground">{piece.type}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {piece.seoScore > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-accent/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">SEO Score</p>
                <p className="text-2xl font-bold">{piece.seoScore}/100</p>
              </div>
              <div className="bg-accent/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Readability</p>
                <p className="text-2xl font-bold">{piece.readabilityScore}/100</p>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium mb-2">Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {piece.keywords.map((kw) => (
                <span key={kw} className="px-2 py-1 bg-accent rounded-lg text-xs">
                  {kw}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Content Preview</h3>
            <div className="bg-accent/30 rounded-lg p-4 text-sm whitespace-pre-wrap">
              {piece.content}
            </div>
          </div>

          {piece.engagement && (
            <div>
              <h3 className="text-sm font-medium mb-2">Engagement</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-accent/30 rounded-lg">
                  <p className="text-lg font-bold">{formatNumber(piece.engagement.views)}</p>
                  <p className="text-xs text-muted-foreground">Views</p>
                </div>
                <div className="text-center p-3 bg-accent/30 rounded-lg">
                  <p className="text-lg font-bold">{formatNumber(piece.engagement.clicks)}</p>
                  <p className="text-xs text-muted-foreground">Clicks</p>
                </div>
                <div className="text-center p-3 bg-accent/30 rounded-lg">
                  <p className="text-lg font-bold">{formatNumber(piece.engagement.shares)}</p>
                  <p className="text-xs text-muted-foreground">Shares</p>
                </div>
                <div className="text-center p-3 bg-accent/30 rounded-lg">
                  <p className="text-lg font-bold">{formatNumber(piece.engagement.comments)}</p>
                  <p className="text-xs text-muted-foreground">Comments</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
