import { NextResponse } from 'next/server';

// 登出
export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: '登出成功'
  });

  // 清除cookie
  response.cookies.delete('session_token');
  response.cookies.delete('user_id');

  return response;
}
