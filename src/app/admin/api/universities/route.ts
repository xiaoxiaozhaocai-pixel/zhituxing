import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

// 高校列表（搜索+分页）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const keyword = searchParams.get('keyword');
    const status = searchParams.get('status');
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('universities')
      .select('*', { count: 'exact' });

    if (keyword) {
      query = query.ilike('name', `%${keyword}%`);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: list, count: total, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    return NextResponse.json({
      code: 200,
      data: {
        list: list || [],
        pagination: { page, pageSize, total: total || 0 }
      }
    });
  } catch (error) {
    console.error('获取高校列表失败:', error);
    return NextResponse.json({ code: 500, message: '获取列表失败' }, { status: 500 });
  }
}

// 创建高校
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, domain, logo_url, status, plan } = body;

    if (!name || !domain) {
      return NextResponse.json({ code: 400, message: '名称和域名不能为空' }, { status: 400 });
    }

    // 检查域名是否已存在
    const { data: existing } = await supabase
      .from('universities')
      .select('id')
      .eq('domain', domain)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ code: 409, message: '该域名已被占用' }, { status: 409 });
    }

    const { data: university, error } = await supabase
      .from('universities')
      .insert({
        name,
        domain,
        logo_url: logo_url || null,
        status: status || 'trial',
        plan: plan || 'free',
        student_count: 0,
        admin_count: 0
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      code: 200,
      data: university,
      message: '高校创建成功'
    });
  } catch (error) {
    console.error('创建高校失败:', error);
    return NextResponse.json({ code: 500, message: '创建失败' }, { status: 500 });
  }
}

// 更新高校
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, domain, logo_url, status, plan } = body;

    if (!id) {
      return NextResponse.json({ code: 400, message: '缺少高校ID' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (domain !== undefined) updateData.domain = domain;
    if (logo_url !== undefined) updateData.logo_url = logo_url;
    if (status !== undefined) updateData.status = status;
    if (plan !== undefined) updateData.plan = plan;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ code: 400, message: '没有需要更新的字段' }, { status: 400 });
    }

    // 如果更新域名，检查是否冲突
    if (domain) {
      const { data: conflict } = await supabase
        .from('universities')
        .select('id')
        .eq('domain', domain)
        .neq('id', id)
        .maybeSingle();

      if (conflict) {
        return NextResponse.json({ code: 409, message: '该域名已被占用' }, { status: 409 });
      }
    }

    const { data: university, error } = await supabase
      .from('universities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      code: 200,
      data: university,
      message: '更新成功'
    });
  } catch (error) {
    console.error('更新高校失败:', error);
    return NextResponse.json({ code: 500, message: '更新失败' }, { status: 500 });
  }
}

// 软删除高校（设置status=inactive）
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ code: 400, message: '缺少高校ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('universities')
      .update({ status: 'inactive' })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ code: 200, message: '已停用该高校' });
  } catch (error) {
    console.error('停用高校失败:', error);
    return NextResponse.json({ code: 500, message: '操作失败' }, { status: 500 });
  }
}
