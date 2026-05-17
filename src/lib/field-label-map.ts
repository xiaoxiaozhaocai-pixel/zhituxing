/**
 * 英文字段名 → 中文标签映射
 * 统一管理，供 ai-response-parser.ts 和其他模块引用
 * 规则：所有英文字段名绝对不能出现在用户页面上
 */

export const FIELD_LABEL_MAP: Record<string, string> = {
  // === 匹配相关 ===
  match_score: '匹配度',
  match_reason: '匹配原因',
  job_name: '岗位名称',
  job_title: '岗位名称',
  position: '职位',
  salary_range: '薪资范围',
  salary: '薪资',
  salary_min: '最低薪资',
  salary_max: '最高薪资',
  industry: '行业',
  city: '城市',
  company: '公司',

  // === 技能相关 ===
  required_skills: '所需技能',
  missing_skills: '缺失技能',
  current_skills: '已有技能',
  gap_skills: '技能差距',
  skills: '技能',
  skill_level: '技能等级',
  skill_name: '技能名称',
  skill_analysis: '技能分析',

  // === 岗位相关 ===
  top_jobs: '推荐岗位',
  career_path: '职业路径',
  career_diagnosis: '职业诊断',
  career_direction: '职业方向',

  // === 评分相关 ===
  score: '评分',
  overall_score: '综合评分',
  total_score: '总分',
  dimension: '维度',
  dimensions: '维度评分',
  dimension_scores: '维度评分',
  probability: '录取概率',
  percentile: '百分位',
  level: '等级',
  rating: '评级',
  competency: '胜任力',

  // === 人格相关 ===
  personality: '人格适配',
  personality_type: '人格类型',
  mbti: 'MBTI类型',
  interest: '兴趣倾向',
  values: '价值观契合',
  risk_tolerance: '风险承受',
  work_style: '工作风格',

  // === 专业相关 ===
  major: '专业匹配',
  major_name: '专业名称',
  ability: '能力评估',
  abilities: '能力',
  strength: '优势',
  strengths: '优势',
  weakness: '不足',
  weaknesses: '不足',

  // === 规划相关 ===
  timeline: '时间规划',
  phase: '阶段',
  stage: '阶段',
  task: '任务',
  tasks: '任务',
  goal: '目标',
  duration: '时长',
  action_items: '行动清单',
  improvement_plan: '提升计划',
  learning_path: '学习路径',

  // === 建议相关 ===
  suggestion: '建议',
  suggestions: '改进建议',
  advice: '建议',
  recommendation: '推荐',
  recommendations: '推荐',

  // === 资源相关 ===
  resources: '学习资源',
  courses: '推荐课程',
  books: '推荐书籍',
  certificates: '证书建议',

  // === 面试相关 ===
  interview_question: '面试问题',
  interview_questions: '面试问题',
  evaluation_criteria: '评分标准',
  answer_suggestion: '回答建议',
  answer_tips: '回答技巧',
  follow_up: '追问',

  // === 教育相关 ===
  school_name: '院校名称',
  admission_rate: '录取率',
  exam_subjects: '考试科目',
  exam_difficulty: '考试难度',
  preparation_time: '备考时长',

  // === 分析相关 ===
  gap_analysis: '差距分析',
  swot_analysis: 'SWOT分析',
  conclusion: '结论',
  summary: '总结',
  description: '描述',
  reason: '原因',
  overview: '概述',
  detail: '详情',

  // === 版本/类型 ===
  basic_version: '基础版',
  full_version: '完整版',
  precise_match_conclusion: '精准匹配结论',
  type: '类型',
  category: '分类',
  status: '状态',
  priority: '优先级',
  difficulty: '难度',

  // === 其他 ===
  name: '名称',
  title: '标题',
  label: '标签',
  tags: '标签',
  note: '备注',
  tips: '提示',
  warning: '警告',
  risk: '风险',
  benefit: '收益',
  cost: '成本',
  progress: '进度',
  deadline: '截止日期',
  created_at: '创建时间',
  updated_at: '更新时间',
};
