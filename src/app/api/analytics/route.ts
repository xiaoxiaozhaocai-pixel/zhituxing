export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'edge';

// ============================================================
// POST — 上报行为事件（单条或批量）
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    // 批量上报：{ events: [...] }
    if (body.events && Array.isArray(body.events)) {
      const eventsToInsert = body.events.map((evt: any) => ({
        user_id: evt.user_id || null,
        event_type: evt.event_type || '',
        event_data: evt.event_data || null,
        created_at: evt.timestamp || new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('analytics_events')
        .insert(eventsToInsert);

      if (error) {
        console.error('[analytics] Batch insert error:', error);
        // 不阻塞前端，直接返回成功
      }

      return NextResponse.json({ success: true, inserted: eventsToInsert.length });
    }

    // 单条上报
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        user_id: body.user_id || null,
        event_type: body.event_type || '',
        event_data: body.event_data || null,
        created_at: body.timestamp || new Date().toISOString(),
      });

    if (error) {
      console.error('[analytics] Insert error:', error);
      // 不阻塞前端，直接返回成功
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[analytics] POST error:', error);
    // 即使出错也返回成功，避免前端重试
    return NextResponse.json({ success: true });
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

    const supabase = getSupabaseAdmin();
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // 查询近期事件
    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('event_type, user_id')
      .gte('created_at', sinceDate);

    // 表不存在时返回空数据
    if (error) {
      console.error('[analytics] Query error:', error);
      return NextResponse.json({
        success: true,
        data: {
          daily: [],
          summary: {
            totalEvents: 0,
            totalUsers: 0,
            totalEventTypes: 0,
            period: `${days} days`,
          },
        },
      });
    }

    // JS 聚合计算
    const eventCounts: Record<string, { count: number; users: Set<string> }> = {};
    const uniqueUsers = new Set<string>();

    for (const evt of events || []) {
      if (!evt.event_type) continue;
      if (!eventCounts[evt.event_type]) {
        eventCounts[evt.event_type] = { count: 0, users: new Set() };
      }
      eventCounts[evt.event_type].count++;
      if (evt.user_id) {
        eventCounts[evt.event_type].users.add(evt.user_id);
        uniqueUsers.add(evt.user_id);
      }
    }

    const daily = Object.entries(eventCounts)
      .map(([event_type, data]) => ({
        event_type,
        count: data.count,
        unique_users: data.users.size,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      data: {
        daily,
        summary: {
          totalEvents: events?.length || 0,
          totalUsers: uniqueUsers.size,
          totalEventTypes: Object.keys(eventCounts).length,
          period: `${days} days`,
        },
      },
    });
  } catch (error) {
    console.error('[analytics] GET error:', error);
    return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
  }
}

// ============================================================
// Dashboard 聚合查询 — 用 JS 计算聚合
// ============================================================
async function handleDashboardQuery(days: number) {
  const supabase = getSupabaseAdmin();
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString().split('T')[0];

  // 获取所有事件数据
  const { data: events, error } = await supabase
    .from('analytics_events')
    .select('event_type, user_id, event_data, created_at')
    .gte('created_at', sinceDate);

  // 表不存在时返回空数据
  if (error) {
    console.error('[analytics] Dashboard query error:', error);
    return NextResponse.json({
      success: true,
      data: {
        dau: 0,
        chatCount: 0,
        assessmentStart: 0,
        assessmentComplete: 0,
        paywallShow: 0,
        paywallConvert: 0,
        distribution: [],
        funnel: { pageView: 0, chat: 0, assessment: 0, convert: 0 },
        trend: [],
        topPages: [],
      },
    });
  }

  // JS 聚合计算
  const dauUsers = new Set<string>();
  let chatCount = 0;
  let assessmentStart = 0;
  let assessmentComplete = 0;
  let paywallShow = 0;
  let paywallConvert = 0;

  const eventDistribution: Record<string, number> = {};
  const pageViewUsers = new Set<string>();
  const chatUsers = new Set<string>();
  const assessmentUsers = new Set<string>();
  const convertUsers = new Set<string>();
  const trendByDate: Record<string, Record<string, number>> = {};
  const pageViews: Record<string, number> = {};

  for (const evt of events || []) {
    const evtDate = (evt.created_at as string).split('T')[0];
    const eventType = evt.event_type as string;
    const userId = evt.user_id as string;

    // DAU（今日活跃用户）
    if (evtDate === today && userId) {
      dauUsers.add(userId);
    }

    // 核心指标
    if (eventType === 'chat_send') chatCount++;
    if (eventType === 'assessment_start') assessmentStart++;
    if (eventType === 'assessment_complete') assessmentComplete++;
    if (eventType === 'paywall_show') paywallShow++;
    if (eventType === 'paywall_convert') paywallConvert++;

    // 事件分布
    eventDistribution[eventType] = (eventDistribution[eventType] || 0) + 1;

    // 漏斗
    if (userId) {
      if (eventType === 'page_view') pageViewUsers.add(userId);
      if (eventType === 'chat_send') chatUsers.add(userId);
      if (eventType === 'assessment_start') assessmentUsers.add(userId);
      if (eventType === 'paywall_convert') convertUsers.add(userId);
    }

    // 趋势
    if (!trendByDate[evtDate]) trendByDate[evtDate] = {};
    trendByDate[evtDate][eventType] = (trendByDate[evtDate][eventType] || 0) + 1;

    // 热门页面
    if (eventType === 'page_view' && evt.event_data) {
      const page = (evt.event_data as any)?.page;
      if (page) {
        pageViews[page] = (pageViews[page] || 0) + 1;
      }
    }
  }

  // 格式化输出
  const distribution = Object.entries(eventDistribution)
    .map(([event_type, count]) => ({ event_type, count }))
    .sort((a, b) => b.count - a.count);

  const trend = Object.entries(trendByDate)
    .map(([date, types]) => ({
      date,
      ...types,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const topPages = Object.entries(pageViews)
    .map(([page, views]) => ({ page, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  return NextResponse.json({
    success: true,
    data: {
      metrics: {
        dau: dauUsers.size,
        chatCount,
        assessmentCompleteRate: assessmentStart > 0 ? Math.round((assessmentComplete / assessmentStart) * 100) : 0,
        paywallConvertRate: paywallShow > 0 ? Math.round((paywallConvert / paywallShow) * 100) : 0,
      },
      distribution,
      funnel: {
        stages: [
          { name: '浏览页面', count: pageViewUsers.size },
          { name: '发起对话', count: chatUsers.size },
          { name: '开始测评', count: assessmentUsers.size },
          { name: '付费转化', count: convertUsers.size },
        ],
      },
      trend,
      topPages,
      period: `${days} days`,
    },
  });
}
