import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 提交JD
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { code: 401, message: '请先登录', data: null },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      job_name,
      industry,
      city,
      company_name,
      company_type,
      salary_min,
      salary_max,
      skills,
      jd_content
    } = body;

    // 验证必填字段
    if (!job_name || !company_name || !jd_content) {
      return NextResponse.json(
        { code: 400, message: '岗位名称、企业名称和JD内容为必填项', data: null },
        { status: 400 }
      );
    }

    // 检查是否已存在相同的JD（防止重复上传）
    const existing = await execSql(`
      SELECT id FROM jd_submissions 
      WHERE user_id = '${userId}' 
      AND job_name = '${job_name.replace(/'/g, "''")}' 
      AND company_name = '${company_name.replace(/'/g, "''")}'
      LIMIT 1
    `) as Array<{ id: number }>;

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { code: 400, message: '该JD已上传，请勿重复提交', data: null },
        { status: 400 }
      );
    }

    // 插入数据库
    const result = await execSql(`
      INSERT INTO jd_submissions (
        user_id, job_name, industry, city, company_name, company_type,
        salary_min, salary_max, skills, jd_content, status
      ) VALUES (
        '${userId}',
        '${job_name.replace(/'/g, "''")}',
        ${industry ? `'${industry.replace(/'/g, "''")}'` : 'NULL'},
        ${city ? `'${city.replace(/'/g, "''")}'` : 'NULL'},
        '${company_name.replace(/'/g, "''")}',
        ${company_type ? `'${company_type.replace(/'/g, "''")}'` : 'NULL'},
        ${salary_min || 'NULL'},
        ${salary_max || 'NULL'},
        ${skills ? `'${skills.replace(/'/g, "''")}'` : 'NULL'},
        '${jd_content.replace(/'/g, "''")}',
        0
      )
      RETURNING id
    `);

    const submissionId = (result as Array<{ id: number }>)?.[0]?.id;

    // 检查是否满足奖励条件（累计3条审核通过）
    await checkAndGrantReward(userId);

    return NextResponse.json({
      code: 200,
      message: '提交成功！审核通过后，我们会自动为你发放会员奖励',
      data: {
        id: submissionId
      }
    });

  } catch (error) {
    console.error('提交JD失败:', error);
    return NextResponse.json(
      { code: 500, message: '提交失败，请稍后重试', data: null },
      { status: 500 }
    );
  }
}

// 获取我的提交记录
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { code: 401, message: '请先登录', data: null },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const status = searchParams.get('status');
    const offset = (page - 1) * pageSize;

    // 构建查询
    let whereClause = `WHERE user_id = '${userId}'`;
    if (status !== null && status !== '') {
      whereClause += ` AND status = '${status}'`;
    }

    // 获取总数
    const countResult = await execSql(`
      SELECT COUNT(*) as total FROM jd_submissions ${whereClause}
    `) as Array<{ total: number }>;
    const total = countResult[0]?.total || 0;

    // 获取列表
    const submissions = await execSql(`
      SELECT id, job_name, industry, city, company_name, company_type,
             salary_min, salary_max, skills, status, reject_reason,
             reward_granted, created_at, reviewed_at
      FROM jd_submissions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    // 获取审核通过的总数（用于计算进度）
    const approvedResult = await execSql(`
      SELECT COUNT(*) as approved FROM jd_submissions 
      WHERE user_id = '${userId}' AND status = 1 AND reward_granted = FALSE
    `) as Array<{ approved: number }>;
    const approvedCount = approvedResult[0]?.approved || 0;

    // 获取用户会员状态
    const userResult = await execSql(`
      SELECT member_type, member_expire_time, is_lifetime_member 
      FROM users WHERE id = '${userId}'
    `) as Array<{ member_type: string; member_expire_time: string; is_lifetime_member: boolean }>;
    const user = userResult?.[0];

    return NextResponse.json({
      code: 200,
      data: {
        list: submissions,
        pagination: {
          page,
          pageSize,
          total
        },
        progress: {
          approved: approvedCount,
          required: 3,
          remaining: Math.max(0, 3 - approvedCount),
          isComplete: approvedCount >= 3,
          isLifetimeMember: user?.is_lifetime_member || false,
          currentReward: approvedCount >= 3 ? '终身会员' : (approvedCount >= 3 ? `${approvedCount}/3` : null)
        },
        memberStatus: {
          isMember: !!user?.member_type || user?.is_lifetime_member,
          isLifetimeMember: user?.is_lifetime_member || false,
          memberType: user?.member_type || null,
          expireTime: user?.member_expire_time
        }
      }
    });

  } catch (error) {
    console.error('获取提交记录失败:', error);
    return NextResponse.json(
      { code: 500, message: '获取失败', data: null },
      { status: 500 }
    );
  }
}

// 检查并发放奖励
async function checkAndGrantReward(userId: string) {
  try {
    // 检查审核通过的JD数量（未领取奖励的）
    const approvedResult = await execSql(`
      SELECT COUNT(*) as approved FROM jd_submissions 
      WHERE user_id = '${userId}' AND status = 1 AND reward_granted = FALSE
    `) as Array<{ approved: number }>;
    const approvedCount = approvedResult[0]?.approved || 0;

    // 获取用户会员状态
    const userResult = await execSql(`
      SELECT member_type, is_lifetime_member FROM users WHERE id = '${userId}'
    `) as Array<{ member_type: string; is_lifetime_member: boolean }>;
    const user = userResult?.[0];

    // 如果已有终身会员，不再发放
    if (user?.is_lifetime_member) {
      return;
    }

    // 检查是否满足奖励条件（3条审核通过）
    if (approvedCount >= 3) {
      // 标记所有已审核的JD为已发放奖励
      await execSql(`
        UPDATE jd_submissions 
        SET reward_granted = TRUE 
        WHERE user_id = '${userId}' AND status = 1
      `);

      // 如果用户已有月度会员，延长6个月
      if (user?.member_type) {
        await execSql(`
          UPDATE users 
          SET member_expire_time = COALESCE(member_expire_time, NOW()) + INTERVAL '6 months'
          WHERE id = '${userId}'
        `);
      } else {
        // 开通终身会员
        await execSql(`
          UPDATE users 
          SET is_lifetime_member = TRUE, 
              member_type = 'lifetime',
              member_expire_time = '2099-12-31 23:59:59'
          WHERE id = '${userId}'
        `);
      }

      // 更新配额表
      await execSql(`
        INSERT INTO user_quotas (user_id, member_type, quota, used_quota, member_expires_at)
        VALUES ('${userId}', 'lifetime', -1, 0, '2099-12-31 23:59:59')
        ON CONFLICT (user_id) DO UPDATE SET
          member_type = 'lifetime',
          quota = -1,
          member_expires_at = '2099-12-31 23:59:59'
      `);
    }
  } catch (error) {
    console.error('检查奖励失败:', error);
  }
}
