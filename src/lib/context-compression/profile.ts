/**
 * 用户画像管理 — 从 Supabase 读取/更新用户画像锚定
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import type { UserProfile } from './types';

/**
 * 获取用户画像锚定
 * 优先从 user_profiles 表读取，fallback 时返回 null
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      user_name: data.user_name || null,
      school: data.school || null,
      major: data.major || null,
      grade: data.grade || null,
      target_industry: data.target_industry || null,
      target_position: data.target_position || null,
      job_hunting_stage: data.job_hunting_stage || null,
      skills: Array.isArray(data.skills) ? data.skills : [],
      key_projects: Array.isArray(data.key_projects) ? data.key_projects : [],
      key_preferences: Array.isArray(data.key_preferences) ? data.key_preferences : [],
    };
  } catch (err) {
    console.error('[context-compression] Failed to load user profile:', err);
    return null;
  }
}

/**
 * 更新用户画像（增量合并）
 * 只更新非 null 字段
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>,
): Promise<void> {
  if (!userId || !updates || Object.keys(updates).length === 0) return;

  try {
    const supabase = getSupabaseAdmin();
    // 检查是否已有记录
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('user_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    } else {
      await supabase
        .from('user_profiles')
        .insert({ user_id: userId, ...updates });
    }
    console.log('[context-compression] User profile updated:', userId, Object.keys(updates));
  } catch (err) {
    console.error('[context-compression] Failed to update user profile:', err);
  }
}
