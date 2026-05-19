import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      job_title,
      company,
      location,
      salary_min,
      salary_max,
      responsibilities,
      requirements,
      skills_required,
      industry,
      source_url
    } = body;

    const { data: jd, error } = await supabase
      .from('jd_library')
      .insert({
        job_title,
        company,
        location,
        salary_min,
        salary_max,
        responsibilities,
        requirements,
        skills_required,
        industry,
        source_url,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: jd });
  } catch (error) {
    console.error('提交JD失败:', error);
    return NextResponse.json({ error: '提交失败' }, { status: 500 });
  }
}
