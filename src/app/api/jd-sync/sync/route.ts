import { NextRequest, NextResponse } from 'next/server';
import {syncAllPlatforms, getLastSyncStatus, getJobsStats, getPlatformStats} from '@/lib/jd-sync-service';
export const dynamic = 'force-dynamic';

// 触发全量同步
export async function POST(request: NextRequest) {
  try {
    // 内部同步触发：与 /api/cron/jd-sync 同款 CRON_SECRET 校验（此前匿名可触发全平台爬取同步）
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ code: 500, message: 'CRON_SECRET 未配置' }, { status: 500 });
    }
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ code: 401, message: 'unauthorized' }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const useMock = body.useMock === true;

    const results = await syncAllPlatforms(useMock);

    const totalFetched = results.reduce((sum, r) => sum + r.total_fetched, 0);
    const totalSuccess = results.reduce((sum, r) => sum + r.success_count, 0);
    const totalFail = results.reduce((sum, r) => sum + r.fail_count, 0);

    return NextResponse.json({
      code: 200,
      message: '同步完成',
      data: {
        results,
        summary: {
          total_fetched: totalFetched,
          success_count: totalSuccess,
          fail_count: totalFail
        }
      }
    });
  } catch (error) {
    console.error('同步任务失败:', error);
    return NextResponse.json({
      code: 500,
      message: '同步失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}

// 获取同步状态和统计
export async function GET(_request: NextRequest) {
  try {
    const lastSync = await getLastSyncStatus();
    const jobsStats = await getJobsStats();
    const platformStats = await getPlatformStats();

    return NextResponse.json({
      code: 200,
      data: {
        last_sync: lastSync,
        jobs_stats: jobsStats,
        platform_stats: platformStats,
        is_syncing: false
      }
    });
  } catch (error) {
    console.error('获取同步状态失败:', error);
    return NextResponse.json({
      code: 500,
      message: '获取状态失败'
    }, { status: 500 });
  }
}
