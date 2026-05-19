import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

export const runtime = 'edge';

// ============================================================
// POST — 上报行为事件（单条或批量）
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 批量上报：{ events: [...] }
    if (body.events && Array.isArray(body.events)) {
      let inserted = 0;
      for (const evt of body.events) {
        const userId = evt.user_id ? String(evt.user_id).replace(/'/g, "''") : null;
        const eventType = String(evt.event_type || '').replace(/'/g, "''");
        const eventData = evt.event_data ? JSON.stringify(evt.event_data).replace(/'/g, "''") : null;
        const ts = evt.timestamp ? `'${evt.timestamp}'` : 'NOW()';
        const sql = `INSERT INTO analytics_events (user_id, event_type, event_data, created_at) VALUES (${userId ? `'${userId}'` : 'NULL'}, '${eventType}', '${eventData}'::jsonb, ${ts})`;
        const res = await execSql(sql);
        if (Array.isArray(res) && (res as Record<string, unknown>[]).length > 0) inserted++;
      }
      return NextResponse.json({ success: true, inserted });
    }

    // 单条上报
    const userId = body.user_id ? String(body.user_id).replace(/'/g, "''") : null;
    const eventType = String(body.event_type || '').replace(/'/g, "''");
    const eventData = body.event_data ? JSON.stringify(body.event_data).replace(/'/g, "''") : null;
    const ts = body.timestamp ? `'${body.timestamp}'` : 'NOW()';

    await execSql(
      `INSERT INTO analytics_events (user_id, event_type, event_data, created_at) VALUES (${userId ? `'${userId}'` : 'NULL'}, '${eventType}', '${eventData}'::jsonb, ${ts})`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[analytics] POST error:', error);
    return NextResponse.json({ success: false, error: '上报失败' }, { status: 500 });
  }
}

// ============================================================
// GET — 查询行为数据
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const days = parseInt(searchParams.get('days') || '7', 10);

    if (action === 'dashboard') {
      return await handleDashboardQuery(days);
    }

    // 默认：查询近期事件概要
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const rows = await execSql(
      `SELECT event_type, COUNT(*) as count, COUNT(DISTINCT user_id) as unique_users FROM analytics_events WHERE created_at >= '${sinceDate}' GROUP BY event_type ORDER BY count DESC`
    );
    const summaryRows = await execSql(
      `SELECT COUNT(*) as total_events, COUNT(DISTINCT user_id) as total_users, COUNT(DISTINCT event_type) as total_event_types FROM analytics_events WHERE created_at >= '${sinceDate}'`
    );
    const summary = (summaryRows as Record<string, unknown>[])[0] || {};
    return NextResponse.json({
      success: true,
      data: { daily: rows, summary: { totalEvents: Number(summary.total_events) || 0, totalUsers: Number(summary.total_users) || 0, totalEventTypes: Number(summary.total_event_types) || 0, period: `${days} days` } },
    });
  } catch (error) {
    console.error('[analytics] GET error:', error);
    return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
  }
}

// ============================================================
// Dashboard 聚合查询 — 用 JS 计算日期避免 SQL INTERVAL 问题
// ============================================================
async function handleDashboardQuery(days: number) {
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const where = `created_at >= '${sinceDate}'`;

  // 1. 核心指标
  const metricsRows = await execSql(
    `SELECT COUNT(DISTINCT CASE WHEN DATE(created_at) = CURRENT_DATE THEN user_id END) as dau, COUNT(CASE WHEN event_type = 'chat_send' THEN 1 END) as chat_count, COUNT(CASE WHEN event_type = 'assessment_complete' THEN 1 END) as assessment_complete_count, COUNT(CASE WHEN event_type = 'assessment_start' THEN 1 END) as assessment_start_count, COUNT(CASE WHEN event_type = 'paywall_convert' THEN 1 END) as paywall_convert_count, COUNT(CASE WHEN event_type = 'paywall_show' THEN 1 END) as paywall_show_count FROM analytics_events WHERE ${where}`
  );
  const m = ((metricsRows as Record<string, unknown>[])[0]) || {};
  const chatCount = Number(m.chat_count) || 0;
  const assessmentStart = Number(m.assessment_start_count) || 0;
  const assessmentComplete = Number(m.assessment_complete_count) || 0;
  const paywallShow = Number(m.paywall_show_count) || 0;
  const paywallConvert = Number(m.paywall_convert_count) || 0;

  // 2. 事件分布
  const distributionRows = await execSql(
    `SELECT event_type, COUNT(*) as count FROM analytics_events WHERE ${where} GROUP BY event_type ORDER BY count DESC`
  );
  const distribution = (distributionRows as Record<string, unknown>[]).filter(r => r.event_type !== undefined);

  // 3. 行为漏斗
  const funnelRows = await execSql(
    `SELECT COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN user_id END) as page_view_users, COUNT(DISTINCT CASE WHEN event_type = 'chat_send' THEN user_id END) as chat_users, COUNT(DISTINCT CASE WHEN event_type = 'assessment_start' THEN user_id END) as assessment_users, COUNT(DISTINCT CASE WHEN event_type = 'paywall_convert' THEN user_id END) as convert_users FROM analytics_events WHERE ${where}`
  );
  const f = ((funnelRows as Record<string, unknown>[])[0]) || {};

  // 4. 趋势图
  const trendRows = await execSql(
    `SELECT DATE(created_at) as date, event_type, COUNT(*) as count FROM analytics_events WHERE ${where} GROUP BY DATE(created_at), event_type ORDER BY date ASC`
  );
  const trend = (trendRows as Record<string, unknown>[]).filter(r => r.date !== undefined);

  // 5. 热门页面
  const topPagesRows = await execSql(
    `SELECT (event_data->>'page')::text as page, COUNT(*) as views FROM analytics_events WHERE event_type = 'page_view' AND event_data->>'page' IS NOT NULL AND ${where} GROUP BY (event_data->>'page')::text ORDER BY views DESC LIMIT 10`
  );
  const topPages = (topPagesRows as Record<string, unknown>[]).filter(r => r.page !== undefined);

  return NextResponse.json({
    success: true,
    data: {
      metrics: {
        dau: Number(m.dau) || 0,
        chatCount,
        assessmentCompleteRate: assessmentStart > 0 ? Math.round((assessmentComplete / assessmentStart) * 100) : 0,
        paywallConvertRate: paywallShow > 0 ? Math.round((paywallConvert / paywallShow) * 100) : 0,
      },
      distribution,
      funnel: {
        stages: [
          { name: '浏览页面', count: Number(f.page_view_users) || 0 },
          { name: '发起对话', count: Number(f.chat_users) || 0 },
          { name: '开始测评', count: Number(f.assessment_users) || 0 },
          { name: '付费转化', count: Number(f.convert_users) || 0 },
        ],
      },
      trend,
      topPages,
      period: `${days} days`,
    },
  });
}
