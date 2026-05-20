import { Music, Video, Zap } from 'lucide-react';

export function TikTokScriptCard({ script }: { script: any }) {
  // Graceful fallback if the script object isn't fully structured yet
  const hooks = script?.hooks || ["Hook 1: Did you know...", "Hook 2: Stop scrolling!", "Hook 3: I tried the viral..."];
  const audioStyle = script?.audioStyle || "Trending phonk or fast-paced Lo-Fi";
  const visualStyle = script?.visualStyle || "Quick cuts, green screen, B-roll";

  return (
    <div className="bg-gradient-to-br from-slate-900 to-black border border-pink-500/30 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-pink-500 p-2 rounded-lg">
            <Video className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-bold">TikTok Video Strategy</h3>
        </div>
        <span className="text-[10px] bg-white/10 px-2 py-1 rounded-full uppercase tracking-tighter">Algorithm Optimized</span>
      </div>

      <div className="space-y-4">
        <div className="bg-white/5 p-3 rounded-xl border border-white/10">
          <p className="text-xs text-pink-400 font-bold uppercase mb-1 flex items-center gap-1">
            <Zap className="w-3 h-3" /> The Hook
          </p>
          <p className="text-sm italic">"{hooks[0]}"</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="text-blue-400 font-bold mb-1 flex items-center gap-1">
               <Music className="w-3 h-3" /> Audio
            </p>
            <p>{audioStyle}</p>
          </div>
          <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <p className="text-purple-400 font-bold mb-1">Visual Style</p>
            <p>{visualStyle}</p>
          </div>
        </div>

        <button className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-pink-500 hover:text-white transition-all text-sm">
          Copy Full Script
        </button>
      </div>
    </div>
  );
}
