import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Play,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Target,
  TrendingUp,
  Clock,
  Wrench,
  ExternalLink,
} from 'lucide-react'
import { seoAPI } from '@/services/api'
import { useStore } from '@/store'
import { cn } from '@/utils/cn'
import { SEVERITY_COLORS } from '@/utils/constants'
import type { SEOIssue, SEORecommendation, AuditCategory } from '@/types'
import toast from 'react-hot-toast'

export default function SEOAuditPage() {
  const { currentProject } = useStore()
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: audit, isLoading } = useQuery({
    queryKey: ['seo-audit', currentProject?.id],
    queryFn: async () => {
      const audits = await seoAPI.getAudits(currentProject?.id)
      return audits[0] || null
    },
    enabled: !!currentProject,
  })

  const runAuditMutation = useMutation({
    mutationFn: () => seoAPI.audit(currentProject?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-audit', currentProject?.id] })
      toast.success('SEO audit started in background')
    },
    onError: () => toast.error('Audit failed'),
  })

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500/10'
    if (score >= 60) return 'bg-yellow-500/10'
    return 'bg-red-500/10'
  }

  const severityIcons = {
    critical: AlertTriangle,
    warning: AlertCircle,
    info: Info,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SEO Audit</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Comprehensive analysis of your website's SEO health
          </p>
        </div>
        <button
          onClick={() => runAuditMutation.mutate()}
          disabled={runAuditMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {runAuditMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span>Run Audit</span>
        </button>
      </div>

      {isLoading && !audit ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : audit ? (
        <>
          {/* Overall Score */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1 bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center">
              <div className="relative">
                <svg className="w-32 h-32 -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted/20"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(audit.overallScore / 100) * 351.86} 351.86`}
                    className={cn(getScoreColor(audit.overallScore))}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={cn('text-3xl font-bold', getScoreColor(audit.overallScore))}>
                    {audit.overallScore}
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">Overall Score</p>
              <p className={cn('text-xs font-medium mt-1', getScoreColor(audit.overallScore))}>
                {audit.overallScore >= 80 ? 'Excellent' : audit.overallScore >= 60 ? 'Good' : 'Needs Improvement'}
              </p>
            </div>

            <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-5 gap-4">
              {audit.categories.map((category) => (
                <button
                  key={category.name}
                  onClick={() => setExpandedCategory(expandedCategory === category.name ? null : category.name)}
                  className={cn(
                    'bg-card border border-border rounded-xl p-4 text-left transition-all hover:border-primary/30',
                    expandedCategory === category.name && 'border-primary/50 bg-primary/5'
                  )}
                >
                  <p className="text-xs text-muted-foreground mb-1">{category.name}</p>
                  <p className={cn('text-xl font-bold', getScoreColor(category.score))}>
                    {category.score}
                  </p>
                  <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                    <div
                      className={cn('h-full rounded-full transition-all', getScoreColor(category.score).replace('text-', 'bg-'))}
                      style={{ width: `${category.score}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Issues & Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Issues */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Issues Found</h2>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 text-red-400">
                    <AlertTriangle className="w-3 h-3" />
                    {audit.issues.filter((i) => i.severity === 'critical').length}
                  </span>
                  <span className="flex items-center gap-1 text-yellow-400">
                    <AlertCircle className="w-3 h-3" />
                    {audit.issues.filter((i) => i.severity === 'warning').length}
                  </span>
                  <span className="flex items-center gap-1 text-blue-400">
                    <Info className="w-3 h-3" />
                    {audit.issues.filter((i) => i.severity === 'info').length}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {audit.issues.map((issue) => {
                  const SeverityIcon = severityIcons[issue.severity]
                  const isExpanded = expandedIssue === issue.id

                  return (
                    <motion.div
                      key={issue.id}
                      layout
                      className={cn(
                        'border rounded-lg overflow-hidden transition-colors',
                        SEVERITY_COLORS[issue.severity]
                      )}
                    >
                      <button
                        onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
                        className="w-full flex items-start gap-3 p-4 text-left"
                      >
                        <SeverityIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{issue.title}</span>
                            <span className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded-full uppercase font-bold',
                              issue.impact === 'high' && 'bg-red-500/20 text-red-400',
                              issue.impact === 'medium' && 'bg-yellow-500/20 text-yellow-400',
                              issue.impact === 'low' && 'bg-blue-500/20 text-blue-400'
                            )}>
                              {issue.impact}
                            </span>
                          </div>
                          <p className="text-xs opacity-80 mt-1 line-clamp-1">{issue.description}</p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 flex-shrink-0" />
                        )}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-0 space-y-3">
                              {issue.url && (
                                <div className="flex items-center gap-2 text-xs">
                                  <ExternalLink className="w-3 h-3" />
                                  <span className="opacity-70">{issue.url}</span>
                                </div>
                              )}
                              {issue.fix && (
                                <div className="bg-background/50 rounded-lg p-3">
                                  <p className="text-xs font-medium mb-1 flex items-center gap-1">
                                    <Wrench className="w-3 h-3" />
                                    Recommended Fix
                                  </p>
                                  <p className="text-xs opacity-80">{issue.fix}</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Recommendations</h2>
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
              </div>

              <div className="space-y-3">
                {audit.recommendations.map((rec, i) => (
                  <motion.div
                    key={rec.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-accent/30 rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">{rec.priority}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium">{rec.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                        <div className="flex items-center gap-3 mt-3">
                          <span className="flex items-center gap-1 text-xs text-green-400">
                            <ArrowUpRight className="w-3 h-3" />
                            {rec.expectedImpact}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Target className="w-3 h-3" />
                            {rec.difficulty}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {rec.estimatedTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Competitors */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Competitor Analysis</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">Domain</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">Authority</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">Backlinks</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">Keywords</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">Traffic</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">Overlap</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.competitors.map((comp) => (
                    <tr key={comp.domain} className="border-b border-border/50 last:border-0">
                      <td className="py-3 text-sm font-medium">{comp.domain}</td>
                      <td className="py-3 text-sm">{comp.authority}</td>
                      <td className="py-3 text-sm">{comp.backlinks.toLocaleString()}</td>
                      <td className="py-3 text-sm">{comp.keywords.toLocaleString()}</td>
                      <td className="py-3 text-sm">{comp.traffic.toLocaleString()}</td>
                      <td className="py-3 text-sm">
                        <span className="text-green-400">{comp.overlap}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Audit Data</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Run your first SEO audit to see detailed insights about your website.
          </p>
          <button
            onClick={() => runAuditMutation.mutate()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Run First Audit
          </button>
        </div>
      )}
    </div>
  )
}
