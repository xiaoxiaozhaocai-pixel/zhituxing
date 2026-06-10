import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';
export const dynamic = 'force-dynamic';

const supabase = getSupabaseAdmin();

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { data: resumes, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: resumes || [] });
  } catch (error) {
    console.error('获取简历失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { name, content, sections, template_id, isDefault } = body;

    // 如果设为默认，先取消其他默认
    if (isDefault) {
      await supabase
        .from('resumes')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    const insertData: Record<string, unknown> = {
      user_id: userId,
      name,
      content: content || '',
      is_default: isDefault || false,
      created_at: new Date().toISOString(),
    };
    if (sections !== undefined) insertData.sections = sections;
    if (template_id !== undefined) insertData.template_id = template_id;

    const { data: resume, error } = await supabase
      .from('resumes')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: resume });
  } catch (error) {
    console.error('保存简历失败:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}
