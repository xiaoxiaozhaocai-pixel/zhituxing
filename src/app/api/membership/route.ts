import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    let userId = request.headers.get('x-user-id') || request.headers.get('X-User-Id') || request.headers.get('user-id');
    
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

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('membership_type, membership_expires_at, user_type')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
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
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}
