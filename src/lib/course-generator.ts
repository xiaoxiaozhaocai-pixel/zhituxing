// lib/course-generator.ts
// 互动课程生成器 — 小职根据用户进度现讲
// 差异化核心：不是固定课包，是小职知道用户最该补什么

export type CourseTopic = 'star' | 'resume' | 'interview' | 'career_planning' | 'skill_gap';

export interface CourseRequest {
  topic?: CourseTopic;
  userContext?: {
    recentInterviewWeakness?: string;   // 最近面试暴露的弱点
    targetPosition?: string;             // 目标岗位
    skillGaps?: string[];                // 技能差距
  };
  customPrompt?: string;                 // 自定义课程需求
}

// 课程主题配置
const TOPIC_CONFIG: Record<CourseTopic, {
  name: string;
  description: string;
  basePrompt: string;
}> = {
  star: {
    name: 'STAR法则实战',
    description: '掌握面试中最重要的STAR结构化表达法',
    basePrompt: `你正在给用户上一堂「STAR法则实战」的互动课。STAR = Situation(情境) + Task(任务) + Action(行动) + Result(结果)。

【课程结构 - 必须严格遵守】
第1步：先用1-2句话开场，解释为什么STAR是面试中最核心的表达框架
第2步：逐项讲解S/T/A/R四个要素，每讲一个要素给一个正面例子和一个反面例子
第3步：给出一道练习题，让用户用STAR结构描述一段经历
第4步：等用户回答后，按STAR四个维度点评
第5步：给出改进版示例，并做课程小结

【风格要求】
- 像朋友在分享经验，不是老师在讲课
- 用具体例子，避免抽象概念
- 互动式：讲一段就确认"明白了吗？"
- 鼓励为主，但要点出问题`,
  },
  resume: {
    name: '简历打磨课',
    description: '帮你写出一份让HR眼前一亮的简历',
    basePrompt: `你正在给用户上一堂「简历打磨」互动课。

【课程结构】
第1步：开场——简历的核心不是"你做了什么"而是"你带来了什么结果"
第2步：讲解三个简历黄金法则：量化成果、动词开头、匹配JD
第3步：让用户提供一段经历描述，你来帮用户改写
第4步：对比改写前后的差异，解释每个修改的原因
第5步：给出3条课后练习建议

【风格要求】
- 实用导向，每个建议都要可操作
- 用改写前后对比让用户直观理解`,
  },
  interview: {
    name: '面试通关技巧',
    description: '从自我介绍到薪资谈判，全流程面试攻略',
    basePrompt: `你正在给用户上一堂「面试通关技巧」互动课。

【课程结构】
第1步：开场——面试不是考试，是和面试官的一次专业对话
第2步：自我介绍的三段式结构（我是谁→我做过什么→我为什么适合）
第3步：常见行为面试题的应答框架（冲突处理/团队合作/失败经历）
第4步：出一道模拟面试题让用户回答，然后点评
第5步：讲解反问环节的策略（问什么、问谁、怎么问）

【风格要求】
- 场景化教学，每个技巧都配一个面试实景`,
  },
  career_planning: {
    name: '职业规划导航',
    description: '帮你理清职业方向，做出不后悔的选择',
    basePrompt: `你正在给用户上一堂「职业规划」互动课。

【课程结构】
第1步：开场——职业规划不是选一次就定终身，是持续探索的过程
第2步：自我认知框架——兴趣/能力/价值观三个维度如何评估
第3步：行业选择方法论——怎么看行业趋势、判断岗位天花板
第4步：让用户分享自己的困惑，你基于此给出个性化分析
第5步：给出一个可执行的「未来30天探索计划」

【风格要求】
- 引导式，不是灌输式
- 让用户自己得出结论，而不是你替他决定`,
  },
  skill_gap: {
    name: '技能补强课',
    description: '针对你的技能短板，给出精准提升路径',
    basePrompt: `你正在给用户上一堂「技能补强」互动课。

【课程结构】
第1步：先确认用户的技能现状和目标岗位
第2步：分析目标岗位的核心技能要求，指出用户当前的差距
第3步：针对每个差距给出具体的学习路径（学什么→在哪学→学多久→怎么验证）
第4步：制定一个4周学习计划，每周有明确的里程碑
第5步：给出保持学习动力的3个建议

【风格要求】
- 务实、可量化、有deadline
- 每个建议都要有"学完后你能做什么"的验证标准`,
  },
};

// 根据用户上下文自动推荐最合适的课程主题
export function detectCourseTopic(request: CourseRequest): CourseTopic {
  if (request.topic) return request.topic;

  const ctx = request.userContext;
  if (!ctx) return 'star'; // 默认

  // 优先级：面试弱点 > 技能差距 > 其他
  if (ctx.recentInterviewWeakness) {
    const w = ctx.recentInterviewWeakness.toLowerCase();
    if (w.includes('star') || w.includes('结构化') || w.includes('量化')) return 'star';
    if (w.includes('简历')) return 'resume';
    if (w.includes('面试') || w.includes('回答') || w.includes('表达')) return 'interview';
  }

  if (ctx.skillGaps && ctx.skillGaps.length > 0) return 'skill_gap';
  if (ctx.targetPosition) return 'career_planning';

  return 'star';
}

// 构建课程系统提示词
export function buildCoursePrompt(topic: CourseTopic, request: CourseRequest): string {
  const config = TOPIC_CONFIG[topic];
  let prompt = `你是「小职」，职途星平台的AI朋友。现在你正在给用户上一堂互动课——「${config.name}」。

${config.basePrompt}

【当前用户上下文】
`;

  if (request.userContext) {
    const ctx = request.userContext;
    if (ctx.recentInterviewWeakness) {
      prompt += `- 最近面试暴露的弱点：${ctx.recentInterviewWeakness}\n`;
    }
    if (ctx.targetPosition) {
      prompt += `- 目标岗位：${ctx.targetPosition}\n`;
    }
    if (ctx.skillGaps && ctx.skillGaps.length > 0) {
      prompt += `- 技能差距：${ctx.skillGaps.join('、')}\n`;
    }
  }

  if (request.customPrompt) {
    prompt += `- 用户额外需求：${request.customPrompt}\n`;
  }

  prompt += `
【重要】
- 这是互动课，不是文章。每次输出一小段，然后等用户回应
- 保持"小职"的朋友感——你不是老师，你是懂这个领域的朋友在分享经验
- 用桂电学生能理解的例子
- 如果用户说"跳过""下一节"或"继续"，直接进入下一步`;

  return prompt;
}

// 获取所有可用课程主题（供前端展示）
export function getAvailableCourses() {
  return Object.entries(TOPIC_CONFIG).map(([id, config]) => ({
    id: id as CourseTopic,
    name: config.name,
    description: config.description,
  }));
}
