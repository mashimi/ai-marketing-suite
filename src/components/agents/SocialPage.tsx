import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
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
} from 'lucide-react'
import { socialAPI } from '@/services/api'
import { useStore } from '@/store'
import { cn } from '@/utils/cn'
import { formatRelativeTime, formatNumber } from '@/utils/format'
import type { SocialMention, TrendingTopic } from '@/types'

export default function SocialPage() {
  const { currentProject } = useStore()
  const [platform, setPlatform] = useState<'reddit' | 'hackernews' | 'twitter' | 'linkedin'>('reddit')
  const [sentimentFilter, setSentimentFilter] = useState<string>('all')

  const { data: monitorData } = useQuery({
    queryKey: ['social', platform, currentProject?.id],
    queryFn: () => socialAPI.monitor(currentProject?.id || '1', platform),
    enabled: !!currentProject,
  })

  const platforms = [
    { id: 'reddit' as const, label: 'Reddit', icon: MessageSquare },
    { id: 'hackernews' as const, label: 'Hacker News', icon: Share2 },
    { id: 'twitter' as const, label: 'X/Twitter', icon: Share2 },
    { id: 'linkedin' as const, label: 'LinkedIn', icon: Share2 },
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
                      {mention.upvotes}
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
        </div>
      </div>
    </div>
  )
}
