import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { analyzeError, AIAnalysisRequest } from '@/services/aiAnalysis';
import { validateAndNormalizeAnalyzeRequest } from '@/lib/validators/analyze';
import { checkAndConsumeQuota, checkAnonymousRateLimit, quotaToHeaders, getClientIdentifier } from '@/lib/quota';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. 認證檢查
    let userId: string | null = null;
    try {
      const session = await getServerSession(authOptions);
      const sessionUser = session?.user as { id?: string } | undefined;
      userId = sessionUser?.id ?? null;
    } catch (authError) {
      console.warn(
        'Session lookup skipped (continuing anonymously):',
        authError instanceof Error ? authError.message : authError
      );
    }

    // 2. 配額檢查
    let quotaResult;
    if (userId) {
      // 已登入用戶：使用資料庫配額系統
      quotaResult = await checkAndConsumeQuota(userId);
    } else {
      // 匿名用戶：使用記憶體速率限制
      const clientId = await getClientIdentifier();
      quotaResult = await checkAnonymousRateLimit(clientId);
    }

    // 設定速率限制 headers
    const rateLimitHeaders = quotaToHeaders(quotaResult);

    if (!quotaResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: quotaResult.isUnlimited
            ? 'Rate limit exceeded'
            : `已達今日分析次數上限 (${quotaResult.used}/${quotaResult.limit})，請稍後再試或升級方案`,
          rateLimit: {
            limit: quotaResult.isUnlimited ? 'unlimited' : quotaResult.limit,
            remaining: quotaResult.isUnlimited ? 'unlimited' : quotaResult.remaining,
            resetAt: quotaResult.resetAt.toISOString(),
          },
        },
        { 
          status: 429,
          headers: rateLimitHeaders,
        }
      );
    }

    // 3. 解析並驗證請求
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      rawBody = {};
    }

    const validationResult = validateAndNormalizeAnalyzeRequest(rawBody);
    
    if (!validationResult.success) {
      const errorMessages = validationResult.errors.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return NextResponse.json(
        { 
          success: false, 
          error: '請求格式錯誤', 
          details: errorMessages 
        },
        { 
          status: 400,
          headers: rateLimitHeaders,
        }
      );
    }

    const normalizedRequest = validationResult.data;

    // 4. 執行 AI 分析
    const analysisRequest: AIAnalysisRequest = {
      errorMessage: normalizedRequest.errorMessage,
      stackTrace: normalizedRequest.stackTrace,
      context: normalizedRequest.context,
      model: normalizedRequest.model,
      promptVersion: normalizedRequest.promptVersion,
      language: normalizedRequest.language,
      framework: normalizedRequest.framework,
      trackExperiment: normalizedRequest.trackExperiment,
      testCase: normalizedRequest.testCase,
    };

    const result = await analyzeError(analysisRequest);

    // 5. 儲存分析結果（資料庫失敗不影響分析結果回傳）
    let analysisId: string | null = null;
    try {
      const analysis = await prisma.analysis.create({
        data: {
          userId,
          errorInput: analysisRequest.errorMessage,
          stackTrace: analysisRequest.stackTrace,
          context: analysisRequest.context,
          model: result.model,
          errorType: result.errorType,
          analysis: result.analysis,
          suggestions: JSON.stringify(result.suggestions ?? []),
          documentation: result.documentation
            ? JSON.stringify(result.documentation)
            : null,
          confidence: result.confidence ?? 0,
          tokensUsed: result.tokensUsed ?? 0,
        },
      });
      analysisId = analysis.id;
    } catch (dbError) {
      console.warn(
        'Failed to persist analysis (continuing):',
        dbError instanceof Error ? dbError.message : dbError
      );
    }

    // 6. 回傳統一格式回應
    const response = NextResponse.json({
      success: true,
      data: {
        id: analysisId,
        errorType: result.errorType,
        analysis: result.analysis,
        suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
        documentation: Array.isArray(result.documentation) ? result.documentation : [],
        confidence: result.confidence ?? 0,
        tokensUsed: result.tokensUsed ?? 0,
        model: result.model,
        severity: result.severity,
        cwe: Array.isArray(result.cwe) ? result.cwe.join(', ') : result.cwe,
        relatedConcepts: result.relatedConcepts,
        latencyMs: result.latencyMs,
      },
      rateLimit: {
        limit: quotaResult.isUnlimited ? 'unlimited' : quotaResult.limit,
        remaining: quotaResult.isUnlimited ? 'unlimited' : quotaResult.remaining,
        resetAt: quotaResult.resetAt.toISOString(),
      },
    }, { headers: rateLimitHeaders });

    return response;
  } catch (error) {
    console.error('Analysis error:', error);

    // 錯誤碼對應 HTTP 狀態
    let status = 500;
    let errorMessage = 'Internal server error';
    let errorDetails: string | undefined;

    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as Record<string, unknown>).code;
      if (code === 'AI_ANALYSIS_ERROR') {
        status = 502;
        errorMessage = 'AI analysis failed';
        errorDetails = 'error' in error ? String((error as Record<string, unknown>).error) : undefined;
      }
    }

    const rateLimitHeaders = {
      'X-RateLimit-Limit': 'unknown',
      'X-RateLimit-Remaining': 'unknown',
      'X-RateLimit-Reset': Math.ceil((Date.now() + 24 * 60 * 60 * 1000) / 1000).toString(),
    };

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: errorDetails,
      },
      { 
        status,
        headers: rateLimitHeaders,
      }
    );
  }
}