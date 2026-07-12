import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * P7.2 数据库迁移端点
 * GET /api/employer/job-posts/migrate
 * 创建 employer_job_posts 和 employer_job_matches 表
 */

async function execRawSql(sql: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: text };
    }

    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}

export async function GET() {
  const results: { step: string; success: boolean; error?: string }[] = [];

  // Step 1: Create employer_job_posts table
  const sql1 = `
    CREATE TABLE IF NOT EXISTS employer_job_posts (
      id BIGSERIAL PRIMARY KEY,
      employer_id UUID NOT NULL REFERENCES employer_profiles(id),
      job_title TEXT NOT NULL,
      description TEXT,
      required_hard_skills JSONB DEFAULT '[]',
      required_soft_skills JSONB DEFAULT '[]',
      target_grade TEXT,
      target_major TEXT,
      target_school TEXT,
      target_cities JSONB DEFAULT '[]',
      target_industry TEXT,
      min_completeness INTEGER DEFAULT 0,
      min_assessment INTEGER DEFAULT 0,
      has_internship_required TEXT DEFAULT 'any',
      graduation_year TEXT,
      auto_push BOOLEAN DEFAULT false,
      push_frequency TEXT DEFAULT 'weekly',
      status TEXT DEFAULT 'active' CHECK(status IN ('active','paused','closed')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `.trim();

  const r1 = await execRawSql(sql1);
  results.push({ step: 'create_employer_job_posts', success: r1.success, error: r1.error });

  // Step 2: Create employer_job_matches table
  const sql2 = `
    CREATE TABLE IF NOT EXISTS employer_job_matches (
      id BIGSERIAL PRIMARY KEY,
      job_post_id BIGINT NOT NULL REFERENCES employer_job_posts(id) ON DELETE CASCADE,
      candidate_user_id UUID NOT NULL,
      match_score NUMERIC(5,2) NOT NULL,
      matched_at TIMESTAMPTZ DEFAULT NOW(),
      is_viewed BOOLEAN DEFAULT false,
      is_notified BOOLEAN DEFAULT false,
      notes TEXT,
      UNIQUE(job_post_id, candidate_user_id)
    )
  `.trim();

  const r2 = await execRawSql(sql2);
  results.push({ step: 'create_employer_job_matches', success: r2.success, error: r2.error });

  // Step 3: Create indexes
  const sql3 = `CREATE INDEX IF NOT EXISTS idx_job_posts_employer ON employer_job_posts(employer_id)`;
  const r3 = await execRawSql(sql3);
  results.push({ step: 'idx_job_posts_employer', success: r3.success, error: r3.error });

  const sql4 = `CREATE INDEX IF NOT EXISTS idx_job_matches_post ON employer_job_matches(job_post_id)`;
  const r4 = await execRawSql(sql4);
  results.push({ step: 'idx_job_matches_post', success: r4.success, error: r4.error });

  const sql5 = `CREATE INDEX IF NOT EXISTS idx_job_matches_score ON employer_job_matches(match_score DESC)`;
  const r5 = await execRawSql(sql5);
  results.push({ step: 'idx_job_matches_score', success: r5.success, error: r5.error });

  const allSuccess = results.every(r => r.success);

  return NextResponse.json({
    success: allSuccess,
    results,
    message: allSuccess ? '数据库迁移完成' : '部分迁移步骤失败，请检查日志',
  });
}
