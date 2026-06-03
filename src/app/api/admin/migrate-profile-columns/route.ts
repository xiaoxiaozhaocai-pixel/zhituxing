import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * 管理员API：为 user_profiles 表添加缺失的列
 * 
 * 添加的列：
 * - awards JSONB DEFAULT '[]'
 * - internship_experience JSONB DEFAULT '[]'
 * - project_experience JSONB DEFAULT '[]'
 * - graduation_year VARCHAR(20)
 */
export async function POST(request: NextRequest) {
  try {
    // 简单的管理员验证（通过 header 或 query）
    const authHeader = request.headers.get('x-admin-key');
    const url = new URL(request.url);
    const adminKey = url.searchParams.get('key');
    
    // 验证管理员权限（使用环境变量或固定密钥）
    const expectedKey = process.env.ADMIN_MIGRATE_KEY || 'migrate-profile-2024';
    if (authHeader !== expectedKey && adminKey !== expectedKey) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    // 动态导入 Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const results: { column: string; status: string; error?: string }[] = [];

    // 执行 ALTER TABLE 添加列
    const migrations = [
      {
        column: 'awards',
        sql: `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS awards JSONB DEFAULT '[]'::jsonb;`
      },
      {
        column: 'internship_experience',
        sql: `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS internship_experience JSONB DEFAULT '[]'::jsonb;`
      },
      {
        column: 'project_experience',
        sql: `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS project_experience JSONB DEFAULT '[]'::jsonb;`
      },
      {
        column: 'graduation_year',
        sql: `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS graduation_year VARCHAR(20);`
      }
    ];

    for (const migration of migrations) {
      try {
        // 使用 rpc 执行原始 SQL
        const { error } = await supabase.rpc('exec_sql', { sql: migration.sql });
        
        if (error) {
          // 如果 rpc 不存在，尝试直接用 REST API
          console.log(`[migrate] RPC failed for ${migration.column}, trying alternative...`);
          
          // 检查列是否已存在
          const checkSql = `SELECT column_name FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='${migration.column}';`;
          const { data: existingColumns, error: checkError } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'user_profiles')
            .eq('column_name', migration.column);
          
          if (checkError) {
            results.push({ 
              column: migration.column, 
              status: 'check_failed', 
              error: checkError.message 
            });
          } else if (existingColumns && existingColumns.length > 0) {
            results.push({ column: migration.column, status: 'already_exists' });
          } else {
            // 列不存在，但无法直接执行 DDL
            results.push({ 
              column: migration.column, 
              status: 'needs_manual_migration',
              error: 'Supabase REST API 不支持 DDL，请在 Supabase Dashboard 执行 SQL'
            });
          }
        } else {
          results.push({ column: migration.column, status: 'success' });
        }
      } catch (err) {
        results.push({ 
          column: migration.column, 
          status: 'error', 
          error: err instanceof Error ? err.message : 'Unknown error' 
        });
      }
    }

    // 验证列是否添加成功
    const { data: columns, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'user_profiles')
      .in('column_name', ['awards', 'internship_experience', 'project_experience', 'graduation_year']);

    return NextResponse.json({
      success: true,
      message: '迁移执行完成',
      results,
      currentColumns: columns || [],
      instruction: '如果状态为 needs_manual_migration，请在 Supabase Dashboard > SQL Editor 执行以下 SQL：',
      manualSql: migrations.map(m => m.sql).join('\n')
    });

  } catch (err) {
    console.error('[migrate-profile-columns] Error:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      instruction: '请在 Supabase Dashboard > SQL Editor 手动执行以下 SQL：',
      manualSql: `
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS awards JSONB DEFAULT '[]'::jsonb;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS internship_experience JSONB DEFAULT '[]'::jsonb;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS project_experience JSONB DEFAULT '[]'::jsonb;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS graduation_year VARCHAR(20);
`
    }, { status: 500 });
  }
}

// GET 方法：检查当前列状态
export async function GET(request: NextRequest) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 查询 user_profiles 表的所有列
    const { data: allColumns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, column_default')
      .eq('table_name', 'user_profiles')
      .order('ordinal_position');

    // 检查目标列是否存在
    const targetColumns = ['awards', 'internship_experience', 'project_experience', 'graduation_year'];
    const existingTargetColumns = allColumns?.filter(c => targetColumns.includes(c.column_name)) || [];
    const missingColumns = targetColumns.filter(c => !existingTargetColumns.some(ec => ec.column_name === c));

    return NextResponse.json({
      success: true,
      totalColumns: allColumns?.length || 0,
      allColumns: allColumns?.map(c => c.column_name) || [],
      targetColumnsStatus: existingTargetColumns,
      missingColumns,
      needsMigration: missingColumns.length > 0,
      manualSql: missingColumns.length > 0 ? `
-- 在 Supabase Dashboard > SQL Editor 执行：
${missingColumns.includes('awards') ? "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS awards JSONB DEFAULT '[]'::jsonb;" : ''}
${missingColumns.includes('internship_experience') ? "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS internship_experience JSONB DEFAULT '[]'::jsonb;" : ''}
${missingColumns.includes('project_experience') ? "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS project_experience JSONB DEFAULT '[]'::jsonb;" : ''}
${missingColumns.includes('graduation_year') ? "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS graduation_year VARCHAR(20);" : ''}
`.trim() : null
    });

  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
