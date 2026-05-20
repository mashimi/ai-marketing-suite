import { useState, useEffect } from 'react'
import { X, Sparkles, CheckCircle } from 'lucide-react'
import { geoAPI } from '../../services/api'
import { toast } from 'react-hot-toast'

interface GEOOptimizationModalProps {
  isOpen: boolean
  onClose: () => void
  opportunity: any
  projectId: string
  onOptimized: () => void
}

export default function GEOOptimizationModal({ isOpen, onClose, opportunity, projectId, onOptimized }: GEOOptimizationModalProps) {
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<any>(null)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    if (isOpen && opportunity) {
      loadRecommendations()
    }
  }, [isOpen, opportunity])

  const loadRecommendations = async () => {
    try {
      setLoading(true)
      const data = await geoAPI.getRecommendations(projectId, opportunity.query, opportunity.platform)
      setRecommendations(data)
    } catch (error) {
      toast.error('Failed to load AI recommendations')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    try {
      setApplying(true)
      const res = await geoAPI.autoOptimizeAll(projectId, 1) 
      
      if (res.results[0]?.success) {
        toast.success('Optimization applied successfully!')
        onOptimized()
        onClose()
      } else {
        toast.error(res.results[0]?.reason || 'Failed to apply optimization')
      }
    } catch (error) {
      toast.error('Error applying optimization')
      console.error(error)
    } finally {
      setApplying(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="relative z-50">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
        <div className="mx-auto max-w-2xl w-full rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-2xl pointer-events-auto border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-indigo-500" />
              GEO Optimization Insights
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {opportunity && (
            <div className="mb-6 flex gap-3 flex-wrap">
              <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full">
                Query: {opportunity.query}
              </span>
              <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">
                Platform: {opportunity.platform}
              </span>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${opportunity.score > 70 ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700'}`}>
                Score: {opportunity.score}/100
              </span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">DeepSeek is analyzing content gaps...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700/30 p-5 rounded-xl border border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Actionable Recommendations</h3>
                <ul className="space-y-3">
                  {recommendations?.actions?.map((action: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{action}</span>
                    </li>
                  ))}
                  {!recommendations?.actions?.length && (
                    <p className="text-gray-500 text-sm italic">No specific actions identified.</p>
                  )}
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Schema Suggestions</h3>
                  <div className="flex flex-wrap gap-2">
                    {recommendations?.schemaSuggestions?.map((schema: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 rounded text-xs font-medium border border-fuchsia-100 dark:border-fuchsia-800">
                        {schema}
                      </span>
                    ))}
                    {!recommendations?.schemaSuggestions?.length && <span className="text-sm text-gray-400">None</span>}
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">FAQ Opportunities</h3>
                  <ul className="list-disc pl-4 text-xs text-gray-600 dark:text-gray-400 space-y-1.5">
                    {recommendations?.faqSuggestions?.map((faq: string, idx: number) => (
                      <li key={idx}>{faq}</li>
                    ))}
                    {!recommendations?.faqSuggestions?.length && <li>None identified</li>}
                  </ul>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button 
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleApply} 
                  disabled={applying}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {applying ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Apply AI Optimizations
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
