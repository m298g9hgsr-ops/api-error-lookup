import { z } from 'zod';

/** 分析請求輸入 */
export const AnalyzeInputSchema = z.object({
  errorMessage: z.string().min(1, '請輸入錯誤訊息').max(50000),
  stackTrace: z.string().max(50000).optional(),
  context: z.string().max(50000).optional(),
  language: z.string().max(100).optional(),
  framework: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  promptVersion: z.string().max(100).optional(),
  trackExperiment: z.boolean().default(true),
  testCase: z.string().max(100).default('production'),
});

export type AnalyzeInput = z.infer<typeof AnalyzeInputSchema>;

/** 分析回應 */
export const AnalyzeResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.string().nullable(),
    errorType: z.string(),
    analysis: z.string(),
    suggestions: z.array(z.string()),
    documentation: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    tokensUsed: z.number().int().nonnegative(),
    model: z.string(),
    severity: z.string().optional(),
    cwe: z.array(z.string()).optional(),
    relatedConcepts: z.array(z.string()).optional(),
    createdAt: z.string(),
  }).nullable(),
  rateLimit: z.object({
    remaining: z.number().int().nonnegative(),
    resetAt: z.string(),
  }).optional(),
  error: z.string().optional(),
  details: z.unknown().optional(),
});

export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;

/** 歷史查詢參數 */
export const HistoryParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.enum(['date', 'confidence', 'type']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  errorType: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type HistoryParams = z.infer<typeof HistoryParamsSchema>;

/** 分頁回應 */
export const PaginatedSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  });

/** 分析記錄 */
export const AnalysisSchema = z.object({
  id: z.string(),
  errorInput: z.string(),
  errorType: z.string(),
  analysis: z.string(),
  confidence: z.number().min(0).max(1),
  suggestions: z.array(z.string()),
  documentation: z.array(z.string()),
  model: z.string(),
  tokensUsed: z.number().int().nonnegative(),
  createdAt: z.string(),
  userId: z.string(),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

/** 分頁分析回應 */
export const PaginatedAnalysisSchema = PaginatedSchema(AnalysisSchema);
export type PaginatedAnalysis = z.infer<typeof PaginatedAnalysisSchema>;

/** 用量回應 */
export const UsageResponseSchema = z.object({
  used: z.number().int().nonnegative(),
  limit: z.number().int(),
  remaining: z.number().int(),
  resetAt: z.string(),
  isUnlimited: z.boolean(),
});

export type UsageResponse = z.infer<typeof UsageResponseSchema>;

/** 訂閱狀態 */
export const SubscriptionStatusSchema = z.object({
  id: z.string(),
  userId: z.string(),
  plan: z.object({
    id: z.string(),
    name: z.string(),
    priceMonthly: z.number().int().nonnegative(),
    priceYearly: z.number().int().nonnegative().optional(),
    maxRequestsPerDay: z.number().int(),
    features: z.array(z.string()),
    stripePriceIdMonthly: z.string().optional(),
    stripePriceIdYearly: z.string().optional(),
  }),
  status: z.enum(['active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing']),
  currentPeriodStart: z.string(),
  currentPeriodEnd: z.string(),
  cancelAtPeriodEnd: z.boolean(),
  remainingQuota: z.number().int(),
  isPro: z.boolean(),
});

export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

/** 建立 Checkout Session */
export const CreateCheckoutSessionInputSchema = z.object({
  priceId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export type CreateCheckoutSessionInput = z.infer<typeof CreateCheckoutSessionInputSchema>;

export const CreateCheckoutSessionResponseSchema = z.object({
  url: z.string().url(),
  sessionId: z.string(),
});

export type CreateCheckoutSessionResponse = z.infer<typeof CreateCheckoutSessionResponseSchema>;

/** 計費入口 */
export const BillingPortalResponseSchema = z.object({
  url: z.string().url(),
});

export type BillingPortalResponse = z.infer<typeof BillingPortalResponseSchema>;

/** 發票回應 */
export const InvoiceSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  invoiceUrl: z.string().url().optional(),
  invoicePdf: z.string().url().optional(),
  createdAt: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
});

export const InvoicesResponseSchema = z.object({
  invoices: z.array(InvoiceSchema),
  hasMore: z.boolean(),
});

export type InvoicesResponse = z.infer<typeof InvoicesResponseSchema>;

/** 模式查詢參數 */
export const PatternParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  errorType: z.string().optional(),
  language: z.string().optional(),
  sortBy: z.enum(['frequency', 'pattern', 'errorType', 'createdAt', 'updatedAt']).default('frequency'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PatternParams = z.infer<typeof PatternParamsSchema>;

/** 錯誤模式 */
export const ErrorPatternSchema = z.object({
  id: z.string(),
  pattern: z.string(),
  errorType: z.string(),
  language: z.string().nullable().optional(),
  framework: z.string().nullable().optional(),
  rootCause: z.string(),
  fixTemplate: z.string(),
  docLinks: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  frequency: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
  isVerified: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PaginatedPatternsSchema = PaginatedSchema(ErrorPatternSchema);
export type PaginatedPatterns = z.infer<typeof PaginatedPatternsSchema>;
export type ErrorPattern = z.infer<typeof ErrorPatternSchema>;

/** 註冊輸入 */
export const RegisterInputSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;

/** 登入輸入 */
export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

/** 忘記密碼 */
export const ForgotPasswordInputSchema = z.object({
  email: z.string().email(),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInputSchema>;

/** 重置密碼 */
export const ResetPasswordInputSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(128),
});

export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;

/** 變更密碼 */
export const ChangePasswordInputSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8).max(128),
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordInputSchema>;