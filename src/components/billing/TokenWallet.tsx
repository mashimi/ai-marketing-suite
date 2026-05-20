import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Coins, 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard,
  ExternalLink,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useStore } from '@/store';
import { billingService } from '@/services/billing';
import { TokenTransaction } from '@/types';
import { cn } from '@/utils/cn';
import { formatRelativeTime } from '@/utils/format';

export default function TokenWallet() {
  const { wallet, setWallet } = useStore();
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [walletData, txData] = await Promise.all([
          billingService.getWallet(),
          billingService.getTransactions(),
        ]);
        setWallet(walletData);
        setTransactions(txData);
      } catch (error) {
        console.error('Failed to load wallet data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [setWallet]);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { url } = await billingService.createPortalSession();
      window.location.href = url;
    } catch (error) {
      console.error('Failed to open billing portal:', error);
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Wallet Summary */}
      <div className="space-y-6 lg:col-span-1">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-8"
        >
          <div className="flex items-center justify-between">
            <div className="rounded-full bg-amber-500/20 p-3">
              <Coins className="h-6 w-6 text-amber-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Available Balance
            </span>
          </div>
          
          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-5xl font-bold">{wallet?.balance.toLocaleString()}</span>
            <span className="text-sm font-medium text-muted-foreground">Credits</span>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Monthly Allowance</p>
              <p className="font-semibold">{wallet?.monthlyAllowance.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Reserved</p>
              <p className="font-semibold text-amber-400">{wallet?.reserved.toLocaleString()}</p>
            </div>
          </div>

          <button 
            onClick={handleManageBilling}
            disabled={portalLoading}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all"
          >
            {portalLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Manage Subscription
              </>
            )}
          </button>
        </motion.div>

        {wallet?.balance === 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Your balance is empty. AI agents will pause until you top up or your allowance resets.</p>
          </div>
        )}
      </div>

      {/* Transactions History */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border bg-card flex flex-col h-full">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-bold">Transaction History</h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[600px]">
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                <History className="h-12 w-12 mb-4 opacity-20" />
                <p>No transactions yet.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-card border-b border-border text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Description</th>
                    <th className="px-6 py-3 font-medium">Amount</th>
                    <th className="px-6 py-3 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-6 py-4">
                        {tx.type === 'CREDIT' ? (
                          <div className="flex items-center gap-2 text-green-400">
                            <ArrowUpRight className="h-4 w-4" />
                            <span className="text-sm font-medium">Credit</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-400">
                            <ArrowDownLeft className="h-4 w-4" />
                            <span className="text-sm font-medium">Debit</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium">{tx.description}</p>
                        {tx.metadata && (tx.metadata as any).agentType && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Agent: {(tx.metadata as any).agentType}
                          </p>
                        )}
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-sm font-bold",
                        tx.type === 'CREDIT' ? "text-green-400" : "text-amber-400"
                      )}>
                        {tx.type === 'CREDIT' ? '+' : '-'}{tx.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                        {formatRelativeTime(tx.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
