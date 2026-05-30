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
  awards: [],
  internship_experience: [],
  project_experience: [],
  graduation_year: '',
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

    // 用 SERVICE_ROLE 客户端验证 token
    const { getSupabaseAdmin } = await import('@/lib/supabase');
    const supabaseAdmin = getSupabaseAdmin();

    // 验证 token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    console.log('[user/profile GET] Token验证:', user ? '成功 userId=' + user.id : '失败', authError?.message || '');
    
    if (authError || !user) {
      console.log('[user/profile GET] 认证失败:', authError?.message);
      return NextResponse.json({ error: '认证失败: ' + (authError?.message || 'token无效') }, { status: 401 });
    }

    const userId = user.id;

    // 用 SERVICE_ROLE 客户端查询数据库（绕过 RLS）
    const { getSupabaseAdmin } = await import('@/lib/supabase');
    const supabase = getSupabaseAdmin();

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

    // 统一返回格式：success: true, data: {...profile直接}
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

    // 用 SERVICE_ROLE 客户端验证 token
    const { getSupabaseAdmin } = await import('@/lib/supabase');
    const supabaseAdmin = getSupabaseAdmin();

    // 验证 token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    console.log('[user/profile PUT] Token验证:', user ? '成功 userId=' + user.id : '失败', authError?.message || '');
    
    if (authError || !user) {
      console.log('[user/profile PUT] 认证失败:', authError?.message);
      return NextResponse.json({ error: '认证失败: ' + (authError?.message || 'token无效') }, { status: 401 });
    }

    const userId = user.id;

    // 用 SERVICE_ROLE 客户端操作数据库（绕过 RLS）
    const { getSupabaseAdmin } = await import('@/lib/supabase');
    const supabase = getSupabaseAdmin();
    
    const body = await request.json();
    console.log('[user/profile PUT] 请求body:', JSON.stringify(body, null, 2));

    // 构建更新数据，只使用数据库真实存在的列
    // 数据库实际存在的列：major, grade, target_cities(jsonb), target_job, hard_skills(jsonb), soft_skills(jsonb), 
    // personality_type, has_internship(boolean), has_project(boolean), user_type, created_at, updated_at
    const updateData: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    // 直接透传的字段（数据库列名和前端字段名一致）
    if (body.major !== undefined) updateData.major = body.major;
    if (body.grade !== undefined) updateData.grade = body.grade;
    if (body.personality_type !== undefined) updateData.personality_type = body.personality_type;
    if (body.user_type !== undefined) updateData.user_type = body.user_type;
    if (body.nickname !== undefined) updateData.nickname = body.nickname;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.target_industry !== undefined) updateData.target_industry = body.target_industry;
    if (body.career_tendency !== undefined) updateData.career_tendency = body.career_tendency;
    if (body.english_level !== undefined) updateData.english_level = body.english_level;
    if (body.economic_pressure !== undefined) updateData.economic_pressure = body.economic_pressure;

    // 字段映射：target_position / job_intention → target_job
    if (body.target_position !== undefined) updateData.target_job = body.target_position;
    if (body.target_job !== undefined) updateData.target_job = body.target_job;
    if (body.job_intention !== undefined) updateData.target_job = body.job_intention;

    // 字段映射：target_city / city → target_cities (转成数组)
    if (body.target_cities !== undefined) {
      updateData.target_cities = body.target_cities;
    } else if (body.target_city !== undefined) {
      updateData.target_cities = [body.target_city];
    } else if (body.city !== undefined) {
      updateData.target_cities = [body.city];
    }

    // 直接透传 hard_skills 和 soft_skills (jsonb)
    if (body.hard_skills !== undefined) updateData.hard_skills = body.hard_skills;
    if (body.soft_skills !== undefined) updateData.soft_skills = body.soft_skills;

    // 新增字段：awards, internship_experience, project_experience (jsonb)
    if (body.awards !== undefined) updateData.awards = body.awards;
    if (body.internship_experience !== undefined) updateData.internship_experience = body.internship_experience;
    if (body.project_experience !== undefined) updateData.project_experience = body.project_experience;

    // 新增字段：graduation_year (varchar)
    if (body.graduation_year !== undefined) updateData.graduation_year = body.graduation_year;

    // 字段映射：internship_experience → has_internship (boolean)
    if (body.internship_experience !== undefined) {
      updateData.has_internship = !!body.internship_experience && body.internship_experience.length > 0;
    }
    if (body.has_internship !== undefined) updateData.has_internship = body.has_internship;

    // 字段映射：project_experience → has_project (boolean)
    if (body.project_experience !== undefined) {
      updateData.has_project = !!body.project_experience && body.project_experience.length > 0;
    }
    if (body.has_project !== undefined) updateData.has_project = body.has_project;

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
        code: 500, 
        error: error.message || '保存失败',
        details: error
      }, { status: 500 });
    }

    // 统一返回格式：code: 200, data: { profile: ... }
    return NextResponse.json({ code: 200, data: { profile } });
  } catch (err) {
    console.error('[user/profile] 更新异常:', err);
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ 
      code: 500, 
      error: errorMessage 
    }, { status: 500 });
  }
}
