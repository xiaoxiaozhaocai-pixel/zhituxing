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

// POST 方法 - 更新用户画像（与 PUT 相同，兼容前端调用）
export async function POST(request: NextRequest) {
  return PUT(request);
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
    // 前端字段名映射到数据库字段名
    // direction/target_job/target_position → 数据库: job_intention
    // city/target_cities → 数据库: target_city
    // hard_skills/soft_skills → 数据库: skills (jsonb)
    // personality/personality_type → 数据库: personality_type
    const { 
      major, 
      direction,  // 新增：方向 → target_job
      target_position, 
      target_job,  // 兼容字段名
      skills, 
      education, 
      grade,  // 兼容字段名
      experience, 
      internship_experience,  // 兼容字段名
      city,  // 新增：单个城市
      target_cities,  // 目标城市数组
      personality,  // 新增：人格类型
      personality_type,  // 兼容字段名
      hard_skills,  // 专业技能
      soft_skills   // 软技能
    } = body;

    // 构建 update 对象，只包含提供的字段，映射到数据库字段名
    // 注意：数据库字段是 update_time 不是 updated_at
    const updateData: Record<string, unknown> = { 
      update_time: new Date().toISOString() 
    };
    if (major !== undefined) updateData.major = major;
    // direction/target_job/target_position → job_intention
    if (direction !== undefined) updateData.job_intention = direction;
    if (target_position !== undefined) updateData.job_intention = target_position;
    if (target_job !== undefined) updateData.job_intention = target_job;
    // education/grade → grade
    if (education !== undefined) updateData.grade = education;
    if (grade !== undefined) updateData.grade = grade;
    // experience/internship_experience → internship_experience
    if (experience !== undefined) updateData.internship_experience = experience;
    if (internship_experience !== undefined) updateData.internship_experience = internship_experience;
    // city/target_cities → target_city
    if (city !== undefined) updateData.target_city = city;
    if (target_cities !== undefined) {
      // target_cities 可能是数组，取第一个存入 target_city
      updateData.target_city = Array.isArray(target_cities) 
        ? target_cities[0] 
        : target_cities;
    }
    // personality/personality_type → personality_type
    if (personality !== undefined) updateData.personality_type = personality;
    if (personality_type !== undefined) updateData.personality_type = personality_type;
    
    // skills 字段处理：
    // 1. 如果前端传了 skills 数组，直接存数组
    // 2. 如果前端传了 hard_skills/soft_skills，合并成 {hard_skills:[], soft_skills:[]} 对象
    // 3. 不要把数组展开成对象
    if (hard_skills !== undefined || soft_skills !== undefined) {
      // 有 hard_skills 或 soft_skills 时，存对象格式
      updateData.skills = {
        hard_skills: hard_skills || [],
        soft_skills: soft_skills || []
      };
    } else if (skills !== undefined) {
      // 只有 skills 时，直接存（可能是数组或对象）
      updateData.skills = skills;
    }

    // 使用 upsert：存在则更新，不存在则插入
    // onConflict 用 user_id（数据库有 uk_user_profiles_user_id 唯一约束）
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
      // 返回真实错误，不再掩盖
      return NextResponse.json({ 
        success: false, 
        error: error.message || '保存失败',
        details: error
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (err) {
    console.error('更新用户画像失败:', err);
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}
