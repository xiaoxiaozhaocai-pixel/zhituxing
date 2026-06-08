export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * 检查 hard_skills/soft_skills 数据格式
 */
export async function GET() {
  const supabase = getSupabaseAdmin();
  const _results: Record<string, unknown> = {};

  try {
    // 获取样本数据
    const { data: samples, error } = await supabase
      .from('job_descriptions')
      .select('id, job_title, hard_skills, soft_skills')
      .not('hard_skills', 'is', null)
      .limit(100);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 统计各种格式
    let hardArrayCount = 0;
    let hardStringCount = 0;
    let hardJsonStringCount = 0;
    let softArrayCount = 0;
    let softStringCount = 0;
    let softJsonStringCount = 0;
    
    const hardStringSamples: { id: string; value: string }[] = [];
    const softStringSamples: { id: string; value: string }[] = [];

    for (const record of samples || []) {
      const hard = record.hard_skills;
      const soft = record.soft_skills;

      // 检查 hard_skills
      if (hard !== null) {
        if (Array.isArray(hard)) {
          hardArrayCount++;
        } else if (typeof hard === 'string') {
          if (hard.startsWith('"[') || hard.startsWith('["')) {
            hardJsonStringCount++;
            if (hardStringSamples.length < 5) {
              hardStringSamples.push({ id: record.id, value: hard.substring(0, 100) });
            }
          } else {
            hardStringCount++;
          }
        }
      }

      // 检查 soft_skills
      if (soft !== null) {
        if (Array.isArray(soft)) {
          softArrayCount++;
        } else if (typeof soft === 'string') {
          if (soft.startsWith('"[') || soft.startsWith('["')) {
            softJsonStringCount++;
            if (softStringSamples.length < 5) {
              softStringSamples.push({ id: record.id, value: soft.substring(0, 100) });
            }
          } else {
            softStringCount++;
          }
        }
      }
    }

    return NextResponse.json({
      total: samples?.length || 0,
      hard_skills: {
        array: hardArrayCount,
        string: hardStringCount,
        jsonString: hardJsonStringCount,
        samples: hardStringSamples
      },
      soft_skills: {
        array: softArrayCount,
        string: softStringCount,
        jsonString: softJsonStringCount,
        samples: softStringSamples
      }
    });

  } catch (error: unknown) {
    const _error_ = error as Error;
    return NextResponse.json({ error: _error_.message }, { status: 500 });
  }
}
