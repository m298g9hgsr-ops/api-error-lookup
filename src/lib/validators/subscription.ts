import { z } from 'zod';

// Subscription schemas
export const PlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  priceMonthly: z.number().int().nonnegative(),
  priceYearly: z.number().int().nonnegative().optional(),
  maxRequestsPerDay: z.number().int().nonnegative(),
  features: z.array(z.string()),
  stripePriceIdMonthly: z.string().optional(),
  stripePriceIdYearly: z.string().optional(),
  isActive: z.boolean(),
});

export const SubscriptionStatusSchema = z.object({
  plan: PlanSchema,
  status: z.enum(['active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired']),
  currentPeriodStart: z.string().datetime(),
  currentPeriodEnd: z.string().datetime(),
  cancelAtPeriodEnd: z.boolean(),
  usedQuota: z.number().int().nonnegative(),
  remainingQuota: z.number().int().nonnegative(),
});

export const UsageResponseSchema = z.object({
  used: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(), // -1 for unlimited
  resetAt: z.string().datetime(),
  plan: z.string(),
  isPro: z.boolean(),
});

export const CreateCheckoutSessionInputSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const CreateCheckoutSessionResponseSchema = z.object({
  url: z.string().url(),
  sessionId: z.string(),
});

export const BillingPortalResponseSchema = z.object({
  url: z.string().url(),
});

export const InvoiceSchema = z.object({
  id: z.string(),
  amount: z.number().int(),
  currency: z.string(),
  status: z.enum(['draft', 'open', 'paid', 'void', 'uncollectible']),
  createdAt: z.string().datetime(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  invoiceUrl: z.string().url().optional(),
  pdfUrl: z.string().url().optional(),
});

export const InvoicesResponseSchema = z.object({
  data: z.array(InvoiceSchema),
  hasMore: z.boolean(),
});

// Types
export type Plan = z.infer<typeof PlanSchema>;
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;
export type UsageResponse = z.infer<typeof UsageResponseSchema>;
export type CreateCheckoutSessionInput = z.infer<typeof CreateCheckoutSessionInputSchema>;
export type CreateCheckoutSessionResponse = z.infer<typeof CreateCheckoutSessionResponseSchema>;
export type BillingPortalResponse = z.infer<typeof BillingPortalResponseSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type InvoicesResponse = z.infer<typeof InvoicesResponseSchema>;