export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

// 默认用户画像
const getDefaultProfile = (userId: string) => ({
  id: null,
  user_id: userId,
  major: '',
  target_job: '',
  hard_skills: [],
  soft_skills: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

export async function GET(request: NextRequest) {
  try {
    // 从 cookie 读取 sb-access-token
    const cookieHeader = request.headers.get('cookie') || '';
    console.log('[user/profile GET] Cookie header:', cookieHeader ? '有cookie' : '无cookie');
    const tokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    console.log('[user/profile GET] Token存在:', !!token, '长度:', token?.length || 0);

    if (!token) {
      console.log('[user/profile GET] 未登录 - 无token');
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 动态导入 Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 验证 token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 });
    }

    const userId = user.id;

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('查询user_profiles失败，返回默认值:', error.message);
      return NextResponse.json({ success: true, data: getDefaultProfile(userId) });
    }

    if (!profile) {
      return NextResponse.json({ success: true, data: getDefaultProfile(userId) });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (err) {
    console.error('获取用户画像失败:', err);
    return NextResponse.json({ success: true, data: getDefaultProfile('unknown') });
  }
}

// POST 方法 - 更新用户画像（与 PUT 相同，兼容前端调用）
export async function POST(request: NextRequest) {
  return PUT(request);
}

export async function PUT(request: NextRequest) {
  try {
    // 从 cookie 读取 sb-access-token
    const cookieHeader = request.headers.get('cookie') || '';
    console.log('[user/profile PUT] Cookie header:', cookieHeader ? '有cookie' : '无cookie');
    const tokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    console.log('[user/profile PUT] Token存在:', !!token, '长度:', token?.length || 0);

    if (!token) {
      console.log('[user/profile PUT] 未登录 - 无token');
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 动态导入 Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 验证 token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log('[user/profile PUT] Token验证:', user ? '成功 userId=' + user.id : '失败', authError?.message || '');
    
    if (authError || !user) {
      console.log('[user/profile PUT] 认证失败:', authError?.message);
      return NextResponse.json({ error: '认证失败: ' + (authError?.message || 'token无效') }, { status: 401 });
    }

    const userId = user.id;
    const body = await request.json();

    // 直接透传前端字段，不做任何映射转换
    // 前端字段名和数据库列名完全一致
    const updateData: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    // 允许直接透传的字段列表（只包含数据库真实存在的列）
    const allowedFields = [
      'major', 'grade', 'target_job', 'target_cities',
      'hard_skills', 'soft_skills', 'personality_type',
      'graduation_year', 'city',
      'internship_experience', 'project_experience', 'awards',
      'ability_background', 'user_type'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    console.log('[user/profile] 保存数据:', JSON.stringify(updateData, null, 2));

    // 使用 upsert：存在则更新，不存在则插入
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .upsert(updateData, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('[user/profile] 保存失败:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message || '保存失败',
        details: error
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (err) {
    console.error('[user/profile] 更新异常:', err);
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}
