import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取站内信列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const type = searchParams.get('type');
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    if (type && type !== 'all') {
      whereClause += ` AND n.type = '${type}'`;
    }

    // 获取总数
    const countResult = await execSql(`
      SELECT COUNT(*) as total FROM notifications n ${whereClause}
    `) as Array<{ total: number }>;
    const total = countResult[0]?.total || 0;

    // 获取列表
    const notifications = await execSql(`
      SELECT n.*, u.nickname as user_nickname
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id::varchar
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    // 获取统计数据
    const stats = await execSql(`
      SELECT 
        COUNT(*) as total_sent,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_sent,
        COUNT(*) FILTER (WHERE type = 'activity') as activity_count
      FROM notifications
    `) as any;

    return NextResponse.json({
      code: 200,
      data: {
        list: notifications,
        stats: {
          totalSent: stats[0]?.total_sent || 0,
          todaySent: stats[0]?.today_sent || 0,
          activityCount: stats[0]?.activity_count || 0
        },
        pagination: { page, pageSize, total }
      }
    });
  } catch (error) {
    console.error('获取站内信失败:', error);
    return NextResponse.json({ code: 500, message: '获取列表失败' }, { status: 500 });
  }
}

// 发送站内信
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, type, targetType, targetUserId, adminId, adminUsername } = body;

    if (!title || !content) {
      return NextResponse.json({ code: 400, message: '标题和内容不能为空' }, { status: 400 });
    }

    let insertedCount = 0;

    if (targetType === 'all') {
      // 发送给所有用户
      const users = await execSql(`SELECT id::varchar as user_id FROM users WHERE is_blocked = FALSE OR is_blocked IS NULL`) as any[];
      for (const user of users) {
        await execSql(`
          INSERT INTO notifications (user_id, title, content, type, created_at)
          VALUES ('${user.user_id}', '${title.replace(/'/g, "''")}', '${content.replace(/'/g, "''")}', '${type || 'system'}', NOW())
        `);
        insertedCount++;
      }
    } else if (targetType === 'members') {
      // 仅发送给会员用户
      const users = await execSql(`
        SELECT id::varchar as user_id FROM users 
        WHERE (member_type IS NOT NULL OR is_lifetime_member = TRUE) 
        AND (is_blocked = FALSE OR is_blocked IS NULL)
      `) as any[];
      for (const user of users) {
        await execSql(`
          INSERT INTO notifications (user_id, title, content, type, created_at)
          VALUES ('${user.user_id}', '${title.replace(/'/g, "''")}', '${content.replace(/'/g, "''")}', '${type || 'system'}', NOW())
        `);
        insertedCount++;
      }
    } else if (targetType === 'single' && targetUserId) {
      // 发送给指定用户
      await execSql(`
        INSERT INTO notifications (user_id, title, content, type, created_at)
        VALUES ('${targetUserId}', '${title.replace(/'/g, "''")}', '${content.replace(/'/g, "''")}', '${type || 'system'}', NOW())
      `);
      insertedCount = 1;
    }

    // 记录操作日志
    await execSql(`
      INSERT INTO admin_operation_logs (admin_id, admin_username, operation_type, operation_content)
      VALUES (${adminId || 0}, '${adminUsername || 'unknown'}', 'notification_send', '发送站内信: ${title}, 目标:${targetType}, 数量:${insertedCount}')
    `);

    return NextResponse.json({
      code: 200,
      message: `发送成功，共发送给 ${insertedCount} 位用户`,
      data: { count: insertedCount }
    });
  } catch (error) {
    console.error('发送站内信失败:', error);
    return NextResponse.json({ code: 500, message: '发送失败' }, { status: 500 });
  }
}

// 删除站内信
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ code: 400, message: '缺少ID' }, { status: 400 });
    }

    await execSql(`DELETE FROM notifications WHERE id = ${id}`);

    return NextResponse.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除站内信失败:', error);
    return NextResponse.json({ code: 500, message: '删除失败' }, { status: 500 });
  }
}
