import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AgentItem {
  id: string;
  name: string;
  icon: string;
  desc: string;
  url: string;
  completed: boolean;
}

const REASON_MAP: Record<string, string> = {
  skill_portrait: '从技能画像开始，看清你的差距',
  assessment: '做能力测评，定位你的短板',
  career: '生成你的专属职业规划',
  resume: '让 AI 帮你优化简历',
  jobs: '分析感兴趣的岗位匹配度',
  interview: '模拟面试，提前练手',
  competency: '看看你的整体求职竞争力',
  decision: '考研还是就业？让 AI 帮你算',
};

const RECOMMEND_CHAIN = [
  'skill_portrait',
  'assessment',
  'career',
  'resume',
  'jobs',
  'interview',
  'competency',
  'decision',
];

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // 1) 拿 user_profiles 的 latest_*_id 和画像基础字段
    const { data: profile } = await supabase
      .from('user_profiles')
      .select(
        'major, grade, target_industry, gpa, latest_assessment_id, latest_career_plan_id, latest_competency_id, latest_interview_id'
      )
      .eq('user_id', userId)
      .maybeSingle();

    // 2) 并行查 4 张没有 latest_*_id 的表
    const headSel = { count: 'exact' as const, head: true };
    const [resumeRes, portraitRes, matchRes, decisionRes] = await Promise.all([
      supabase
        .from('resume_optimizations')
        .select('id', headSel)
        .eq('user_id', userId),
      supabase
        .from('skill_portraits')
        .select('id', headSel)
        .eq('user_id', userId),
      supabase
        .from('skill_job_match')
        .select('id', headSel)
        .eq('user_id', userId),
      supabase
        .from('decision_results')
        .select('id', headSel)
        .eq('user_id', userId),
    ]);

    const hasProfile = !!(
      profile?.major &&
      profile?.grade &&
      profile?.target_industry
    );

    const agents: AgentItem[] = [
      {
        id: 'skill_portrait',
        name: '技能画像',
        icon: '🧠',
        desc: '看清你的技能差距',
        url: '/assistant?bot=skill_portrait',
        completed: (portraitRes.count ?? 0) > 0,
      },
      {
        id: 'assessment',
        name: '能力测评',
        icon: '📊',
        desc: '定位你的短板',
        url: '/assistant?bot=assessment',
        completed: !!profile?.latest_assessment_id,
      },
      {
        id: 'career',
        name: '职业规划',
        icon: '🎯',
        desc: '生成专属规划报告',
        url: '/assistant?bot=career',
        completed: !!profile?.latest_career_plan_id,
      },
      {
        id: 'resume',
        name: '简历优化',
        icon: '📝',
        desc: 'AI 帮你改简历',
        url: '/resume-optimize',
        completed: (resumeRes.count ?? 0) > 0,
      },
      {
        id: 'jobs',
        name: 'JD 助手',
        icon: '💼',
        desc: '分析岗位匹配度',
        url: '/assistant?bot=jobs',
        completed: (matchRes.count ?? 0) > 0,
      },
      {
        id: 'interview',
        name: 'AI 面试官',
        icon: '🎤',
        desc: '模拟真实面试',
        url: '/assistant?bot=interview',
        completed: !!profile?.latest_interview_id,
      },
      {
        id: 'competency',
        name: '胜任力评估',
        icon: '⚖️',
        desc: '看求职竞争力',
        url: '/assistant?bot=competency',
        completed: !!profile?.latest_competency_id,
      },
      {
        id: 'decision',
        name: '考研就业决策',
        icon: '🧭',
        desc: '考研 vs 就业',
        url: '/assistant?bot=decision',
        completed: (decisionRes.count ?? 0) > 0,
      },
    ];

    const completedCount = agents.filter((a) => a.completed).length;
    const completionPct = Math.round((completedCount / agents.length) * 100);

    // 推荐下一步
    let recommendedNext: (AgentItem & { reason: string }) | null = null;
    if (!hasProfile) {
      recommendedNext = {
        id: 'profile_onboarding',
        name: '完善画像',
        icon: '👤',
        desc: '基础信息',
        url: '/profile',
        completed: false,
        reason: '先填基础信息，所有智能体才能"懂你"',
      };
    } else {
      for (const id of RECOMMEND_CHAIN) {
        const a = agents.find((x) => x.id === id);
        if (a && !a.completed) {
          recommendedNext = {
            ...a,
            reason: REASON_MAP[id] || '继续完善你的能力链路',
          };
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        hasProfile,
        agents,
        completedCount,
        totalCount: agents.length,
        completionPct,
        recommendedNext,
      },
    });
  } catch (error) {
    console.error('[agent-chain status] error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
