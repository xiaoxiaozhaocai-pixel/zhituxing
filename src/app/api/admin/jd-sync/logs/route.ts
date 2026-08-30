import { NextRequest, NextResponse } from 'next/server';
import { getSyncLogs } from '@/lib/jd-sync-service';
export const dynamic = 'force-dynamic';

// 获取同步日志列表
export async function GET(request: NextRequest) {
  // Admin 鉴权
  const adminToken = request.headers.get('x-admin-token') || 
                     request.headers.get('Authorization')?.replace('Bearer ', '');
  if (adminToken !== process.env.ADMIN_SECRET_KEY && adminToken !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ code: 401, message: '未授权访问' }, { status: 401 });
  }
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    const result = await getSyncLogs(pageSize, offset);

    return NextResponse.json({
      code: 200,
      data: {
        list: result.list,
        pagination: {
          page,
          pageSize,
          total: result.total
        }
      }
    });
  } catch (error) {
    console.error('获取同步日志失败:', error);
    return NextResponse.json({
      code: 500,
      message: '获取日志失败'
    }, { status: 500 });
  }
}
