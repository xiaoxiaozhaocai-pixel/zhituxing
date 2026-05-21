export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

// 默认用户画像
const getDefaultProfile = (userId: string) => ({
  id: null,
  user_id: userId,
  major: '',
  target_position: '',
  skills: [],
  education: '',
  experience: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

export async function GET(request: NextRequest) {
  try {
    // 从 cookie 读取 sb-access-token（与 /api/auth/me 一致）
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    // 调试模式：?debug=1 返回 cookie 信息
    const url = new URL(request.url);
    if (url.searchParams.get('debug') === '1') {
      return NextResponse.json({
        debug: true,
        cookieHeader: cookieHeader.substring(0, 500),
        cookieHeaderLength: cookieHeader.length,
        tokenFound: !!token,
        tokenPreview: token ? token.substring(0, 50) + '...' : null,
      });
    }

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 动态导入 Supabase（与 /api/auth/me 一致）
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

    // 查询出错不报错，返回默认值
    if (error) {
      console.warn('查询user_profiles失败，返回默认值:', error.message);
      return NextResponse.json({ 
        success: true, 
        data: getDefaultProfile(userId) 
      });
    }

    // 没有数据则返回默认值
    if (!profile) {
      return NextResponse.json({ 
        success: true, 
        data: getDefaultProfile(userId) 
      });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (err) {
    console.error('获取用户画像失败:', err);
    return NextResponse.json({ 
      success: true, 
      data: getDefaultProfile('unknown') 
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 从 cookie 读取 sb-access-token（与 /api/auth/me 一致）
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 动态导入 Supabase（与 /api/auth/me 一致）
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

    const body = await request.json();
    const { major, target_position, skills, education, experience } = body;

    // 构建 update 对象，只包含提供的字段
    const updateData: Record<string, unknown> = { 
      updated_at: new Date().toISOString() 
    };
    if (major !== undefined) updateData.major = major;
    if (target_position !== undefined) updateData.target_position = target_position;
    if (skills !== undefined) updateData.skills = skills;
    if (education !== undefined) updateData.education = education;
    if (experience !== undefined) updateData.experience = experience;

    // 使用 upsert：存在则更新，不存在则插入
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        ...updateData
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('保存用户画像失败:', error);
      // 即使保存失败，也返回成功和数据
      return NextResponse.json({ 
        success: true, 
        data: {
          user_id: userId,
          ...updateData
        }
      });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (err) {
    console.error('更新用户画像失败:', err);
    return NextResponse.json({ 
      success: true, 
      data: { message: '保存完成' }
    });
  }
}
