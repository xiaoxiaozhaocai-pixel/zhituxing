import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';
export const dynamic = 'force-dynamic';

const supabase = getSupabaseAdmin();

// DS 成本估算常量
const DS_PRICE_PER_1M_TOKENS = 0.5; // ¥0.5/百万token（输入+输出均价）
const AVG_TOKENS_PER_CHAT = 2500;   // 平均每次对话 token 数
const AVG_TOKENS_PER_INTERVIEW = 4000;
const AVG_TOKENS_PER_COURSE = 3500;

interface DailyCostItem {
  date: string;
  chats: number;
  interviews: number;
  estTokens: number;
  estCost: number;
}

export async function GET(request: NextRequest) {
  const _authCheck = requireAdmin(request);
  if (_authCheck) return _authCheck;
  try {
    const days = parseInt(request.nextUrl.searchParams.get('days') || '30');

    // 用 Supabase 原生 SQL 聚合每日对话数
    const { data: raw, error } = await supabase.rpc('get_daily_costs', { lookback_days: days });

    // RPC 可能不存在，降级为直接查询 analytics_events
    if (error || !raw) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // 按天聚合 chat_send 事件
      const { data: chatData, error: chatErr } = await supabase
        .from('analytics_events')
        .select('created_at, event_type')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (chatErr) {
        console.error('查询成本数据失败:', chatErr);
        return NextResponse.json({ success: false, message: '查询失败' }, { status: 500 });
      }

      // 手动聚合
      const dayMap = new Map<string, { chats: number; interviews: number }>();
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dayMap.set(key, { chats: 0, interviews: 0 });
      }

      if (chatData) {
        for (const row of chatData) {
          const key = (row.created_at as string).slice(0, 10);
          const bucket = dayMap.get(key);
          if (!bucket) continue;
          if (row.event_type === 'chat_send') bucket.chats++;
          else if (row.event_type === 'interview_complete') bucket.interviews++;
          
        }
      }

      const daily: DailyCostItem[] = [];
      let totalCost = 0;
      let totalChats = 0;
      let totalTokens = 0;
      let prevDayCost = -1;
      let _prevDayTokens = 0;

      const sorted = Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b));
      for (const [date, counts] of sorted) {
        const estTokens =
          counts.chats * AVG_TOKENS_PER_CHAT +
          counts.interviews * AVG_TOKENS_PER_INTERVIEW +
          0;
        const estCost = (estTokens / 1_000_000) * DS_PRICE_PER_1M_TOKENS;

        daily.push({
          date,
          chats: counts.chats,
          interviews: counts.interviews,
          estTokens,
          estCost: Math.round(estCost * 10000) / 10000,
        });

        totalCost += estCost;
        totalChats += counts.chats;
        totalTokens += estTokens;
        if (prevDayCost < 0) { prevDayCost = estCost; _prevDayTokens = estTokens; }
      }

      // 取最近两天对比变化
      const todayData = daily[daily.length - 1]!;
      const yesterdayData = daily.length >= 2 ? daily[daily.length - 2] : null;
      const costChange = yesterdayData && yesterdayData.estCost > 0
        ? ((todayData.estCost - yesterdayData.estCost) / yesterdayData.estCost * 100)
        : null;

      const monthlyProjection = days > 0
        ? Math.round((totalCost / days) * 30 * 100) / 100
        : 0;

      // 日均成本预警
      const dailyAvg = days > 0 ? totalCost / days : 0;
      const warning = dailyAvg > 20 ? 'high' : dailyAvg > 10 ? 'medium' : 'low';

      return NextResponse.json({
        success: true,
        data: {
          summary: {
            totalCost: Math.round(totalCost * 100) / 100,
            totalChats,
            totalTokens,
            dailyAvg: Math.round(dailyAvg * 10000) / 10000,
            monthlyProjection,
            costChange: costChange !== null ? Math.round(costChange * 10) / 10 : null,
            warning,
            avgTokensPerChat: totalChats > 0 ? Math.round(totalTokens / totalChats) : AVG_TOKENS_PER_CHAT,
          },
          daily,
          constants: {
            dsPricePer1MTokens: DS_PRICE_PER_1M_TOKENS,
            avgTokensPerChat: AVG_TOKENS_PER_CHAT,
            avgTokensPerInterview: AVG_TOKENS_PER_INTERVIEW,
            avgTokensPerCourse: AVG_TOKENS_PER_COURSE,
          },
          period: `${days}天`,
        },
      });
    }

    return NextResponse.json({ success: true, data: raw });
  } catch (err) {
    console.error('成本API异常:', err);
    return NextResponse.json({ success: false, message: '服务器异常' }, { status: 500 });
  }
}
