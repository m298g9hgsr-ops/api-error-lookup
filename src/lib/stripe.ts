import Stripe from 'stripe';
import { NextAuthOptions } from 'next-auth';

// Skip Stripe initialization during build
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

let stripeInstance: Stripe | null = null;

if (!isBuildTime) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
}

function getStripe(): Stripe {
  if (!stripeInstance) {
    throw new Error('Stripe is not initialized. This should only happen at build time.');
  }
  return stripeInstance;
}

export const stripe = stripeInstance;

export function getStripePriceId(planName: string, interval: 'month' | 'year'): string | null {
  const priceIds: Record<string, Record<string, string>> = {
    pro: {
      month: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
      year: process.env.STRIPE_PRICE_PRO_YEARLY || '',
    },
    enterprise: {
      month: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
      year: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || '',
    },
  };
  return priceIds[planName]?.[interval] || null;
}

// Re-export getStripe for runtime use
export { getStripe };