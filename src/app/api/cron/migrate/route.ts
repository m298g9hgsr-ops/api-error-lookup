import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

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

    // Run prisma db push
    const output = execSync('npx prisma db push --accept-data-loss', {
      encoding: 'utf-8',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      timeout: 120000,
    });

    return NextResponse.json({
      success: true,
      output,
      message: 'Migration completed successfully',
    });
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: err.message || String(error),
      stdout: err.stdout,
      stderr: err.stderr,
    }, { status: 500 });
  }
}