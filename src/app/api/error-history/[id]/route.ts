import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Type assertion for extended Analysis fields (deletedAt, updatedAt)
// These will be available after `npx prisma generate` runs
const analysisSelect = {
  id: true,
  userId: true,
  errorInput: true,
  stackTrace: true,
  context: true,
  model: true,
  errorType: true,
  analysis: true,
  suggestions: true,
  documentation: true,
  confidence: true,
  tokensUsed: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

type ExtendedAnalysis = {
  id: string;
  userId: string | null;
  errorInput: string;
  stackTrace: string | null;
  context: string | null;
  model: string;
  errorType: string;
  analysis: string;
  suggestions: string;
  documentation: string | null;
  confidence: number;
  tokensUsed: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role || 'USER';
    const { id } = await params;

    // Find the analysis with explicit select to get all fields including deletedAt
    const analysis = await prisma.analysis.findUnique({
      where: { id },
      select: analysisSelect as any,
    }) as ExtendedAnalysis | null;

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Check ownership or admin role
    if (analysis.userId !== userId && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if soft-deleted
    if (analysis.deletedAt && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: analysis.id,
        errorInput: analysis.errorInput,
        stackTrace: analysis.stackTrace,
        context: analysis.context,
        model: analysis.model,
        errorType: analysis.errorType,
        analysis: analysis.analysis,
        suggestions: analysis.suggestions,
        documentation: analysis.documentation,
        confidence: analysis.confidence,
        tokensUsed: analysis.tokensUsed,
        createdAt: analysis.createdAt.toISOString(),
        updatedAt: analysis.updatedAt.toISOString(),
        deletedAt: analysis.deletedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Get analysis detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role || 'USER';
    const { id } = await params;

    // Find the analysis
    const analysis = await prisma.analysis.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        deletedAt: true,
      } as any,
    }) as { id: string; userId: string | null; deletedAt: Date | null } | null;

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Check ownership or admin role
    if (analysis.userId !== userId && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if already soft-deleted
    if (analysis.deletedAt) {
      return NextResponse.json({ error: 'Analysis already deleted' }, { status: 400 });
    }

    if (userRole === 'ADMIN') {
      // Hard delete for admin
      await prisma.analysis.delete({
        where: { id },
      });
    } else {
      // Soft delete for regular users
      await prisma.analysis.update({
        where: { id },
        data: { deletedAt: new Date() } as any,
      });
    }

    // TODO: Add audit log entry here

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete analysis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}