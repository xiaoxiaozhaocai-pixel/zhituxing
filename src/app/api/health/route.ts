export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

// 版本号 - 用于验证部署是否成功
export const VERSION = '2833971';

export async function GET() {
  // 基础响应（始终包含 version）
  const response: Record<string, any> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: VERSION,
    database: 'unknown'
  };
  
  try {
    // 动态导入 Supabase
    const { getSupabaseAdmin } = await import('@/lib/supabase');
    const supabase = getSupabaseAdmin();
    
    // 测试数据库连接
    const { error } = await supabase
      .from('job_descriptions')
      .select('id')
      .limit(1);
    
    response.database = error ? 'disconnected' : 'connected';
    
    if (error) {
      response.dbError = error.message || String(error);
    }
  } catch (err: any) {
    response.database = 'error';
    response.error = err?.message || String(err);
  }
  
  return NextResponse.json(response);
}
