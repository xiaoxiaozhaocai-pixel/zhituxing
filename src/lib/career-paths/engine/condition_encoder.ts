// 职途星组态引擎 · 画像编码器
// 对应 Python: condition_encoder.py (v3)

import { EncodedProfile, RawProfile } from '@/lib/career-paths/types';
import { encodeSchool } from '@/lib/career-paths/engine/school_tier';
import { encodeMajor } from '@/lib/career-paths/engine/major_mapping';

/**
 * 编码原始画像 → 6个条件值
 * 档位标准（来自 config_routes.ts meta.档位说明）：
 *
 * SCH_TIER: 桂电=0.50, 211=0.75, 985=0.95, 二本/大专=0.25
 * DEG_LEV:  本科=0.60, 硕士=0.95, 大专=0.25
 * INT_NUM:  0段=0.05, 1段=0.50, 2段=0.75, 3段+=0.95
 * INT_QLT:  无=0.05, 小厂=0.25, 中厂=0.50, 大厂=0.75, 头部=0.95
 * SKILL_SET: 0-2项=0.25, 3-4项=0.50, 5-7项=0.75, 8+项=0.95
 */
export function encodeProfile(raw: RawProfile): EncodedProfile {
  return {
    SCH_TIER: encodeSchool(raw.school),
    MAJ_CAT: encodeMajor(raw.major),
    DEG_LEV: encodeDegree(raw.degree),
    INT_NUM: encodeInternshipCount(raw.internshipCount),
    INT_QLT: encodeInternshipQuality(raw.internshipQuality),
    SKILL_SET: encodeSkillSet(raw.skills),
  };
}

/** 学历编码 */
export function encodeDegree(degree: string): number {
  const clean = degree.replace(/\s+/g, '');
  if (clean.includes('硕士') || clean.includes('研究生') || clean.includes('博士')) return 0.95;
  if (clean.includes('本科')) return 0.60;
  if (clean.includes('大专') || clean.includes('专科')) return 0.25;
  return 0.60; // 默认本科
}

/** 实习数量编码 */
export function encodeInternshipCount(count: number): number {
  if (count >= 3) return 0.95;
  if (count === 2) return 0.75;
  if (count === 1) return 0.50;
  if (count === 0) return 0.05;
  return 0.05;
}

/** 实习质量编码 */
export function encodeInternshipQuality(q: string): number {
  const clean = q.replace(/\s+/g, '');
  if (clean.includes('头部') || clean.includes('顶尖') || clean.includes('世界500强')) return 0.95;
  if (clean.includes('大厂') || clean.includes('BAT') || clean.includes('字节') || clean.includes('腾讯') || clean.includes('阿里')) return 0.75;
  if (clean.includes('中厂') || clean.includes('知名') || clean.includes('上市公司')) return 0.50;
  if (clean.includes('小厂') || clean.includes('创业') || clean.includes('初创') || clean.includes('普通')) return 0.25;
  return 0.05; // 无
}

/** 技能数量编码 */
export function encodeSkillSet(skills: string[]): number {
  const count = skills.length;
  if (count >= 8) return 0.95;
  if (count >= 5) return 0.75;
  if (count >= 3) return 0.50;
  if (count >= 1) return 0.25;
  return 0.25; // 至少有个基础技能
}
