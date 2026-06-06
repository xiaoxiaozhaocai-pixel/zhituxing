import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';


const supabase = getSupabaseAdmin();

// 获取高校管理员列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取管理员列表，关联 auth.users 获取基本信息
    const { data: admins, error } = await supabase
      .from('university_admins')
      .select(`
        id,
        university_id,
        user_id,
        role,
        created_at,
        user:user_id (email, raw_user_meta_data)
      `)
      .eq('university_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 格式化返回数据
    const formatted = (admins || []).map((admin: Record<string, unknown>) => {
      const userData = admin.user as Record<string, unknown> | null;
      const meta = (userData?.raw_user_meta_data as Record<string, string>) || {};
      return {
        id: admin.id,
        university_id: admin.university_id,
        user_id: admin.user_id,
        role: admin.role,
        email: userData?.email || meta?.email || '未知',
        name: meta?.name || meta?.full_name || meta?.nickname || '',
        created_at: admin.created_at
      };
    });

    return NextResponse.json({
      code: 200,
      data: formatted
    });
  } catch (error) {
    console.error('获取管理员列表失败:', error);
    return NextResponse.json({ code: 500, message: '获取列表失败' }, { status: 500 });
  }
}

// 添加管理员
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { user_id, role } = body;

    if (!user_id) {
      return NextResponse.json({ code: 400, message: '请提供用户ID' }, { status: 400 });
    }

    // 验证用户是否存在
    const { data: userExists } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (!userExists) {
      return NextResponse.json({ code: 404, message: '用户不存在' }, { status: 404 });
    }

    // 检查是否已是管理员
    const { data: existing } = await supabase
      .from('university_admins')
      .select('id')
      .eq('university_id', id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ code: 409, message: '该用户已是该校管理员' }, { status: 409 });
    }

    // 添加管理员
    const { data: admin, error } = await supabase
      .from('university_admins')
      .insert({
        university_id: id,
        user_id,
        role: role || 'admin'
      })
      .select()
      .single();

    if (error) throw error;

    // 更新高校管理员计数
    const { count } = await supabase
      .from('university_admins')
      .select('*', { count: 'exact', head: true })
      .eq('university_id', id);

    await supabase
      .from('universities')
      .update({ admin_count: count || 0 })
      .eq('id', id);

    return NextResponse.json({
      code: 200,
      data: admin,
      message: '管理员添加成功'
    });
  } catch (error) {
    console.error('添加管理员失败:', error);
    return NextResponse.json({ code: 500, message: '添加失败' }, { status: 500 });
  }
}

// 移除管理员
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const adminId = searchParams.get('adminId');

    if (!adminId) {
      return NextResponse.json({ code: 400, message: '缺少管理员记录ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('university_admins')
      .delete()
      .eq('id', adminId)
      .eq('university_id', id);

    if (error) throw error;

    // 更新高校管理员计数
    const { count } = await supabase
      .from('university_admins')
      .select('*', { count: 'exact', head: true })
      .eq('university_id', id);

    await supabase
      .from('universities')
      .update({ admin_count: count || 0 })
      .eq('id', id);

    return NextResponse.json({ code: 200, message: '管理员已移除' });
  } catch (error) {
    console.error('移除管理员失败:', error);
    return NextResponse.json({ code: 500, message: '操作失败' }, { status: 500 });
  }
}
