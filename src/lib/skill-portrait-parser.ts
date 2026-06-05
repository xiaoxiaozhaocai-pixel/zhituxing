/**
 * 技能画像解析器
 * 解析技能画像智能体返回的结构化内容
 * 格式：PROFESSIONAL_SKILLS_START/END、OFFICE_SKILLS_START/END、SOFT_SKILLS_START/END、SKILL_SUMMARY_START/END
 */

export interface SkillItem {
  name: string;
  hotness: 'hot' | 'normal' | 'optional';
  description: string;
}

export interface SkillPortraitResult {
  professionalSkills: SkillItem[];
  officeSkills: SkillItem[];
  softSkills: SkillItem[];
  summary: string;
  rawText: string; // 原始文本（除标记外的内容）
}

/**
 * 解析单个技能区块
 * 每行格式：技能名称|热门程度|说明
 * 也可以是：- 技能名称（说明） 或 技能名称：说明
 */
function parseSkillBlock(text: string): SkillItem[] {
  const skills: SkillItem[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // 跳过标题行、说明行、空行
    if (line.startsWith('#') || line.startsWith('**') || line.startsWith('```') ||
        line.startsWith('以下是') || line.startsWith('请按照') || line.startsWith('注意')) {
      continue;
    }

    // 格式1: 技能名称|hot|说明
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 1) {
        const name = parts[0]!.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
        if (!name) continue;

        let hotness: SkillItem['hotness'] = 'normal';
        if (parts.length >= 2) {
          const h = parts[1]!.toLowerCase();
          if (h === 'hot' || h.includes('热门') || h.includes('急需') || h.includes('🔥')) {
            hotness = 'hot';
          } else if (h === 'optional' || h.includes('可选') || h.includes('加分')) {
            hotness = 'optional';
          }
        }

        const description = parts.length >= 3 ? parts[2] : '';
        skills.push({ name: name!, hotness: hotness!, description: description! });
      }
      continue;
    }

    // 格式2: 🔥 技能名称 - 说明  或  - 技能名称(热门) - 说明
    const emojiMatch = line.match(/^[-*•]?\s*(🔥|⭐)?\s*(.+?)(?:\s*[-–—]\s*|\s*[（(]\s*)(.+?)(?:\s*[)）])?$/);
    if (emojiMatch) {
      const name = emojiMatch[2]!.replace(/\s*[(（]热门[)）]\s*/, '').replace(/\s*[(（]可选[)）]\s*/, '').trim();
      const desc = emojiMatch[3] || '';
      let hotness: SkillItem['hotness'] = 'normal';
      if (emojiMatch[1] === '🔥' || line.includes('热门') || line.includes('急需')) {
        hotness = 'hot';
      } else if (line.includes('可选') || line.includes('加分')) {
        hotness = 'optional';
      }
      if (name && name.length > 0 && name.length < 50) {
        skills.push({ name, hotness, description: desc });
      }
      continue;
    }

    // 格式3: 数字. 技能名称：说明  或  - 技能名称：说明
    const listMatch = line.match(/^[-*•]?\s*\d+[.)]?\s*(.+?)[：:]\s*(.+)/);
    if (listMatch) {
      const name = listMatch[1]!.trim();
      const desc = listMatch[2]!.trim();
      let hotness: SkillItem['hotness'] = 'normal';
      if (line.includes('🔥') || line.includes('热门') || line.includes('急需')) hotness = 'hot';
      else if (line.includes('可选') || line.includes('加分')) hotness = 'optional';
      if (name && name.length > 0 && name.length < 50) {
        skills.push({ name, hotness, description: desc });
      }
      continue;
    }

    // 格式4: 纯技能名称（可能带 emoji）
    const simpleMatch = line.match(/^[-*•]?\s*(?:\d+[.)]\s*)?(🔥|⭐)?\s*(.{2,30})/);
    if (simpleMatch && !line.startsWith('专业') && !line.startsWith('办公') && !line.startsWith('软技能')) {
      const name = simpleMatch[2]!.replace(/\s*[(（].+?[)）]/, '').trim();
      if (name && name.length >= 2 && name.length < 30) {
        let hotness: SkillItem['hotness'] = 'normal';
        if (simpleMatch[1] === '🔥' || line.includes('热门')) hotness = 'hot';
        else if (line.includes('可选')) hotness = 'optional';
        skills.push({ name, hotness, description: '' });
      }
    }
  }

  return skills;
}

/**
 * 提取标记区块的内容
 */
function extractBlock(text: string, startTag: string, endTag: string): string | null {
  const startIdx = text.indexOf(startTag);
  if (startIdx === -1) return null;
  const afterStart = startIdx + startTag.length;
  const endIdx = text.indexOf(endTag, afterStart);
  if (endIdx === -1) return text.substring(afterStart).trim();
  return text.substring(afterStart, endIdx).trim();
}

/**
 * 从原始文本中移除标记区块
 */
function removeBlocks(text: string): string {
  let result = text;
  const blockPatterns = [
    /PROFESSIONAL_SKILLS_START[\s\S]*?PROFESSIONAL_SKILLS_END/gi,
    /OFFICE_SKILLS_START[\s\S]*?OFFICE_SKILLS_END/gi,
    /SOFT_SKILLS_START[\s\S]*?SOFT_SKILLS_END/gi,
    /SKILL_SUMMARY_START[\s\S]*?SKILL_SUMMARY_END/gi,
  ];
  for (const pattern of blockPatterns) {
    result = result.replace(pattern, '');
  }
  return result.trim();
}

/**
 * 主解析函数：解析技能画像智能体返回的文本
 */
export function parseSkillPortrait(rawText: string): SkillPortraitResult {
  // 1. 解析专业核心技能
  const professionalText = extractBlock(rawText, 'PROFESSIONAL_SKILLS_START', 'PROFESSIONAL_SKILLS_END');
  const professionalSkills = professionalText ? parseSkillBlock(professionalText) : [];

  // 2. 解析办公软件技能
  const officeText = extractBlock(rawText, 'OFFICE_SKILLS_START', 'OFFICE_SKILLS_END');
  const officeSkills = officeText ? parseSkillBlock(officeText) : [];

  // 3. 解析软技能
  const softText = extractBlock(rawText, 'SOFT_SKILLS_START', 'SOFT_SKILLS_END');
  const softSkills = softText ? parseSkillBlock(softText) : [];

  // 4. 解析总结
  const summaryText = extractBlock(rawText, 'SKILL_SUMMARY_START', 'SKILL_SUMMARY_END');
  const summary = summaryText || '';

  // 5. 原始文本（去掉标记区块后的内容）
  const rawTextCleaned = removeBlocks(rawText);

  return {
    professionalSkills,
    officeSkills,
    softSkills,
    summary,
    rawText: rawTextCleaned,
  };
}

/**
 * 熟练度等级
 */
export type ProficiencyLevel = '了解' | '熟悉' | '熟练' | '精通';

/**
 * 保存用的技能数据格式
 */
export interface SkillForSave {
  name: string;
  category: 'professional' | 'office' | 'soft';
  level: ProficiencyLevel;
  is_hot: boolean;
  hotness: 'hot' | 'normal' | 'optional';
  description: string;
}

/**
 * 将 SkillPortraitResult 转换为保存格式
 * @param result 解析结果
 * @param selections 用户选择及熟练度设定
 */
export function convertToSaveFormat(
  result: SkillPortraitResult,
  selections: Record<string, { selected: boolean; level: ProficiencyLevel }>
): SkillForSave[] {
  const allSkills: SkillForSave[] = [];

  for (const skill of result.professionalSkills) {
    const key = `professional_${skill.name}`;
    const sel = selections[key];
    if (sel?.selected !== false) { // 默认选中 hot 和 normal
      allSkills.push({
        name: skill.name,
        category: 'professional',
        level: sel?.level || (skill.hotness === 'hot' ? '熟悉' : '了解'),
        is_hot: skill.hotness === 'hot',
        hotness: skill.hotness,
        description: skill.description,
      });
    }
  }

  for (const skill of result.officeSkills) {
    const key = `office_${skill.name}`;
    const sel = selections[key];
    if (sel?.selected !== false) {
      allSkills.push({
        name: skill.name,
        category: 'office',
        level: sel?.level || (skill.hotness === 'hot' ? '熟悉' : '了解'),
        is_hot: skill.hotness === 'hot',
        hotness: skill.hotness,
        description: skill.description,
      });
    }
  }

  for (const skill of result.softSkills) {
    const key = `soft_${skill.name}`;
    const sel = selections[key];
    if (sel?.selected !== false) {
      allSkills.push({
        name: skill.name,
        category: 'soft',
        level: sel?.level || '熟悉',
        is_hot: skill.hotness === 'hot',
        hotness: skill.hotness,
        description: skill.description,
      });
    }
  }

  return allSkills;
}

/**
 * 熟练度配置
 */
export const PROFICIENCY_CONFIG: Record<ProficiencyLevel, { color: string; bgColor: string; width: string; label: string }> = {
  '了解': { color: '#3B82F6', bgColor: '#EFF6FF', width: '20%', label: '了解' },
  '熟悉': { color: '#10B981', bgColor: '#ECFDF5', width: '50%', label: '熟悉' },
  '熟练': { color: '#F59E0B', bgColor: '#FFFBEB', width: '75%', label: '熟练' },
  '精通': { color: '#EF4444', bgColor: '#FEF2F2', width: '100%', label: '精通' },
};

/**
 * 从数据库读取的 skills jsonb 中提取按分类分组的技能
 */
export function groupSkillsByCategory(skills: unknown[]): {
  professional: SkillForSave[];
  office: SkillForSave[];
  soft: SkillForSave[];
} {
  const professional: SkillForSave[] = [];
  const office: SkillForSave[] = [];
  const soft: SkillForSave[] = [];

  if (!Array.isArray(skills)) return { professional, office, soft };

  for (const s of skills) {
    if (typeof s === 'object' && s !== null) {
      const skill = s as Record<string, unknown>;
      const categorized: SkillForSave = {
        name: (skill.name as string) || '',
        category: (skill.category as SkillForSave['category']) || 'professional',
        level: (skill.level as ProficiencyLevel) || '了解',
        is_hot: Boolean(skill.is_hot),
        hotness: (skill.hotness as SkillItem['hotness']) || 'normal',
        description: (skill.description as string) || '',
      };
      if (categorized.category === 'professional') professional.push(categorized);
      else if (categorized.category === 'office') office.push(categorized);
      else soft.push(categorized);
    }
  }

  return { professional, office, soft };
}
