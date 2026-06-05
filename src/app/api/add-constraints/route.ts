import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 直接调用 Supabase REST API
async function supabaseRpc(sql: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  return res.json();
}

// 直接执行 SQL（通过 Supabase 的 SQL endpoint）
async function executeSql(sql: string) {
  // Supabase 提供了一个 SQL 执行端点
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      query: sql,
    }),
  });
  return res;
}

export async function GET() {
  try {
    // 方案1：创建约束函数并调用
    const createFunctionSql = `
      CREATE OR REPLACE FUNCTION add_skills_constraints_v2()
      RETURNS TEXT
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        ALTER TABLE job_descriptions DROP CONSTRAINT IF EXISTS hard_skills_array_check;
        ALTER TABLE job_descriptions DROP CONSTRAINT IF EXISTS soft_skills_array_check;
        ALTER TABLE job_descriptions ADD CONSTRAINT hard_skills_array_check 
          CHECK (hard_skills IS NULL OR jsonb_typeof(hard_skills) = 'array');
        ALTER TABLE job_descriptions ADD CONSTRAINT soft_skills_array_check 
          CHECK (soft_skills IS NULL OR jsonb_typeof(soft_skills) = 'array');
        RETURN 'OK';
      END;
      $$;
    `;

    // 由于 REST API 不支持直接执行 DDL，我们返回需要手动执行的 SQL
    return NextResponse.json({
      success: false,
      message: 'Supabase REST API 不支持直接执行 DDL',
      supabaseUrl: SUPABASE_URL,
      instructions: {
        step1: '打开 Supabase Dashboard SQL Editor',
        step2: '执行以下 SQL',
        sql: `
-- 1. 删除旧约束
ALTER TABLE job_descriptions DROP CONSTRAINT IF EXISTS hard_skills_array_check;
ALTER TABLE job_descriptions DROP CONSTRAINT IF EXISTS soft_skills_array_check;

-- 2. 添加新约束
ALTER TABLE job_descriptions ADD CONSTRAINT hard_skills_array_check 
  CHECK (hard_skills IS NULL OR jsonb_typeof(hard_skills) = 'array');
ALTER TABLE job_descriptions ADD CONSTRAINT soft_skills_array_check 
  CHECK (soft_skills IS NULL OR jsonb_typeof(soft_skills) = 'array');

-- 3. 验证约束
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'job_descriptions'::regclass 
AND conname LIKE '%skills_array%';

-- 4. 测试约束（应该失败）
INSERT INTO job_descriptions (job_title, hard_skills, industry) 
VALUES ('__test__', '"string_not_array"', 'test');
        `.trim(),
      },
    });
  } catch (error: unknown) {
    const _error_ = error as Error;
    return NextResponse.json({
      success: false,
      error: _error_.message,
    }, { status: 500 });
  }
}
