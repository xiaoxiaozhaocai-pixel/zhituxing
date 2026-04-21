import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';
import { checkAndResetQuota, isMember } from '@/lib/quota';

// 获取当前用户
export async function GET(request: NextRequest) {
  try {
    // 从请求头获取用户ID
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    // 查询用户信息
    const result = await execSql(
      `SELECT id, phone, nickname, avatar_url, created_at, 
              monthly_quota, quota_reset_time, member_type, member_expire_time
       FROM users WHERE id = '${userId}' LIMIT 1`
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    const user = result[0] as {
      id: string;
      phone: string;
      nickname: string;
      avatar_url: string | null;
      created_at: string;
      monthly_quota: number;
      quota_reset_time: string;
      member_type: string;
      member_expire_time: string | null;
    };

    // 检查并重置配额
    await checkAndResetQuota(userId);
    
    // 重新获取配额信息
    const updatedResult = await execSql(
      `SELECT monthly_quota, quota_reset_time FROM users WHERE id = '${userId}' LIMIT 1`
    );
    
    if (updatedResult && updatedResult.length > 0) {
      user.monthly_quota = (updatedResult[0] as { monthly_quota: number }).monthly_quota;
      user.quota_reset_time = (updatedResult[0] as { quota_reset_time: string }).quota_reset_time;
    }
    
    // 计算是否为会员
    const isVip = await isMember(userId);
    
    // 格式化响应
    const userInfo = {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
      quota: {
        remaining: isVip ? -1 : user.monthly_quota, // -1表示会员无限次
        reset_time: user.quota_reset_time,
        is_member: isVip,
        member_type: user.member_type,
        member_expire_time: user.member_expire_time
      }
    };

    return NextResponse.json({
      success: true,
      user: userInfo
    });

  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
