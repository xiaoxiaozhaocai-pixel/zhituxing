export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

// event_type → 模块中文名映射
const MODULE_MAP: Record<string, string> = {
  chat_send: '小职对话',
  interview_complete: '模拟面试',
  course_start: '互动课程',
  resume_create: '简历优化',
  job_view: '岗位浏览',
};

// 使用率 → 状态判定
function getStatus(rate: number): 'healthy' | 'warning' | 'low' {
  if (rate > 50) return 'healthy';
  if (rate >= 10) return 'warning';
  return 'low';
}

// 生成决策规则
function generateDecisionRules(
  modules: { name: string; key: string; count: number; rate: number; status: string }[]
) {
  const rules: { rule: string; action: string; modules: string[] }[] = [];

  const lowModules = modules.filter((m) => m.status === 'low');
  const warningModules = modules.filter((m) => m.status === 'warning');

  if (lowModules.length > 0) {
    rules.push({
      rule: '使用率 < 10%',
      action: '🔴 排查问题或考虑砍掉',
      modules: lowModules.map((m) => m.name),
    });
  }

  if (warningModules.length > 0) {
    rules.push({
      rule: '使用率 10%–50%',
      action: '🟡 持续观察，优化体验与引导',
      modules: warningModules.map((m) => m.name),
    });
  }

  const healthyModules = modules.filter((m) => m.status === 'healthy');
  if (healthyModules.length > 0) {
    rules.push({
      rule: '使用率 > 50%',
      action: '🟢 核心模块，继续投入资源优化',
      modules: healthyModules.map((m) => m.name),
    });
  }

  return rules;
}

export async function GET(request: NextRequest) {
  try {
    const days = parseInt(request.nextUrl.searchParams.get('days') || '30');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 查询指定时间范围内的所有事件
    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('event_type, user_id')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) {
      return NextResponse.json(
        { success: false, message: '查询失败: ' + error.message },
        { status: 500 }
      );
    }

    if (!events || events.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          modules: [],
          totalUsers: 0,
          decisionRules: [],
          period: `${days}天`,
        },
      });
    }

    // 按 event_type 分组，去重统计 user_id
    const moduleUsersMap = new Map<string, Set<string>>();
    const allUsers = new Set<string>();

    for (const event of events) {
      const type = event.event_type as string;
      const uid = event.user_id as string;
      if (!uid) continue;

      allUsers.add(uid);

      if (!moduleUsersMap.has(type)) {
        moduleUsersMap.set(type, new Set());
      }
      moduleUsersMap.get(type)!.add(uid);
    }

    const totalUsers = allUsers.size;

    // 构建模块列表（仅包含 MODULE_MAP 中定义的模块）
    const modules = Object.entries(MODULE_MAP)
      .map(([key, name]) => {
        const users = moduleUsersMap.get(key);
        const count = users ? users.size : 0;
        const rate = totalUsers > 0 ? Math.round((count / totalUsers) * 1000) / 10 : 0;
        const status = getStatus(rate);

        return { name, key, count, rate, status };
      })
      .sort((a, b) => b.rate - a.rate);

    const decisionRules = generateDecisionRules(modules);

    return NextResponse.json({
      success: true,
      data: {
        modules,
        totalUsers,
        decisionRules,
        period: `${days}天`,
      },
    });
  } catch (err) {
    console.error('[analytics/usage] 异常:', err);
    return NextResponse.json(
      { success: false, message: '服务器异常' },
      { status: 500 }
    );
  }
}
