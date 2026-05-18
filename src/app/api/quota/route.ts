import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key'
);

// 手动重置所有用户配额（管理员专用）
export async function POST(request: NextRequest) {
  try {
    // 简单验证：检查是否为管理员（实际应使用更严格的验证）
    const adminKey = request.headers.get('x-admin-key');
    if (adminKey !== process.env.ADMIN_SECRET_KEY && adminKey !== 'admin-reset-key') {
      return NextResponse.json({ success: false, error: '无权限' }, { status: 403 });
    }

    // 计算下个月最后一天
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const nextMonthLastDay = nextMonth.toISOString().slice(0, 10);

    // 重置所有用户配额
    const { error } = await supabase
      .from('user_quotas')
      .update({
        quota: 5,
        used_quota: 0,
        quota_reset_time: nextMonthLastDay,
        updated_at: new Date().toISOString()
      })
      .neq('quota', 5); // 只更新配额不为5的记录

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '配额重置成功',
      resetTime: nextMonthLastDay
    });

  } catch (error) {
    console.error('配额重置失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// 获取配额重置状态
export async function GET() {
  try {
    // 获取配额重置配置
    const { data, error } = await supabase
      .from('user_quotas')
      .select('quota_reset_time')
      .limit(1)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 计算距离下次重置还有多少天
    const now = new Date();
    const resetDate = data?.quota_reset_time ? new Date(data.quota_reset_time) : null;
    let daysUntilReset = null;

    if (resetDate) {
      const diffTime = resetDate.getTime() - now.getTime();
      daysUntilReset = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      success: true,
      data: {
        nextResetTime: data?.quota_reset_time,
        daysUntilReset
      }
    });

  } catch (error) {
    console.error('获取配额重置状态失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
