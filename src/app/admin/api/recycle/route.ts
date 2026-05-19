import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取回收站列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const tableType = searchParams.get('tableType');
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE 1=1 AND expire_at > NOW()';
    if (tableType && tableType !== 'all') {
      whereClause += ` AND original_table = '${tableType}'`;
    }

    // 获取总数
    const countResult = await execSql(`
      SELECT COUNT(*) as total FROM recycle_bin ${whereClause}
    `) as Array<{ total: number }>;
    const total = countResult[0]?.total || 0;

    // 获取列表
    const records = await execSql(`
      SELECT * FROM recycle_bin
      ${whereClause}
      ORDER BY deleted_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    // 获取即将过期的数量
    const expiringSoon = await execSql(`
      SELECT COUNT(*) as count FROM recycle_bin 
      WHERE expire_at > NOW() AND expire_at < NOW() + INTERVAL '1 day'
    `) as Array<{ count: number }>;

    return NextResponse.json({
      code: 200,
      data: {
        list: records,
        stats: {
          total: total,
          expiringSoon: expiringSoon[0]?.count || 0
        },
        pagination: { page, pageSize, total }
      }
    });
  } catch (error) {
    console.error('获取回收站失败:', error);
    return NextResponse.json({ code: 500, message: '获取列表失败' }, { status: 500 });
  }
}

// 恢复或永久删除
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, adminId, adminUsername } = body;

    if (!id || !action) {
      return NextResponse.json({ code: 400, message: '参数不完整' }, { status: 400 });
    }

    // 获取记录
    const record = await execSql('SELECT * FROM recycle_bin WHERE id = %s', id) as any[];

    if (!record || record.length === 0) {
      return NextResponse.json({ code: 404, message: '记录不存在' }, { status: 404 });
    }

    const { original_table, original_id, deleted_data } = record[0];

    if (action === 'restore') {
      // 恢复数据
      if (original_table === 'jobs') {
        const data = deleted_data;
        await execSql(`
          INSERT INTO jobs (job_name, company_name, city, salary_min, salary_max, industry, source, jd_content, is_fresh_friendly, created_at, updated_at)
          VALUES ('${data.job_name || ''}', '${data.company_name || ''}', '${data.city || ''}', ${data.salary_min || 0}, ${data.salary_max || 0}, '${data.industry || ''}', '${data.source || ''}', '${(data.jd_content || '').replace(/'/g, "''")}', ${data.is_fresh_friendly ? 1 : 0}, '${data.created_at || new Date().toISOString()}', NOW())
        `);
      } else if (original_table === 'articles') {
        const data = deleted_data;
        await execSql(`
          INSERT INTO articles (title, content, category, is_published, is_pinned, sort_order, created_at, updated_at)
          VALUES ('${(data.title || '').replace(/'/g, "''")}', '${(data.content || '').replace(/'/g, "''")}', '${data.category || ''}', ${data.is_published ? 'TRUE' : 'FALSE'}, ${data.is_pinned ? 'TRUE' : 'FALSE'}, ${data.sort_order || 0}, '${data.created_at || new Date().toISOString()}', NOW())
        `);
      } else if (original_table === 'announcements') {
        const data = deleted_data;
        await execSql(`
          INSERT INTO announcements (title, content, priority, is_published, is_pinned, created_at, updated_at)
          VALUES ('${(data.title || '').replace(/'/g, "''")}', '${(data.content || '').replace(/'/g, "''")}', ${data.priority || 0}, ${data.is_published ? 'TRUE' : 'FALSE'}, ${data.is_pinned ? 'TRUE' : 'FALSE'}, '${data.created_at || new Date().toISOString()}', NOW())
        `);
      }

      // 删除回收站记录
      await execSql('DELETE FROM recycle_bin WHERE id = %s', id);

      await execSql(`
        INSERT INTO admin_operation_logs (admin_id, admin_username, operation_type, operation_content)
        VALUES (${adminId || 0}, '${adminUsername || 'unknown'}', 'recycle_restore', '恢复数据: ${original_table} #${original_id}')
      `);

      return NextResponse.json({ code: 200, message: '恢复成功' });
    } else if (action === 'permanent_delete') {
      // 永久删除
      await execSql('DELETE FROM recycle_bin WHERE id = %s', id);

      await execSql(`
        INSERT INTO admin_operation_logs (admin_id, admin_username, operation_type, operation_content)
        VALUES (${adminId || 0}, '${adminUsername || 'unknown'}', 'recycle_delete', '永久删除: ${original_table} #${original_id}')
      `);

      return NextResponse.json({ code: 200, message: '永久删除成功' });
    }

    return NextResponse.json({ code: 400, message: '无效操作' }, { status: 400 });
  } catch (error) {
    console.error('回收站操作失败:', error);
    return NextResponse.json({ code: 500, message: '操作失败' }, { status: 500 });
  }
}

// 自动清理过期数据（定时任务）
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'cleanup') {
      // 清理过期数据
      const result = await execSql(`DELETE FROM recycle_bin WHERE expire_at < NOW()`);
      return NextResponse.json({ code: 200, message: '清理完成' });
    }

    return NextResponse.json({ code: 400, message: '无效操作' }, { status: 400 });
  } catch (error) {
    console.error('清理失败:', error);
    return NextResponse.json({ code: 500, message: '清理失败' }, { status: 500 });
  }
}
