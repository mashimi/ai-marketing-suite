import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Share2,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Filter,
  ExternalLink,
  Hash,
  Activity,
  Search,
  Instagram,
  Users,
  Settings,
  X,
  Plus,
  Loader2,
} from 'lucide-react'
import { socialAPI } from '@/services/api'
import { useStore } from '@/store'
import { cn } from '@/utils/cn'
import { formatRelativeTime, formatNumber } from '@/utils/format'
import type { SocialMention, TrendingTopic } from '@/types'
import { toast } from 'sonner'

export default function SocialPage() {
  const { currentProject } = useStore()
  const queryClient = useQueryClient()
  const [platform, setPlatform] = useState<'reddit' | 'hackernews' | 'twitter' | 'linkedin' | 'instagram'>('reddit')
  const [sentimentFilter, setSentimentFilter] = useState<string>('all')
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  
  // Instagram specific config
  const [hashtags, setHashtags] = useState<string[]>([])
  const [competitors, setCompetitors] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [newComp, setNewComp] = useState('')

  const { data: monitorData, isLoading } = useQuery({
    queryKey: ['social', platform, currentProject?.id],
    queryFn: () => socialAPI.monitor(currentProject?.id || '1', platform),
    enabled: !!currentProject,
  })

  const startMonitorMutation = useMutation({
    mutationFn: (params: any) => socialAPI.startMonitor(params),
    onSuccess: () => {
      toast.success('Monitoring job started successfully')
      setIsConfigModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['social', platform] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to start monitoring')
    }
  })

  const handleStartMonitor = () => {
    if (!currentProject) return

    startMonitorMutation.mutate({
      projectId: currentProject.id,
      platform,
      keywords: currentProject.name.split(' '), // Default keywords
      ...(platform === 'instagram' && { 
        hashtags, 
        competitorProfiles: competitors 
      })
    })
  }

  const platforms = [
    { id: 'reddit' as const, label: 'Reddit', icon: MessageSquare },
    { id: 'hackernews' as const, label: 'Hacker News', icon: Share2 },
    { id: 'twitter' as const, label: 'X/Twitter', icon: Share2 },
    { id: 'linkedin' as const, label: 'LinkedIn', icon: Share2 },
    { id: 'instagram' as const, label: 'Instagram', icon: Instagram },
  ]

  const filteredMentions = monitorData?.mentions.filter((m) =>
    sentimentFilter === 'all' || m.sentiment === sentimentFilter
  ) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Social Monitor</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track mentions, sentiment, and trends across social platforms
          </p>
        </div>
        {platform === 'instagram' && (
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-all"
          >
            <Settings className="w-4 h-4" />
            Configure Instagram
          </button>
        )}
      </div>

      {/* Platform Tabs */}
      <div className="flex items-center gap-2">
        {platforms.map((p) => {
          const Icon = p.icon
          return (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                platform === p.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:bg-accent'
              )}
            >
              <Icon className="w-4 h-4" />
              {p.label}
            </button>
          )
        })}
      </div>

      {/* Sentiment Overview */}
      {monitorData?.sentiment && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Overall Sentiment</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-2xl font-bold',
                monitorData.sentiment.overall > 0.6 ? 'text-green-400' :
                monitorData.sentiment.overall > 0.4 ? 'text-yellow-400' : 'text-red-400'
              )}>
                {(monitorData.sentiment.overall * 100).toFixed(0)}%
              </span>
              {monitorData.sentiment.trend === 'up' && <TrendingUp className="w-5 h-5 text-green-400" />}
              {monitorData.sentiment.trend === 'down' && <TrendingDown className="w-5 h-5 text-red-400" />}
              {monitorData.sentiment.trend === 'stable' && <Minus className="w-5 h-5 text-yellow-400" />}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <ThumbsUp className="w-4 h-4 text-green-400" />
              <span className="text-sm text-muted-foreground">Positive</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{monitorData.sentiment.positive}%</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Minus className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-muted-foreground">Neutral</span>
            </div>
            <p className="text-2xl font-bold text-yellow-400">{monitorData.sentiment.neutral}%</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <ThumbsDown className="w-4 h-4 text-red-400" />
              <span className="text-sm text-muted-foreground">Negative</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{monitorData.sentiment.negative}%</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mentions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Mentions</h2>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              {(['all', 'positive', 'neutral', 'negative'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSentimentFilter(s)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all',
                    sentimentFilter === s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent text-muted-foreground hover:bg-accent/80'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredMentions.map((mention, i) => (
              <motion.div
                key={mention.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-sm">{mention.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'w-2 h-2 rounded-full',
                      mention.sentiment === 'positive' && 'bg-green-500',
                      mention.sentiment === 'neutral' && 'bg-yellow-500',
                      mention.sentiment === 'negative' && 'bg-red-500'
                    )} />
                    <span className="text-xs text-muted-foreground capitalize">{mention.sentiment}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{mention.content}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>u/{mention.author}</span>
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" />
                      {mention.upvotes} {platform === 'instagram' ? 'likes' : 'upvotes'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {mention.comments}
                    </span>
                    <span>{formatRelativeTime(mention.timestamp)}</span>
                  </div>
                  <a
                    href={mention.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Trending Topics */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Trending Topics</h2>
          <div className="space-y-3">
            {monitorData?.trending.map((topic, i) => (
              <motion.div
                key={topic.topic}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-sm">{topic.topic}</h3>
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <TrendingUp className="w-3 h-3" />
                    +{topic.growth}%
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                  <span>{formatNumber(topic.volume)} mentions</span>
                  <span className={cn(
                    topic.sentiment > 0.6 ? 'text-green-400' :
                    topic.sentiment > 0.4 ? 'text-yellow-400' : 'text-red-400'
                  )}>
                    Sentiment: {(topic.sentiment * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {topic.relatedKeywords.map((kw) => (
                    <span key={kw} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-accent rounded-full text-muted-foreground">
                      <Hash className="w-2.5 h-2.5" />
                      {kw}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Keywords */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-medium mb-3">Monitored Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {monitorData?.keywords.map((kw) => (
                <span key={kw} className="px-2 py-1 bg-accent rounded-lg text-xs text-muted-foreground">
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Instagram Influencers */}
          {platform === 'instagram' && monitorData?.influencerMentions && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-medium">Influencer Discovery</h3>
              </div>
              <div className="space-y-4">
                {monitorData.influencerMentions.map((inf) => (
                  <div key={inf.username} className="flex flex-col gap-1 border-b border-border last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">@{inf.username}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full capitalize">
                        {inf.mention_type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatNumber(inf.followers)} followers</span>
                      <span className="text-green-400">{inf.engagement_rate}% engagement</span>
                    </div>
                    <div className="w-full bg-accent rounded-full h-1 mt-1">
                      <div 
                        className="bg-primary h-1 rounded-full" 
                        style={{ width: `${Math.min(100, (inf.reach / 100000) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instagram Config Modal */}
      <AnimatePresence>
        {isConfigModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfigModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Instagram className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">Instagram Monitoring</h2>
                </div>
                <button
                  onClick={() => setIsConfigModalOpen(false)}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Hashtags to Track</label>
                  <div className="flex gap-2 mb-3">
                    <div className="relative flex-1">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="marketing, ai, tech..."
                        className="w-full bg-accent border-none rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary transition-all"
                        onKeyPress={(e) => e.key === 'Enter' && (setHashtags([...hashtags, newTag]), setNewTag(''))}
                      />
                    </div>
                    <button
                      onClick={() => { if(newTag) { setHashtags([...hashtags, newTag]); setNewTag(''); } }}
                      className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hashtags.map((tag) => (
                      <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 bg-accent rounded-lg text-xs font-medium">
                        #{tag}
                        <button onClick={() => setHashtags(hashtags.filter(t => t !== tag))}>
                          <X className="w-3 h-3 hover:text-red-400" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Competitor Profiles</label>
                  <div className="flex gap-2 mb-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={newComp}
                        onChange={(e) => setNewComp(e.target.value)}
                        placeholder="competitor_handle"
                        className="w-full bg-accent border-none rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary transition-all"
                        onKeyPress={(e) => e.key === 'Enter' && (setCompetitors([...competitors, newComp]), setNewComp(''))}
                      />
                    </div>
                    <button
                      onClick={() => { if(newComp) { setCompetitors([...competitors, newComp]); setNewComp(''); } }}
                      className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {competitors.map((comp) => (
                      <span key={comp} className="flex items-center gap-1.5 px-2.5 py-1 bg-accent rounded-lg text-xs font-medium">
                        @{comp}
                        <button onClick={() => setCompetitors(competitors.filter(c => c !== comp))}>
                          <X className="w-3 h-3 hover:text-red-400" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setIsConfigModalOpen(false)}
                    className="flex-1 px-4 py-2.5 bg-accent text-accent-foreground rounded-xl text-sm font-bold hover:bg-accent/80 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStartMonitor}
                    disabled={startMonitorMutation.isPending || (hashtags.length === 0 && competitors.length === 0)}
                    className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {startMonitorMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Start Monitoring'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
