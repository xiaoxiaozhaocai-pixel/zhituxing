import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 每次请求现场创建 admin client（service_role，bypass RLS）。
// 不用模块顶层共享单例：构建期求值时环境变量缺失会缓存 dummy client，导致运行时查询恒空。
function newAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

import { getAuthenticatedUserId } from '@/lib/auth';
export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  const supabase = newAdminClient();
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 生成邀请码
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data: invite, error } = await supabase
      .from('invites')
      .insert({
        inviter_id: userId,
        code,
        created_at: new Date().toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: invite });
  } catch (error) {
    console.error('生成邀请码失败:', error);
    return NextResponse.json({ error: '生成失败' }, { status: 500 });
  }
}
