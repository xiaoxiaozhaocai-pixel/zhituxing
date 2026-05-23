export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

export const runtime = 'edge';

// 管理员权限校验
async function checkAdmin(request: NextRequest): Promise<number | null> {
  const userId = parseInt(request.headers.get('x-user-id') || '0');
  if (!userId) return null;
  const rows = await execSql(
    `SELECT is_admin FROM user_profiles WHERE user_id = '${userId}'`
  ) as Record<string, unknown>[];
  if (!rows?.length || !rows[0].is_admin) return null;
  return userId;
}

// 索引定义
const INDEXES = [
  {
    name: 'idx_job_descriptions_industry',
    sql: 'CREATE INDEX IF NOT EXISTS idx_job_descriptions_industry ON job_descriptions(industry);',
    table: 'job_descriptions',
    column: 'industry',
  },
  {
    name: 'idx_job_descriptions_created_at',
    sql: 'CREATE INDEX IF NOT EXISTS idx_job_descriptions_created_at ON job_descriptions(created_at DESC);',
    table: 'job_descriptions',
    column: 'created_at DESC',
  },
  {
    name: 'idx_assessment_results_user_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_assessment_results_user_id ON assessment_results(user_id);',
    table: 'assessment_results',
    column: 'user_id',
  },
  {
    name: 'idx_career_plans_user_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_career_plans_user_id ON career_plans(user_id);',
    table: 'career_plans',
    column: 'user_id',
  },
  {
    name: 'idx_interview_results_user_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_interview_results_user_id ON interview_results(user_id);',
    table: 'interview_results',
    column: 'user_id',
  },
  {
    name: 'idx_user_profiles_user_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);',
    table: 'user_profiles',
    column: 'user_id',
  },
];

// POST /api/admin/migrate — 创建数据库索引
export async function POST(request: NextRequest) {
  const adminId = await checkAdmin(request);
  if (!adminId) {
    return NextResponse.json({ error: '接口不存在' }, { status: 404 });
  }

  const results: Array<{
    name: string;
    table: string;
    column: string;
    status: 'success' | 'error';
    message?: string;
  }> = [];

  for (const index of INDEXES) {
    try {
      await execSql(index.sql);
      results.push({
        name: index.name,
        table: index.table,
        column: index.column,
        status: 'success',
        message: '索引创建成功',
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      results.push({
        name: index.name,
        table: index.table,
        column: index.column,
        status: 'error',
        message: errorMsg,
      });
    }
  }

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return NextResponse.json({
    success: true,
    summary: {
      total: INDEXES.length,
      success: successCount,
      error: errorCount,
    },
    indexes: results,
  });
}

// GET /api/admin/migrate — 查看索引状态（不执行创建）
export async function GET(request: NextRequest) {
  const adminId = await checkAdmin(request);
  if (!adminId) {
    return NextResponse.json({ error: '接口不存在' }, { status: 404 });
  }

  // 查询现有索引
  try {
    const existingIndexes = await execSql(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE indexname IN ('idx_job_descriptions_industry', 'idx_job_descriptions_created_at', 'idx_assessment_results_user_id', 'idx_career_plans_user_id', 'idx_interview_results_user_id', 'idx_user_profiles_user_id')
    `) as Array<{ indexname: string; tablename: string }>;

    const existingSet = new Set(existingIndexes?.map(r => r.indexname) || []);

    const status = INDEXES.map(idx => ({
      name: idx.name,
      table: idx.table,
      column: idx.column,
      exists: existingSet.has(idx.name),
    }));

    return NextResponse.json({
      success: true,
      indexes: status,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
