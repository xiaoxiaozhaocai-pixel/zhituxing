import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * 添加 skills 数组约束的 API
 * GET: 检查约束是否存在
 * POST: 添加约束
 */

// Supabase REST API 配置
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function executeSql(sql: string): Promise<{ data?: unknown; error?: string }> {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return { error: 'Missing Supabase credentials' };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { error: `HTTP ${response.status}: ${text}` };
    }

    const data = await response.json();
    return { data };
  } catch (e: unknown) {
    const _e_ = e as Error;
    return { error: _e_.message };
  }
}

// 直接使用 PostgreSQL 连接执行 DDL
async function runDdl(sql: string): Promise<{ success: boolean; error?: string }> {
  // 通过 Supabase 的 pg_net 扩展执行原生 SQL
  // 或者使用 edge-runtime 的 Database API
  // 这里我们使用一个变通方法：通过 REST API 的 sql endpoint
  
  const pgUrl = `${SUPABASE_URL}/pg/query`;
  
  try {
    const response = await fetch(pgUrl, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY!,
        'Authorization': `Bearer ${SERVICE_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    const text = await response.text();
    return { success: response.ok, error: response.ok ? undefined : text };
  } catch (e: unknown) {
    const _e_ = e as Error;
    return { success: false, error: _e_.message };
  }
}

export async function GET() {
  // 检查约束是否存在
  const checkSql = `
    SELECT conname, pg_get_constraintdef(oid) as definition 
    FROM pg_constraint 
    WHERE conrelid = 'job_descriptions'::regclass 
    AND conname LIKE '%skills_array%';
  `;
  
  // 尝试通过 REST API 查询
  try {
    // 使用 pg_catalog 查询
    const response = await fetch(`${SUPABASE_URL}/rest/v1/pg_constraint?select=conname,pg_get_constraintdef:pg_get_constraintdef(oid)&conrelid=eq.job_descriptions&contype=eq.c`, {
      headers: {
        'apikey': SERVICE_KEY!,
        'Authorization': `Bearer ${SERVICE_KEY!}`,
      },
    });
    
    const data = await response.json();
    return NextResponse.json({
      method: 'check_constraints',
      result: data,
      supabaseUrl: SUPABASE_URL ? 'configured' : 'missing',
    });
  } catch (e: unknown) {
    const _e_ = e as Error;
    return NextResponse.json({
      error: 'Failed to check constraints',
      details: _e_.message,
    });
  }
}

export async function POST() {
  const results: string[] = [];
  
  // 约束 SQL
  const constraints = [
    {
      name: 'hard_skills_array_check',
      sql: `ALTER TABLE job_descriptions ADD CONSTRAINT hard_skills_array_check CHECK (hard_skills IS NULL OR jsonb_typeof(hard_skills) = 'array')`,
    },
    {
      name: 'soft_skills_array_check', 
      sql: `ALTER TABLE job_descriptions ADD CONSTRAINT soft_skills_array_check CHECK (soft_skills IS NULL OR jsonb_typeof(soft_skills) = 'array')`,
    },
  ];
  
  // 尝试通过 Supabase SQL API 执行
  // 注意：需要先启用 pg_net 扩展或使用 dashboard
  
  // 变通方案：返回 SQL 让用户手动执行
  return NextResponse.json({
    message: 'DDL statements cannot be executed via REST API directly',
    instructions: 'Please execute the following SQL in Supabase Dashboard SQL Editor:',
    sql_statements: [
      '-- 检查约束是否存在',
      "SELECT conname FROM pg_constraint WHERE conrelid = 'job_descriptions'::regclass AND conname LIKE '%skills_array%';",
      '',
      '-- 如果不存在，添加约束',
      constraints[0]!.sql + ';',
      constraints[1]!.sql + ';',
      '',
      '-- 验证约束',
      "INSERT INTO job_descriptions (job_title, hard_skills, industry) VALUES ('test', '\"string_not_array\"', 'test');",
      '-- 应该报错: new row for relation "job_descriptions" violates check constraint "hard_skills_array_check"',
    ],
    supabase_dashboard_url: `${SUPABASE_URL?.replace('.supabase.co', '')}/project/_/sql`,
  });
}
