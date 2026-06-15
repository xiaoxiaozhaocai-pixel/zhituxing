/**
 * GET /api/jobs/stats
 * 返回岗位库的真实统计数据，用于首页"数据信任区"动态显示
 *
 * 返回：
 *   - total: 岗位总数（job_descriptions 表 count(*)）
 *   - industries: 不同行业数量（distinct industry，已去 null/空）
 *   - updated_at: 数据最近更新时间（max(created_at)）
 *
 * 缓存：内存 LRU 5 分钟，避免每次请求都打 DB
 */
import { jsonOk, jsonError } from '@/lib/api-contracts/_shared';
import { JobsStatsDataSchema, type JobsStatsData } from '@/lib/api-contracts/jobs';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface StatsCache {
  data: JobsStatsData;
  timestamp: number;
}

let cache: StatsCache | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

export async function GET() {
  // 命中缓存直接返回
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return jsonOk(JobsStatsDataSchema, cache.data);
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    // 总数（HEAD + count=exact 性能最优）
    const { count: total, error: countErr } = await supabase
      .from('job_descriptions')
      .select('id', { count: 'exact', head: true });

    if (countErr) {
      return jsonError('UPSTREAM_ERROR', `Supabase count: ${countErr.message}`);
    }

    // 行业去重：取最近 5000 条样本（够覆盖现状 4819）
    const { data: industryRows, error: indErr } = await supabase
      .from('job_descriptions')
      .select('industry')
      .not('industry', 'is', null)
      .neq('industry', '')
      .limit(5000);

    if (indErr) {
      return jsonError('UPSTREAM_ERROR', `Supabase industry: ${indErr.message}`);
    }

    const industriesSet = new Set(
      (industryRows ?? [])
        .map((r) => (r as { industry: string }).industry?.trim())
        .filter(Boolean),
    );

    // 最近更新时间
    const { data: latest } = await supabase
      .from('job_descriptions')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const result: JobsStatsData = {
      total: total ?? 0,
      industries: industriesSet.size,
      updated_at: (latest as { created_at: string } | null)?.created_at ?? null,
    };

    cache = { data: result, timestamp: Date.now() };
    return jsonOk(JobsStatsDataSchema, result);
  } catch (e) {
    return jsonError('INTERNAL_ERROR', e instanceof Error ? e.message : String(e));
  }
}
