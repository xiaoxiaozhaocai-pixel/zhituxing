import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取同步日志列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const platform = searchParams.get('platform');
    const offset = (page - 1) * pageSize;

    let whereClause = '';
    if (platform) {
      whereClause = `WHERE source = '${platform.replace(/'/g, "''")}'`;
    }

    // 获取总数
    const countResult = await execSql(`
      SELECT COUNT(*) as total FROM jd_sync_logs ${whereClause}
    `) as Array<{ total: number }>;
    const total = countResult[0]?.total || 0;

    // 获取列表
    const logs = await execSql(`
      SELECT * FROM jd_sync_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    // 获取统计数据
    const stats = await execSql(`
      SELECT 
        COUNT(*) as total_syncs,
        SUM(success_count) as total_success,
        SUM(fail_count) as total_fail,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as today_syncs
      FROM jd_sync_logs
    `) as any;

    return NextResponse.json({
      code: 200,
      data: {
        list: logs,
        stats: {
          total_syncs: stats[0]?.total_syncs || 0,
          total_success: stats[0]?.total_success || 0,
          total_fail: stats[0]?.total_fail || 0,
          today_syncs: stats[0]?.today_syncs || 0
        },
        pagination: { page, pageSize, total }
      }
    });
  } catch (error) {
    console.error('获取同步日志失败:', error);
    return NextResponse.json(
      { code: 500, message: '获取列表失败' },
      { status: 500 }
    );
  }
}

// 触发同步任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, adminId, adminUsername } = body;

    // 模拟同步过程
    const platforms = platform === 'all' 
      ? ['国家24365就业平台', '中国公共招聘网', '广西人才网', '国聘网', '中国研究生招聘网', '广西高校毕业生就业网']
      : [platform];

    const results = [];

    for (const p of platforms) {
      // 模拟同步数据
      const successCount = Math.floor(Math.random() * 50) + 10;
      const failCount = Math.floor(Math.random() * 5);
      
      const result = await execSql(`
        INSERT INTO jd_sync_logs (source, fetched_count, success_count, fail_count, status, error_message, created_at)
        VALUES ('${p}', ${successCount + failCount}, ${successCount}, ${failCount}, 'completed', '', NOW())
        RETURNING id
      `);
      
      results.push({
        platform: p,
        successCount,
        failCount,
        logId: (result as any[])?.[0]?.id
      });
    }

    // 记录操作日志
    await execSql(`
      INSERT INTO admin_operation_logs (admin_id, admin_username, operation_type, operation_content)
      VALUES (${adminId || 0}, '${adminUsername || 'unknown'}', 'sync_trigger', '手动触发同步: ${platform === 'all' ? '全部平台' : platform}')
    `);

    return NextResponse.json({
      code: 200,
      message: '同步任务已启动',
      data: results
    });
  } catch (error) {
    console.error('触发同步失败:', error);
    return NextResponse.json(
      { code: 500, message: '触发同步失败' },
      { status: 500 }
    );
  }
}
