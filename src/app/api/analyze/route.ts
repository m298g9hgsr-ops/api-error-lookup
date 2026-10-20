import { NextRequest, NextResponse } from 'next/server';
import { analyzeError, validateAnalysisRequest, AIAnalysisRequest } from '@/services/aiAnalysis';

const RATE_LIMIT_MAX = process.env.NODE_ENV === 'development' ? 100 : 10;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string) {
  const now = Date.now();
  const current = rateLimitBuckets.get(key);
  const bucket =
    !current || current.resetAt <= now
      ? { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS }
      : current;

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  return {
    allowed: bucket.count <= RATE_LIMIT_MAX,
    remaining: Math.max(0, RATE_LIMIT_MAX - bucket.count),
    resetAt: new Date(bucket.resetAt),
  };
}

export async function POST(req: NextRequest) {
  try {
    // 認證檢查 - 資料庫或 Prisma 尚未就緒時仍允許匿名測試
    let userId: string | null = null;
    try {
      const [{ getServerSession }, { authOptions }] = await Promise.all([
        import('next-auth'),
        import('@/lib/auth'),
      ]);
      const session = await getServerSession(authOptions);
      const sessionUser = session?.user as { id?: string } | undefined;
      userId = sessionUser?.id ?? null;
    } catch (authError) {
      console.warn(
        'Session lookup skipped (continuing anonymously):',
        authError instanceof Error ? authError.message : authError
      );
    }

    // 速率限制（以登入使用者或來源 IP 區分）
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientKey = userId
      ? `user:${userId}`
      : `ip:${forwardedFor?.split(',')[0]?.trim() || 'local'}`;

    const rateLimitResult = rateLimit(clientKey);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: '已達今日分析次數上限，請稍後再試',
          retryAfter: rateLimitResult.resetAt.toISOString(),
        },
        { status: 429 }
      );
    }

    // 解析請求
    const rawBody = await req.json().catch(() => ({}));
    const body =
      rawBody && typeof rawBody === 'object'
        ? (rawBody as Record<string, unknown>)
        : {};

    // 前端使用 errorInput，服務層使用 errorMessage，這裡統一正規化
    const errorMessage =
      typeof body.errorMessage === 'string'
        ? body.errorMessage
        : typeof body.errorInput === 'string'
          ? body.errorInput
          : '';

    const normalizedBody = { ...body, errorMessage };

    if (!validateAnalysisRequest(normalizedBody)) {
      return NextResponse.json(
        { success: false, error: '請輸入要分析的錯誤訊息' },
        { status: 400 }
      );
    }

    const analysisRequest: AIAnalysisRequest = {
      errorMessage,
      stackTrace: typeof body.stackTrace === 'string' ? body.stackTrace : '',
      context: typeof body.context === 'string' ? body.context : '',
      model: typeof body.model === 'string' ? body.model : undefined,
      promptVersion: typeof body.promptVersion === 'string' ? body.promptVersion : undefined,
      language: typeof body.language === 'string' ? body.language : undefined,
      framework: typeof body.framework === 'string' ? body.framework : undefined,
      trackExperiment: body.trackExperiment !== false,
      testCase: typeof body.testCase === 'string' ? body.testCase : 'production',
    };

    // 執行 AI 分析
    const result = await analyzeError(analysisRequest);

    // 儲存分析結果（資料庫失敗不影響分析結果回傳）
    let analysisId: string | null = null;
    try {
      const { prisma } = await import('@/lib/prisma');
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

    return NextResponse.json({
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
        cwe: result.cwe,
        relatedConcepts: result.relatedConcepts,
      },
      rateLimit: {
        remaining: rateLimitResult.remaining,
        resetAt: rateLimitResult.resetAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Analysis error:', error);

    if (error instanceof Object && 'code' in error && error.code === 'AI_ANALYSIS_ERROR') {
      return NextResponse.json(
        {
          success: false,
          error: 'AI analysis failed',
          details: 'error' in error ? error.error : undefined,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
