/**
 * 数据分析统计API
 * POST /api/analytics
 *
 * 上报用户行为数据，写入 analytics_events 表
 * 也支持 GET 获取统计数据（管理后台用）
 */

import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';
import { getUserInfoFromRequest } from '@/lib/coze-stream';

export const runtime = 'edge';

// POST - 上报行为数据
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_type, event_data } = body;

    if (!event_type) {
      return NextResponse.json({ error: '缺少 event_type 参数' }, { status: 400 });
    }

    // 校验 event_type 长度
    if (event_type.length > 100) {
      return NextResponse.json({ error: 'event_type 过长' }, { status: 400 });
    }

    // 获取用户ID（可选，匿名事件也支持）
    const userInfo = await getUserInfoFromRequest(request);
    const userId = userInfo?.userId || null;

    // 序列化 event_data
    const dataStr = event_data ? JSON.stringify(event_data).replace(/'/g, "''") : 'null';
    const now = new Date().toISOString();

    const userIdStr = userId ? `${userId}` : 'NULL';

    await execSql(
      `INSERT INTO analytics_events (user_id, event_type, event_data, created_at) VALUES (${userIdStr}, '${event_type.replace(/'/g, "''")}', '${dataStr}', '${now}')`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[analytics] POST Error:', error);
    return NextResponse.json(
      { error: '上报失败', detail: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// GET - 获取统计数据
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventType = searchParams.get('event_type') || '';
    const userId = searchParams.get('user_id') || '';
    const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') || '7', 10)));

    // 查询统计数据
    let sql = `
      SELECT
        event_type,
        COUNT(*) as event_count,
        COUNT(DISTINCT user_id) as unique_users,
        DATE(created_at) as event_date
      FROM analytics_events
      WHERE created_at >= NOW() - INTERVAL '${days} days'
    `;

    if (eventType) {
      sql += ` AND event_type = '${eventType.replace(/'/g, "''")}'`;
    }
    if (userId) {
      sql += ` AND user_id = ${userId}`;
    }

    sql += ` GROUP BY event_type, DATE(created_at) ORDER BY event_date DESC, event_count DESC LIMIT 100`;

    const rows = await execSql(sql);

    // 查询总览
    const summarySql = `
      SELECT
        COUNT(*) as total_events,
        COUNT(DISTINCT user_id) as total_users,
        COUNT(DISTINCT event_type) as total_event_types
      FROM analytics_events
      WHERE created_at >= NOW() - INTERVAL '${days} days'
    `;
    const summaryRows = await execSql(summarySql);
    const summary = (summaryRows[0] as Record<string, unknown>) || {};

    return NextResponse.json({
      success: true,
      data: {
        daily: rows,
        summary: {
          totalEvents: Number(summary.total_events) || 0,
          totalUsers: Number(summary.total_users) || 0,
          totalEventTypes: Number(summary.total_event_types) || 0,
          period: `${days} days`,
        },
      },
    });
  } catch (error) {
    console.error('[analytics] GET Error:', error);
    return NextResponse.json(
      { error: '查询统计失败', detail: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
