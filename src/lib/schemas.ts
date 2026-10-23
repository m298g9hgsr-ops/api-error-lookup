import { z } from 'zod';

/** 錯誤分析請求的 Zod schema */
export const AnalyzeErrorRequestSchema = z.object({
  errorMessage: z.string().min(1, '請輸入錯誤訊息').max(50000, '錯誤訊息過長'),
  stackTrace: z.string().max(50000, '堆疊追蹤過長').optional(),
  context: z.string().max(50000, '上下文過長').optional(),
  language: z.string().max(100, '語言名稱過長').optional(),
  framework: z.string().max(100, '框架名稱過長').optional(),
  model: z.string().max(100).optional(),
  promptVersion: z.string().max(100).optional(),
  trackExperiment: z.boolean().default(true),
  testCase: z.string().max(100).default('production'),
});

/** 錯誤分析回應的 Zod schema */
export const AnalyzeErrorResponseSchema = z.object({
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
  }).nullable(),
  rateLimit: z.object({
    remaining: z.number().int().nonnegative(),
    resetAt: z.string(),
  }).optional(),
  error: z.string().optional(),
  details: z.unknown().optional(),
});

/** 從 schema 推導型別 */
export type AnalyzeErrorRequest = z.infer<typeof AnalyzeErrorRequestSchema>;
export type AnalyzeErrorResponse = z.infer<typeof AnalyzeErrorResponseSchema>;

/** 前端輸入表單的 schema */
export const ErrorInputFormSchema = z.object({
  errorInput: z.string().min(1, '請輸入錯誤訊息、HTTP 狀態碼或堆疊追蹤').max(50000, '輸入過長'),
  stackTrace: z.string().max(50000).optional(),
  context: z.string().max(50000).optional(),
  language: z.string().max(100).optional(),
  framework: z.string().max(100).optional(),
});

export type ErrorInputForm = z.infer<typeof ErrorInputFormSchema>;

/** 範例錯誤 schema */
export const ExampleErrorSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  errorText: z.string(),
  category: z.string(),
});

export type ExampleError = z.infer<typeof ExampleErrorSchema>;