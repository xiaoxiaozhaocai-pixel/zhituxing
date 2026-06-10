import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';
export const dynamic = 'force-dynamic';

const supabase = getSupabaseAdmin();

/**
 * GET /api/resume/[id]/export/pdf
 * 导出简历为PDF - 返回简历数据供前端渲染打印
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { data: resume, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !resume) {
      return NextResponse.json({ error: '简历不存在' }, { status: 404 });
    }

    // Return the structured data for the frontend to render and print
    return NextResponse.json({
      success: true,
      data: {
        name: resume.name,
        sections: resume.sections,
        template_id: resume.template_id || 'simple',
      },
    });
  } catch (error) {
    console.error('导出PDF失败:', error);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}
