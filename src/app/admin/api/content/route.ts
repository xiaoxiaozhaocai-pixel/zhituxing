import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取内容列表（支持文章、公告、FAQ）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'article';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    let table = '';
    switch (type) {
      case 'article':
        table = 'articles';
        break;
      case 'announcement':
        table = 'announcements';
        break;
      case 'faq':
        table = 'faqs';
        break;
      default:
        table = 'articles';
    }

    // 获取总数
    const countResult = await execSql(`
      SELECT COUNT(*) as total FROM ${table}
    `) as Array<{ total: number }>;
    const total = countResult[0]?.total || 0;

    // 获取列表 - 根据表结构选择正确的查询
    let listSql = '';
    if (type === 'faq') {
      listSql = `SELECT id, question as title, answer as content, category, sort_order, is_published, created_at, updated_at FROM ${table} ORDER BY sort_order ASC NULLS LAST, created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
    } else if (type === 'announcement') {
      listSql = `SELECT id, title, content, category, priority as sort_order, is_published, is_pinned, created_at, updated_at FROM ${table} ORDER BY is_pinned DESC NULLS LAST, created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
    } else {
      listSql = `SELECT id, title, content, category, sort_order, is_published, is_pinned, created_at, updated_at FROM ${table} ORDER BY is_pinned DESC NULLS LAST, created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
    }
    
    const list = await execSql(listSql);

    return NextResponse.json({
      code: 200,
      data: {
        list,
        pagination: { page, pageSize, total }
      }
    });
  } catch (error) {
    console.error('获取内容列表失败:', error);
    return NextResponse.json(
      { code: 500, message: '获取列表失败' },
      { status: 500 }
    );
  }
}

// 创建内容
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, content, category, isPublished, isPinned, sortOrder, adminId, adminUsername } = body;

    if (type === 'faq') {
      const result = await execSql(`
        INSERT INTO faqs (question, answer, category, sort_order, is_published, created_at, updated_at)
        VALUES ('${title?.replace(/'/g, "''")}', '${content?.replace(/'/g, "''")}', '${category || ''}', ${sortOrder || 0}, ${isPublished ? 'TRUE' : 'FALSE'}, NOW(), NOW())
        RETURNING id
      `);
      await execSql(`
        INSERT INTO admin_operation_logs (admin_id, admin_username, operation_type, operation_content)
        VALUES (${adminId || 0}, '${adminUsername || 'unknown'}', 'content_create', '创建${type}: ${title}')
      `);
      return NextResponse.json({ code: 200, message: '创建成功', data: { id: (result as any[])?.[0]?.id } });
    }

    if (type === 'article') {
      const result = await execSql(`
        INSERT INTO articles (title, content, category, is_published, is_pinned, created_at, updated_at)
        VALUES ('${title?.replace(/'/g, "''")}', '${content?.replace(/'/g, "''")}', '${category || ''}', ${isPublished ? 'TRUE' : 'FALSE'}, ${isPinned ? 'TRUE' : 'FALSE'}, NOW(), NOW())
        RETURNING id
      `);
      await execSql(`
        INSERT INTO admin_operation_logs (admin_id, admin_username, operation_type, operation_content)
        VALUES (${adminId || 0}, '${adminUsername || 'unknown'}', 'content_create', '创建${type}: ${title}')
      `);
      return NextResponse.json({ code: 200, message: '创建成功', data: { id: (result as any[])?.[0]?.id } });
    }

    if (type === 'announcement') {
      const result = await execSql(`
        INSERT INTO announcements (title, content, category, is_published, is_pinned, priority, created_at, updated_at)
        VALUES ('${title?.replace(/'/g, "''")}', '${content?.replace(/'/g, "''")}', '${category || ''}', ${isPublished ? 'TRUE' : 'FALSE'}, ${isPinned ? 'TRUE' : 'FALSE'}, ${sortOrder || 0}, NOW(), NOW())
        RETURNING id
      `);
      await execSql(`
        INSERT INTO admin_operation_logs (admin_id, admin_username, operation_type, operation_content)
        VALUES (${adminId || 0}, '${adminUsername || 'unknown'}', 'content_create', '创建${type}: ${title}')
      `);
      return NextResponse.json({ code: 200, message: '创建成功', data: { id: (result as any[])?.[0]?.id } });
    }

    return NextResponse.json({ code: 400, message: '无效的内容类型' }, { status: 400 });
  } catch (error) {
    console.error('创建内容失败:', error);
    return NextResponse.json(
      { code: 500, message: '创建失败' },
      { status: 500 }
    );
  }
}

// 更新内容
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, title, content, category, isPublished, isPinned, sortOrder, adminId, adminUsername } = body;

    if (!id) {
      return NextResponse.json({ code: 400, message: '缺少ID' }, { status: 400 });
    }

    if (type === 'faq') {
      await execSql(`
        UPDATE faqs SET question = '${title?.replace(/'/g, "''")}', answer = '${content?.replace(/'/g, "''")}', category = '${category || ''}', sort_order = ${sortOrder || 0}, updated_at = NOW()
        WHERE id = ${id}
      `);
      await execSql(`
        INSERT INTO admin_operation_logs (admin_id, admin_username, operation_type, operation_content)
        VALUES (${adminId || 0}, '${adminUsername || 'unknown'}', 'content_update', '更新${type} #${id}: ${title || ''}')
      `);
      return NextResponse.json({ code: 200, message: '更新成功' });
    }

    if (type === 'article') {
      await execSql(`
        UPDATE articles SET title = '${title?.replace(/'/g, "''")}', content = '${content?.replace(/'/g, "''")}', category = '${category || ''}', is_published = ${isPublished ? 'TRUE' : 'FALSE'}, is_pinned = ${isPinned ? 'TRUE' : 'FALSE'}, updated_at = NOW()
        WHERE id = '${id}'
      `);
      await execSql(`
        INSERT INTO admin_operation_logs (admin_id, admin_username, operation_type, operation_content)
        VALUES (${adminId || 0}, '${adminUsername || 'unknown'}', 'content_update', '更新${type} #${id}: ${title || ''}')
      `);
      return NextResponse.json({ code: 200, message: '更新成功' });
    }

    if (type === 'announcement') {
      await execSql(`
        UPDATE announcements SET title = '${title?.replace(/'/g, "''")}', content = '${content?.replace(/'/g, "''")}', is_published = ${isPublished ? 'TRUE' : 'FALSE'}, is_pinned = ${isPinned ? 'TRUE' : 'FALSE'}, priority = ${sortOrder || 0}, updated_at = NOW()
        WHERE id = ${id}
      `);
      await execSql(`
        INSERT INTO admin_operation_logs (admin_id, admin_username, operation_type, operation_content)
        VALUES (${adminId || 0}, '${adminUsername || 'unknown'}', 'content_update', '更新${type} #${id}: ${title || ''}')
      `);
      return NextResponse.json({ code: 200, message: '更新成功' });
    }

    return NextResponse.json({ code: 400, message: '无效的内容类型' }, { status: 400 });
  } catch (error) {
    console.error('更新内容失败:', error);
    return NextResponse.json(
      { code: 500, message: '更新失败' },
      { status: 500 }
    );
  }
}

// 删除内容
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json({ code: 400, message: '缺少参数' }, { status: 400 });
    }

    if (type === 'faq') {
      await execSql('DELETE FROM faqs WHERE id = %s', id);
    } else if (type === 'article') {
      await execSql('DELETE FROM articles WHERE id = %L', id);
    } else if (type === 'announcement') {
      await execSql('DELETE FROM announcements WHERE id = %s', id);
    }

    await execSql(`
      INSERT INTO admin_operation_logs (admin_id, admin_username, operation_type, operation_content)
      VALUES (0, 'unknown', 'content_delete', '删除${type} #${id}')
    `);

    return NextResponse.json({
      code: 200,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除内容失败:', error);
    return NextResponse.json(
      { code: 500, message: '删除失败' },
      { status: 500 }
    );
  }
}
