export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 从job_descriptions表获取所有唯一的job_title
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from('job_descriptions')
      .select('job_title')
      .or('is_synthetic.is.null,is_synthetic.eq.false')
      .not('job_title', 'is', null)
      .not('job_title', 'eq', '');

    if (error) {
      console.error('[jobs/list] 查询失败:', error);
      return NextResponse.json({ 
        code: 500, 
        error: '获取岗位列表失败' 
      }, { status: 500 });
    }

    // 提取唯一岗位名称并去重
    const uniqueJobs = [...new Set((data as { job_title: string }[])?.map(j => j.job_title).filter(Boolean) || [])];

    return NextResponse.json({ 
      code: 200, 
      data: uniqueJobs 
    });
  } catch (err) {
    console.error('[jobs/list] 异常:', err);
    return NextResponse.json({ 
      code: 500, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}
