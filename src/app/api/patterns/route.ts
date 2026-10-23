import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Pagination params
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const errorType = searchParams.get('errorType') || undefined;
    const search = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') || 'frequency';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: any = {};

    if (errorType) {
      where.errorType = errorType;
    }

    if (search) {
      where.OR = [
        { pattern: { contains: search, mode: 'insensitive' } },
        { rootCause: { contains: search, mode: 'insensitive' } },
        { fixTemplate: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.errorPattern.count({ where });

    // Get paginated results
    const patterns = await prisma.errorPattern.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      take: limit,
      skip: (page - 1) * limit,
    });

    return NextResponse.json({
      data: patterns.map(p => ({
        id: p.id,
        pattern: p.pattern,
        errorType: p.errorType,
        language: p.language,
        framework: p.framework,
        rootCause: p.rootCause,
        fixTemplate: p.fixTemplate,
        docLinks: p.docLinks ? JSON.parse(p.docLinks) : [],
        tags: p.tags ? JSON.parse(p.tags) : [],
        frequency: p.frequency,
        confidence: p.confidence,
        isVerified: p.isVerified,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get patterns error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}