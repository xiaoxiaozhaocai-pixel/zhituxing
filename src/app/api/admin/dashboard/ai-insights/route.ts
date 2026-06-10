import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';

async function checkAdmin(request: NextRequest): Promise<boolean> {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return false;
  const adminIds = process.env.ADMIN_USER_IDS;
  if (!adminIds) {
    console.warn('[admin/ai-insights] ADMIN_USER_IDS not configured');
    return false;
  }
  return adminIds.split(',').map(id => id.trim().toLowerCase()).includes(userId.toLowerCase());
}

// ===== 工具函数 =====
function getDateRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start: start.toISOString(), end: end.toISOString() };
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

// ===== 主路由 =====
export async function GET(request: NextRequest) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ code: 403, message: '无权限' }, { status: 403 });
  }
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date();
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    // 1. 本月趋势数据
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    const { count: monthNewUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthAgo.toISOString());
    
    const { count: weekNewUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString());
    
    // 2. JD 市场数据
    const { count: totalJds } = await supabase
      .from('jd_submissions')
      .select('*', { count: 'exact', head: true });
    
    const { count: monthNewJds } = await supabase
      .from('jd_submissions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthAgo.toISOString());
    
    const { count: pendingJds } = await supabase
      .from('jd_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    // 3. 公司活跃度（本月新增JD最多的公司）
    const { data: topCompanies } = await supabase
      .from('jd_submissions')
      .select('company, created_at')
      .gte('created_at', monthAgo.toISOString())
      .not('company', 'is', null);
    
    // 4. 面试 & 评估数据
    const { count: totalInterviews } = await supabase
      .from('interview_results')
      .select('*', { count: 'exact', head: true });
    
    const { count: monthInterviews } = await supabase
      .from('interview_results')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthAgo.toISOString());
    
    const { count: totalAssessments } = await supabase
      .from('assessment_results')
      .select('*', { count: 'exact', head: true });
    
    const { count: monthAssessments } = await supabase
      .from('assessment_results')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthAgo.toISOString());
    
    // 5. 会员数据
    const { count: memberCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('member_type', 'is', null);
    
    // 6. 每日用户注册趋势（近7天）
    const weekUserTrend: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStart = formatDate(d);
      const dayEnd = formatDate(new Date(d.getTime() + 86400000));
      
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dayStart)
        .lt('created_at', dayEnd);
      
      weekUserTrend.push({ date: dayStart, count: count || 0 });
    }
    
    // 统计公司频次
    const companyFreq: Record<string, number> = {};
    (topCompanies || []).forEach(jd => {
      if (jd.company) {
        companyFreq[jd.company] = (companyFreq[jd.company] || 0) + 1;
      }
    });
    
    const sortedCompanies = Object.entries(companyFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
    
    // 7. AI 洞察文本
    const monthNewUsersPercent = totalUsers ? ((monthNewUsers || 0) / totalUsers * 100).toFixed(1) : '0';
    const insightSummary = {
      trendOverview: `本月新增用户 ${monthNewUsers || 0} 人（占总用户 ${monthNewUsersPercent}%），新增 JD ${monthNewJds || 0} 条`,
      activeCompanies: sortedCompanies.slice(0, 5).map(c => c.name).join('、') || '暂无数据',
      userActivity: `本月完成面试模拟 ${monthInterviews || 0} 次，完成胜任力评估 ${monthAssessments || 0} 次`,
    };
    
    return NextResponse.json({
      code: 200,
      data: {
        cards: {
          trend: {
            title: '本月趋势解读',
            data: {
              totalUsers,
              monthNewUsers,
              weekNewUsers,
              totalJds,
              monthNewJds,
              pendingJds,
              totalInterviews,
              monthInterviews,
              totalAssessments,
              monthAssessments,
              memberCount,
            },
            insight: insightSummary.trendOverview,
          },
          highRisk: {
            title: '重点群体识别',
            data: {
              pendingUsers: 0,  // 待行为埋点完善后启用
              lowActivityUsers: 0,
              totalUsers,
            },
            insight: \`当前平台共 \${totalUsers || 0} 名用户，其中会员用户 \${memberCount || 0} 人\`,
          },
          opportunities: {
            title: '岗位机会推荐',
            data: {
              topCompanies: sortedCompanies,
              totalJdsThisMonth: monthNewJds,
            },
            insight: sortedCompanies.length > 0
              ? \`本月活跃雇主：\${insightSummary.activeCompanies}\`
              : '本月暂无新增岗位数据',
          },
          suggestions: {
            title: '老师待办建议',
            data: {
              pendingJds,
              pendingReviews: pendingJds,
              monthNewUsers,
            },
            insight: [
              pendingJds > 0 && \`待审核 JD \${pendingJds} 条，建议优先处理\`,
              monthNewUsers && monthNewUsers > 0 && \`本月新注册 \${monthNewUsers} 名用户\`,
              '建议定期关注学生面试模拟数据，针对性开展就业指导',
            ].filter(Boolean).join('；'),
          },
        },
        summary: insightSummary,
      },
    });
  } catch (error) {
    console.error('AI Dashboard error:', error);
    return NextResponse.json(
      { code: 500, message: '获取数据失败' },
      { status: 500 }
    );
  }
}
