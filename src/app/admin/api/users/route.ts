import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

// 获取用户列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const keyword = searchParams.get('keyword');
    const memberType = searchParams.get('memberType');
    const filterBlocked = searchParams.get('blocked');
    const offset = (page - 1) * pageSize;

    // 构建查询
    let query = supabase
      .from('users')
      .select('id, nickname, email, created_at, last_sign_in_at, member_type, member_expire_time, is_lifetime_member, interview_quota, assessment_quota, is_blocked, blocked_reason, blocked_at', { count: 'exact' });

    // 关键词搜索
    if (keyword) {
      query = query.or(`nickname.ilike.%${keyword}%,email.ilike.%${keyword}%`);
    }

    // 会员类型筛选
    if (memberType === 'member') {
      query = query.or('member_type.is.not.null,is_lifetime_member.eq.true');
    } else if (memberType === 'normal') {
      query = query.is('member_type', null).eq('is_lifetime_member', false);
    }

    // 拉黑状态筛选
    if (filterBlocked === 'true') {
      query = query.eq('is_blocked', true);
    } else if (filterBlocked === 'false') {
      query = query.or('is_blocked.is.null,is_blocked.eq.false');
    }

    // 获取列表
    const { data: users, count: total, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    // 获取统计数据
    const { count: blockedCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_blocked', true);

    const { count: normalCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .or('is_blocked.is.null,is_blocked.eq.false');

    // 获取每个用户的上传JD数量
    const usersWithStats = await Promise.all(
      (users || []).map(async (user) => {
        const { count } = await supabase
          .from('jd_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        return {
          ...user,
          username: user.nickname || '未设置',
          last_login_time: user.last_sign_in_at,
          jd_count: count || 0
        };
      })
    );

    return NextResponse.json({
      code: 200,
      data: {
        list: usersWithStats,
        stats: {
          total: total || 0,
          blocked: blockedCount || 0,
          normal: normalCount || 0
        },
        pagination: { page, pageSize, total: total || 0 }
      }
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json({ code: 500, message: '获取列表失败' }, { status: 500 });
  }
}

// 开通/取消会员 / 拉黑/取消拉黑
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, memberType, adminId, adminUsername, blockReason, deleteUserJd } = body;

    if (!userId || !action) {
      return NextResponse.json({ code: 400, message: '参数不完整' }, { status: 400 });
    }

    let message = '';

    if (action === 'open') {
      // 开通会员
      if (memberType === 'lifetime') {
        const { error } = await supabase
          .from('users')
          .update({
            is_lifetime_member: true,
            member_type: 'lifetime',
            member_expire_time: '2099-12-31 23:59:59'
          })
          .eq('id', userId);
        if (error) throw error;
        message = '终身会员开通成功';
      } else {
        const expireTime = new Date();
        expireTime.setMonth(expireTime.getMonth() + 1);
        const { error } = await supabase
          .from('users')
          .update({
            member_type: 'monthly',
            member_expire_time: expireTime.toISOString()
          })
          .eq('id', userId);
        if (error) throw error;
        message = '月度会员开通成功';
      }
    } else if (action === 'cancel') {
      // 取消会员
      const { error } = await supabase
        .from('users')
        .update({
          is_lifetime_member: false,
          member_type: null,
          member_expire_time: null
        })
        .eq('id', userId);
      if (error) throw error;
      message = '会员已取消';
    } else if (action === 'block') {
      // 拉黑用户
      if (deleteUserJd === true) {
        // 先将用户上传的JD放入回收站再删除
        const { data: userJds } = await supabase
          .from('jd_submissions')
          .select('*')
          .eq('user_id', userId);

        for (const jd of userJds || []) {
          await supabase.from('recycle_bin').insert({
            original_table: 'jd_submissions',
            original_id: jd.id,
            deleted_data: JSON.stringify(jd),
            deleted_by: adminUsername || 'system'
          });
        }
        // 删除用户上传的JD
        await supabase.from('jd_submissions').delete().eq('user_id', userId);
      }

      const { error } = await supabase
        .from('users')
        .update({
          is_blocked: true,
          blocked_reason: blockReason || '违规操作',
          blocked_at: new Date().toISOString()
        })
        .eq('id', userId);
      if (error) throw error;
      message = `用户已被拉黑${deleteUserJd ? '，已删除该用户上传的所有JD' : ''}`;
    } else if (action === 'unblock') {
      // 取消拉黑
      const { error } = await supabase
        .from('users')
        .update({
          is_blocked: false,
          blocked_reason: null,
          blocked_at: null
        })
        .eq('id', userId);
      if (error) throw error;
      message = '用户已取消拉黑';
    }

    // 记录操作日志
    await supabase.from('admin_operation_logs').insert({
      admin_id: adminId || 0,
      admin_username: adminUsername || 'unknown',
      operation_type: ['block', 'unblock'].includes(action) ? 'user_block' : 'member_manage',
      operation_content: `${message}: 用户 #${userId}`
    });

    return NextResponse.json({
      code: 200,
      message
    });
  } catch (error) {
    console.error('操作失败:', error);
    return NextResponse.json({ code: 500, message: '操作失败' }, { status: 500 });
  }
}
