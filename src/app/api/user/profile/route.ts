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

    // 测试用户/开发环境特殊处理
    if (userId.startsWith('test_') || process.env.NODE_ENV === 'development') {
      const phone = userId.startsWith('test_') ? userId.replace('test_', '') : userId;
      return NextResponse.json({
        code: 200,
        data: {
          id: userId,
          user_id: userId,
          phone: phone,
          nickname: `用户${phone.slice(-4)}`,
          avatar_url: null,
          user_type: 'member',
          membership_type: 'member',
          membership_expires_at: '2030-12-31T23:59:59Z',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          major: '计算机科学',
          grade: '大三',
          skills: ['React', 'TypeScript', 'Node.js'],
          job_intention: '前端开发工程师',
        }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, user_id, user_type, membership_type, membership_expires_at, created_at, major, grade, skills, job_intention')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ code: 404, message: '用户信息不存在' }, { status: 404 });
    }

    return NextResponse.json({
      code: 200,
      data: {
        ...data,
        phone: userId,
        nickname: `用户${userId.slice(-4)}`,
        avatar_url: null,
        updated_at: data.created_at,
      }
    });
  } catch (err) {
    console.error('Profile API error:', err);
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}
