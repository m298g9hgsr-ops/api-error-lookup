import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRateLimitStatus } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    
    // Pagination params
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;
    const errorType = searchParams.get('errorType') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        subscriptions: {
          where: { status: 'active' },
          include: { plan: true },
          take: 1,
        }
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get history limit from plan
    const activeSubscription = user.subscriptions[0];
    const historyDays = activeSubscription?.plan?.features 
      ? JSON.parse(activeSubscription.plan.features as string).errorHistory 
      : 7;
    const effectiveDays = historyDays;

    const since = new Date();
    since.setDate(since.getDate() - effectiveDays);

    // Build where clause - exclude soft-deleted records
    const where: any = {
      userId,
      deletedAt: null,
      createdAt: { gte: since },
    };

    if (search) {
      where.OR = [
        { errorInput: { contains: search, mode: 'insensitive' } },
        { errorType: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (errorType) {
      where.errorType = errorType;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...where.createdAt,
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }

    // Get total count
    const total = await prisma.analysis.count({ where });

    // Get paginated results
    const errorLogs = await prisma.analysis.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      take: limit,
      skip: (page - 1) * limit,
    });

    // Get rate limit status
    const rateLimitStatus = await getRateLimitStatus(userId);

    return NextResponse.json({
      success: true,
      data: errorLogs.map(log => ({
        id: log.id,
        errorInput: log.errorInput,
        stackTrace: log.stackTrace,
        context: log.context,
        model: log.model,
        errorType: log.errorType,
        analysis: log.analysis,
        suggestions: log.suggestions,
        documentation: log.documentation,
        confidence: log.confidence,
        tokensUsed: log.tokensUsed,
        createdAt: log.createdAt.toISOString(),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      rateLimit: rateLimitStatus,
      historyLimitDays: historyDays,
    });
  } catch (error) {
    console.error('Get error history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST is an alias for GET for compatibility with clients that prefer POST for complex queries
export async function POST(request: NextRequest) {
  // Read body as search params
  const body = await request.json().catch(() => ({}));
  const searchParams = new URLSearchParams();
  
  Object.entries(body).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });
  
  // Create a new request with the search params
  const url = new URL(request.url);
  url.search = searchParams.toString();
  
  const newRequest = new NextRequest(url, {
    method: 'GET',
    headers: request.headers,
  });
  
  return GET(newRequest);
}