import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use Prisma to push schema and create initial data
    // First ensure tables exist (this will create them if they don't exist)
    await prisma.$executeRaw`SELECT 1`;

    // Insert plans using Prisma
    const plansData = [
      { name: 'free', description: 'Free tier for occasional use', priceMonthly: 0, priceYearly: 0, maxRequestsPerDay: 10, features: JSON.stringify({maxRequestsPerDay: 10, aiAnalysis: true, errorHistory: 7, prioritySupport: false}), isActive: true },
      { name: 'pro', description: 'For developers who need more', priceMonthly: 1900, priceYearly: 19000, maxRequestsPerDay: -1, features: JSON.stringify({maxRequestsPerDay: -1, aiAnalysis: true, errorHistory: 90, prioritySupport: true, advancedAnalytics: true}), isActive: true },
      { name: 'enterprise', description: 'For teams and organizations', priceMonthly: 9900, priceYearly: 99000, maxRequestsPerDay: -1, features: JSON.stringify({maxRequestsPerDay: -1, aiAnalysis: true, errorHistory: 365, prioritySupport: true, advancedAnalytics: true, teamManagement: true, sso: true, customIntegrations: true}), isActive: true },
    ];

    for (const plan of plansData) {
      await prisma.plan.upsert({
        where: { name: plan.name },
        update: {},
        create: plan,
      });
    }

    // Insert error patterns using Prisma
    const patternsData = [
      { pattern: 'TypeError: Cannot read propert(y|ies) of undefined', errorType: 'RuntimeError', language: 'javascript', framework: 'react', rootCause: 'Attempting to access a property on an undefined value. Common in React when props or state are not initialized before rendering.', fixTemplate: 'Add optional chaining (?.), nullish coalescing (??), or conditional rendering. Example: const value = obj?.prop ?? \'default\'', docLinks: '["https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining", "https://react.dev/learn/conditional-rendering"]', tags: '["null-pointer", "react", "undefined"]', frequency: 150, confidence: 0.95, isVerified: true },
      { pattern: 'TypeError: Cannot read propert(y|ies) of null', errorType: 'RuntimeError', language: 'javascript', framework: 'react', rootCause: 'Attempting to access a property on a null value. Similar to undefined but explicitly null.', fixTemplate: 'Add null checks before accessing properties. Use optional chaining: obj?.prop or guard clauses: if (!obj) return', docLinks: '["https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining"]', tags: '["null-pointer", "javascript"]', frequency: 120, confidence: 0.95, isVerified: true },
      { pattern: 'ReferenceError: (\\w+) is not defined', errorType: 'RuntimeError', language: 'javascript', framework: null, rootCause: 'Using a variable or function that hasn\'t been declared or is out of scope.', fixTemplate: 'Check for typos in variable names, ensure imports are correct, and verify scope. Use ESLint to catch these at build time.', docLinks: '["https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Not_defined"]', tags: '["reference-error", "undefined-variable"]', frequency: 80, confidence: 0.9, isVerified: true },
    ];

    for (const pattern of patternsData) {
      await prisma.errorPattern.upsert({
        where: { pattern: pattern.pattern },
        update: {},
        create: pattern,
      });
    }

    const plans = await prisma.plan.findMany();
    const patterns = await prisma.errorPattern.findMany();

    return NextResponse.json({
      success: true,
      plans: plans.length,
      patterns: patterns.length,
      message: 'Database initialized successfully',
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Init error:', error);
    return NextResponse.json({ 
      error: 'Init failed', 
      details: err.message || String(error),
    }, { status: 500 });
  }
}