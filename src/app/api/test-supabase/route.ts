import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    // 测试1：检查环境变量
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !hasKey) {
      return NextResponse.json({
        status: 'error',
        message: '环境变量缺失',
        env: {
          NEXT_PUBLIC_SUPABASE_URL: url || '未设置',
          SUPABASE_SERVICE_ROLE_KEY: hasKey ? '已设置' : '未设置',
        }
      });
    }

    // 测试2：查询users表
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, phone, created_at')
      .limit(3);

    // 测试3：查询user_profiles表
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, user_id, major, grade')
      .limit(3);

    // 测试4：查询jobs表
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('job_descriptions')
      .select('id, job_title, company, city')
      .limit(3);

    return NextResponse.json({
      status: 'ok',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: url,
        SUPABASE_SERVICE_ROLE_KEY: hasKey ? '已设置' : '未设置',
      },
      tables: {
        users: { count: users?.length ?? 0, error: usersError?.message || null, sample: users },
        user_profiles: { count: profiles?.length ?? 0, error: profilesError?.message || null, sample: profiles },
        jobs: { count: jobs?.length ?? 0, error: jobsError?.message || null, sample: jobs?.map(j => ({...j, job_title: j.job_title, company: j.company})) },
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
}
