import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
export const dynamic = 'force-dynamic';

const supabase = getSupabaseAdmin();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, targetPosition, industry, goals } = body;

    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 保存职业规划
    const { data: plan, error } = await supabase
      .from('career_plans')
      .insert({
        user_id: userId,
        target_position: targetPosition,
        industry,
        goals,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    console.error('生成规划失败:', error);
    return NextResponse.json({ error: '生成失败' }, { status: 500 });
  }
}
