import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserId } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 开发环境模拟数据
function getDevUserProfile(userId: string) {
  return {
    id: userId,
    user_id: userId,
    user_type: 'member',
    membership_type: 'member',
    membership_expires_at: '2030-12-31T23:59:59Z',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    // 使用统一认证工具（优先JWT，兼容x-user-id）
    const userId = await getUserId(request);
    
    if (!userId) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, user_id, user_type, membership_type, membership_expires_at, created_at, updated_at')
      .eq('user_id', userId)
      .single();

    // 如果查询失败或无数据，开发环境返回模拟数据
    if (error || !data) {
      if (process.env.NODE_ENV === 'development' || process.env.COZE_PROJECT_ENV === 'DEV') {
        console.log('Profile API: 返回开发环境模拟数据');
        return NextResponse.json({ code: 200, data: getDevUserProfile(userId) });
      }
      console.error('Profile query error:', error);
      return NextResponse.json({ code: 404, message: '用户信息不存在' }, { status: 404 });
    }

    return NextResponse.json({ code: 200, data: data });
  } catch (err) {
    console.error('Profile API error:', err);
    // 开发环境返回模拟数据
    if (process.env.NODE_ENV === 'development' || process.env.COZE_PROJECT_ENV === 'DEV') {
      const userId = request.headers.get('x-user-id') || 'unknown';
      return NextResponse.json({ code: 200, data: getDevUserProfile(userId) });
    }
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}
