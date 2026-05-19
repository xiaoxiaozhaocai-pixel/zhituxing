import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
    // 测试数据库连接
    const { error } = await supabase
      .from('job_descriptions')
      .select('id')
      .limit(1);
    
    const database = error ? 'disconnected' : 'connected';
    
    return NextResponse.json({
      status: 'ok',
      database,
      timestamp: new Date().toISOString(),
      version: '2833971'
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      database: 'error',
      timestamp: new Date().toISOString(),
      version: '2833971',
      error: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}
