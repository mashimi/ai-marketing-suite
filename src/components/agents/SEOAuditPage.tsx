import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layout,
  BarChart3,
  Globe,
  Zap,
  Shield,
  Search,
  ExternalLink,
  Download,
  Loader2,
  Play,
  Info,
  TrendingUp,
  Clock,
  Wrench,
  Share2,
  RefreshCcw,
  ArrowUpRight,
  Target,
} from 'lucide-react'
import { seoAPI, reportAPI } from '@/services/api'
import { useStore } from '@/store'
import { cn } from '@/utils/cn'
import { formatRelativeTime } from '@/utils/format'
import { SEVERITY_COLORS } from '@/utils/constants'
import type { SEOAudit, Project } from '@/types'
import toast from 'react-hot-toast'

export default function SEOAuditPage() {
  const { currentProject } = useStore()
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const queryClient = useQueryClient()

  const { data: audit, isLoading, refetch } = useQuery<SEOAudit | null>({
    queryKey: ['seo-audit', currentProject?.id],
    queryFn: async () => {
      try {
        const audits = await seoAPI.getAudits(currentProject?.id)
        return audits && audits.length > 0 ? audits[0] : null
      } catch (err) {
        console.error('Failed to fetch audits', err)
        return null
      }
    },
    enabled: !!currentProject,
  })

  const runAuditMutation = useMutation({
    mutationFn: () => seoAPI.audit(currentProject?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-audit', currentProject?.id] })
      toast.success('SEO audit engine initialized', {
        icon: '🚀',
        className: 'bg-primary text-primary-foreground font-bold'
      })
    },
    onError: () => toast.error('Audit initialization failed'),
  })

  const handleDownloadReport = async () => {
    if (!currentProject) return
    setIsGeneratingReport(true)
    try {
      await reportAPI.downloadSEOReport(currentProject.id)
      toast.success('High-fidelity report generated successfully')
    } catch (err) {
      toast.error('Failed to generate PDF report')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-600'
    if (score >= 60) return 'from-yellow-500 to-orange-600'
    return 'from-red-500 to-pink-600'
  }

  const severityIcons = {
    critical: AlertTriangle,
    warning: AlertCircle,
    info: Info,
  }

  if (!currentProject) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <div className="w-20 h-20 bg-accent rounded-3xl flex items-center justify-center mb-6 shadow-xl">
          <Zap className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Select a Project</h2>
        <p className="text-muted-foreground max-w-sm mb-6">
          You need to select or create a project before we can analyze your SEO health.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Dynamic Header */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/50 backdrop-blur-md border border-border/50 p-8 rounded-3xl shadow-2xl">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <Search className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-black tracking-tight">SEO Performance Lab</h1>
            </div>
            <p className="text-muted-foreground font-medium">
              Enterprise-grade technical audit for <span className="text-foreground underline decoration-primary/30 decoration-2 underline-offset-4">{currentProject.url}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => refetch()}
              className="p-3 bg-accent/50 hover:bg-accent rounded-xl border border-border/50 transition-all shadow-lg"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownloadReport}
              disabled={!audit || isGeneratingReport}
              className="flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-xl font-bold hover:bg-accent/80 transition-all shadow-xl disabled:opacity-50"
            >
              {isGeneratingReport ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              <span>Export PDF</span>
            </button>
            <button
              onClick={() => runAuditMutation.mutate()}
              disabled={runAuditMutation.isPending}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-black hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
            >
              {runAuditMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
              <span>RESCAN ENGINE</span>
            </button>
          </div>
        </div>
      </div>

      {isLoading && !audit ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
          <div className="h-64 bg-card/50 rounded-3xl border border-border/50" />
          <div className="md:col-span-3 h-64 bg-card/50 rounded-3xl border border-border/50" />
        </div>
      ) : audit ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-card border border-border/50 rounded-3xl p-8 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden group">
              <div className={cn("absolute inset-0 opacity-5 bg-gradient-to-br", getScoreGradient(audit.overallScore))} />
              <div className="relative">
                <svg className="w-40 h-40 -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-muted/10"
                  />
                  <motion.circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    initial={{ strokeDasharray: "0 439.8" }}
                    animate={{ strokeDasharray: `${(audit.overallScore / 100) * 439.8} 439.8` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className={cn(getScoreColor(audit.overallScore))}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn('text-5xl font-black', getScoreColor(audit.overallScore))}>
                    {audit.overallScore}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Health Score</span>
                </div>
              </div>
              <div className="mt-6 flex flex-col items-center">
                <p className={cn('text-sm font-black uppercase tracking-widest px-4 py-1 rounded-full border', getScoreColor(audit.overallScore).replace('text-', 'bg-').replace('-400', '-500/10'), getScoreColor(audit.overallScore).replace('text-', 'border-').replace('-400', '-500/20'))}>
                  {audit.overallScore >= 80 ? 'Excellent' : audit.overallScore >= 60 ? 'Healthy' : 'Critical'}
                </p>
                <p className="text-[10px] text-muted-foreground mt-4 flex items-center gap-1 font-bold">
                  <Clock className="w-3 h-3" />
                  ANALYZED {new Date(audit.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="md:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(audit.categories || []).map((category, idx) => (
                <motion.button
                  key={category.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setExpandedCategory(expandedCategory === category.name ? null : category.name)}
                  className={cn(
                    'bg-card border border-border/50 rounded-2xl p-6 text-left transition-all hover:scale-[1.02] shadow-xl hover:shadow-2xl relative group',
                    expandedCategory === category.name && 'ring-2 ring-primary bg-primary/5'
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{category.name}</p>
                    <div className={cn("p-1.5 rounded-lg bg-background border border-border shadow-inner", getScoreColor(category.score))}>
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                  <p className={cn('text-4xl font-black mb-2', getScoreColor(category.score))}>
                    {category.score}
                  </p>
                  <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${category.score}%` }}
                      className={cn('h-full rounded-full', getScoreColor(category.score).replace('text-', 'bg-'))}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground mt-4 group-hover:text-foreground transition-colors">
                    Weight: {category.weight * 100}% of total
                  </p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Deep Insights */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
            {/* Technical Issues */}
            <div className="xl:col-span-3 bg-card border border-border/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                    Technical Anomalies
                    <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20 animate-pulse">LIVE</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">Priority issues requiring immediate attention</p>
                </div>
                <div className="flex bg-background border border-border rounded-xl p-1 gap-1 shadow-inner">
                  <button className="px-3 py-1 text-[10px] font-black bg-accent rounded-lg shadow-sm">ALL</button>
                  <button className="px-3 py-1 text-[10px] font-black text-muted-foreground hover:text-foreground">CRITICAL</button>
                </div>
              </div>

              <div className="space-y-4">
                {(audit.issues || []).map((issue) => {
                  const SeverityIcon = severityIcons[issue.severity] || Info
                  const isExpanded = expandedIssue === issue.id

                  return (
                    <motion.div
                      key={issue.id}
                      layout
                      className={cn(
                        'border border-border/50 rounded-2xl overflow-hidden transition-all duration-300',
                        isExpanded ? 'bg-accent/20 shadow-inner ring-1 ring-primary/20' : 'bg-background hover:bg-accent/10'
                      )}
                    >
                      <button
                        onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
                        className="w-full flex items-start gap-4 p-5 text-left group"
                      >
                        <div className={cn('p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform', SEVERITY_COLORS[issue.severity])}>
                          <SeverityIcon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-bold text-sm">{issue.title}</span>
                            <span className={cn(
                              'text-[9px] px-2 py-0.5 rounded-md uppercase font-black tracking-widest',
                              issue.impact === 'high' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' :
                              issue.impact === 'medium' ? 'bg-yellow-500 text-black' : 'bg-blue-500 text-white'
                            )}>
                              {issue.impact} IMPACT
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                            {issue.description}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                           {isExpanded ? <ChevronUp className="w-5 h-5 text-primary" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                           <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-0 group-hover:opacity-100 transition-opacity">Expand</span>
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-accent/10 border-t border-border/50"
                          >
                            <div className="p-6 space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Affected URL</h4>
                                  <div className="flex items-center gap-2 p-3 bg-background border border-border rounded-xl text-xs font-mono truncate shadow-sm">
                                    <ExternalLink className="w-3.5 h-3.5 text-primary" />
                                    {issue.url || 'Site-wide issue'}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">AI Intelligence Root</h4>
                                  <div className="p-3 bg-background border border-border rounded-xl text-xs font-medium shadow-sm">
                                    {issue.category} analysis detected inconsistency
                                  </div>
                                </div>
                              </div>
                              
                              {issue.fix && (
                                <div className="bg-primary/5 rounded-2xl p-5 border-l-4 border-primary relative overflow-hidden shadow-xl">
                                  <div className="absolute top-0 right-0 p-2 opacity-10">
                                    <Wrench className="w-12 h-12" />
                                  </div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
                                    <Zap className="w-4 h-4 fill-current" />
                                    AI-Generated Fix Strategy
                                  </p>
                                  <p className="text-sm font-medium leading-relaxed">{issue.fix}</p>
                                  <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all">
                                    Apply Auto-Fix
                                  </button>
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

            {/* Strategic Recommendations */}
            <div className="xl:col-span-2 space-y-8">
              <div className="bg-card border border-border/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <TrendingUp className="w-24 h-24" />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight mb-6">Action Roadmap</h2>
                
                <div className="space-y-4">
                  {(audit.recommendations || []).map((rec, i) => (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="group bg-accent/30 hover:bg-accent/50 p-6 rounded-2xl border border-border/50 transition-all cursor-pointer relative"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-black shadow-lg shadow-primary/20">
                          {rec.priority}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-sm mb-1 group-hover:text-primary transition-colors">{rec.title}</h3>
                          <p className="text-xs text-muted-foreground leading-relaxed mb-4">{rec.description}</p>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 text-[10px] font-bold bg-background p-2 rounded-lg border border-border">
                              <Target className="w-3.5 h-3.5 text-primary" />
                              <span className="text-muted-foreground uppercase">{rec.difficulty}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold bg-background p-2 rounded-lg border border-border">
                              <Clock className="w-3.5 h-3.5 text-blue-500" />
                              <span className="text-muted-foreground uppercase">{rec.estimatedTime}</span>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex items-center gap-2 py-2 px-3 bg-green-500/10 rounded-xl border border-green-500/20">
                            <ArrowUpRight className="w-4 h-4 text-green-500" />
                            <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">
                              Impact: {rec.expectedImpact}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Competitive Intelligence Mini */}
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                 <div className="relative z-10">
                    <h2 className="text-lg font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                      Market Dominance
                      <Share2 className="w-4 h-4" />
                    </h2>
                    <div className="space-y-4">
                      {(audit.competitors || []).slice(0, 3).map((comp) => (
                        <div key={comp.domain} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/20 transition-all cursor-default">
                           <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-bold">{comp.domain}</span>
                              <span className="text-xs font-black text-indigo-200">{comp.authority} DA</span>
                           </div>
                           <div className="w-full bg-white/10 rounded-full h-1.5 shadow-inner">
                              <div className="bg-white h-full rounded-full" style={{ width: `${comp.overlap}%` }} />
                           </div>
                           <div className="flex justify-between items-center mt-2 text-[9px] font-black uppercase tracking-tighter opacity-70">
                              <span>Overlap: {comp.overlap}%</span>
                              <span>Traffic: {(comp.traffic/1000).toFixed(1)}k</span>
                           </div>
                        </div>
                      ))}
                    </div>
                    <button className="w-full mt-6 py-3 bg-white text-indigo-600 rounded-xl font-black text-xs hover:bg-white/90 transition-all shadow-xl">
                      View Deep Analysis
                    </button>
                 </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="bg-card border-2 border-dashed border-border rounded-3xl p-24 text-center shadow-2xl">
          <div className="w-24 h-24 bg-accent/50 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-background shadow-xl">
            <Search className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <h2 className="text-3xl font-black mb-3">No SEO Intelligence Found</h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto mb-10 font-medium">
            Deploy your first SEO audit agent to begin deep indexing and technical analysis of your domain properties.
          </p>
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => runAuditMutation.mutate()}
              className="flex items-center gap-3 px-10 py-5 bg-primary text-primary-foreground rounded-2xl font-black text-lg hover:bg-primary/90 transition-all shadow-2xl shadow-primary/30 active:scale-95"
            >
              <Zap className="w-6 h-6 fill-current" />
              INITIALIZE DEEP SCAN
            </button>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Estimated Scan Time: ~45 seconds
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
