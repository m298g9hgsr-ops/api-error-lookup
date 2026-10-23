import { z } from 'zod';

// Input schemas
export const AnalyzeInputSchema = z.object({
  errorMessage: z.string().min(1, 'Error message is required').max(100000),
  stackTrace: z.string().max(50000).optional(),
  context: z.string().max(10000).optional(),
  language: z.string().optional(),
  framework: z.string().optional(),
  model: z.string().optional(),
});

export const HistoryParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  errorType: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['date', 'confidence', 'type']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const PatternParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['frequency', 'name', 'createdAt']).default('frequency'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Output schemas
export const DocumentationLinkSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  description: z.string().optional(),
});

export const AnalyzeResponseSchema = z.object({
  id: z.string().optional(),
  errorType: z.string(),
  analysis: z.string(),
  suggestions: z.array(z.string()),
  documentation: z.array(z.string()).optional(),
  documentationLinks: z.array(DocumentationLinkSchema).optional(),
  confidence: z.number().min(0).max(100),
  tokensUsed: z.number().int().optional(),
  model: z.string().optional(),
  severity: z.string().optional(),
  cwe: z.array(z.string()).optional(),
  relatedConcepts: z.array(z.string()).optional(),
  latencyMs: z.number().optional(),
});

export const AnalysisSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  errorInput: z.string(),
  stackTrace: z.string().nullable(),
  context: z.string().nullable(),
  model: z.string(),
  errorType: z.string(),
  analysis: z.string(),
  suggestions: z.string(), // JSON string
  documentation: z.string().nullable(), // JSON string
  confidence: z.number(),
  tokensUsed: z.number(),
  createdAt: z.string().datetime(),
});

export const PaginatedAnalysisSchema = z.object({
  data: z.array(AnalysisSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

// Normalized request type (internal use)
export const NormalizedAnalyzeRequestSchema = z.object({
  errorMessage: z.string().min(1),
  stackTrace: z.string().optional(),
  context: z.string().optional(),
  model: z.string().optional(),
  promptVersion: z.string().optional(),
  language: z.string().optional(),
  framework: z.string().optional(),
  trackExperiment: z.boolean().default(true),
  testCase: z.string().default('production'),
});

// Validation result type
export type ValidateResult<T> =
  | { success: true; data: T }
  | { success: false; errors: z.ZodError };

/**
 * Validates and normalizes the analyze request.
 * Accepts either `errorMessage` (preferred) or `errorInput` (legacy/frontend compatibility).
 * Normalizes `errorInput` to `errorMessage`.
 */
export function validateAndNormalizeAnalyzeRequest(input: unknown): ValidateResult<z.infer<typeof NormalizedAnalyzeRequestSchema>> {
  // First pass: accept both errorMessage and errorInput
  const looseSchema = z.object({
    errorMessage: z.string().optional(),
    errorInput: z.string().optional(),
    stackTrace: z.string().optional(),
    context: z.string().optional(),
    model: z.string().optional(),
    promptVersion: z.string().optional(),
    language: z.string().optional(),
    framework: z.string().optional(),
    trackExperiment: z.boolean().optional(),
    testCase: z.string().optional(),
  });

  const looseResult = looseSchema.safeParse(input);
  if (!looseResult.success) {
    return { success: false, errors: looseResult.error };
  }

  const { errorMessage, errorInput, ...rest } = looseResult.data;
  
  // Normalize: errorInput -> errorMessage
  const normalizedErrorMessage = errorMessage || errorInput || '';
  
  if (!normalizedErrorMessage.trim()) {
    return {
      success: false,
      errors: z.ZodError.create([
        {
          code: 'custom',
          message: 'errorMessage is required',
          path: ['errorMessage'],
        },
      ]),
    };
  }

  // Second pass: strict validation on normalized data
  const strictResult = NormalizedAnalyzeRequestSchema.safeParse({
    errorMessage: normalizedErrorMessage,
    ...rest,
  });

  if (!strictResult.success) {
    return { success: false, errors: strictResult.error };
  }

  return { success: true, data: strictResult.data };
}

// Pattern schemas
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
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PaginatedPatternsSchema = z.object({
  data: z.array(ErrorPatternSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

// Types
export type AnalyzeInput = z.infer<typeof AnalyzeInputSchema>;
export type HistoryParams = z.infer<typeof HistoryParamsSchema>;
export type PatternParams = z.infer<typeof PatternParamsSchema>;
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;
export type PaginatedAnalysis = z.infer<typeof PaginatedAnalysisSchema>;
export type DocumentationLink = z.infer<typeof DocumentationLinkSchema>;
export type NormalizedAnalyzeRequest = z.infer<typeof NormalizedAnalyzeRequestSchema>;
export type ErrorPattern = z.infer<typeof ErrorPatternSchema>;
export type PaginatedPatterns = z.infer<typeof PaginatedPatternsSchema>;