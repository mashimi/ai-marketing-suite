import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { FileText, Share2, ExternalLink, ArrowUpRight, MessageCircle } from 'lucide-react'
import { contentAPI, socialAPI } from '@/services/api'
import { formatRelativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'

interface Props {
  type: 'content' | 'social'
}

export default function RecentActivity({ type }: Props) {
  const { data: contentPieces } = useQuery({
    queryKey: ['content', 'recent'],
    queryFn: () => contentAPI.list('1'),
    enabled: type === 'content',
  })

  const { data: socialData } = useQuery({
    queryKey: ['social', 'recent'],
    queryFn: () => socialAPI.monitor('1', 'reddit'),
    enabled: type === 'social',
  })

  if (type === 'content') {
    if (!contentPieces?.length) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No content yet
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {contentPieces.slice(0, 4).map((piece, i) => (
          <motion.div
            key={piece.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
          >
            <div className="p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                {piece.title}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                    piece.status === 'published' && 'bg-green-500/10 text-green-400',
                    piece.status === 'draft' && 'bg-slate-500/10 text-slate-400',
                    piece.status === 'review' && 'bg-yellow-500/10 text-yellow-400'
                  )}
                >
                  {piece.status}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(piece.createdAt)}
                </span>
                {piece.seoScore > 0 && (
                  <span className="text-xs text-muted-foreground">
                    SEO: {piece.seoScore}
                  </span>
                )}
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        ))}
      </div>
    )
  }

  if (type === 'social') {
    const mentions = socialData?.mentions || []
    if (!mentions.length) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No mentions yet
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {mentions.slice(0, 4).map((mention, i) => (
          <motion.div
            key={mention.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
          >
            <div className="p-2 rounded-lg bg-orange-500/10 flex-shrink-0">
              <Share2 className="w-4 h-4 text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                {mention.title}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-muted-foreground">r/{mention.platform}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowUpRight className="w-3 h-3" />
                  {mention.upvotes}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageCircle className="w-3 h-3" />
                  {mention.comments}
                </span>
              </div>
            </div>
            <div
              className={cn(
                'w-2 h-2 rounded-full flex-shrink-0 mt-2',
                mention.sentiment === 'positive' && 'bg-green-500',
                mention.sentiment === 'neutral' && 'bg-yellow-500',
                mention.sentiment === 'negative' && 'bg-red-500'
              )}
            />
          </motion.div>
        ))}
      </div>
    )
  }

  return null
}
