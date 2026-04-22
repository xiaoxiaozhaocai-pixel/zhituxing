import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

export async function GET(request: NextRequest) {
  try {
    // 获取总用户数
    const userCountResult = await execSql(`
      SELECT COUNT(*) as total FROM users
    `) as Array<{ total: number }>;
    const totalUsers = userCountResult[0]?.total || 0;

    // 获取今日新增用户
    const today = new Date().toISOString().slice(0, 10);
    const todayUserResult = await execSql(`
      SELECT COUNT(*) as today FROM users WHERE created_at::date = '${today}'
    `) as Array<{ today: number }>;
    const todayUsers = todayUserResult[0]?.today || 0;

    // 获取总JD数
    const jobCountResult = await execSql(`
      SELECT COUNT(*) as total FROM jobs
    `) as Array<{ total: number }>;
    const totalJobs = jobCountResult[0]?.total || 0;

    // 获取今日新增JD
    const todayJobResult = await execSql(`
      SELECT COUNT(*) as today FROM jobs WHERE created_at::date = '${today}'
    `) as Array<{ today: number }>;
    const todayJobs = todayJobResult[0]?.today || 0;

    // 获取会员用户数
    const memberCountResult = await execSql(`
      SELECT COUNT(*) as total FROM users WHERE member_type IS NOT NULL OR is_lifetime_member = TRUE
    `) as Array<{ total: number }>;
    const totalMembers = memberCountResult[0]?.total || 0;

    // 获取待审核JD数
    const pendingCountResult = await execSql(`
      SELECT COUNT(*) as pending FROM jd_submissions WHERE status = 0
    `) as Array<{ pending: number }>;
    const pendingJDs = pendingCountResult[0]?.pending || 0;

    // 获取近7日用户增长数据
    const weekUserData = await execSql(`
      SELECT DATE(created_at) as date, COUNT(*) as count 
      FROM users 
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `) as Array<{ date: string; count: number }>;

    // 获取近7日JD增长数据
    const weekJobData = await execSql(`
      SELECT DATE(created_at) as date, COUNT(*) as count 
      FROM jobs 
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `) as Array<{ date: string; count: number }>;

    // 格式化近7日数据
    const formatWeekData = (data: Array<{date: string; count: number}>, key: string) => {
      const result = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().slice(0, 10);
        const found = data.find(d => d.date === dateStr);
        result.push({
          date: dateStr,
          label: `${date.getMonth() + 1}/${date.getDate()}`,
          [key]: found ? found.count : 0
        });
      }
      return result;
    };

    // JD来源统计
    const sourceStats = await execSql(`
      SELECT source, COUNT(*) as count 
      FROM jobs 
      WHERE source IS NOT NULL AND source != ''
      GROUP BY source
      ORDER BY count DESC
      LIMIT 10
    `) as Array<{ source: string; count: number }>;

    // 审核统计
    const reviewStats = await execSql(`
      SELECT status, COUNT(*) as count 
      FROM jd_submissions 
      GROUP BY status
    `) as Array<{ status: number; count: number }>;

    const reviewPending = reviewStats.find(r => r.status === 0)?.count || 0;
    const reviewApproved = reviewStats.find(r => r.status === 1)?.count || 0;
    const reviewRejected = reviewStats.find(r => r.status === 2)?.count || 0;

    return NextResponse.json({
      code: 200,
      data: {
        overview: {
          totalUsers,
          todayUsers,
          totalJobs,
          todayJobs,
          totalMembers,
          pendingJDs
        },
        weekUserData: formatWeekData(weekUserData, 'users'),
        weekJobData: formatWeekData(weekJobData, 'jobs'),
        sourceStats: sourceStats.map(s => ({
          source: s.source || '未知来源',
          count: s.count
        })),
        reviewStats: {
          pending: reviewPending,
          approved: reviewApproved,
          rejected: reviewRejected
        }
      }
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return NextResponse.json(
      { code: 500, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
}
