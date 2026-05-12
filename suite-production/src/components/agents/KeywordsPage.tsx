import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Key,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  DollarSign,
  BarChart3,
  Sparkles,
  Loader2,
  Filter,
  ExternalLink,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { keywordAPI } from '@/services/api'
import { useStore } from '@/store'
import { cn } from '@/utils/cn'
import { formatNumber } from '@/utils/format'
import type { KeywordData } from '@/types'
import toast from 'react-hot-toast'

export default function KeywordsPage() {
  const { currentProject } = useStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [showResearchModal, setShowResearchModal] = useState(false)
  const [sortBy, setSortBy] = useState<'volume' | 'difficulty' | 'position'>('volume')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { data: keywords } = useQuery({
    queryKey: ['keywords', currentProject?.id],
    queryFn: () => keywordAPI.list(currentProject?.id || '1'),
    enabled: !!currentProject,
  })

  const researchMutation = useMutation({
    mutationFn: ({ seed }: { seed: string }) => keywordAPI.research(currentProject?.id || '1', seed),
    onSuccess: () => {
      toast.success('Keyword research completed')
      setShowResearchModal(false)
    },
  })

  const filteredKeywords = (keywords || [])
    .filter((k) =>
      k.keyword.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortBy] || 0
      const bVal = b[sortBy] || 0
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    })

  const avgPosition = keywords?.length
    ? keywords.reduce((acc, k) => acc + (k.currentPosition || 0), 0) / keywords.filter((k) => k.currentPosition).length
    : 0

  const topKeywords = keywords?.filter((k) => (k.currentPosition || 999) <= 10).length || 0
  const trendingUp = keywords?.filter((k) => k.trend === 'up').length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Keyword Research</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track rankings, discover opportunities, and monitor keyword performance
          </p>
        </div>
        <button
          onClick={() => setShowResearchModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span>Research Keywords</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Tracked Keywords</p>
          <p className="text-2xl font-bold mt-1">{keywords?.length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Top 10 Rankings</p>
          <p className="text-2xl font-bold mt-1 text-green-400">{topKeywords}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Avg Position</p>
          <p className="text-2xl font-bold mt-1">{avgPosition.toFixed(1)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Trending Up</p>
          <p className="text-2xl font-bold mt-1 text-green-400">{trendingUp}</p>
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
            placeholder="Search keywords..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {(['volume', 'difficulty', 'position'] as const).map((sort) => (
            <button
              key={sort}
              onClick={() => {
                if (sortBy === sort) {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                } else {
                  setSortBy(sort)
                  setSortOrder('desc')
                }
              }}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all',
                sortBy === sort
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-muted-foreground hover:bg-accent/80'
              )}
            >
              {sort}
              {sortBy === sort && (
                sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Keywords Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-accent/30">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Keyword</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Volume</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Difficulty</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">CPC</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Position</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Trend</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Intent</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">SERP</th>
              </tr>
            </thead>
            <tbody>
              {filteredKeywords.map((keyword, i) => (
                <motion.tr
                  key={keyword.keyword}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/50 last:border-0 hover:bg-accent/20 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium">{keyword.keyword}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{formatNumber(keyword.volume)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-muted rounded-full h-1.5">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            keyword.difficulty < 30 ? 'bg-green-500' :
                            keyword.difficulty < 60 ? 'bg-yellow-500' : 'bg-red-500'
                          )}
                          style={{ width: `${keyword.difficulty}%` }}
                        />
                      </div>
                      <span className="text-xs">{keyword.difficulty}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">${keyword.cpc}</span>
                  </td>
                  <td className="px-4 py-3">
                    {keyword.currentPosition ? (
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">#{keyword.currentPosition}</span>
                        {keyword.previousPosition && (
                          <span className={cn(
                            'text-xs',
                            keyword.currentPosition < keyword.previousPosition ? 'text-green-400' :
                            keyword.currentPosition > keyword.previousPosition ? 'text-red-400' : 'text-muted-foreground'
                          )}>
                            {keyword.currentPosition < keyword.previousPosition ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : keyword.currentPosition > keyword.previousPosition ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <Minus className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'flex items-center gap-1 text-xs',
                      keyword.trend === 'up' && 'text-green-400',
                      keyword.trend === 'down' && 'text-red-400',
                      keyword.trend === 'stable' && 'text-muted-foreground'
                    )}>
                      {keyword.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                      {keyword.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                      {keyword.trend === 'stable' && <Minus className="w-3 h-3" />}
                      {keyword.trend}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      keyword.intent === 'informational' && 'bg-blue-500/10 text-blue-400',
                      keyword.intent === 'navigational' && 'bg-purple-500/10 text-purple-400',
                      keyword.intent === 'transactional' && 'bg-green-500/10 text-green-400',
                      keyword.intent === 'commercial' && 'bg-amber-500/10 text-amber-400'
                    )}>
                      {keyword.intent}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {keyword.serpFeatures.map((feature) => (
                        <span key={feature} className="text-[10px] px-1.5 py-0.5 bg-accent rounded text-muted-foreground">
                          {feature.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Research Modal */}
      {showResearchModal && (
        <KeywordResearchModal
          onClose={() => setShowResearchModal(false)}
          onResearch={(seed) => researchMutation.mutate({ seed })}
          isLoading={researchMutation.isPending}
        />
      )}
    </div>
  )
}

function KeywordResearchModal({
  onClose,
  onResearch,
  isLoading,
}: {
  onClose: () => void
  onResearch: (seed: string) => void
  isLoading: boolean
}) {
  const [seed, setSeed] = useState('')

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
        <h2 className="text-xl font-bold mb-4">Keyword Research</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Enter a seed keyword to discover related keywords, search volume, and difficulty.
        </p>
        <input
          type="text"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          placeholder="e.g., saas analytics"
          className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all mb-4"
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onResearch(seed)}
            disabled={!seed || isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Sparkles className="w-4 h-4" />
            Research
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
