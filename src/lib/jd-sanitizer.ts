/**
 * JD 对外脱敏工具
 * 用途：从 supabase 拉出的 JD 数据，在返回给 C 端用户前必须过一遍
 * admin 路径不应使用此工具（保留完整字段调试用）
 */

export const SENSITIVE_JD_FIELDS = ['source_url', 'source_platform', 'raw_jd'] as const

type AnyObj = Record<string, any>

/** 单条脱敏 */
export function sanitizeJD<T extends AnyObj>(jd: T | null | undefined): T | null {
  if (!jd) return null as T | null
  const clean: AnyObj = { ...jd }
  for (const f of SENSITIVE_JD_FIELDS) {
    if (f in clean) delete clean[f]
  }
  return clean as T
}

/** 批量脱敏 */
export function sanitizeJDList<T extends AnyObj>(list: T[] | null | undefined): T[] {
  if (!Array.isArray(list)) return []
  return list.map(jd => sanitizeJD(jd) as T)
}
