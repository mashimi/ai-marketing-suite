import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Coins, Zap } from 'lucide-react';
import TokenWallet from './TokenWallet';
import PricingPage from './PricingPage';
import { cn } from '@/utils/cn';

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<'wallet' | 'plans'>('wallet');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing & Usage</h1>
          <p className="text-muted-foreground mt-1">Manage your credits, subscription, and view usage history.</p>
        </div>

        <div className="flex bg-accent/30 p-1 rounded-xl border border-border/50 backdrop-blur-sm self-start">
          <button
            onClick={() => setActiveTab('wallet')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
              activeTab === 'wallet' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Coins className="h-4 w-4" />
            Wallet
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
              activeTab === 'plans' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Zap className="h-4 w-4" />
            Plans & Top-ups
          </button>
        </div>
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'wallet' ? <TokenWallet /> : <PricingPage />}
      </motion.div>
    </div>
  );
}
