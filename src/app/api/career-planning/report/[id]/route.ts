import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取职业规划报告详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { code: 401, message: '请先登录', data: null },
        { status: 401 }
      );
    }

    const { id } = await params;

    // 查询报告详情
    const result = await execSql(`
      SELECT 
        id, user_id, major, grade, city, report_data, is_latest, create_time, update_time
      FROM career_planning_reports 
      WHERE id = '${id}' AND user_id = '${userId}'
    `);

    if (!result || (result as Array<Record<string, unknown>>).length === 0) {
      return NextResponse.json(
        { code: 404, message: '报告不存在', data: null },
        { status: 404 }
      );
    }

    const report = (result as Array<Record<string, unknown>>)[0];

    // 模拟数据（后续填充真实的report_data）
    // 如果report_data为空，生成模拟数据
    let reportData = report.report_data;
    if (!reportData) {
      reportData = generateMockReportData(report);
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        id: report.id,
        user_id: report.user_id,
        major: report.major,
        grade: report.grade,
        city: report.city,
        is_latest: report.is_latest,
        create_time: report.create_time,
        report_data: reportData,
        // 核心岗位（占位）
        core_jobs: [
          { name: '产品经理', match_score: 92, industry: '互联网', city: report.city || '全国', salary_range: '15k-25k' },
          { name: '数据分析师', match_score: 85, industry: '互联网', city: report.city || '全国', salary_range: '12k-20k' },
          { name: '运营专员', match_score: 78, industry: '互联网', city: report.city || '全国', salary_range: '8k-15k' }
        ],
        // 6维诊断模型（占位）
        dimensions: {
          personality: 85,
          major: 90,
          ability: 75,
          interest: 80,
          values: 88,
          risk: 70
        },
        // 职业发展路径（占位）
        career_path: [
          { stage: '大一', action: '探索期：了解专业方向，尝试实习' },
          { stage: '大二', action: '积累期：获取相关证书，参与项目' },
          { stage: '大三', action: '提升期：争取大厂实习，丰富简历' },
          { stage: '大四', action: '收获期：秋招/春招，拿到offer' }
        ],
        // 技能缺口分析（占位）
        skills_gap: [
          { skill: 'Python数据分析', current: 40, target: 80 },
          { skill: 'Axure原型设计', current: 30, target: 70 },
          { skill: 'SQL数据库', current: 50, target: 75 }
        ],
        // 全年行动清单（占位）
        action_plan: [
          { month: '1月', task: '完成职业兴趣测评', status: 'pending' },
          { month: '2月', task: '学习SQL基础课程', status: 'pending' },
          { month: '3月', task: '准备暑期实习简历', status: 'pending' },
          { month: '4月', task: '参加校园招聘会', status: 'pending' },
          { month: '5月', task: '投递暑期实习申请', status: 'pending' },
          { month: '6月', task: '开始实习或项目实践', status: 'pending' }
        ]
      }
    });

  } catch (error) {
    console.error('获取职业规划报告失败:', error);
    return NextResponse.json(
      { code: 500, message: '获取失败', data: null },
      { status: 500 }
    );
  }
}

// 生成模拟报告数据
function generateMockReportData(report: Record<string, unknown>): Record<string, unknown> {
  return {
    generated_at: report.create_time,
    summary: '基于您的个人信息生成的职业规划报告',
    recommendations: [
      '建议优先发展产品经理方向',
      '加强数据分析技能学习',
      '争取大三暑期到大厂实习'
    ]
  };
}
