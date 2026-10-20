import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRateLimitStatus } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const status = await getRateLimitStatus(userId);

    return NextResponse.json({ status });
  } catch (error) {
    console.error('Get rate limit status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}