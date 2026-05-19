import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取待审核JD列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status');
    const keyword = searchParams.get('keyword');
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    if (status !== null && status !== '' && status !== 'all') {
      whereClause += ` AND status = '${status}'`;
    }
    if (keyword) {
      whereClause += ` AND (job_name LIKE '%${keyword.replace(/'/g, "''")}%' OR company_name LIKE '%${keyword.replace(/'/g, "''")}%')`;
    }

    // 获取总数
    const countResult = await execSql(`
      SELECT COUNT(*) as total FROM jd_submissions ${whereClause}
    `) as Array<{ total: number }>;
    const total = countResult[0]?.total || 0;

    // 获取列表
    const submissions = await execSql(`
      SELECT 
        s.id,
        s.job_name,
        s.company_name,
        s.city,
        s.salary_min,
        s.salary_max,
        s.jd_content,
        s.status,
        s.reject_reason,
        s.auto_review_result,
        s.created_at,
        s.review_time,
        u.username
      FROM jd_submissions s
      LEFT JOIN users u ON s.user_id = u.id::text
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    // 获取各状态数量
    const statusCounts = await execSql(`
      SELECT status, COUNT(*) as count FROM jd_submissions GROUP BY status
    `) as Array<{ status: number; count: number }>;

    const pending = statusCounts.find(s => s.status === 0)?.count || 0;
    const approved = statusCounts.find(s => s.status === 1)?.count || 0;
    const rejected = statusCounts.find(s => s.status === 2)?.count || 0;

    return NextResponse.json({
      code: 200,
      data: {
        list: submissions,
        pagination: { page, pageSize, total },
        statusCounts: { pending, approved, rejected }
      }
    });
  } catch (error) {
    console.error('获取JD列表失败:', error);
    return NextResponse.json(
      { code: 500, message: '获取列表失败' },
      { status: 500 }
    );
  }
}

// 审核操作（通过/拒绝）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, reason, adminId, adminUsername } = body;

    if (!id || !action) {
      return NextResponse.json(
        { code: 400, message: '参数不完整' },
        { status: 400 }
      );
    }

    const newStatus = action === 'approve' ? 1 : 2;
    const rejectReason = action === 'reject' ? (reason || '不符合审核标准') : null;

    // 更新状态
    await execSql(`
      UPDATE jd_submissions 
      SET status = ${newStatus}, 
          review_time = NOW(),
          reject_reason = ${rejectReason ? `'${rejectReason.replace(/'/g, "''")}'` : 'NULL'}
      WHERE id = ${id}
    `);

    // 记录操作日志
    await execSql(`
      INSERT INTO admin_operation_logs (admin_id, admin_username, operation_type, operation_content)
      VALUES (${adminId || 0}, '${adminUsername || 'unknown'}', 'jd_review', '${action === 'approve' ? '通过' : '拒绝'} JD #${id}' ${rejectReason ? `, '${rejectReason.replace(/'/g, "''")}'` : ''})
    `);

    // 如果是拒绝，发送通知给用户
    if (action === 'reject') {
      const submission = await execSql('SELECT user_id FROM jd_submissions WHERE id = %s', id) as Array<{ user_id: string }>;
      if (submission[0]?.user_id) {
        await execSql(`
          INSERT INTO notifications (user_id, type, title, content, created_at)
          VALUES ('${submission[0].user_id}', 'jd_reject', 'JD审核结果通知', '您上传的JD未通过审核，原因：${rejectReason?.replace(/'/g, "''") || '不符合标准'}', NOW())
        `);
      }
    }

    return NextResponse.json({
      code: 200,
      message: action === 'approve' ? '已通过' : '已拒绝'
    });
  } catch (error) {
    console.error('审核操作失败:', error);
    return NextResponse.json(
      { code: 500, message: '操作失败' },
      { status: 500 }
    );
  }
}

// 批量审核
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, action, reason, adminId, adminUsername } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { code: 400, message: '请选择要操作的项' },
        { status: 400 }
      );
    }

    const newStatus = action === 'approve' ? 1 : 2;
    const rejectReason = action === 'reject' ? (reason || '不符合审核标准') : null;
    const idList = ids.join(',');

    await execSql(`
      UPDATE jd_submissions 
      SET status = ${newStatus}, 
          review_time = NOW(),
          reject_reason = ${rejectReason ? `'${rejectReason.replace(/'/g, "''")}'` : 'NULL'}
      WHERE id IN (${idList})
    `);

    // 记录操作日志
    await execSql(`
      INSERT INTO admin_operation_logs (admin_id, admin_username, operation_type, operation_content)
      VALUES (${adminId || 0}, '${adminUsername || 'unknown'}', 'jd_review', '批量${action === 'approve' ? '通过' : '拒绝'} ${ids.length}条JD')
    `);

    return NextResponse.json({
      code: 200,
      message: `已${action === 'approve' ? '通过' : '拒绝'} ${ids.length} 条`
    });
  } catch (error) {
    console.error('批量审核失败:', error);
    return NextResponse.json(
      { code: 500, message: '操作失败' },
      { status: 500 }
    );
  }
}
