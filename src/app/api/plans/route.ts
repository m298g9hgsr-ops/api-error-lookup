import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Get plans error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}