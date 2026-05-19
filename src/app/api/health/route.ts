import { NextResponse } from 'next/server';

// 版本号 - 用于验证部署是否成功
const VERSION = '2833971';

export async function GET() {
  // 基础响应
  const baseResponse = {
    timestamp: new Date().toISOString(),
    version: VERSION
  };
  
  try {
    // 动态导入 Supabase，避免构建时错误
    const { getSupabaseAdmin } = await import('@/lib/supabase');
    const supabase = getSupabaseAdmin();
    
    // 测试数据库连接
    let database = 'connected';
    try {
      const { error } = await supabase
        .from('job_descriptions')
        .select('id')
        .limit(1);
      if (error) {
        database = 'disconnected';
      }
    } catch {
      database = 'error';
    }
    
    return NextResponse.json({
      status: 'ok',
      database,
      ...baseResponse
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      database: 'error',
      ...baseResponse,
      error: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}
