import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// 版本号 - 用于验证部署是否成功
const VERSION = '2833971';

export async function GET() {
  try {
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
      timestamp: new Date().toISOString(),
      version: VERSION
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      database: 'error',
      timestamp: new Date().toISOString(),
      version: VERSION,
      error: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}
