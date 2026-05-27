export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';
import { sanitizeJDList } from '@/lib/jd-sanitizer';
import { PUBLIC_JD_FIELDS } from '@/lib/rag-utils';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const userId = await getAuthenticatedUserId(request);
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');

    // 获取用户画像
    let userSkills: string[] = [];
    let targetPosition = '';

    if (userId) {
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('skills, target_position')
          .eq('user_id', userId)
          .maybeSingle();

        if (profile) {
          userSkills = profile.skills || [];
          targetPosition = profile.target_position || '';
        }
      } catch {
        // 查询失败不影响主流程，继续使用默认值
        console.log('user_profiles 查询失败，使用默认值');
      }
    }

    // 如果用户没有目标岗位和技能，返回提示
    if (!targetPosition && userSkills.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: [],
        message: '请先完善个人资料以获取推荐' 
      });
    }

    // 推荐逻辑：优先匹配目标岗位，其次按热门排序
    // 使用 job_descriptions 表（jd_library 可能不存在）
    let query = (supabase as any)
      .from('job_descriptions')
      .or('is_synthetic.is.null,is_synthetic.eq.false')
      .select(PUBLIC_JD_FIELDS)
      .limit(limit);

    // 如果有目标岗位，按标题匹配
    if (targetPosition) {
      try {
        const { data: jds, error } = await (supabase as any)
          .from('job_descriptions')
          .or('is_synthetic.is.null,is_synthetic.eq.false')
          .select(PUBLIC_JD_FIELDS)
          .ilike('job_title', `%${targetPosition}%`)
          .limit(limit);

        if (!error && jds && jds.length > 0) {
          return NextResponse.json({ success: true, data: sanitizeJDList(jds) });
        }
      } catch {
        // job_descriptions 表查询失败，继续尝试其他查询
        console.log('job_descriptions 按标题查询失败');
      }
    }

    // 回退：按创建时间排序
    try {
      const { data: jds, error } = await (query as any).order('created_at', { ascending: false });

      if (error) {
        console.log('job_descriptions 按时间排序失败:', error);
        return NextResponse.json({ 
          success: true, 
          data: [],
          message: '暂无推荐数据' 
        });
      }

      return NextResponse.json({ success: true, data: sanitizeJDList(jds) || [] });
    } catch {
      // job_descriptions 表可能不存在
      return NextResponse.json({ 
        success: true, 
        data: [],
        message: '暂无推荐数据' 
      });
    }
  } catch (error) {
    console.error('推荐JD失败:', error);
    // 不返回 500，返回空结果
    return NextResponse.json({ 
      success: true, 
      data: [],
      message: '获取推荐失败，请稍后重试' 
    });
  }
}
