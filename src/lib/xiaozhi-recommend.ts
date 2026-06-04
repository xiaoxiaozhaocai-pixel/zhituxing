// lib/xiaozhi-recommend.ts
// 小职个性化推荐语 — 每个岗位推荐带一句懂用户的话
// 差异化核心：不是冷冰冰的匹配度数字，是小职了解用户后的个性化推荐

export interface RecommendContext {
  matchScore: number;
  jobTitle: string;
  company: string;
  matchedSkills: string[];
  gapSkills: string[];
  freshGraduateFriendly?: boolean | null;
  targetPosition?: string;
  industry?: string;
}

interface NoteTemplate {
  condition: (ctx: RecommendContext) => boolean;
  generate: (ctx: RecommendContext) => string;
}

const templates: NoteTemplate[] = [
  // 高匹配 + 应届友好
  {
    condition: (c) => c.matchScore >= 80 && !!c.freshGraduateFriendly,
    generate: (c) => {
      const matched = c.matchedSkills.slice(0, 2).join('、');
      return `这个岗位和你的匹配度很高！${matched ? `你的${matched}正好是他们看重的` : ''}而且明确招应届生，投起来～`;
    },
  },
  // 高匹配
  {
    condition: (c) => c.matchScore >= 80,
    generate: (c) => {
      const matched = c.matchedSkills.slice(0, 2).join('、');
      return `匹配度${c.matchScore}%——${matched ? `你的${matched}和这个岗位很对路` : '你的技能组合和这个岗位很匹配'}，建议重点准备`;
    },
  },
  // 中匹配 + 应届友好
  {
    condition: (c) => c.matchScore >= 50 && !!c.freshGraduateFriendly,
    generate: (c) => {
      const gaps = c.gapSkills.slice(0, 2).join('、');
      return `这个岗位招应届生，是个好机会。${gaps ? `如果补上${gaps}，匹配度能再上一个台阶` : '值得一试'}`;
    },
  },
  // 中匹配
  {
    condition: (c) => c.matchScore >= 50,
    generate: (c) => {
      const gaps = c.gapSkills.slice(0, 2).join('、');
      const matched = c.matchedSkills.slice(0, 1).join('、');
      return `${c.matchScore}%匹配——${matched ? `你的${matched}是加分项，` : ''}${gaps ? `如果补强${gaps}会更有竞争力` : '可以试试看'}`;
    },
  },
  // 低匹配但有技能重叠
  {
    condition: (c) => c.matchedSkills.length > 0,
    generate: (c) => {
      const matched = c.matchedSkills.slice(0, 2).join('、');
      return `匹配度不算高，但${matched ? `你的${matched}和这个岗位有交集` : '你的部分技能可以用上'}。如果对这个方向感兴趣，可以先了解行业`;
    },
  },
  // 低匹配 + 应届友好
  {
    condition: (c) => !!c.freshGraduateFriendly,
    generate: () => '虽然匹配度不高，但这家招应届生，门槛相对友好。想试的话可以投，当练手也不错～',
  },
  // 默认
  {
    condition: () => true,
    generate: (c) => {
      const gaps = c.gapSkills.slice(0, 2).join('、');
      return `这个方向和你目前的技能组合有些距离${gaps ? `，主要在${gaps}方面` : ''}。可以先收藏，等技能储备够了再冲`;
    },
  },
];

// 目标岗位相关的推荐语修饰
function targetPositionNote(ctx: RecommendContext): string {
  if (!ctx.targetPosition) return '';
  const target = ctx.targetPosition.toLowerCase();
  const job = ctx.jobTitle.toLowerCase();

  if (target === job || job.includes(target) || target.includes(job)) {
    return '这正是你目标方向的岗位，重点关注！';
  }

  // 相关领域提示
  const relatedMap: Record<string, string> = {
    '产品经理': '产品',
    'hr': '人力资源',
    '运营': '运营',
    '开发': '技术',
    '设计': '设计',
    '数据分析': '数据',
  };

  for (const [key, label] of Object.entries(relatedMap)) {
    if (target.includes(key) && job.includes(label)) {
      return `和你的目标方向（${ctx.targetPosition}）属于相关领域，可以了解下`;
    }
  }

  return '';
}

// 主函数：生成小职推荐语
export function generateXiaozhiNote(ctx: RecommendContext): string {
  // 找到第一个匹配的模板
  const template = templates.find((t) => t.condition(ctx));
  let note = template ? template.generate(ctx) : '这个岗位值得关注，建议深入了解后再决定';

  // 追加目标岗位提示
  const targetNote = targetPositionNote(ctx);
  if (targetNote) {
    note = `${targetNote}\n${note}`;
  }

  // 小职语气包装
  return `💬 ${note}`;
}

// 批量生成（用于列表推荐）
export function generateBatchNotes(
  items: RecommendContext[]
): string[] {
  return items.map((item) => generateXiaozhiNote(item));
}
