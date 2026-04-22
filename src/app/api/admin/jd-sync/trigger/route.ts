import { NextRequest, NextResponse } from 'next/server';
import { syncAllPlatforms, syncSinglePlatform } from '@/lib/jd-sync-service';

// 手动触发同步任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const platformId = body.platform; // 可选，指定单个平台
    const useMock = body.useMock === true;

    console.log(`手动触发JD同步任务... platform: ${platformId || '全量'}, useMock: ${useMock}`);
    
    let results;
    if (platformId) {
      // 单平台同步
      const result = await syncSinglePlatform(platformId);
      results = [result];
    } else {
      // 全量同步
      results = await syncAllPlatforms(useMock);
    }

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
    console.error('手动同步失败:', error);
    return NextResponse.json({
      code: 500,
      message: '同步失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}
