export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';

const supabase = getSupabaseAdmin();


interface TimelineRecord {
  id: string;
  created_at: string;
  target_position?: string;
  industry?: string;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const [careerPlans, competencyResults, assessmentResults] = await Promise.all([
      supabase.from('career_plans')
        .select('id, created_at, target_position, industry')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase.from('competency_results')
        .select('id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase.from('assessment_results')
        .select('id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ]);

    const items = [
      ...(careerPlans.data || []).map((p: TimelineRecord) => ({
        id: p.id,
        type: 'career-plan' as const,
        typeLabel: '职业规划',
        icon: '🎯',
        title: p.target_position || '职业规划报告',
        subtitle: p.industry || '',
        created_at: p.created_at,
        link: `/career-planning/report/${p.id}`,
        linkLabel: '查看报告 →',
      })),
      ...(competencyResults.data || []).map((c: TimelineRecord) => ({
        id: c.id,
        type: 'competency' as const,
        typeLabel: '胜任力评估',
        icon: '📊',
        title: '胜任力评估报告',
        subtitle: '',
        created_at: c.created_at,
        link: null,
        linkLabel: '',
      })),
      ...(assessmentResults.data || []).map((a: TimelineRecord) => ({
        id: a.id,
        type: 'assessment' as const,
        typeLabel: '能力测评',
        icon: '📋',
        title: '能力测评报告',
        subtitle: '',
        created_at: a.created_at,
        link: null,
        linkLabel: '',
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('获取成长时间线失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
