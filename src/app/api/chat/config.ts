// ============================================================
// 调度卡片文案（小职检测到意图后推送给前端的 action card）
// ============================================================
export const DISPATCH_CARDS: Record<string, { title: string; description: string; actionLabel: string; tabId: string; url?: string }> = {
  interview: {
    title: '🎙️ 检测到你在准备面试',
    description: '要不要试试AI模拟面试？还原真实校招全流程，帮你打磨面试技巧。',
    actionLabel: '进入模拟面试',
    tabId: 'interview',
  },
  career: {
    title: '🧭 检测到你在思考职业方向',
    description: '要不要做一次职业规划？基于全行业真实数据，帮你理清成长路径。',
    actionLabel: '开始职业规划',
    tabId: 'career',
  },
  decision: {
    title: '⚖️ 检测到你在纠结选择',
    description: '要不要做个考研vs就业对比分析？数据推演帮你理性决策。',
    actionLabel: '开始对比分析',
    tabId: 'decision',
  },
  assessment: {
    title: '📊 检测到你想做能力测评',
    description: '要不要来一套专业能力测评题？精准定位你的能力短板。',
    actionLabel: '开始能力测评',
    tabId: 'assessment',
  },
  competency: {
    title: '🎯 检测到你在关心岗位匹配度',
    description: '要不要做个胜任力评估？可视化雷达图帮你看到差距。',
    actionLabel: '查看胜任力评估',
    tabId: 'career',
  },
  jobs: {
    title: '💼 检测到你在找岗位信息',
    description: '要不要帮你精准匹配职位？覆盖27大行业20000+真实JD。',
    actionLabel: '精准搜岗位',
    tabId: 'jobs',
  },
  resume: {
    title: '📝 检测到你需要简历帮助',
    description: '要不要优化一下简历？AI帮你打磨，让HR眼前一亮。',
    actionLabel: '优化简历',
    tabId: 'jobs',
    url: '/resume',
  },
  skill: {
    title: '🔧 检测到你想提升技能',
    description: '要不要做个技能画像分析？找到你的优势和短板。',
    actionLabel: '技能画像分析',
    tabId: 'career',
    url: '/skill-portrait',
  },
  course: {
    title: '📚 检测到你需要补补课',
    description: '要不要上一堂互动课？我根据你的情况现讲，不是录播～',
    actionLabel: '开始上课',
    tabId: 'career',
  },
};

// ============================================================
// 深度调度已整合：所有智能体统一走 /api/chat DeepSeek+RAG 路径
// 不再转发到独立 API，userContext 在 route.ts 统一注入，避免散落
// ============================================================

// ============================================================
// RAG 表查询配置（按 botType 分表）
// ============================================================
export const RAG_TABLE_CONFIG: Record<string, string[]> = {
  jobs: ['job_descriptions'],
  interview: ['job_descriptions', 'skill_taxonomy'],
  decision: ['job_descriptions', 'career_paths'],
  career: ['job_descriptions', 'career_paths', 'skill_taxonomy', 'learning_resources'],
  assessment: ['skill_taxonomy'],
  competency: ['job_descriptions', 'skill_taxonomy'],
  xiaozhi_chat: ['guet_knowledge'],
  xiaozhi: ['guet_knowledge', 'job_descriptions', 'career_paths', 'skill_taxonomy', 'learning_resources'],
  resume: ['job_descriptions', 'skill_taxonomy'],
  skill: ['skill_taxonomy', 'job_descriptions', 'career_paths'],
  course: ['learning_resources', 'skill_taxonomy', 'career_paths'],
};

// ============================================================
// 角色重申配置（三明治结构底部）
// ============================================================
export const ROLE_REINFORCEMENTS: Record<string, string> = {
  jobs: '\n【角色重申】你只负责解读岗位信息，不做职业规划。职业规划请咨询职业规划师。',
  interview: '\n【角色重申】你只负责模拟面试，不做职业规划或能力测评。职业规划请咨询职业规划师。',
  decision: '\n【角色重申】你只提供考研vs就业的客观对比，不做职业规划。',
  career: '\n【角色重申】你是唯一授权提供职业规划建议的智能体，请基于参考数据给出专业建议。',
  assessment: '\n【角色重申】你只负责技能测评和出题评分，不做职业规划。职业规划请咨询职业规划师。',
  competency: '\n【角色重申】你只负责胜任力评估和差距分析，不做职业规划。职业规划请咨询职业规划师。',
  xiaozhi: '',
  course: '\n【角色重申】你只负责互动课程教学，不做职业规划或面试模拟。',
  resume: '\n【角色重申】你只负责简历优化和JD对标，不做职业规划或面试模拟。',
  skill: '\n【角色重申】你只负责技能梳理和差距分析，不做职业规划或面试模拟。',
};

// ============================================================
// RAG 数据标签配置（按 botType 定制）
// ============================================================
export const RAG_DISPLAY_NAMES: Record<string, Record<string, string>> = {
  jobs: { job_descriptions: '岗位信息' },
  interview: { job_descriptions: '面试参考岗位', skill_taxonomy: '面试技能参考' },
  decision: { job_descriptions: '就业参考岗位', career_paths: '职业路径参考' },
  career: { job_descriptions: '目标岗位', career_paths: '职业发展路径', skill_taxonomy: '技能要求', learning_resources: '学习资源' },
  assessment: { skill_taxonomy: '技能测评题库' },
  competency: { job_descriptions: '目标岗位要求', skill_taxonomy: '技能差距参考' },
  course: { learning_resources: '学习资源', skill_taxonomy: '技能分类', career_paths: '发展路径' },
  xiaozhi_chat: { guet_knowledge: '桂电知识' },
  xiaozhi: { guet_knowledge: '桂电知识', job_descriptions: '岗位信息', career_paths: '职业发展路径', skill_taxonomy: '技能要求', learning_resources: '学习资源' },
  resume: { job_descriptions: '岗位JD参考', skill_taxonomy: '技能关键词' },
  skill: { skill_taxonomy: '技能分类参考', job_descriptions: '岗位对标', career_paths: '发展路径参考' },
};
