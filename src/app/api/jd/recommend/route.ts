export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');

    // 获取用户画像
    let userSkills: string[] = [];
    let targetPosition = '';

    if (userId) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('skills, target_position')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile) {
        userSkills = profile.skills || [];
        targetPosition = profile.target_position || '';
      }
    }

    // 推荐逻辑：优先匹配目标岗位，其次按热门排序
    let query = supabase
      .from('jd_library')
      .select('*')
      .eq('status', 'active')
      .limit(limit);

    // 如果有目标岗位，按标题匹配
    if (targetPosition) {
      const { data: jds, error } = await supabase
        .from('jd_library')
        .select('*')
        .eq('status', 'active')
        .ilike('job_title', `%${targetPosition}%`)
        .limit(limit);

      if (!error && jds && jds.length > 0) {
        return NextResponse.json({ success: true, data: jds });
      }
    }

    // 回退：按创建时间排序
    const { data: jds, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: jds || [] });
  } catch (error) {
    console.error('推荐JD失败:', error);
    return NextResponse.json({ error: '推荐失败' }, { status: 500 });
  }
}
