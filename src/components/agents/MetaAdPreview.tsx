import { ThumbsUp, MessageSquare, Share2 } from 'lucide-react';

export function MetaAdPreview({ adCopy }: { adCopy: any }) {
  const primaryText = adCopy?.primaryText || "Tired of wasting hours? Our new AI solution cuts your work in half. Try it free today!";
  const headline = adCopy?.headline || "The #1 AI Tool for 2026";
  const cta = adCopy?.cta || "Learn More";

  return (
    <div className="max-w-[400px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="p-3 flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">B</div>
        <div>
          <p className="text-sm font-bold">Your Brand Name</p>
          <p className="text-[10px] text-slate-400">Sponsored</p>
        </div>
      </div>
      
      <div className="px-4 py-2 text-sm text-slate-200">
        {primaryText}
      </div>
      
      <div className="aspect-video bg-slate-800 flex items-center justify-center text-slate-500 italic">
        Ad Creative Image (1200x628)
      </div>
      
      <div className="p-3 bg-slate-800 flex justify-between items-center">
        <div className="flex-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">
            {typeof window !== 'undefined' ? new URL(window.location.href).hostname : 'yoursite.com'}
          </p>
          <p className="text-sm font-bold uppercase">{headline}</p>
        </div>
        <button className="bg-slate-700 px-4 py-1.5 rounded text-xs font-bold uppercase">
          {cta}
        </button>
      </div>

      <div className="px-4 py-2 flex justify-between border-t border-slate-700/50">
         <ThumbsUp className="w-4 h-4 text-slate-400" />
         <MessageSquare className="w-4 h-4 text-slate-400" />
         <Share2 className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  );
}
