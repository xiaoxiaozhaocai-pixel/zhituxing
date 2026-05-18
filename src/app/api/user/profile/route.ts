import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    let userId = request.headers.get('x-user-id') 
      || request.headers.get('X-User-Id')
      || request.headers.get('user-id');
    
    const authHeader = request.headers.get('Authorization');
    if (!userId && authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }
    
    if (!userId) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    // 测试用户特殊处理
    if (userId.startsWith('test_')) {
      const phone = userId.replace('test_', '');
      return NextResponse.json({
        code: 200,
        data: {
          id: userId,
          user_id: userId,
          phone: phone,
          nickname: '测试用户',
          avatar_url: null,
          user_type: 'member',
          membership_type: 'member',
          membership_expires_at: '2030-12-31T23:59:59Z',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, user_id, phone, nickname, avatar_url, user_type, membership_type, membership_expires_at, created_at, updated_at')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ code: 404, message: '用户信息不存在' }, { status: 404 });
    }

    return NextResponse.json({
      code: 200,
      data: data
    });
  } catch (err) {
    console.error('Profile API error:', err);
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}
