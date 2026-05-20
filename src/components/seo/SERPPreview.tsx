import { motion } from 'framer-motion'
import { Search, Globe, MoreVertical, Smartphone, Monitor } from 'lucide-react'
import { useState } from 'react'
import { format } from 'date-fns'
import { cn } from '@/utils/cn'

interface SERPPreviewProps {
  title: string
  url: string
  description: string
  keywords?: string[]
}

export default function SERPPreview({ title, url, description, keywords = [] }: SERPPreviewProps) {
  const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop')

  const highlightKeywords = (text: string) => {
    if (!keywords.length) return text
    const regex = new RegExp(`(${keywords.join('|')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) => 
      keywords.some(k => k.toLowerCase() === part.toLowerCase()) 
        ? <span key={i} className="font-bold text-foreground">{part}</span> 
        : part
    )
  }

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-border/50 flex items-center justify-between bg-accent/5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
            <Search className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">SERP Simulation</span>
        </div>
        <div className="flex bg-background border border-border p-1 rounded-lg">
          <button 
            onClick={() => setDevice('desktop')}
            className={cn(
              "p-1.5 rounded-md transition-all",
              device === 'desktop' ? "bg-accent text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setDevice('mobile')}
            className={cn(
              "p-1.5 rounded-md transition-all",
              device === 'mobile' ? "bg-accent text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-8 flex justify-center bg-[#f8f9fa] dark:bg-[#1a1c1e]">
        <motion.div 
          layout
          className={cn(
            "bg-white dark:bg-[#202124] rounded-lg shadow-sm border border-[#dadce0] dark:border-[#3c4043] overflow-hidden transition-all duration-500",
            device === 'desktop' ? "w-full max-w-[650px] p-6" : "w-[360px] p-4"
          )}
        >
          {/* Breadcrumb / URL */}
          <div className="flex items-center gap-2 mb-1 group">
            <div className="w-7 h-7 rounded-full bg-[#f1f3f4] dark:bg-[#3c4043] flex items-center justify-center">
              <Globe className="w-4 h-4 text-[#5f6368] dark:text-[#bdc1c6]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-[12px] text-[#202124] dark:text-[#e8eaed] font-medium truncate">
                  {new URL(url).hostname}
                </span>
                <MoreVertical className="w-3 h-3 text-[#70757a] dark:text-[#9aa0a6]" />
              </div>
              <span className="text-[10px] text-[#4d5156] dark:text-[#9aa0a6] truncate">
                {url}
              </span>
            </div>
          </div>

          {/* Title */}
          <h3 className={cn(
            "text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer transition-colors line-clamp-1 mb-1",
            device === 'desktop' ? "text-xl" : "text-lg"
          )}>
            {title || 'Page Title Placeholder'}
          </h3>

          {/* Snippet / Description */}
          <div className="flex flex-col gap-1">
            <p className={cn(
              "text-[#4d5156] dark:text-[#bdc1c6] leading-relaxed line-clamp-2",
              device === 'desktop' ? "text-sm" : "text-[14px]"
            )}>
              <span className="font-medium text-[#70757a] dark:text-[#9aa0a6] mr-1">
                {format(new Date(), 'MMM d, yyyy')} —
              </span>
              {description ? highlightKeywords(description) : 'Enter a meta description to see how your page will appear in search results. A good description is between 150-160 characters.'}
            </p>
          </div>

          {/* Site Links (Desktop only) */}
          {device === 'desktop' && (
            <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2">
              <div className="space-y-0.5">
                <div className="text-[14px] text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer font-medium">Pricing Plans</div>
                <div className="text-[12px] text-[#4d5156] dark:text-[#bdc1c6] line-clamp-1">Scale your business with our flexible plans...</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-[14px] text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer font-medium">Features</div>
                <div className="text-[12px] text-[#4d5156] dark:text-[#bdc1c6] line-clamp-1">Explore our advanced AI marketing tools...</div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <div className="p-4 bg-accent/5 border-t border-border/50 flex flex-wrap gap-2">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mr-2 py-1">Target Keywords:</span>
        {keywords.map((kw, i) => (
          <span key={i} className="text-[10px] font-medium bg-background border border-border px-2 py-0.5 rounded-md shadow-sm">
            {kw}
          </span>
        ))}
        {keywords.length === 0 && <span className="text-[10px] italic text-muted-foreground">No keywords defined</span>}
      </div>
    </div>
  )
}
