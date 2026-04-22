import { NextRequest, NextResponse } from 'next/server';

// 管理员登出
export async function POST(request: NextRequest) {
  // 清除token即可（前端处理）
  return NextResponse.json({
    code: 200,
    message: '登出成功'
  });
}
