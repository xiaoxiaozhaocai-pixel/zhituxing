import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { FixStep } from '@/lib/types';
export const dynamic = 'force-dynamic';

/**
 * 数据修复脚本：修复 hard_skills 和 soft_skills 的 JSON 字符串格式问题
 * 
 * 问题：部分记录存储为 '"["技能"]"' 而非 '["技能"]'
 * 解决：将 JSON 字符串转为正确的 JSONB 数组
 */

export async function GET() {
  const supabase = getSupabaseAdmin();
  const results: Record<string, unknown> = {};

  try {
    // Step 1: 检查脏数据量
    console.log('[fix-skills] Step 1: 检查脏数据量...');
    
    const { data: _dirtyCheck, error: checkError } = await supabase
      .rpc('exec_sql', {
        query: `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN jsonb_typeof(hard_skills) = 'string' THEN 1 END) as hard_string,
          COUNT(CASE WHEN jsonb_typeof(soft_skills) = 'string' THEN 1 END) as soft_string
        FROM job_descriptions;`
      });
    
    if (checkError) {
      // RPC 可能不存在，尝试用原生查询
      console.log('[fix-skills] RPC not available, using direct query...');
    }

    // Step 2: 修复 hard_skills
    console.log('[fix-skills] Step 2: 修复 hard_skills...');
    const { error: hardError } = await supabase
      .rpc('fix_hard_skills_json');
    
    if (hardError) {
      results.hard_skills_error = hardError.message;
      console.error('[fix-skills] hard_skills fix error:', hardError);
    } else {
      results.hard_skills = 'fixed';
    }

    // Step 3: 修复 soft_skills
    console.log('[fix-skills] Step 3: 修复 soft_skills...');
    const { error: softError } = await supabase
      .rpc('fix_soft_skills_json');
    
    if (softError) {
      results.soft_skills_error = softError.message;
      console.error('[fix-skills] soft_skills fix error:', softError);
    } else {
      results.soft_skills = 'fixed';
    }

    // Step 4: 验证修复结果
    console.log('[fix-skills] Step 4: 验证修复结果...');
    const { data: sampleData } = await supabase
      .from('job_descriptions')
      .select('id, job_title, hard_skills, soft_skills')
      .not('hard_skills', 'is', null)
      .limit(5);
    
    results.sample = sampleData;

    return NextResponse.json({
      success: true,
      message: '修复完成',
      results
    });

  } catch (error: unknown) {
    const _error_ = error as Error;
    console.error('[fix-skills] Error:', error);
    return NextResponse.json({
      success: false,
      error: _error_.message,
      results
    }, { status: 500 });
  }
}

/**
 * 使用 POST 方法执行直接 SQL 修复
 */
export async function POST() {
  const supabase = getSupabaseAdmin();
  const results: { steps: FixStep[] } = { steps: [] };

  try {
    // 查询所有需要修复的记录
    console.log('[fix-skills] 查询需要修复的记录...');
    
    // 1. 获取 hard_skills 为 string 类型的记录
    const { data: hardStringRecords, error: hardQueryError } = await supabase
      .from('job_descriptions')
      .select('id, hard_skills')
      .limit(10000);
    
    if (hardQueryError) {
      results.steps.push({ step: 'query_hard', error: hardQueryError.message });
    } else {
      // 筛选出 JSON 字符串格式的记录
      const toFix: { id: string; fixed: string[] }[] = [];
      for (const record of hardStringRecords || []) {
        const val = record.hard_skills;
        // 检查是否为 JSON 字符串格式
        if (typeof val === 'string' && val.startsWith('"[')) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
              toFix.push({ id: record.id, fixed: parsed });
            }
          } catch {
            // 无法解析
          }
        }
      }
      
      results.steps.push({ step: 'find_hard_string', count: toFix.length });
      
      // 批量更新
      if (toFix.length > 0) {
        let fixedCount = 0;
        for (const item of toFix) {
          const { error: updateError } = await supabase
            .from('job_descriptions')
            .update({ hard_skills: item.fixed })
            .eq('id', item.id);
          
          if (!updateError) fixedCount++;
        }
        results.steps.push({ step: 'fix_hard', fixed: fixedCount, total: toFix.length });
      }
    }

    // 2. 获取 soft_skills 为 string 类型的记录
    const { data: softStringRecords, error: softQueryError } = await supabase
      .from('job_descriptions')
      .select('id, soft_skills')
      .limit(10000);
    
    if (softQueryError) {
      results.steps.push({ step: 'query_soft', error: softQueryError.message });
    } else {
      const toFix: { id: string; fixed: string[] }[] = [];
      for (const record of softStringRecords || []) {
        const val = record.soft_skills;
        if (typeof val === 'string' && val.startsWith('"[')) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
              toFix.push({ id: record.id, fixed: parsed });
            }
          } catch {
            // 无法解析
          }
        }
      }
      
      results.steps.push({ step: 'find_soft_string', count: toFix.length });
      
      if (toFix.length > 0) {
        let fixedCount = 0;
        for (const item of toFix) {
          const { error: updateError } = await supabase
            .from('job_descriptions')
            .update({ soft_skills: item.fixed })
            .eq('id', item.id);
          
          if (!updateError) fixedCount++;
        }
        results.steps.push({ step: 'fix_soft', fixed: fixedCount, total: toFix.length });
      }
    }

    return NextResponse.json({
      success: true,
      message: '修复完成',
      results
    });

  } catch (error: unknown) {
    const _error_ = error as Error;
    console.error('[fix-skills] Error:', error);
    return NextResponse.json({
      success: false,
      error: _error_.message,
      results
    }, { status: 500 });
  }
}
