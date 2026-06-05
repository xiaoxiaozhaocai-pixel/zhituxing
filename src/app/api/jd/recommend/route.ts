export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';
import { sanitizeJDList } from '@/lib/jd-sanitizer';
import type { JobRecord } from '@/lib/types';
import { PUBLIC_JD_FIELDS } from '@/lib/rag-utils';
import { generateXiaozhiNote } from '@/lib/xiaozhi-recommend';

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
        console.log('user_profiles 查询失败，使用默认值');
      }

      // 读取最新测评结果，补充技能差距信息
      try {
        const { data: latestAssessment } = await supabase
          .from('assessment_results')
          .select('result_data')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestAssessment?.result_data) {
          const resultData = typeof latestAssessment.result_data === 'string'
            ? JSON.parse(latestAssessment.result_data)
            : latestAssessment.result_data;

          // 从测评结果提取技能弱点
          if (resultData.weaknesses && Array.isArray(resultData.weaknesses)) {
            userSkills = [...new Set([...userSkills, ...resultData.weaknesses])];
          }
          if (resultData.skill_gaps && Array.isArray(resultData.skill_gaps)) {
            userSkills = [...new Set([...userSkills, ...resultData.skill_gaps])];
          }
        }
      } catch {
        // 测评结果读取失败不影响主流程
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
      .select(PUBLIC_JD_FIELDS)
      .or('is_synthetic.is.null,is_synthetic.eq.false')
      .limit(limit);

    // 如果有目标岗位，按标题匹配
    if (targetPosition) {
      try {
        const { data: jds, error } = await (supabase as any)
          .from('job_descriptions')
          .select(PUBLIC_JD_FIELDS)
          .or('is_synthetic.is.null,is_synthetic.eq.false')
          .ilike('job_title', `%${targetPosition}%`)
          .limit(limit);

        if (!error && jds && jds.length > 0) {
          const jdsWithNotes = jds.map((jd: JobRecord) => ({
            ...jd,
            xiaozhi_note: generateXiaozhiNote({
              matchScore: 75,
              jobTitle: jd.job_title || '',
              company: jd.company || '',
              matchedSkills: userSkills.filter((s: string) =>
                (jd.hard_skills || []).concat(jd.soft_skills || []).some((js: string) =>
                  js.toLowerCase().includes(s.toLowerCase())
                )
              ),
              gapSkills: [],
              freshGraduateFriendly: jd.fresh_graduate_friendly,
              targetPosition: targetPosition || undefined,
            }),
          }));
          return NextResponse.json({ success: true, data: sanitizeJDList(jdsWithNotes) });
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
