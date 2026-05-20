import { useState } from 'react';

// Mock hook for now. In a real app, this would use react-query or similar to hit the backend routes.
function useContentActions() {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const approve = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/content/${id}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to approve');
      // Success logic (toast, refresh data)
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingId(null);
    }
  };

  const reject = async (id: string, feedback: string = 'Please rewrite') => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/content/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });
      if (!res.ok) throw new Error('Failed to reject');
      // Success logic
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingId(null);
    }
  };

  return { approve, reject, loadingId };
}

export function ApprovalCard({ piece }: { piece: any }) { // Using any for piece temporarily, replace with your ContentPiece type
  const { approve, reject, loadingId } = useContentActions(); 

  return (
    <div className="border-l-4 border-yellow-500 bg-yellow-500/5 p-4 rounded-r-xl mb-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-sm font-bold">Review Required</h4>
          <p className="text-xs text-muted-foreground">AI has finished this draft. Please review for brand accuracy.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => reject(piece.id)}
            disabled={loadingId === piece.id}
            className="px-3 py-1 bg-red-500/10 text-red-500 text-xs rounded-lg disabled:opacity-50"
          >
            Rewrite
          </button>
          <button 
            onClick={() => approve(piece.id)}
            disabled={loadingId === piece.id}
            className="px-3 py-1 bg-green-500 text-white text-xs rounded-lg disabled:opacity-50"
          >
            Approve & Publish
          </button>
        </div>
      </div>
    </div>
  );
}
