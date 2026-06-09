export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

// DS 成本估算常量
const DS_PRICE_PER_1M_TOKENS = 0.5; // ¥0.5/百万token
const AVG_TOKENS_PER_CHAT = 2500;
const AVG_TOKENS_PER_INTERVIEW = 4000;
const AVG_TOKENS_PER_COURSE = 3500;

export async function GET(request: NextRequest) {
  try {
    const days = parseInt(request.nextUrl.searchParams.get('days') || '30');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: chatData, error: chatErr } = await supabase
      .from('analytics_events')
      .select('created_at, event_type')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (chatErr) {
      return NextResponse.json({ success: false, message: '查询失败' }, { status: 500 });
    }

    // 按天聚合
    const dayMap = new Map<string, { chats: number; interviews: number; courses: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, { chats: 0, interviews: 0, courses: 0 });
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

    const daily = [];
    let totalCost = 0, totalChats = 0, totalTokens = 0;

    const sorted = Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b));
    for (const [date, counts] of sorted) {
      const estTokens =
        counts.chats * AVG_TOKENS_PER_CHAT +
        counts.interviews * AVG_TOKENS_PER_INTERVIEW +
        counts.courses * AVG_TOKENS_PER_COURSE;
      const estCost = (estTokens / 1_000_000) * DS_PRICE_PER_1M_TOKENS;

      daily.push({
        date,
        chats: counts.chats,
        interviews: counts.interviews,
        courses: counts.courses,
        estTokens,
        estCost: Math.round(estCost * 10000) / 10000,
      });

      totalCost += estCost;
      totalChats += counts.chats;
      totalTokens += estTokens;
    }

    const todayData = daily[daily.length - 1];
    const yesterdayData = daily.length >= 2 ? daily[daily.length - 2] : null;
    const costChange = yesterdayData && yesterdayData.estCost > 0
      ? ((todayData!.estCost - yesterdayData.estCost) / yesterdayData.estCost * 100)
      : null;

    const monthlyProjection = days > 0 ? Math.round((totalCost / days) * 30 * 100) / 100 : 0;
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
        constants: { dsPricePer1MTokens: DS_PRICE_PER_1M_TOKENS },
      },
    });
  } catch (err) {
    console.error('成本API异常:', err);
    return NextResponse.json({ success: false, message: '服务器异常' }, { status: 500 });
  }
}
