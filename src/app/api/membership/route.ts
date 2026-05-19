import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 开发环境模拟数据
const DEV_USER_PROFILE = {
  membership_type: 'member',
  membership_expires_at: '2030-12-31T23:59:59Z',
  user_type: 'member',
  is_expired: false,
};

export async function GET(request: NextRequest) {
  try {
    // 从请求头获取用户ID
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('membership_type, membership_expires_at, user_type')
      .eq('user_id', userId)
      .single();

    // 如果查询失败或无数据，开发环境返回模拟数据
    if (error || !data) {
      if (process.env.NODE_ENV === 'development' || process.env.COZE_PROJECT_ENV === 'DEV') {
        console.log('Membership API: 返回开发环境模拟数据');
        return NextResponse.json({ code: 200, data: DEV_USER_PROFILE });
      }
      console.error('Membership query error:', error);
      return NextResponse.json({ code: 404, message: '用户信息不存在' }, { status: 404 });
    }

    const isExpired = data.membership_expires_at 
      ? new Date(data.membership_expires_at) < new Date() 
      : true;

    return NextResponse.json({
      code: 200,
      data: {
        membership_type: data.membership_type || 'free',
        membership_expires_at: data.membership_expires_at,
        user_type: data.user_type || 'member',
        is_expired: isExpired,
      }
    });
  } catch (err) {
    console.error('Membership API error:', err);
    // 开发环境返回模拟数据
    if (process.env.NODE_ENV === 'development' || process.env.COZE_PROJECT_ENV === 'DEV') {
      return NextResponse.json({ code: 200, data: DEV_USER_PROFILE });
    }
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}
