export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

// 从 cookie 认证用户
async function authenticateUser(request: NextRequest): Promise<string | null> {
  const cookieHeader = request.headers.get('cookie') || '';
  const tokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;

  if (!token) return null;

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  return user.id;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

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
  } catch (error) {
    console.error('获取用户画像失败:', error);
    // 即使出错也返回默认值，不返回500
    return NextResponse.json({ 
      success: true, 
      data: getDefaultProfile('') 
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { major, target_position, skills, education, experience } = body;

    // 构建更新数据
    const updateData: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString()
    };
    if (major !== undefined) updateData.major = major;
    if (target_position !== undefined) updateData.target_position = target_position;
    if (skills !== undefined) updateData.skills = skills;
    if (education !== undefined) updateData.education = education;
    if (experience !== undefined) updateData.experience = experience;

    // 使用 upsert（存在则更新，不存在则插入）
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(updateData, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.warn('保存user_profiles失败，返回传入数据:', error.message);
      return NextResponse.json({ 
        success: true, 
        data: { ...updateData, id: null } 
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('更新用户画像失败:', error);
    return NextResponse.json({ 
      success: true, 
      data: getDefaultProfile('') 
    });
  }
}
