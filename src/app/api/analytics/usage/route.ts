import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

interface ModuleUsage {
  module: string;
  label: string;
  users: number;
  percentage: number;
  status: 'healthy' | 'warning' | 'low';
}

interface DecisionRule {
  threshold: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const supabase = getSupabaseAdmin();

    // 查询各表活跃用户数
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const sinceISO = sinceDate.toISOString();

    // 并行查询各模块活跃用户
    const [
      chatResult,
      interviewResult,
      resumeResult,
      jobsResult,
    ] = await Promise.allSettled([
      // 小职对话：从 messages 表
      supabase.from('messages')
        .select('user_id', { count: 'exact', head: false })
        .gte('created_at', sinceISO),
      // 模拟面试：从 assessment_results 表（含 interview 标记）
      supabase.from('assessment_results')
        .select('user_id', { count: 'exact', head: false })
        .gte('created_at', sinceISO)
        .or('result_data->>type.eq.interview,result_data->>interview.not.is.null'),
      // 简历优化：从 messages 表按关键词
      supabase.from('messages')
        .select('user_id', { count: 'exact', head: false })
        .gte('created_at', sinceISO)
        .or('content.ilike.%简历%,content.ilike.%resume%'),
      // 岗位浏览：从 jobs 相关事件
      supabase.from('messages')
        .select('user_id', { count: 'exact', head: false })
        .gte('created_at', sinceISO)
        .or('content.ilike.%岗位%,content.ilike.%职位%,content.ilike.%求职%'),
    ]);

    // 获取总活跃用户数（所有有记录的用户去重）
    const dedupUsers = new Set<string>();
    [chatResult, interviewResult, resumeResult, jobsResult].forEach((r) => {
      if (r.status === 'fulfilled' && r.value.data) {
        (r.value.data as { user_id: string }[]).forEach((row) => {
          if (row.user_id) dedupUsers.add(row.user_id);
        });
      }
    });

    const totalUsers = dedupUsers.size || 1; // 避免除零

    const extractUserCount = (result: PromiseSettledResult<{ data: { user_id: string }[] | null }>) => {
      if (result.status !== 'fulfilled' || !result.value.data) return 0;
      const users = new Set(result.value.data.map((r) => r.user_id).filter(Boolean));
      return users.size;
    };

    const modules: ModuleUsage[] = [
      {
        module: 'chat',
        label: '小职对话',
        users: extractUserCount(chatResult),
        percentage: 0,
        status: 'low',
      },
      {
        module: 'interview',
        label: '模拟面试',
        users: extractUserCount(interviewResult),
        percentage: 0,
        status: 'low',
      },
      {
        module: 'resume',
        label: '简历优化',
        users: extractUserCount(resumeResult),
        percentage: 0,
        status: 'low',
      },
      {
        module: 'jobs',
        label: '岗位浏览',
        users: extractUserCount(jobsResult),
        percentage: 0,
        status: 'low',
      },
    ];

    // 计算百分比和状态
    modules.forEach((m) => {
      m.percentage = Math.round((m.users / totalUsers) * 100);
      m.status = m.percentage > 50 ? 'healthy' : m.percentage >= 10 ? 'warning' : 'low';
    });

    const decisionRules: DecisionRule[] = [
      { threshold: '使用率 < 10%', action: '排查功能可用性或砍掉该模块', priority: 'high' },
      { threshold: '使用率 10%-30%', action: '观察优化：改进入口引导、降低使用门槛', priority: 'medium' },
      { threshold: '使用率 30%-50%', action: '持续投入：A/B 测试优化体验', priority: 'medium' },
      { threshold: '使用率 > 50%', action: '核心模块：保证稳定性、收集反馈迭代', priority: 'low' },
    ];

    return NextResponse.json({
      success: true,
      data: {
        modules,
        totalUsers,
        decisionRules,
        period: `${days}天`,
      },
    });
  } catch (error) {
    console.error('[analytics/usage] 查询失败:', error);
    return NextResponse.json(
      { success: false, message: '查询使用率数据失败' },
      { status: 500 }
    );
  }
}
