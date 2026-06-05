export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * 修复 skills 数据格式 + 添加约束
 * 
 * GET: 统计脏数据量
 * POST: 修复数据 + 添加约束
 */

// 简单的 SQL 执行函数（通过 Supabase REST API）
async function executeSql(supabase: any, sql: string): Promise<{ data: any; error: any }> {
  // 使用 Supabase 的 rpc 功能执行原生 SQL
  // 注意：需要先在 Supabase 中创建 exec_sql 函数
  // 或者使用直接查询的方式
  
  // 这里我们用另一种方式：直接返回查询结果
  return { data: null, error: 'Direct SQL not supported via JS SDK' };
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  
  try {
    console.log('[fix-skills-data] 检查脏数据量...');
    
    // 获取所有记录并统计
    const { data: allRecords, error: queryError } = await supabase
      .from('job_descriptions')
      .select('id, hard_skills, soft_skills')
      .limit(10000);
    
    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }
    
    // 统计各种格式
    let hardStringCount = 0;
    let hardArrayCount = 0;
    let hardNullCount = 0;
    let softStringCount = 0;
    let softArrayCount = 0;
    let softNullCount = 0;
    
    const hardStringSamples: any[] = [];
    const softStringSamples: any[] = [];
    
    for (const record of allRecords || []) {
      const hard = record.hard_skills;
      const soft = record.soft_skills;
      
      // 检查 hard_skills
      if (hard === null) {
        hardNullCount++;
      } else if (Array.isArray(hard)) {
        hardArrayCount++;
      } else if (typeof hard === 'string') {
        hardStringCount++;
        if (hardStringSamples.length < 5) {
          hardStringSamples.push({
            id: record.id,
            value: hard.substring(0, 100),
            type: 'string'
          });
        }
      } else {
        hardStringCount++; // 其他类型也算脏数据
      }
      
      // 检查 soft_skills
      if (soft === null) {
        softNullCount++;
      } else if (Array.isArray(soft)) {
        softArrayCount++;
      } else if (typeof soft === 'string') {
        softStringCount++;
        if (softStringSamples.length < 5) {
          softStringSamples.push({
            id: record.id,
            value: soft.substring(0, 100),
            type: 'string'
          });
        }
      } else {
        softStringCount++;
      }
    }
    
    return NextResponse.json({
      total: allRecords?.length || 0,
      hard_skills: {
        array: hardArrayCount,
        string: hardStringCount,
        null: hardNullCount,
        dirty: hardStringCount,
        samples: hardStringSamples
      },
      soft_skills: {
        array: softArrayCount,
        string: softStringCount,
        null: softNullCount,
        dirty: softStringCount,
        samples: softStringSamples
      },
      needs_fix: hardStringCount > 0 || softStringCount > 0,
      summary: `发现 ${hardStringCount} 条 hard_skills 脏数据，${softStringCount} 条 soft_skills 脏数据`
    });
    
  } catch (error: unknown) {
    const _error_ = error as Error;
    console.error('[fix-skills-data] Error:', error);
    return NextResponse.json({ error: _error_.message }, { status: 500 });
  }
}

export async function POST() {
  const supabase = getSupabaseAdmin();
  const results: any = { steps: [] };
  
  try {
    // ============================================================
    // Step 1: 获取所有需要修复的记录
    // ============================================================
    console.log('[fix-skills-data] Step 1: 获取需要修复的记录...');
    
    const { data: allRecords, error: queryError } = await supabase
      .from('job_descriptions')
      .select('id, hard_skills, soft_skills')
      .limit(10000);
    
    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }
    
    results.steps.push({ step: 'query', count: allRecords?.length || 0 });
    
    // ============================================================
    // Step 2: 筛选并修复 hard_skills
    // ============================================================
    console.log('[fix-skills-data] Step 2: 修复 hard_skills...');
    
    const hardToFix: any[] = [];
    for (const record of allRecords || []) {
      const hard = record.hard_skills;
      
      // 检查是否为字符串格式（需要修复）
      if (hard !== null && !Array.isArray(hard) && typeof hard === 'string') {
        try {
          // 尝试解析 JSON 字符串
          let parsed = JSON.parse(hard);
          
          // 处理双重转义
          if (typeof parsed === 'string') {
            try {
              parsed = JSON.parse(parsed);
            } catch {}
          }
          
          // 如果解析结果是数组，使用它
          if (Array.isArray(parsed)) {
            hardToFix.push({ id: record.id, fixed: parsed });
          } else {
            // 如果不是数组，包装成数组
            hardToFix.push({ id: record.id, fixed: [String(parsed)] });
          }
        } catch {
          // JSON 解析失败，按逗号分割
          const parts = hard.split(',').map((s: string) => s.trim()).filter(Boolean);
          if (parts.length > 0) {
            hardToFix.push({ id: record.id, fixed: parts });
          } else {
            hardToFix.push({ id: record.id, fixed: [hard] });
          }
        }
      }
    }
    
    results.steps.push({ step: 'find_hard_dirty', count: hardToFix.length });
    
    // 批量更新 hard_skills
    if (hardToFix.length > 0) {
      let hardFixed = 0;
      let hardFailed = 0;
      
      for (const item of hardToFix) {
        const { error: updateError } = await supabase
          .from('job_descriptions')
          .update({ hard_skills: item.fixed })
          .eq('id', item.id);
        
        if (updateError) {
          hardFailed++;
          console.error(`[fix-skills-data] Failed to update hard_skills for id ${item.id}:`, updateError);
        } else {
          hardFixed++;
        }
      }
      
      results.steps.push({ step: 'fix_hard', fixed: hardFixed, failed: hardFailed, total: hardToFix.length });
    }
    
    // ============================================================
    // Step 3: 筛选并修复 soft_skills
    // ============================================================
    console.log('[fix-skills-data] Step 3: 修复 soft_skills...');
    
    const softToFix: any[] = [];
    for (const record of allRecords || []) {
      const soft = record.soft_skills;
      
      if (soft !== null && !Array.isArray(soft) && typeof soft === 'string') {
        try {
          let parsed = JSON.parse(soft);
          
          if (typeof parsed === 'string') {
            try {
              parsed = JSON.parse(parsed);
            } catch {}
          }
          
          if (Array.isArray(parsed)) {
            softToFix.push({ id: record.id, fixed: parsed });
          } else {
            softToFix.push({ id: record.id, fixed: [String(parsed)] });
          }
        } catch {
          const parts = soft.split(',').map((s: string) => s.trim()).filter(Boolean);
          if (parts.length > 0) {
            softToFix.push({ id: record.id, fixed: parts });
          } else {
            softToFix.push({ id: record.id, fixed: [soft] });
          }
        }
      }
    }
    
    results.steps.push({ step: 'find_soft_dirty', count: softToFix.length });
    
    // 批量更新 soft_skills
    if (softToFix.length > 0) {
      let softFixed = 0;
      let softFailed = 0;
      
      for (const item of softToFix) {
        const { error: updateError } = await supabase
          .from('job_descriptions')
          .update({ soft_skills: item.fixed })
          .eq('id', item.id);
        
        if (updateError) {
          softFailed++;
          console.error(`[fix-skills-data] Failed to update soft_skills for id ${item.id}:`, updateError);
        } else {
          softFixed++;
        }
      }
      
      results.steps.push({ step: 'fix_soft', fixed: softFixed, failed: softFailed, total: softToFix.length });
    }
    
    // ============================================================
    // Step 4: 验证修复结果
    // ============================================================
    console.log('[fix-skills-data] Step 4: 验证修复结果...');
    
    const { data: verifyRecords } = await supabase
      .from('job_descriptions')
      .select('id, hard_skills, soft_skills')
      .limit(10000);
    
    let remainingHardString = 0;
    let remainingSoftString = 0;
    
    for (const record of verifyRecords || []) {
      if (record.hard_skills !== null && !Array.isArray(record.hard_skills)) {
        remainingHardString++;
      }
      if (record.soft_skills !== null && !Array.isArray(record.soft_skills)) {
        remainingSoftString++;
      }
    }
    
    results.steps.push({
      step: 'verify',
      remaining_hard_string: remainingHardString,
      remaining_soft_string: remainingSoftString
    });
    
    // ============================================================
    // Step 5: 提示添加约束（需要在 Supabase Dashboard 手动执行）
    // ============================================================
    results.constraint_sql = `
-- 在 Supabase SQL Editor 中执行以下 SQL 添加约束：
-- 注意：只有当 remaining_hard_string 和 remaining_soft_string 都为 0 时才能执行

-- 删除可能存在的旧约束
ALTER TABLE job_descriptions DROP CONSTRAINT IF EXISTS hard_skills_array_check;
ALTER TABLE job_descriptions DROP CONSTRAINT IF EXISTS soft_skills_array_check;

-- 添加新约束
ALTER TABLE job_descriptions ADD CONSTRAINT hard_skills_array_check 
  CHECK (hard_skills IS NULL OR jsonb_typeof(hard_skills) = 'array');

ALTER TABLE job_descriptions ADD CONSTRAINT soft_skills_array_check 
  CHECK (soft_skills IS NULL OR jsonb_typeof(soft_skills) = 'array');
`.trim();
    
    const success = remainingHardString === 0 && remainingSoftString === 0;
    
    return NextResponse.json({
      success,
      message: success 
        ? '修复完成，可以添加约束'
        : `仍有 ${remainingHardString + remainingSoftString} 条脏数据未修复`,
      results
    });
    
  } catch (error: unknown) {
    const _error_ = error as Error;
    console.error('[fix-skills-data] Error:', error);
    return NextResponse.json({
      success: false,
      error: _error_.message,
      results
    }, { status: 500 });
  }
}
