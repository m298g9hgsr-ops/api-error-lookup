import { NextRequest, NextResponse } from 'next/server';
import { getExperimentSummary, getExperimentRuns } from '@/services/aiAnalysis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const version = searchParams.get('version');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (version) {
      const runs = await getExperimentRuns(version, limit);
      return NextResponse.json({ success: true, data: runs });
    } else {
      const summary = await getExperimentSummary();
      return NextResponse.json({ success: true, data: summary });
    }
  } catch (error) {
    console.error('Experiment API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}