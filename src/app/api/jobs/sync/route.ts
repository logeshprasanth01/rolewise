import { NextRequest, NextResponse } from 'next/server';
import { syncJobs } from '@/lib/job-store';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

/**
 * GET /api/jobs/sync — refreshes the stored job listings.
 * Called hourly by Supabase pg_cron and daily by Vercel Cron, both with `Authorization: Bearer $CRON_SECRET`.
 * JSearch (LinkedIn, Indeed, Naukri…) runs every 6th hour to stay inside its quota, or when ?jsearch=1.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const withJSearch = req.nextUrl.searchParams.get('jsearch') === '1' || new Date().getUTCHours() % 6 === 0;
  const result = await syncJobs({ withJSearch });
  return NextResponse.json(result, { status: result.ok ? 200 : 500, headers: { 'Cache-Control': 'no-store' } });
}
