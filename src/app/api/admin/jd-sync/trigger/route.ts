import { NextRequest, NextResponse } from 'next/server';
import { syncAllPlatforms } from '@/lib/jd-sync-service';

// 手动触发同步任务
export async function POST(request: NextRequest) {
  try {
    // 获取管理员ID（这里简化为从header获取，实际应该验证权限）
    const adminId = request.headers.get('x-admin-id');
    
    if (!adminId) {
      return NextResponse.json({
        code: 401,
        message: '无权限执行此操作'
      }, { status: 401 });
    }

    console.log(`管理员 ${adminId} 手动触发JD同步任务`);
    
    // 执行同步
    const results = await syncAllPlatforms();

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
