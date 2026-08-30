/**
 * /api/cost/summary
 * 成本监控汇总接口：按日/周/月统计 DeepSeek API 消耗
 */

import { NextRequest, NextResponse } from 'next/server';

interface CostRow {
  collect_date: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  details?: Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'daily';
    const days = parseInt(searchParams.get('days') || '7', 10);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 });
    }

    // 查询日期范围
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    // 通过 Supabase REST API 查询
    const res = await fetch(
      `${supabaseUrl}/rest/v1/cost_logs?collect_date=gte.${startDate}&collect_date=lte.${endDate}&order=collect_date.asc`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Supabase query failed: ${res.status}`);
    }

    const rows: CostRow[] = await res.json();

    // 汇总计算
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalCost = 0;
    let totalCalls = 0;

    const dailyMap = new Map<string, {
      prompt_tokens: number;
      completion_tokens: number;
      cost: number;
      calls: number;
    }>();

    // 按 bot_type 分组
    const botTypeMap = new Map<string, {
      prompt_tokens: number;
      completion_tokens: number;
      cost: number;
      calls: number;
    }>();

    for (const row of rows) {
      const p = Number(row.prompt_tokens) || 0;
      const c = Number(row.completion_tokens) || 0;
      const cost = Number(row.estimated_cost) || 0;
      const calls = 1; // call_count 字段

      totalPromptTokens += p;
      totalCompletionTokens += c;
      totalCost += cost;
      totalCalls += calls;

      // 按天
      const date = row.collect_date;
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { prompt_tokens: 0, completion_tokens: 0, cost: 0, calls: 0 });
      }
      const d = dailyMap.get(date)!;
      d.prompt_tokens += p;
      d.completion_tokens += c;
      d.cost += cost;
      d.calls += calls;

      // 按 bot_type
      const botType = (row.details as Record<string, unknown>)?.bot_type as string || 'unknown';
      if (!botTypeMap.has(botType)) {
        botTypeMap.set(botType, { prompt_tokens: 0, completion_tokens: 0, cost: 0, calls: 0 });
      }
      const b = botTypeMap.get(botType)!;
      b.prompt_tokens += p;
      b.completion_tokens += c;
      b.cost += cost;
      b.calls += calls;
    }

    // 按 period 返回不同粒度
    let detail: unknown[];
    switch (period) {
      case 'daily':
        detail = Array.from(dailyMap.entries())
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date));
        break;
      case 'weekly': {
        const weeklyMap = new Map<string, typeof dailyMap extends Map<string, infer V> ? V : never>();
        for (const [date, data] of dailyMap) {
          const d = new Date(date);
          const weekStart = new Date(d);
          weekStart.setDate(d.getDate() - d.getDay());
          const weekKey = weekStart.toISOString().slice(0, 10);
          if (!weeklyMap.has(weekKey)) {
            weeklyMap.set(weekKey, { prompt_tokens: 0, completion_tokens: 0, cost: 0, calls: 0 });
          }
          const w = weeklyMap.get(weekKey)!;
          w.prompt_tokens += data.prompt_tokens;
          w.completion_tokens += data.completion_tokens;
          w.cost += data.cost;
          w.calls += data.calls;
        }
        detail = Array.from(weeklyMap.entries())
          .map(([week, data]) => ({ week, ...data }))
          .sort((a, b) => a.week.localeCompare(b.week));
        break;
      }
      default:
        detail = Array.from(botTypeMap.entries())
          .map(([bot_type, data]) => ({ bot_type, ...data }))
          .sort((a, b) => b.cost - a.cost);
    }

    return NextResponse.json({
      success: true,
      summary: {
        period,
        date_range: { start: startDate, end: endDate },
        total_prompt_tokens: totalPromptTokens,
        total_completion_tokens: totalCompletionTokens,
        total_tokens: totalPromptTokens + totalCompletionTokens,
        total_cost_yuan: Math.round(totalCost * 10000) / 10000,
        total_calls: totalCalls,
      },
      by_bot_type: Array.from(botTypeMap.entries())
        .map(([bot_type, data]) => ({ bot_type, ...data }))
        .sort((a, b) => b.cost - a.cost),
      detail,
    });
  } catch (error) {
    console.error('[cost] Summary error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cost summary' },
      { status: 500 }
    );
  }
}
