export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

// 简化健康检查 - 不暴露敏感信息
export async function GET(request: NextRequest) {
  // 检查是否是内部调用（通过 header 判断）
  const isInternal = request.headers.get('x-internal-check') === 'true';
  
  if (isInternal) {
    // 内部调用返回完整信息
    try {
      const { getSupabaseAdmin } = await import('@/lib/supabase');
      const supabase = getSupabaseAdmin();
      const { error } = await supabase
        .from('job_descriptions')
        .select('id')
        .limit(1);
      
      return NextResponse.json({
        status: 'ok',
        database: error ? 'disconnected' : 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      return NextResponse.json({
        status: 'error',
        database: 'error',
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  // 外部调用仅返回状态
  return NextResponse.json({ status: 'ok' });
}
