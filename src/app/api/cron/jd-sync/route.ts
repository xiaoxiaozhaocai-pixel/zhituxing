import { NextRequest, NextResponse } from 'next/server';
import { syncOfficialJobs } from '@/lib/jd-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ code: 500, message: 'CRON_SECRET 未配置' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ code: 401, message: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(500, parseInt(searchParams.get('limit') || '100'));
  const dryRun = searchParams.get('dryRun') === 'true';

  try {
    const result = await syncOfficialJobs({ limit, dryRun });
    return NextResponse.json({ code: 200, data: result });
  } catch (err) {
    console.error('cron jd-sync error:', err);
    return NextResponse.json({ code: 500, message: 'cron 执行失败', error: String(err) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
