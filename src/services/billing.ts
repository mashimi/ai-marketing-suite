import axios from 'axios';
import { TokenWallet, TokenPackage, PlanDefinition, TokenTransaction } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

export const billingService = {
  getWallet: async (): Promise<TokenWallet> => {
    const response = await axios.get(`${API_URL}/billing/wallet`);
    return response.data;
  },

  getTransactions: async (): Promise<TokenTransaction[]> => {
    const response = await axios.get(`${API_URL}/billing/transactions`);
    return response.data;
  },

  getPackages: async (): Promise<TokenPackage[]> => {
    const response = await axios.get(`${API_URL}/billing/plans`);
    return response.data.packages;
  },

  getPlans: async (): Promise<PlanDefinition[]> => {
    const response = await axios.get(`${API_URL}/billing/plans`);
    return response.data.plans;
  },

  createCheckoutSession: async (id: string, type: 'subscription' | 'one_time'): Promise<{ url: string }> => {
    const payload = type === 'subscription' 
      ? { planId: id, successUrl: window.location.origin + '/billing?success=true', cancelUrl: window.location.origin + '/billing?cancel=true' }
      : { packageId: id, successUrl: window.location.origin + '/billing?success=true', cancelUrl: window.location.origin + '/billing?cancel=true' };
    
    const response = await axios.post(`${API_URL}/billing/checkout`, payload);
    return response.data;
  },

  createPortalSession: async (): Promise<{ url: string }> => {
    const response = await axios.post(`${API_URL}/billing/portal`);
    return response.data;
  },
};
