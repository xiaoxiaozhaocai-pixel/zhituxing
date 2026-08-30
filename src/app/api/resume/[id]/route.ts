import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';
export const dynamic = 'force-dynamic';

const supabase = getSupabaseAdmin();

// GET /api/resume/[id] — 获取单个简历
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { id } = await params;
    const { data: resume, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !resume) {
      return NextResponse.json({ error: '简历不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: resume });
  } catch (error) {
    console.error('获取简历失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// PUT /api/resume/[id] — 更新简历
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, content, sections, template_id, is_default } = body;

    // 验证简历归属
    const { data: existing } = await supabase
      .from('resumes')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: '简历不存在' }, { status: 404 });
    }

    // 如果设为默认，先取消其他默认
    if (is_default) {
      await supabase
        .from('resumes')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (content !== undefined) updateData.content = content;
    if (sections !== undefined) updateData.sections = sections;
    if (template_id !== undefined) updateData.template_id = template_id;
    if (is_default !== undefined) updateData.is_default = is_default;

    const { data: updated, error } = await supabase
      .from('resumes')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('更新简历失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// DELETE /api/resume/[id] — 删除简历
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { id } = await params;

    const { error } = await supabase
      .from('resumes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除简历失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
