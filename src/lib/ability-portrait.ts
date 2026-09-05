// ============================================================
// 用户能力档案（ability_portrait）读写 helper · C→B 飞轮数据底座
//
// 背景：认知校正 / 技能画像 / 岗位匹配 三个画像入口此前「纯返回不落库」，
//       导致 B 端与 RAG 拿不到这部分画像数据，飞轮数据断裂。
// 方案：统一落库到 user_profiles.ability_portrait(JSONB)，按子块合并写入：
//   {
//     cognitive:      CognitiveCorrectionResult,  // 认知校正
//     skill_portrait: { major, target_industry, target_city, portrait },  // 技能画像
//     matched_skills: { skills, target_position, industry, city, at }     // 岗位匹配
//   }
// 写入策略：读现有 → 合并子块 → upsert，避免覆盖其它子块。
// ============================================================

import { getSupabaseAdmin } from './supabase';

export interface AbilityPortrait {
  cognitive?: Record<string, unknown> | null;
  skill_portrait?: Record<string, unknown> | null;
  matched_skills?: Record<string, unknown> | null;
}

/** 读取指定用户的 ability_portrait（无则返回空对象） */
export async function getAbilityPortrait(userId: string): Promise<AbilityPortrait> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('ability_portrait')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[ability-portrait] 读取失败:', error);
      return {};
    }
    const raw = (data?.ability_portrait as AbilityPortrait) ?? {};
    // 防御：非对象则重置
    if (typeof raw !== 'object' || raw === null) return {};
    return raw;
  } catch (e) {
    console.error('[ability-portrait] 读取异常:', e);
    return {};
  }
}

/**
 * 合并写入指定子块（deep merge 该子块内的字段），不覆盖其它子块。
 * @param userId 用户 id
 * @param block  子块名：cognitive | skill_portrait | matched_skills
 * @param data   该子块要合并写入的内容
 */
export async function mergeAbilityPortrait(
  userId: string,
  block: keyof AbilityPortrait,
  data: Record<string, unknown>
): Promise<boolean> {
  try {
    const current = await getAbilityPortrait(userId);
    const nextBlock = {
      ...(current[block] ?? {}),
      ...data,
    };
    const next: AbilityPortrait = {
      ...current,
      [block]: nextBlock,
    };

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('user_profiles')
      .upsert(
        { user_id: userId, ability_portrait: next, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error(`[ability-portrait] 写入 ${block} 失败:`, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[ability-portrait] 写入 ${block} 异常:`, e);
    return false;
  }
}
