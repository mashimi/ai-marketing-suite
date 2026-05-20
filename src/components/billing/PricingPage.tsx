import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, Rocket, Coins, ArrowRight, Loader2 } from 'lucide-react';
import { billingService } from '@/services/billing';
import { PlanDefinition, TokenPackage } from '@/types';
import { cn } from '@/utils/cn';

export default function PricingPage() {
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadBillingData() {
      try {
        const [plansData, packagesData] = await Promise.all([
          billingService.getPlans(),
          billingService.getPackages(),
        ]);
        setPlans(plansData);
        setPackages(packagesData);
      } catch (error) {
        console.error('Failed to load billing data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadBillingData();
  }, []);

  const handleCheckout = async (priceId: string, type: 'subscription' | 'one_time') => {
    setProcessingId(priceId);
    try {
      const { url } = await billingService.createCheckoutSession(priceId, type);
      window.location.href = url;
    } catch (error) {
      console.error('Checkout failed:', error);
      setProcessingId(null);
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
    <div className="space-y-12 pb-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Pricing Plans</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Choose the plan that fits your marketing needs.
        </p>
      </div>

      {/* Subscription Plans */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-md",
              plan.name.toLowerCase() === 'pro' && "border-primary/50 ring-1 ring-primary/50"
            )}
          >
            {plan.name.toLowerCase() === 'pro' && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">
                POPULAR
              </div>
            )}
            
            <div className="flex items-center gap-2">
              {plan.name.toLowerCase() === 'starter' && <Rocket className="h-5 w-5 text-blue-400" />}
              {plan.name.toLowerCase() === 'pro' && <Zap className="h-5 w-5 text-primary" />}
              {plan.name.toLowerCase() === 'enterprise' && <Crown className="h-5 w-5 text-amber-400" />}
              <h3 className="text-xl font-bold">{plan.name}</h3>
            </div>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold">
                {plan.plan === 'free' ? '$0' : 
                 plan.plan === 'starter' ? '$29' :
                 plan.plan === 'pro' ? '$79' : '$199'}
              </span>
              <span className="text-muted-foreground">/mo</span>
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-sm font-medium text-amber-400">
              <Coins className="h-4 w-4" />
              <span>{plan.monthlyTokens.toLocaleString()} tokens included</span>
            </div>

            <ul className="mt-8 flex-1 space-y-4">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout(plan.plan, 'subscription')}
              disabled={!!processingId}
              className={cn(
                "mt-8 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all",
                plan.name.toLowerCase() === 'pro'
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {processingId === plan.plan ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Subscribe Now
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      <hr className="border-border" />

      {/* Token Top-ups */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">One-time Top-ups</h2>
          <p className="mt-2 text-muted-foreground">
            Need more credits? Buy a package and it never expires.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((pkg) => (
            <motion.div
              key={pkg.id}
              whileHover={{ scale: 1.02 }}
              className="flex flex-col rounded-xl border bg-card/50 p-6 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 font-bold">
                <Coins className="h-5 w-5 text-amber-400" />
                <span>{pkg.name}</span>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold">${pkg.priceUsd}</span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {pkg.tokenAmount.toLocaleString()} Credits
              </div>
              <button
                onClick={() => handleCheckout(pkg.id, 'one_time')}
                disabled={!!processingId}
                className="mt-6 w-full rounded-lg bg-accent py-2 text-sm font-semibold hover:bg-accent/80 transition-all disabled:opacity-50"
              >
                {processingId === pkg.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  'Purchase'
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
