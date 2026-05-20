import { useState, useEffect } from 'react'
import { Search, TrendingUp, Lightbulb, FileText, GitBranch, Eye, BarChart3, Layers } from 'lucide-react'
import { geoAPI } from '../services/api'
import GEOOptimizationModal from '../components/geo/GEOOptimizationModal'
import { toast } from 'react-hot-toast'
import { useStore } from '../store'

type TabView = 'overview' | 'reviews' | 'citations' | 'entities' | 'abtesting'

export default function GEOMonitorPage() {
  const { currentProject } = useStore()
  const projectId = currentProject?.id
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabView>('overview')
  const [reviewData, setReviewData] = useState<any>(null)
  const [citationData, setCitationData] = useState<any>(null)
  const [entityData, setEntityData] = useState<any>(null)
  const [abTestData, setAbTestData] = useState<any>(null)

  const fetchData = async () => {
    if (!projectId) return
    try {
      setLoading(true)
      const dashboard = await geoAPI.getDashboard(projectId)
      setData(dashboard)
      setCitationData({ citationIndex: dashboard.citatonIndex, citationRate: dashboard.overall.citationRate })
      setEntityData({ gaps: dashboard.entityGaps, implicitQuestions: dashboard.implicitQuestions })
      setReviewData({ items: [], stats: dashboard.reviewQueue })
    } catch (error) {
      console.error('Failed to load GEO dashboard', error)
      toast.error('Failed to load GEO data')
    } finally {
      setLoading(false)
    }
  }

  const fetchTabData = async (tab: TabView) => {
    if (!projectId) return
    try {
      switch (tab) {
        case 'reviews':
          const reviews = await geoAPI.getReviews(projectId)
          setReviewData(reviews)
          break
        case 'citations':
          const citations = await geoAPI.getCitationIndex(projectId)
          setCitationData(citations)
          break
        case 'entities':
          const entities = await geoAPI.getEntityCoverage(projectId)
          setEntityData(entities)
          break
        case 'abtesting':
          const tests = await geoAPI.getABTests(projectId)
          setAbTestData(tests)
          break
      }
    } catch (error) {
      console.error(`Failed to load ${tab} data`, error)
    }
  }

  useEffect(() => {
    fetchData()
  }, [projectId])

  useEffect(() => {
    if (activeTab !== 'overview') {
      fetchTabData(activeTab)
    }
  }, [activeTab])

  const handleAutoOptimize = async () => {
    if (!projectId) return
    try {
      setOptimizing(true)
      const res = await geoAPI.autoOptimizeAll(projectId, 5)
      const successCount = res.results?.filter((r: any) => r.success || r.reviewId).length || 0
      const needsApproval = res.results?.filter((r: any) => r.requiresApproval).length || 0
      toast.success(`Auto-optimized ${successCount} items${needsApproval > 0 ? ` (${needsApproval} pending review)` : ''}`)
      await fetchData()
    } catch (error) {
      console.error('Auto-optimize failed', error)
      toast.error('Failed to auto-optimize')
    } finally {
      setOptimizing(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    )
  }

  const platformData = Object.entries(data?.byPlatform || {}).map(([name, stats]: [string, any]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    position: stats.avgPosition
  }))

  const tabs: { key: TabView; label: string; icon: any; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'reviews', label: 'Review Queue', icon: Eye, count: reviewData?.stats?.pendingCount ?? data?.reviewQueue?.pendingCount ?? 0 },
    { key: 'citations', label: 'Citation Index', icon: GitBranch },
    { key: 'entities', label: 'Entity Analysis', icon: Layers },
    { key: 'abtesting', label: 'A/B Tests', icon: FileText },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Generative Engine Optimization (GEO)</h1>
          <p className="text-gray-500">Monitor and optimize your visibility in AI search engines using real citation data.</p>
        </div>
        <button 
          onClick={handleAutoOptimize}
          disabled={optimizing}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {optimizing ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Lightbulb className="w-5 h-5" />
          )}
          Auto-Optimize Top Content
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border-t-4 border-t-indigo-500 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Avg. AI Position</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{data?.overall.avgPosition || 'N/A'}</p>
                </div>
                <div className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full flex items-center gap-1 text-xs font-semibold">
                  <TrendingUp className="w-3 h-3" /> Position
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border-t-4 border-t-fuchsia-500 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Optimization Score</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{data?.overall.avgOptimizationScore || '0'}/100</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border-t-4 border-t-emerald-500 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Citation Rate</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{data?.overall.citationRate || '0'}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border-t-4 border-t-blue-500 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Tracked Queries</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{data?.overall.totalTrackedQueries || 0}</p>
                </div>
                <div className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-full flex items-center gap-1 text-xs font-semibold">
                  <Search className="w-3 h-3" /> Active
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Platform Visibility */}
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Visibility by Platform</h2>
              <div className="mt-6 flex flex-col gap-4">
                {platformData.map((p, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="font-medium text-gray-700 dark:text-gray-200">{p.name}</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">Pos: {p.position.toFixed(1)}</span>
                  </div>
                ))}
                {platformData.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No platform data available yet.</p>
                )}
              </div>
            </div>

            {/* Opportunities + Entity Gaps */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Optimization Opportunities
                  {entityData?.gaps?.length > 0 && (
                    <span className="ml-2 text-xs text-orange-500">(includes entity gaps)</span>
                  )}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300">
                    <tr>
                      <th className="px-6 py-3 font-medium">Query / Entity</th>
                      <th className="px-6 py-3 font-medium">Platform</th>
                      <th className="px-6 py-3 font-medium">Type</th>
                      <th className="px-6 py-3 font-medium">Score</th>
                      <th className="px-6 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {(!data?.opportunities || data.opportunities.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center">
                          No immediate optimization opportunities found.
                        </td>
                      </tr>
                    ) : (
                      data?.opportunities?.map((opp: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                            {opp.query}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded text-xs capitalize">{opp.platform}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              opp.type === 'entity_gap' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {opp.type === 'entity_gap' ? 'Entity Gap' : 'Position'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              opp.score > 70 ? 'bg-emerald-100 text-emerald-700' : 
                              opp.score > 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {opp.type === 'entity_gap' ? `${100 - opp.score}% gap` : `${opp.score}/100`}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {opp.type !== 'entity_gap' && (
                              <button 
                                onClick={() => {
                                  setSelectedOpportunity(opp)
                                  setIsModalOpen(true)
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                              >
                                Optimize Now
                              </button>
                            )}
                            {opp.type === 'entity_gap' && (
                              <span className="text-xs text-gray-400">Needs content</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Recent Rankings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Rankings Activity</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300">
                  <tr>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Platform</th>
                    <th className="px-6 py-3 font-medium">Query</th>
                    <th className="px-6 py-3 font-medium">Position</th>
                    <th className="px-6 py-3 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data?.recentRankings?.map((ranking: any) => (
                    <tr key={ranking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">{new Date(ranking.timestamp).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs capitalize">
                          {ranking.platform}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-gray-200 font-medium">{ranking.query}</td>
                      <td className="px-6 py-4">
                        {ranking.position <= 3 ? (
                          <span className="text-emerald-600 font-bold">{ranking.position}</span>
                        ) : (
                          <span className="text-gray-600">{ranking.position}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">{ranking.optimizationScore || 'N/A'}</td>
                    </tr>
                  ))}
                  {(!data?.recentRankings || data.recentRankings.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center">
                        No tracking data available yet. Check rankings to populate.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Review Queue Tab */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{reviewData?.stats?.pendingCount || data?.reviewQueue?.pendingCount || 0}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-2xl font-bold text-emerald-600">{reviewData?.stats?.approvedCount || data?.reviewQueue?.approvedCount || 0}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500">Auto-Applied</p>
              <p className="text-2xl font-bold text-blue-600">{reviewData?.stats?.autoAppliedCount || data?.reviewQueue?.autoAppliedCount || 0}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500">High Severity</p>
              <p className="text-2xl font-bold text-red-600">{reviewData?.stats?.bySeverity?.high || data?.reviewQueue?.bySeverity?.high || 0}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pending Review Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300">
                  <tr>
                    <th className="px-6 py-3 font-medium">Query</th>
                    <th className="px-6 py-3 font-medium">Severity</th>
                    <th className="px-6 py-3 font-medium">Length Change</th>
                    <th className="px-6 py-3 font-medium">Sections Changed</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {reviewData?.items?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No pending reviews. All optimizations processed.
                      </td>
                    </tr>
                  ) : (
                    reviewData?.items?.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.query}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.severity === 'high' ? 'bg-red-100 text-red-700' :
                            item.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {item.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={item.diffStats?.percentChange > 10 ? 'text-orange-500' : 'text-gray-600'}>
                            {item.diffStats?.percentChange > 0 ? '+' : ''}{item.diffStats?.percentChange || 0}%
                          </span>
                        </td>
                        <td className="px-6 py-4">{item.diffStats?.sectionCountChange || 0}</td>
                        <td className="px-6 py-4">{new Date(item.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={async () => {
                                try {
                                  await geoAPI.reviewItem(item.id, 'approve')
                                  toast.success('Optimization approved')
                                  fetchTabData('reviews')
                                } catch { toast.error('Failed to approve') }
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await geoAPI.reviewItem(item.id, 'reject')
                                  toast.success('Optimization rejected')
                                  fetchTabData('reviews')
                                } catch { toast.error('Failed to reject') }
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Citation Index Tab */}
      {activeTab === 'citations' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Citation Index
              <span className="ml-4 text-sm font-normal text-gray-500">
                Overall citation rate: <span className="font-bold text-indigo-600">{citationData?.citationRate?.citationRate?.toFixed(1) || data?.overall?.citationRate || '0'}%</span>
              </span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Domains most frequently cited by AI search engines for your tracked queries.
              Your domain: <span className="font-medium">{currentProject?.url ? new URL(currentProject.url).hostname : 'N/A'}</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-3 font-medium">Domain</th>
                  <th className="px-6 py-3 font-medium">Total Citations</th>
                  <th className="px-6 py-3 font-medium">Tracked Queries</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {(citationData?.citationIndex || data?.citatonIndex || []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center">
                      No citation data available. Run a ranking check to start tracking.
                    </td>
                  </tr>
                ) : (
                  (citationData?.citationIndex || data?.citatonIndex || []).map((entry: any, idx: number) => {
                    const isOurDomain = currentProject?.url && entry.domain === new URL(currentProject.url).hostname
                    return (
                      <tr key={idx} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isOurDomain ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                        <td className="px-6 py-4">
                          <span className={`font-medium ${isOurDomain ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>
                            {entry.domain} {isOurDomain && '(You)'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold">{entry.totalCitations}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {entry.queries?.slice(0, 3).map((q: string) => (
                              <span key={q} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">{q}</span>
                            ))}
                            {entry.queries?.length > 3 && (
                              <span className="text-xs text-gray-400">+{entry.queries.length - 3} more</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Entity Analysis Tab */}
      {activeTab === 'entities' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Entity Gaps */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Entity Coverage Gaps</h2>
              <p className="text-sm text-gray-500 mt-1">Topics competitors cover that you don't</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300">
                  <tr>
                    <th className="px-6 py-3 font-medium">Entity</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Gap</th>
                    <th className="px-6 py-3 font-medium">Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {(!entityData?.gaps || entityData.gaps.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center">
                        No entity gaps found. Your semantic coverage is competitive.
                      </td>
                    </tr>
                  ) : (
                    entityData?.gaps?.map((gap: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{gap.entity}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs capitalize">{gap.type}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div className="bg-red-500 h-2 rounded-full" style={{ width: `${Math.min(100, gap.competitorCoverage * 100)}%` }}></div>
                            </div>
                            <span className="text-xs">{((gap.competitorCoverage - gap.ourCoverage) * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            gap.impact === 'high' ? 'bg-red-100 text-red-700' :
                            gap.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                          }`}>{gap.impact}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Implicit Questions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Implicit Questions</h2>
              <p className="text-sm text-gray-500 mt-1">Follow-up questions AI would want your content to answer</p>
            </div>
            <div className="p-6 space-y-3">
              {(!entityData?.implicitQuestions || entityData.implicitQuestions.length === 0) ? (
                <p className="text-gray-500 text-center py-8">No implicit questions identified yet.</p>
              ) : (
                entityData?.implicitQuestions?.map((q: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-indigo-500 font-bold mt-0.5">Q{idx + 1}</span>
                    <div>
                      <p className="text-sm text-gray-900 dark:text-gray-200">{q.question}</p>
                      <p className="text-xs text-gray-400 mt-1">Frequency: {q.frequency}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={async () => {
                  try {
                    await geoAPI.updateEntityCoverage(projectId!)
                    toast.success('Entity coverage updated')
                    fetchTabData('entities')
                  } catch { toast.error('Failed to update') }
                }}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Refresh Entity Analysis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A/B Testing Tab */}
      {activeTab === 'abtesting' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">A/B Test Results</h2>
              <p className="text-sm text-gray-500 mt-1">Shadow testing: baseline vs optimized versions measured against real citation data</p>
            </div>
            <button
              onClick={async () => {
                try {
                  await geoAPI.runABTestMeasurement(projectId!)
                  toast.success('Measurement round completed')
                  fetchTabData('abtesting')
                } catch { toast.error('Failed to measure') }
              }}
              className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              Run Measurement
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-3 font-medium">Query</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Baseline Rate</th>
                  <th className="px-6 py-3 font-medium">Optimized Rate</th>
                  <th className="px-6 py-3 font-medium">Improvement</th>
                  <th className="px-6 py-3 font-medium">Confidence</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {(!abTestData || abTestData.length === 0) ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center">
                      No A/B tests running. Optimizations with medium/high severity automatically create tests.
                    </td>
                  </tr>
                ) : (
                  abTestData?.map((test: any) => (
                    <tr key={test.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{test.query}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          test.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          test.status === 'running' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>{test.status}</span>
                      </td>
                      <td className="px-6 py-4">{(test.baselineRate * 100).toFixed(1)}%</td>
                      <td className="px-6 py-4">{(test.optimizedRate * 100).toFixed(1)}%</td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${test.improvement > 0 ? 'text-emerald-600' : test.improvement < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {test.improvement > 0 ? '+' : ''}{test.improvement.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div className={`h-2 rounded-full ${test.significance > 70 ? 'bg-emerald-500' : test.significance > 40 ? 'bg-yellow-500' : 'bg-gray-400'}`}
                              style={{ width: `${test.significance}%` }}></div>
                          </div>
                          <span className="text-xs">{test.significance.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{new Date(test.startedAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <GEOOptimizationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        opportunity={selectedOpportunity}
        projectId={projectId!}
        onOptimized={fetchData}
      />
    </div>
  )
}