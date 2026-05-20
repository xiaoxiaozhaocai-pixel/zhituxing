export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 管理员权限验证
async function verifyAdmin(request: NextRequest): Promise<{ valid: boolean; adminId?: string; adminName?: string }> {
  const adminId = request.headers.get('x-admin-id');
  const adminName = request.headers.get('x-admin-name');
  
  if (!adminId) {
    return { valid: false };
  }
  
  return { valid: true, adminId, adminName: adminName || '管理员' };
}

// 审核通过
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.valid) {
      return NextResponse.json(
        { code: 404, message: '接口不存在', data: null },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { code: 400, message: '缺少JD ID', data: null },
        { status: 400 }
      );
    }

    // 获取待审核的JD
    const jdResult = await execSql(`
      SELECT * FROM jd_submissions WHERE id = '${id}' AND status = 0
    `);

    if (!jdResult || jdResult.length === 0) {
      return NextResponse.json(
        { code: 404, message: 'JD不存在或已审核', data: null },
        { status: 404 }
      );
    }

    const jd = jdResult[0] as Record<string, unknown>;

    // 插入到jobs表
    const insertResult = await execSql(`
      INSERT INTO jobs (
        job_name, industry, city, company_type, salary_min, salary_max,
        skills, is_fresh_friendly, jd_content, source
      ) VALUES (
        '${(jd.job_name as string).replace(/'/g, "''")}',
        ${jd.industry ? `'${(jd.industry as string).replace(/'/g, "''")}'` : "'互联网'"},
        ${jd.city ? `'${(jd.city as string).replace(/'/g, "''")}'` : "'全国'"},
        ${jd.company_type ? `'${(jd.company_type as string).replace(/'/g, "''")}'` : "'民营企业'"},
        ${jd.salary_min || 5000},
        ${jd.salary_max || 10000},
        ${jd.skills ? `'${(jd.skills as string).replace(/'/g, "''")}'` : 'NULL'},
        1,
        '${(jd.jd_content as string).replace(/'/g, "''")}',
        '用户贡献'
      )
      RETURNING id
    `);

    // 更新审核状态
    await execSql(`
      UPDATE jd_submissions 
      SET status = 1, reviewer_id = '${auth.adminId}', reviewer_name = '${auth.adminName}',
          update_time = CURRENT_TIMESTAMP
      WHERE id = '${id}'
    `);

    // 发放奖励给用户（3次免费AI次数+7天会员）
    await grantRewards(jd.user_id as string);

    // 发送通知（记录到系统消息表或发送邮件）
    await sendNotification(jd.user_id as string, '您的JD已通过审核，奖励已发放！');

    return NextResponse.json({
      code: 200,
      message: '审核通过，JD已入库并发放奖励',
      data: {
        job_id: (insertResult as Array<{id: number}>)?.[0]?.id
      }
    });

  } catch (error) {
    console.error('审核通过失败:', error);
    return NextResponse.json(
      { code: 500, message: '操作失败', data: null },
      { status: 500 }
    );
  }
}

// 审核驳回
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.valid) {
      return NextResponse.json(
        { code: 403, message: '无权限访问', data: null },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, reject_reason } = body;

    if (!id) {
      return NextResponse.json(
        { code: 400, message: '缺少JD ID', data: null },
        { status: 400 }
      );
    }

    if (!reject_reason) {
      return NextResponse.json(
        { code: 400, message: '请填写驳回原因', data: null },
        { status: 400 }
      );
    }

    // 更新审核状态
    await execSql(`
      UPDATE jd_submissions 
      SET status = 2, reject_reason = '${reject_reason.replace(/'/g, "''")}',
          reviewer_id = '${auth.adminId}', reviewer_name = '${auth.adminName}',
          update_time = CURRENT_TIMESTAMP
      WHERE id = '${id}' AND status = 0
    `);

    // 获取用户ID
    const jdResult = await execSql(`
      SELECT user_id FROM jd_submissions WHERE id = '${id}'
    `);

    if (jdResult && jdResult.length > 0) {
      const userId = (jdResult[0] as {user_id: string}).user_id as string;
      // 发送通知
      await sendNotification(userId, `您提交的JD未通过审核，原因：${reject_reason}`);
    }

    return NextResponse.json({
      code: 200,
      message: '已驳回',
      data: null
    });

  } catch (error) {
    console.error('审核驳回失败:', error);
    return NextResponse.json(
      { code: 500, message: '操作失败', data: null },
      { status: 500 }
    );
  }
}

// 发放奖励
async function grantRewards(userId: string) {
  try {
    // 这里调用现有的奖励发放逻辑
    // 1. 增加3次免费AI次数
    await execSql(`
      UPDATE users 
      SET quota_remaining = quota_remaining + 3
      WHERE id = '${userId}'
    `);

    // 2. 增加7天会员（如果有会员到期时间则延后，否则从今天开始计算）
    const userResult = await execSql(`
      SELECT member_expires_at FROM users WHERE id = '${userId}'
    `);

    const currentExpires = (userResult as Array<{member_expires_at: string | null}>)?.[0]?.member_expires_at;
    let newExpires = new Date();
    newExpires.setDate(newExpires.getDate() + 7);

    if (currentExpires) {
      const existingDate = new Date(currentExpires as string);
      if (existingDate > new Date()) {
        existingDate.setDate(existingDate.getDate() + 7);
        newExpires = existingDate;
      }
    }

    await execSql(`
      UPDATE users 
      SET is_member = true, member_expires_at = '${newExpires.toISOString()}'
      WHERE id = '${userId}'
    `);

    console.log(`已向用户 ${userId} 发放奖励：3次AI次数+7天会员`);
  } catch (error) {
    console.error('发放奖励失败:', error);
  }
}

// 发送通知
async function sendNotification(userId: string, message: string) {
  try {
    // 记录通知到数据库（如果有无话消息表的话）
    console.log(`向用户 ${userId} 发送通知: ${message}`);
  } catch (error) {
    console.error('发送通知失败:', error);
  }
}
