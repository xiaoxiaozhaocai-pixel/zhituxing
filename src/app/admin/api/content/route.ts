import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';

const supabase = getSupabaseAdmin();

// 获取内容列表（支持文章、公告、FAQ）
export async function GET(request: NextRequest) {
  const _authCheck = requireAdmin(request);
  if (_authCheck) return _authCheck;
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
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    const total = count || 0;

    // 获取列表
    let query = supabase.from(table).select('*');
    
    if (type === 'faq') {
      query = query.order('sort_order', { ascending: true, nullsFirst: false });
    } else {
      query = query.order('is_pinned', { ascending: false, nullsFirst: false });
    }
    
    const { data: list } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    // 根据类型转换字段名
    const transformedList = (list || []).map(item => {
      if (type === 'faq') {
        return {
          id: item.id,
          title: item.question,
          content: item.answer,
          category: item.category,
          sort_order: item.sort_order,
          is_published: item.is_published,
          created_at: item.created_at,
          updated_at: item.updated_at
        };
      } else if (type === 'announcement') {
        return {
          id: item.id,
          title: item.title,
          content: item.content,
          category: item.category,
          sort_order: item.priority,
          is_published: item.is_published,
          is_pinned: item.is_pinned,
          created_at: item.created_at,
          updated_at: item.updated_at
        };
      }
      return item;
    });

    return NextResponse.json({
      code: 200,
      data: {
        list: transformedList,
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
  const _authCheck = requireAdmin(request);
  if (_authCheck) return _authCheck;
  try {
    const body = await request.json();
    const { type, title, content, category, isPublished, isPinned, sortOrder, adminId, adminUsername } = body;

    let insertData: Record<string, unknown> = {};
    let table = '';

    if (type === 'faq') {
      table = 'faqs';
      insertData = {
        question: title,
        answer: content,
        category: category || '',
        sort_order: sortOrder || 0,
        is_published: isPublished || false
      };
    } else if (type === 'article') {
      table = 'articles';
      insertData = {
        title,
        content,
        category: category || '',
        is_published: isPublished || false,
        is_pinned: isPinned || false
      };
    } else if (type === 'announcement') {
      table = 'announcements';
      insertData = {
        title,
        content,
        category: category || '',
        is_published: isPublished || false,
        is_pinned: isPinned || false,
        priority: sortOrder || 0
      };
    } else {
      return NextResponse.json({ code: 400, message: '无效的内容类型' }, { status: 400 });
    }

    const { data: result, error } = await supabase
      .from(table)
      .insert(insertData)
      .select('id')
      .single();

    if (error) throw error;

    // 记录操作日志
    await supabase.from('admin_operation_logs').insert({
      admin_id: adminId || 0,
      admin_username: adminUsername || 'unknown',
      operation_type: 'content_create',
      operation_content: `创建${type}: ${title}`
    });

    return NextResponse.json({ code: 200, message: '创建成功', data: { id: result?.id } });
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
  const _authCheck = requireAdmin(request);
  if (_authCheck) return _authCheck;
  try {
    const body = await request.json();
    const { type, id, title, content, category, isPublished, isPinned, sortOrder, adminId, adminUsername } = body;

    if (!id) {
      return NextResponse.json({ code: 400, message: '缺少ID' }, { status: 400 });
    }

    let updateData: Record<string, unknown> = {};
    let table = '';

    if (type === 'faq') {
      table = 'faqs';
      updateData = {
        question: title,
        answer: content,
        category: category || '',
        sort_order: sortOrder || 0
      };
    } else if (type === 'article') {
      table = 'articles';
      updateData = {
        title,
        content,
        category: category || '',
        is_published: isPublished || false,
        is_pinned: isPinned || false
      };
    } else if (type === 'announcement') {
      table = 'announcements';
      updateData = {
        title,
        content,
        is_published: isPublished || false,
        is_pinned: isPinned || false,
        priority: sortOrder || 0
      };
    } else {
      return NextResponse.json({ code: 400, message: '无效的内容类型' }, { status: 400 });
    }

    const { error } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    // 记录操作日志
    await supabase.from('admin_operation_logs').insert({
      admin_id: adminId || 0,
      admin_username: adminUsername || 'unknown',
      operation_type: 'content_update',
      operation_content: `更新${type} #${id}: ${title || ''}`
    });

    return NextResponse.json({ code: 200, message: '更新成功' });
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
  const _authCheck = requireAdmin(request);
  if (_authCheck) return _authCheck;
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json({ code: 400, message: '缺少参数' }, { status: 400 });
    }

    let table = '';
    if (type === 'faq') table = 'faqs';
    else if (type === 'article') table = 'articles';
    else if (type === 'announcement') table = 'announcements';

    if (table) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    }

    // 记录操作日志
    await supabase.from('admin_operation_logs').insert({
      admin_id: 0,
      admin_username: 'unknown',
      operation_type: 'content_delete',
      operation_content: `删除${type} #${id}`
    });

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
