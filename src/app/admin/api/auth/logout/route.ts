import { NextRequest, NextResponse } from 'next/server';

// 管理员登出
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ code: 200, message: '已退出登录' });
  
  // 清除 httpOnly cookie
  response.cookies.set('admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  
  return response;
}
