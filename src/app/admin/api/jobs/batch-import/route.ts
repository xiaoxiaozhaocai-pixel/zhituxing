import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// 获取Supabase客户端
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
  return createClient(supabaseUrl, supabaseKey);
}

// 简单的管理员验证
async function verifyAdmin(request: NextRequest) {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_token')?.value;
  const expectedToken = process.env.ADMIN_TOKEN || 'admin_token_for_zhituxing';
  return adminToken === expectedToken;
}

// 批量导入JD
export async function POST(request: NextRequest) {
  try {
    // 验证管理员
    if (!await verifyAdmin(request)) {
      return NextResponse.json({ code: 401, message: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { jobs, duplicateOption } = body;

    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json({ code: 400, message: '没有可导入的数据' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const result = {
      successCount: 0,
      failedCount: 0,
      errors: [] as { rowIndex: number; error: string }[]
    };

    // 批量插入数据
    const jobsToInsert = jobs.map((job: any, index: number) => ({
      job_name: job.job_name,
      company_name: job.company_name,
      city: job.city,
      salary_range: job.salary_range || null,
      industry: job.industry || null,
      company_type: job.company_type || null,
      job_description: job.job_description || null,
      is_fresh_friendly: job.is_fresh_friendly ?? 1,
      source: job.source || '管理员批量导入',
      status: 'approved',
      created_at: new Date().toISOString()
    }));

    // 根据duplicateOption处理重复数据
    if (duplicateOption === 'overwrite') {
      // 先删除重复数据，再插入
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        try {
          // 检查是否存在
          const { data: existing } = await supabase
            .from('jobs')
            .select('id')
            .eq('job_name', job.job_name)
            .eq('company_name', job.company_name)
            .eq('city', job.city)
            .single();

          if (existing) {
            // 删除现有数据
            await supabase.from('jobs').delete().eq('id', existing.id);
          }
        } catch (e) {
          // 继续处理
        }
      }
    }

    // 批量插入
    const { data, error } = await supabase
      .from('jobs')
      .insert(jobsToInsert)
      .select();

    if (error) {
      console.error('批量导入失败:', error);
      result.failedCount = jobs.length;
      result.errors.push({ rowIndex: -1, error: error.message });
      
      return NextResponse.json({
        code: 200,
        message: `导入完成，成功${result.successCount}条，失败${result.failedCount}条`,
        data: result
      });
    }

    result.successCount = data?.length || jobs.length;

    // 记录操作日志
    try {
      const cookieStore = await cookies();
      const adminUsername = cookieStore.get('admin_username')?.value || 'unknown';
      
      await supabase.from('admin_operation_logs').insert({
        admin_username: adminUsername,
        operation_type: 'batch_import',
        operation_content: `批量导入${result.successCount}条JD`
      });
    } catch (e) {
      console.error('记录日志失败:', e);
    }

    return NextResponse.json({
      code: 200,
      message: `导入成功，共${result.successCount}条`,
      data: result
    });

  } catch (error: any) {
    console.error('批量导入出错:', error);
    return NextResponse.json({
      code: 500,
      message: `导入失败: ${error.message}`
    }, { status: 500 });
  }
}
