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

// POST - 上报行为数据（单条或批量）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 批量上报：{ events: [...] }
    if (body.events && Array.isArray(body.events)) {
      if (body.events.length === 0) {
        return NextResponse.json({ success: true, inserted: 0 });
      }
      // 批量插入，最多100条
      const events = body.events.slice(0, 100);
      const valuesParts: string[] = [];
      for (const evt of events) {
        const eventType = (evt.event_type || '').replace(/'/g, "''");
        if (!eventType || eventType.length > 100) continue;
        const userId = evt.user_id ? `${evt.user_id}` : 'NULL';
        const dataStr = evt.event_data ? JSON.stringify(evt.event_data).replace(/'/g, "''") : 'null';
        const ts = evt.timestamp || new Date().toISOString();
        valuesParts.push(`(${userId}, '${eventType}', '${dataStr}', '${ts}')`);
      }
      if (valuesParts.length === 0) {
        return NextResponse.json({ success: true, inserted: 0 });
      }
      await execSql(
        `INSERT INTO analytics_events (user_id, event_type, event_data, created_at) VALUES ${valuesParts.join(', ')}`
      );
      return NextResponse.json({ success: true, inserted: valuesParts.length });
    }

    // 单条上报：{ event_type, event_data }
    const { event_type, event_data, user_id: bodyUserId, timestamp } = body;

    if (!event_type) {
      return NextResponse.json({ error: '缺少 event_type 参数' }, { status: 400 });
    }
    if (event_type.length > 100) {
      return NextResponse.json({ error: 'event_type 过长' }, { status: 400 });
    }

    // 优先使用 body 中的 user_id（来自 tracker），否则从 header 获取
    let userId: number | null = bodyUserId ? Number(bodyUserId) : null;
    if (!userId || isNaN(userId)) {
      const userInfo = await getUserInfoFromRequest(request);
      const parsedId = userInfo?.userId ? Number(userInfo.userId) : null;
      userId = (parsedId && !isNaN(parsedId)) ? parsedId : null;
    }

    const dataStr = event_data ? JSON.stringify(event_data).replace(/'/g, "''") : 'null';
    const now = timestamp || new Date().toISOString();
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
