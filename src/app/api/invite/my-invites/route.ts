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


export async function GET(request: NextRequest) {
  const supabase = newAdminClient();
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { data: invites, error } = await supabase
      .from('invites')
      .select('*')
      .eq('inviter_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: invites || [] });
  } catch (error) {
    console.error('获取邀请记录失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
