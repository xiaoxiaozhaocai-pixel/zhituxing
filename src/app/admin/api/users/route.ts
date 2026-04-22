import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取用户列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const keyword = searchParams.get('keyword');
    const memberType = searchParams.get('memberType');
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    if (keyword) {
      whereClause += ` AND (COALESCE(nickname, '') LIKE '%${keyword.replace(/'/g, "''")}%' OR COALESCE(email, '') LIKE '%${keyword.replace(/'/g, "''")}%')`;
    }
    if (memberType === 'member') {
      whereClause += ` AND (member_type IS NOT NULL OR is_lifetime_member = TRUE)`;
    } else if (memberType === 'normal') {
      whereClause += ` AND (member_type IS NULL AND is_lifetime_member = FALSE)`;
    }

    // 获取总数
    const countResult = await execSql(`
      SELECT COUNT(*) as total FROM users ${whereClause}
    `) as Array<{ total: number }>;
    const total = countResult[0]?.total || 0;

    // 获取列表
    const users = await execSql(`
      SELECT 
        id, COALESCE(nickname, '未设置') as username, email, created_at, last_sign_in_at as last_login_time,
        member_type, member_expire_time, is_lifetime_member,
        interview_quota, assessment_quota
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    // 获取每个用户的上传JD数量
    const usersWithStats = await Promise.all(
      (users as any[]).map(async (user) => {
        const jdCount = await execSql(`
          SELECT COUNT(*) as count FROM jd_submissions WHERE user_id = '${user.id}'
        `) as Array<{ count: number }>;
        return { ...user, jd_count: jdCount[0]?.count || 0 };
      })
    );

    return NextResponse.json({
      code: 200,
      data: {
        list: usersWithStats,
        pagination: { page, pageSize, total }
      }
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json(
      { code: 500, message: '获取列表失败' },
      { status: 500 }
    );
  }
}

// 开通/取消会员
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, memberType, adminId, adminUsername } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { code: 400, message: '参数不完整' },
        { status: 400 }
      );
    }

    let message = '';
    
    if (action === 'open') {
      // 开通会员
      if (memberType === 'lifetime') {
        await execSql(`
          UPDATE users 
          SET is_lifetime_member = TRUE, 
              member_type = 'lifetime',
              member_expire_time = '2099-12-31 23:59:59'
          WHERE id = '${userId}'
        `);
        message = '终身会员开通成功';
      } else {
        const expireTime = new Date();
        expireTime.setMonth(expireTime.getMonth() + 1);
        await execSql(`
          UPDATE users 
          SET member_type = 'monthly',
              member_expire_time = '${expireTime.toISOString()}'
          WHERE id = '${userId}'
        `);
        message = '月度会员开通成功';
      }
    } else if (action === 'cancel') {
      // 取消会员
      await execSql(`
        UPDATE users 
        SET is_lifetime_member = FALSE,
            member_type = NULL,
            member_expire_time = NULL
        WHERE id = '${userId}'
      `);
      message = '会员已取消';
    }

    // 记录操作日志
    await execSql(`
      INSERT INTO admin_operation_logs (admin_id, admin_username, operation_type, operation_content)
      VALUES (${adminId || 0}, '${adminUsername || 'unknown'}', 'member_manage', '${message}: 用户 #${userId}')
    `);

    return NextResponse.json({
      code: 200,
      message
    });
  } catch (error) {
    console.error('会员操作失败:', error);
    return NextResponse.json(
      { code: 500, message: '操作失败' },
      { status: 500 }
    );
  }
}
