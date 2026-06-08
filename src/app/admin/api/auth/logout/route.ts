import { NextRequest, NextResponse } from 'next/server';

// 管理员登出
export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ code: 200, message: '已退出登录' });
  
  // 清除 httpOnly cookie
  response.cookies.set('admin_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  
  return response;
}
