import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  Plus,
  Globe,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Zap,
  BarChart3,
  X,
  Loader2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  TrendingUp,
} from 'lucide-react'
import { competitorAPI } from '@/services/api'
import { useStore } from '@/store'
import { cn } from '@/utils/cn'
import { formatNumber, formatRelativeTime } from '@/utils/format'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from 'recharts'
import toast from 'react-hot-toast'

const COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444']

export default function CompetitorPage() {
  const { currentProject } = useStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCompetitor, setSelectedCompetitor] = useState<any>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([])
  const queryClient = useQueryClient()

  const { data: competitors } = useQuery({
    queryKey: ['competitors', currentProject?.id],
    queryFn: () => competitorAPI.list(currentProject?.id || ''),
    enabled: !!currentProject,
  })

  const addMutation = useMutation({
    mutationFn: (domain: string) => competitorAPI.add(currentProject?.id || '', domain),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] })
      setShowAddModal(false)
      toast.success('Competitor analyzed and added')
    },
    onError: () => toast.error('Failed to analyze competitor'),
  })

  const analyzeMutation = useMutation({
    mutationFn: (id: string) => competitorAPI.analyze(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] })
      toast.success('Re-analysis complete')
    },
  })

  const toggleCompare = (id: string) => {
    setSelectedForCompare(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id].slice(0, 4)
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Competitor Intelligence</h1>
          <p className="text-slate-400 text-sm mt-1">
            Monitor, analyze, and outperform your competition
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              compareMode ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            )}
          >
            <BarChart3 className="w-4 h-4" />
            Compare {selectedForCompare.length > 0 && `(${selectedForCompare.length})`}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Competitor
          </button>
        </div>
      </div>

      {compareMode && selectedForCompare.length >= 2 && (
        <ComparisonView
          projectId={currentProject?.id || ''}
          competitorIds={selectedForCompare}
          onClose={() => {
            setCompareMode(false)
            setSelectedForCompare([])
          }}
        />
      )}

      {/* Competitor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {competitors?.map((comp: any) => (
          <motion.div
            key={comp.id}
            layout
            className={cn(
              'bg-slate-900/50 backdrop-blur-xl border rounded-xl overflow-hidden transition-all',
              selectedForCompare.includes(comp.id)
                ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg shadow-blue-500/10'
                : 'border-slate-800 hover:border-slate-700'
            )}
          >
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
                    <Globe className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-slate-100">{comp.name || comp.domain}</h3>
                    <a
                      href={`https://${comp.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-500 hover:text-blue-400 transition-colors flex items-center gap-1"
                    >
                      {comp.domain}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                {compareMode && (
                  <button
                    onClick={() => toggleCompare(comp.id)}
                    className={cn(
                      'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
                      selectedForCompare.includes(comp.id)
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-slate-600 hover:border-slate-500'
                    )}
                  >
                    {selectedForCompare.includes(comp.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </button>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-2.5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Authority</p>
                  <p className="text-lg font-bold text-slate-100">{comp.domainAuthority || '\u2014'}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-2.5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Backlinks</p>
                  <p className="text-lg font-bold text-slate-100">{formatNumber(comp.backlinks)}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-2.5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Keywords</p>
                  <p className="text-lg font-bold text-slate-100">{formatNumber(comp.organicKeywords)}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-2.5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Content</p>
                  <p className="text-lg font-bold text-slate-100">{formatNumber(comp.contentPieces)}</p>
                </div>
              </div>

              {/* AI Insights Preview */}
              {comp.strengths && comp.strengths.length > 0 && (
                <div className="space-y-1.5 mb-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Key Strengths</p>
                  {comp.strengths.slice(0, 2).map((s: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                      <Shield className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      <span className="line-clamp-1">{s}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Gaps Alert */}
              {comp.gaps && comp.gaps.length > 0 && (
                <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-amber-400 font-medium">{comp.gaps.length} strategy gaps identified</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <span className="text-[10px] text-slate-500">
                  Updated {formatRelativeTime(comp.lastAnalyzedAt)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => analyzeMutation.mutate(comp.id)}
                    disabled={analyzeMutation.isPending}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
                    title="Re-analyze competitor"
                  >
                    {analyzeMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedCompetitor(comp)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
                    title="View details"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddCompetitorModal
            onClose={() => setShowAddModal(false)}
            onAdd={(domain: string) => addMutation.mutate(domain)}
            isLoading={addMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedCompetitor && (
          <CompetitorDetailDrawer
            competitor={selectedCompetitor}
            onClose={() => setSelectedCompetitor(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ComparisonView({ projectId, competitorIds, onClose }: any) {
  const { data: comparison } = useQuery({
    queryKey: ['competitor-compare', competitorIds],
    queryFn: () => competitorAPI.compare(projectId, competitorIds),
    enabled: competitorIds.length >= 2,
  })

  if (!comparison) return null

  const { us, competitors } = comparison

  const radarData = [
    { metric: 'Keywords', us: us.keywords, ...competitors.reduce((acc: any, c: any, i: number) => ({ ...acc, [`comp${i}`]: c.keywords }), {}) },
    { metric: 'Content', us: us.content, ...competitors.reduce((acc: any, c: any, i: number) => ({ ...acc, [`comp${i}`]: c.content }), {}) },
    { metric: 'Traffic', us: us.traffic, ...competitors.reduce((acc: any, c: any, i: number) => ({ ...acc, [`comp${i}`]: c.traffic }), {}) },
    { metric: 'Authority', us: us.authority, ...competitors.reduce((acc: any, c: any, i: number) => ({ ...acc, [`comp${i}`]: c.authority }), {}) },
    { metric: 'Backlinks', us: us.backlinks || 100, ...competitors.reduce((acc: any, c: any, i: number) => ({ ...acc, [`comp${i}`]: c.backlinks }), {}) },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-100">Side-by-Side Comparison</h3>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
              <Radar name="Us" dataKey="us" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              {competitors.map((c: any, i: number) => (
                <Radar key={c.id} name={c.domain} dataKey={`comp${i}`} stroke={COLORS[i + 1]} fill={COLORS[i + 1]} fillOpacity={0.1} />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm font-medium text-slate-100">{us.domain} (You)</span>
            <span className="ml-auto text-xs text-blue-400 font-bold">DA: {us.authority}</span>
          </div>
          {competitors.map((comp: any, i: number) => (
            <div key={comp.id} className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i + 1] }} />
              <span className="text-sm font-medium text-slate-200">{comp.domain}</span>
              <div className="ml-auto flex items-center gap-4 text-xs">
                <span className={comp.authority > us.authority ? 'text-rose-400' : 'text-emerald-400'}>
                  DA: {comp.authority}
                </span>
                <span className="text-slate-400">{formatNumber(comp.backlinks)} links</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function AddCompetitorModal({ onClose, onAdd, isLoading }: any) {
  const [domain, setDomain] = useState('')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl"
      >
        <h2 className="text-xl font-bold text-slate-100 mb-4">Add Competitor</h2>
        <p className="text-sm text-slate-400 mb-6">
          Enter a domain to automatically analyze their SEO metrics, content focus, and strategic gaps.
        </p>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            placeholder="example.com"
            className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-600"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-3 mt-8">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onAdd(domain)}
            disabled={!domain || isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Target className="w-4 h-4" />
            Analyze Domain
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function CompetitorDetailDrawer({ competitor, onClose }: any) {
  const [activeTab, setActiveTab] = useState<'overview' | 'gaps' | 'trends'>('overview')
  const [expandedGap, setExpandedGap] = useState<string | null>(null)

  const { data: trends } = useQuery({
    queryKey: ['competitor-trends', competitor.id],
    queryFn: () => competitorAPI.trends(competitor.id),
    enabled: activeTab === 'trends',
  })

  return (
    <motion.div
      initial={{ opacity: 0, x: 400 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 400 }}
      className="fixed right-0 top-0 h-full w-[520px] bg-slate-900 border-l border-slate-800 shadow-2xl z-50 overflow-y-auto"
    >
      <div className="p-6 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur flex items-center justify-between z-10">
        <div>
          <h2 className="text-lg font-bold text-slate-100">{competitor.name || competitor.domain}</h2>
          <p className="text-xs text-slate-500">Last analyzed {formatRelativeTime(competitor.lastAnalyzedAt)}</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-6 space-y-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'gaps', label: `Gaps (${competitor.gaps?.length || 0})` },
            { id: 'trends', label: 'Trends' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex-1 py-2 rounded-md text-xs font-medium transition-all',
                activeTab === tab.id ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* SWOT */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <h4 className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 mb-3 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Strengths
                </h4>
                <ul className="space-y-2">
                  {competitor.strengths.map((s: string, i: number) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">\u2022</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                <h4 className="text-[10px] uppercase tracking-wider font-bold text-rose-400 mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Weaknesses
                </h4>
                <ul className="space-y-2">
                  {competitor.weaknesses.map((w: string, i: number) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-rose-500 mt-0.5">\u2022</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                <h4 className="text-[10px] uppercase tracking-wider font-bold text-blue-400 mb-3 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Opportunities
                </h4>
                <ul className="space-y-2">
                  {competitor.opportunities.map((o: string, i: number) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">\u2022</span>
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <h4 className="text-[10px] uppercase tracking-wider font-bold text-amber-400 mb-3 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> Threats
                </h4>
                <ul className="space-y-2">
                  {competitor.threats.map((t: string, i: number) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">\u2022</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Tech Stack */}
            {competitor.techStack && competitor.techStack.length > 0 && (
              <div className="pt-4 border-t border-slate-800">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Tech Stack</h4>
                <div className="flex flex-wrap gap-2">
                  {competitor.techStack.map((tech: string) => (
                    <span key={tech} className="px-2.5 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Top Topics */}
            {competitor.topTopics && competitor.topTopics.length > 0 && (
              <div className="pt-4 border-t border-slate-800">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Content Strategy</h4>
                <div className="flex flex-wrap gap-2">
                  {competitor.topTopics.map((topic: string) => (
                    <span key={topic} className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-medium">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'gaps' && (
          <div className="space-y-3">
            {competitor.gaps?.map((gap: any) => {
              const isExpanded = expandedGap === gap.id
              return (
                <motion.div
                  key={gap.id}
                  layout
                  className={cn(
                    'border rounded-xl overflow-hidden transition-all',
                    gap.priority === 'high' ? 'border-rose-500/30 bg-rose-500/5' :
                    gap.priority === 'medium' ? 'border-amber-500/30 bg-amber-500/5' :
                    'border-slate-800 bg-slate-800/20'
                  )}
                >
                  <button
                    onClick={() => setExpandedGap(isExpanded ? null : gap.id)}
                    className="w-full flex items-start gap-4 p-4 text-left"
                  >
                    <div className={cn(
                      'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                      gap.type === 'keyword' ? 'bg-blue-400' :
                      gap.type === 'content' ? 'bg-emerald-400' :
                      gap.type === 'backlink' ? 'bg-purple-400' :
                      'bg-amber-400'
                    )} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-100 capitalize">{gap.type} Gap</span>
                        <span className={cn(
                          'text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider',
                          gap.priority === 'high' && 'bg-rose-500/20 text-rose-400',
                          gap.priority === 'medium' && 'bg-amber-500/20 text-amber-400',
                          gap.priority === 'low' && 'bg-blue-500/20 text-blue-400'
                        )}>
                          {gap.priority} Priority
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{gap.theirAdvantage}</p>
                    </div>
                    <div className="text-slate-500 mt-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-10 pb-5 space-y-4">
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Strategic Analysis</p>
                            <p className="text-sm text-slate-200 leading-relaxed">{gap.theirAdvantage}</p>
                            {gap.theirExample && (
                              <a href={gap.theirExample} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-2 font-medium">
                                <ExternalLink className="w-3 h-3" /> View Source Reference
                              </a>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Our Current State</p>
                            <p className="text-sm text-slate-400 leading-relaxed italic">"{gap.ourState}"</p>
                          </div>
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-inner">
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2">Recommended Strategy</p>
                            <p className="text-sm text-slate-200 leading-relaxed font-medium mb-3">{gap.action}</p>
                            <div className="flex items-center gap-4 pt-3 border-t border-slate-800 text-[11px]">
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Impact: <span className="text-slate-100 font-semibold">{gap.estimatedImpact || 'High'}</span></span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <Zap className="w-3.5 h-3.5 text-amber-400" />
                                <span>Difficulty: <span className="text-slate-100 font-semibold capitalize">{gap.difficulty}</span></span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="space-y-6">
            <h4 className="text-sm font-semibold text-slate-100">Performance Trajectory</h4>
            {trends ? (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trafficTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="keywordTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#475569" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }}
                      itemStyle={{ padding: '2px 0' }}
                    />
                    <Area type="monotone" name="Traffic" dataKey="organicTraffic" stroke="#3b82f6" strokeWidth={2} fill="url(#trafficTrend)" />
                    <Area type="monotone" name="Keywords" dataKey="organicKeywords" stroke="#10b981" strokeWidth={2} fill="url(#keywordTrend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/50">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-700 mx-auto mb-3" />
                  <p className="text-xs text-slate-500">Processing trend data...</p>
                </div>
              </div>
            )}
            <div className="flex justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-0.5 bg-blue-500" />
                 <span>Organic Traffic</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-3 h-0.5 bg-emerald-500" />
                 <span>Keyword Rankings</span>
               </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
