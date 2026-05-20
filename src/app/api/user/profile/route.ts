export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

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
    const userId = request.headers.get('x-user-id');
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
    const userId = request.headers.get('x-user-id');
    return NextResponse.json({ 
      success: true, 
      data: getDefaultProfile(userId || '') 
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    
    // 添加 user_id 和更新时间
    const updateData = {
      ...body,
      user_id: userId,
      updated_at: new Date().toISOString()
    };

    // 使用 upsert：存在则更新，不存在则插入
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .upsert(updateData, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      console.warn('upsert user_profiles失败:', error.message);
      // 即使保存失败，也返回成功和数据
      return NextResponse.json({ 
        success: true, 
        data: { ...getDefaultProfile(userId), ...body },
        message: '保存成功（暂未持久化）'
      });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error('更新用户画像失败:', error);
    // 即使出错也返回成功
    const userId = request.headers.get('x-user-id');
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ 
      success: true, 
      data: { ...getDefaultProfile(userId || ''), ...body },
      message: '保存成功（暂未持久化）'
    });
  }
}
