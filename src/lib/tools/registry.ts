/**
 * 方向四 · 工具注册表（小职调用内部能力）
 *
 * 设计原则：
 * - 白名单制：只有在此注册的工具才可被对话执行，新增工具必须过 review
 * - 全部复用既有 API 的底层实现，零新后端
 * - check_cognitive 为 chatNative：认知校正已在 chat A1 分支内直接执行，
 *   此处仅登记能力清单，不重复拦截执行
 */

export type ToolName =
  | 'score_resume'
  | 'match_jobs'
  | 'plan_career'
  | 'analyze_one_jd'
  | 'translate_experience'
  | 'check_cognitive';

export type ToolQuotaFeature = 'resume_optimize' | 'career_planning';

export interface ToolDefinition {
  name: ToolName;
  /** 卡片标题（用户可见） */
  title: string;
  /** 给决策模型的能力描述 */
  description: string;
  /** 必填参数（决策模型负责抽取） */
  requiredArgs: string[];
  /** 可选参数 */
  optionalArgs: string[];
  /** 执行后计入的配额功能；null = 零成本引擎，不计量 */
  quotaFeature: ToolQuotaFeature | null;
  /** 已有聊天内实现的能力：仅登记，不在对话中重复执行 */
  chatNative?: boolean;
  /** 完整功能页入口 */
  pageUrl: string;
  pageLabel: string;
}

export const TOOL_REGISTRY: Record<ToolName, ToolDefinition> = {
  score_resume: {
    name: 'score_resume',
    title: '简历评分',
    description: '根据目标岗位对简历原文给出优化建议（亮点/硬伤/提升建议）。适合用户明确要求"优化简历/改简历/看看简历有什么问题"时。',
    requiredArgs: ['resume_text', 'target_position'],
    optionalArgs: [],
    quotaFeature: 'resume_optimize',
    pageUrl: '/resume',
    pageLabel: '简历优化',
  },
  match_jobs: {
    name: 'match_jobs',
    title: '岗位匹配',
    description: '基于用户能力画像执行真实岗位匹配，返回匹配岗位、匹配技能、缺口与建议。适合用户明确要求"帮我匹配岗位/推荐岗位"时。',
    requiredArgs: [],
    optionalArgs: ['skills', 'target_position'],
    quotaFeature: null,
    pageUrl: '/match',
    pageLabel: '岗位匹配',
  },
  plan_career: {
    name: 'plan_career',
    title: '职业规划报告',
    description: '生成结构化职业规划报告（推荐岗位/六维评估/三阶段路径/行动计划）。适合用户明确要求"生成规划报告/做一份规划"时。',
    requiredArgs: ['major', 'grade'],
    optionalArgs: ['city', 'target_industry', 'target_job'],
    quotaFeature: 'career_planning',
    pageUrl: '/career-planning',
    pageLabel: '职业规划',
  },
  analyze_one_jd: {
    name: 'analyze_one_jd',
    title: '一岗一策',
    description: '解码一段 JD 的潜台词与隐性要求，给出匹配评估与改写建议。适合用户贴出 JD 原文并要求分析时。',
    requiredArgs: ['jd_text'],
    optionalArgs: ['resume_text'],
    quotaFeature: null,
    pageUrl: '/one-jd',
    pageLabel: '一岗一策',
  },
  translate_experience: {
    name: 'translate_experience',
    title: '能力翻译',
    description: '把口语化经历描述改写成专业简历用语，并指出能力短板。适合用户贴出经历原文并要求翻译/润色成简历语言时。',
    requiredArgs: ['experience'],
    optionalArgs: ['target_industry'],
    quotaFeature: 'resume_optimize',
    pageUrl: '/resume',
    pageLabel: '能力翻译',
  },
  check_cognitive: {
    name: 'check_cognitive',
    title: '认知校正',
    description: '专业→岗位认知校正（已在对话中内置执行，无需调度）。',
    requiredArgs: ['major'],
    optionalArgs: ['grade'],
    quotaFeature: null,
    chatNative: true,
    pageUrl: '/career-planning',
    pageLabel: '认知校正',
  },
};

/** chat 意图 → 工具映射（命中意图后仍需决策模型确认） */
export const TOOL_TRIGGER_INTENTS: Partial<Record<string, ToolName>> = {
  job_match: 'match_jobs',
  // 泛意图同映射（9/12 行为层实测：用户自然语言"查岗位/做职业规划"命中 jobs/career，
  // 白名单缺映射导致决策门被跳过、ToolResultCard 永不出现；决策门 LLM 仍可 skip 兜底）
  jobs: 'match_jobs',
  career: 'plan_career',
  resume_optimize: 'score_resume',
  career_report: 'plan_career',
  capability_dictionary: 'analyze_one_jd',
  narrative_check: 'translate_experience',
};
