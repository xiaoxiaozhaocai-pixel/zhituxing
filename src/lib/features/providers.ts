// src/lib/features/providers.ts
// Feature Flag 读取层：环境变量 > Supabase site_config > 代码默认值

import { FeatureFlag, FLAG_CONFIGS } from './flags';
import { getSupabaseAdmin } from '@/lib/supabase';

// ============================================================
// 缓存（5分钟 TTL）
// ============================================================
interface CacheEntry {
  value: boolean;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const flagCache = new Map<FeatureFlag, CacheEntry>();

function getCached(flag: FeatureFlag): boolean | undefined {
  const entry = flagCache.get(flag);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.value;
  }
  flagCache.delete(flag);
  return undefined;
}

function setCache(flag: FeatureFlag, value: boolean) {
  flagCache.set(flag, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ============================================================
// 环境变量读取（服务端 + 客户端）
// ============================================================
function getEnvOverride(flag: FeatureFlag): boolean | undefined {
  const config = FLAG_CONFIGS[flag];
  const envValue = typeof process !== 'undefined' ? process.env[config.envKey] : undefined;
  if (envValue !== undefined) {
    return envValue === 'true';
  }
  return undefined;
}

// ============================================================
// Supabase site_config 表读取
// ============================================================
async function getSupabaseValue(flag: FeatureFlag): Promise<boolean | undefined> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('site_config')
      .select('enabled')
      .eq('key', flag)
      .maybeSingle();

    if (error || !data) return undefined;
    return data.enabled as boolean;
  } catch {
    return undefined;
  }
}

// ============================================================
// 公开 API
// ============================================================

/**
 * 异步获取 Feature Flag 状态（服务端使用）
 * 优先级：环境变量 > 缓存 > Supabase site_config > 代码默认值
 */
export async function isFeatureEnabled(flag: FeatureFlag): Promise<boolean> {
  // 1. 环境变量（最高优先级）
  const envOverride = getEnvOverride(flag);
  if (envOverride !== undefined) return envOverride;

  // 2. 缓存
  const cached = getCached(flag);
  if (cached !== undefined) return cached;

  // 3. Supabase site_config 表
  const supabaseValue = await getSupabaseValue(flag);
  if (supabaseValue !== undefined) {
    setCache(flag, supabaseValue);
    return supabaseValue;
  }

  // 4. 代码默认值
  return FLAG_CONFIGS[flag].defaultValue;
}

/**
 * 同步获取 Feature Flag 状态（客户端/纯前端使用）
 * 仅读取环境变量和默认值，不查 Supabase
 */
export function getClientFlag(flag: FeatureFlag): boolean {
  const envOverride = getEnvOverride(flag);
  if (envOverride !== undefined) return envOverride;
  return FLAG_CONFIGS[flag].defaultValue;
}

/**
 * 获取所有 Feature Flag 状态
 */
export async function getAllFlags(): Promise<Record<FeatureFlag, boolean>> {
  const entries = await Promise.all(
    Object.values(FeatureFlag).map(async (flag) => [flag, await isFeatureEnabled(flag)])
  );
  return Object.fromEntries(entries) as Record<FeatureFlag, boolean>;
}
