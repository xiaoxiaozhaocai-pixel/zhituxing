import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // 获取所有行业及其JD数量
    const { data, error } = await supabaseAdmin
      .from('job_descriptions')
      .select('industry');
    
    if (error) {
      console.error('获取行业列表失败:', error);
      return NextResponse.json({ error: '获取失败' }, { status: 500 });
    }
    
    // 统计每个行业的数量
    const industryCount: Record<string, number> = {};
    for (const row of data || []) {
      const industry = row.industry || '其他';
      industryCount[industry] = (industryCount[industry] || 0) + 1;
    }
    
    // 转换为数组并按数量降序排序
    const result = Object.entries(industryCount)
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count);
    
    return NextResponse.json({
      success: true,
      data: result,
      total: result.length
    });
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
