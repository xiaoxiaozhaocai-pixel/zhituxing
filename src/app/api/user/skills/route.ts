import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { data: skills, error } = await supabase
      .from('user_skills')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true, data: skills || [] });
  } catch (error) {
    console.error('获取用户技能失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { skill_name, level, experience } = body;

    // 检查是否已存在
    const { data: existing } = await supabase
      .from('user_skills')
      .select('id')
      .eq('user_id', userId)
      .eq('skill_name', skill_name)
      .maybeSingle();

    if (existing) {
      // 更新
      const { data: skill, error } = await supabase
        .from('user_skills')
        .update({ level, experience })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data: skill });
    }

    // 新增
    const { data: skill, error } = await supabase
      .from('user_skills')
      .insert({
        user_id: userId,
        skill_name,
        level,
        experience,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: skill });
  } catch (error) {
    console.error('保存用户技能失败:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const skillName = request.nextUrl.searchParams.get('skill');

    if (!skillName) {
      return NextResponse.json({ error: '缺少技能名称' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_skills')
      .delete()
      .eq('user_id', userId)
      .eq('skill_name', skillName);

    if (error) throw error;

    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除用户技能失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
