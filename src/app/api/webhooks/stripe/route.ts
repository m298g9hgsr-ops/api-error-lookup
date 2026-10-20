import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeWebhookSecret) {
      return NextResponse.json({ message: 'Webhook secret not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { type, id, status } = body;

    // This endpoint is deprecated - use /api/stripe/webhook instead
    // Just return success for backward compatibility
    return NextResponse.json({ message: 'Use /api/stripe/webhook for Stripe events' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  }
}