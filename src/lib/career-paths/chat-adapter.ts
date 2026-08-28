// 职途星组态引擎 · 小职对话适配器
// 从自然语言提取画像 → 跑引擎 → 格式化输出

import { RawProfile, EncodedProfile, MatchReport } from '@/lib/career-paths/types';
import { encodeProfile } from '@/lib/career-paths/engine/condition_encoder';
import { getMatchReport } from '@/lib/career-paths/engine/rule_engine';
import { interviewRadar, type InterviewRadarReport } from '@/lib/career-paths/engine/interview_radar';
import { decodeSubtext, type SubtextReport } from '@/lib/career-paths/engine/subtext_dictionary';
import { analyzeCapabilityGap, findJobInText, type CapabilityReport } from '@/lib/career-paths/engine/capability_dictionary';

/** 从自然语言文本提取画像字段 */
export function extractProfileFromText(text: string): Partial<RawProfile> {
  const _lower = text.toLowerCase();
  const profile: Partial<RawProfile> = {};

  // === 学校 ===
  if (/桂电|桂林电子|桂林电子科技大学/.test(text)) {
    profile.school = '桂林电子科技大学';
  } else if (/清华|北大|复旦|上交|浙大|南大/.test(text)) {
    profile.school = '985高校';
  } else if (/大学/.test(text)) {
    profile.school = '本科高校';
  }

  // === 专业 ===
  if (/人力|HR|工商管理|工管/.test(text)) profile.major = '人力资源管理';
  else if (/计算机|软件/.test(text)) profile.major = '计算机科学与技术';
  else if (/电子/.test(text)) profile.major = '电子科学与技术';
  else if (/机械/.test(text)) profile.major = '机械设计制造及其自动化';
  else if (/英语/.test(text)) profile.major = '英语';
  else if (/物联网/.test(text)) profile.major = '物联网工程';
  else if (/自动化/.test(text)) profile.major = '自动化';
  else if (/电气/.test(text)) profile.major = '电气工程及其自动化';
  else if (/通信/.test(text)) profile.major = '通信工程';
  else if (/电商/.test(text)) profile.major = '电子商务';
  else if (/会计/.test(text)) profile.major = '会计学';
  else if (/工业工程/.test(text)) profile.major = '工业工程';
  else if (/机电/.test(text)) profile.major = '机械电子工程';
  else if (/人工智能|AI/.test(text)) profile.major = '人工智能';
  else if (/设计/.test(text)) profile.major = '设计学';
  else if (/日语/.test(text)) profile.major = '日语';
  else if (/数学|统计/.test(text)) profile.major = '数学与应用数学';

  // === 学历 ===
  if (/硕士|研究生/.test(text)) profile.degree = '硕士';
  else if (/博士/.test(text)) profile.degree = '博士';
  else if (/大专|专科/.test(text)) profile.degree = '大专';
  else profile.degree = '本科';

  // === 实习数量 ===
  // 匹配各种格式: "1段实习" "有一段大厂实习" "有2段" "三段" "两段实习"
  // 先试数字版（"1段大厂实习"）
  const numMatch = text.match(/(?:有)?(\d+)\s*段.*?实习/);
  if (numMatch) {
    profile.internshipCount = Math.min(parseInt(numMatch[1]), 5);
  } else if (/有.*?实习|实习过|一段|1段|有一/.test(text)) {
    // "有一段大厂实习"、"有实习"、"1段实习"、"一段实习"
    profile.internshipCount = 1;
  } else if (/两段|2段/.test(text)) {
    profile.internshipCount = 2;
  } else if (/三段|3段/.test(text)) {
    profile.internshipCount = 3;
  } else if (/没有实习|无实习|0段/.test(text)) {
    profile.internshipCount = 0;
  }

  // === 实习质量 ===
  if (/头部|BAT|腾讯|阿里|字节|华为|大疆|世界500强/.test(text)) profile.internshipQuality = '头部';
  else if (/大厂|京东|美团|网易|小米|百度|比亚迪|宁德/.test(text)) profile.internshipQuality = '大厂';
  else if (/中厂|中型|知名/.test(text)) profile.internshipQuality = '中厂';
  else if (/小厂|小公司|初创/.test(text)) profile.internshipQuality = '小厂';

  // === 技能 ===
  const skillKeywords = [
    'Python', 'Java', 'C++', 'JavaScript', 'TypeScript', 'SQL',
    'React', 'Vue', 'Node', 'HTML', 'CSS',
    'Photoshop', 'PS', 'PR', 'AE', 'Figma',
    'Excel', 'PPT', 'Word', 'Office',
    'SolidWorks', 'CAD', 'MATLAB', 'PLC',
    '数据分析', '机器学习', '深度学习', 'NLP',
    '招聘', '面试', 'HRIS', 'ATS', '北森',
    '项目管理', 'PMP', '敏捷',
    '英语六级', '英语四级', '雅思', '托福',
    '日语', '会计证', 'CPA',
  ];
  const found = skillKeywords.filter(sk => new RegExp(sk, 'i').test(text));
  if (found.length > 0) {
    profile.skills = found;
  }

  return profile;
}

/** 检查画像是否完整（可运行引擎） */
export function isProfileComplete(profile: Partial<RawProfile>): boolean {
  return !!(profile.school && profile.major && profile.degree
    && profile.internshipCount !== undefined
    && profile.internshipQuality
    && profile.skills && profile.skills.length > 0);
}

/** 列出缺失字段 */
export function getMissingFields(profile: Partial<RawProfile>): string[] {
  const missing: string[] = [];
  if (!profile.school) missing.push('学校');
  if (!profile.major) missing.push('专业');
  if (!profile.degree) missing.push('学历');
  if (profile.internshipCount === undefined) missing.push('实习段数');
  if (!profile.internshipQuality) missing.push('实习质量（无/小厂/中厂/大厂/头部）');
  if (!profile.skills || profile.skills.length === 0) missing.push('掌握的技能');
  return missing;
}

/** 将匹配报告格式化为小职的对话式回复 */
export function formatReportForChat(report: MatchReport, _raw: RawProfile): string {
  const { summary, routes } = report;

  // 最佳路径
  let output = '';

  if (summary.strong_match > 0 || summary.match > 0) {
    // 有匹配
    const topRoutes = routes.filter(r => r.verdict === 'strong_match' || r.verdict === 'match').slice(0, 5);
    const best = topRoutes[0];

    if (best) {
      const badge = best.verdict === 'strong_match' ? '⭐' : '🔵';
      output += `${badge} **${best.name}** **${Math.round(best.match_rate * 100)}%**`;
      if (summary.strong_match >= 2 && topRoutes.indexOf(best) === 0) {
        output += ' ← **最推荐**';
      }
      output += '\n\n';
    }

    output += '**匹配结果一览：**\n\n';
    topRoutes.forEach((r, i) => {
      const icon = r.verdict === 'strong_match' ? '🟢' : '🔵';
      const tag = r.verdict === 'strong_match' ? '强匹配' : '匹配';
      output += `${icon} **#${i + 1} ${r.name}** — ${Math.round(r.match_rate * 100)}%（${tag}）\n`;

      // 条件明细
      r.field_details.forEach(fd => {
        const mark = fd.status === 'met' ? '✅' : fd.status === 'near_gap' ? '⚠️' : '❌';
        output += `  ${mark} ${fd.label}：${fd.current} → 要求${fd.required}\n`;
      });

      // 差距建议
      if (r.gaps.length > 0) {
        output += `  💡 差距：${r.gaps.map(g => `${g.label}（${g.advice}）`).join('、')}\n`;
      }
      output += '\n';
    });

    // 弱匹配/不匹配的简写
    const partials = routes.filter(r => r.verdict === 'partial_match');
    const noMatches = routes.filter(r => r.verdict === 'no_match');
    if (partials.length > 0) {
      output += `🟡 还有 **${partials.length}条** 弱匹配路径（差一点就够着），可以针对性补强后考虑。\n\n`;
    }
    if (noMatches.length > 0) {
      output += `⚪ **${noMatches.length}条** 路径暂不匹配（专业或门槛不达标）。\n\n`;
    }

  } else {
    // 全不匹配
    output += '😅 目前12条路径中暂时没有和你匹配的方向。\n\n';
    output += '可能原因：\n';
    output += '- 专业不在白名单中\n';
    output += '- 实习经历或技能门槛不够\n\n';
    output += '💡 **建议**：可以先积累一段实习、补充一些岗位通用技能后再来看看。';
  }

  output += `\n---\n*匹配基于 ${summary.total_routes} 条桂电学生求职路径 · 数据来自职途星组态引擎*`;

  return output;
}

/**
 * 问用户补充缺失信息的提示
 */
export function generateMissingQuestion(missing: string[]): string {
  if (missing.length === 0) return '';

  // 第一次只问最关键的一项
  const priority: Record<string, string> = {
    '专业': '你是什么专业的呀？',
    '实习段数': '你有过几段实习经历？',
    '实习质量': '你之前的实习大概是什么级别的公司？（小厂/中厂/大厂/头部）',
    '掌握的技能': '你平时掌握了哪些技能或工具？',
    '学校': '你是哪个学校的？',
    '学历': '你是本科还是硕士？',
  };

  // 按优先级排序
  const ordered = ['专业', '实习段数', '掌握的技能', '实习质量', '学校', '学历'];
  const prioritized = ordered.filter(f => missing.includes(f));

  if (prioritized.length > 0) {
    return priority[prioritized[0]] || `方便告诉我你的${missing[0]}吗？`;
  }

  return '方便再多说一些你的背景信息吗？比如专业、实习、技能这些～';
}

/**
 * 一键处理：从自然语言输入 → 引擎结果 → 回复
 * 返回 { reply: string, needsMoreInfo: boolean }
 */
export function handleCareerPathsQuery(text: string): {
  reply: string;
  needsMoreInfo: boolean;
  profile?: RawProfile;
  report?: MatchReport;
} {
  const profile = extractProfileFromText(text);

  if (!isProfileComplete(profile)) {
    const missing = getMissingFields(profile);
    // 如果有部分信息，先告诉用户已识别到的，再问缺失的
    let reply = '';
    const recognized: string[] = [];
    if (profile.major) recognized.push(`专业：${profile.major}`);
    if (profile.internshipCount !== undefined) recognized.push(`实习：${profile.internshipCount}段`);
    if (profile.skills && profile.skills.length > 0) recognized.push(`技能：${profile.skills.join('、')}`);
    if (profile.school) recognized.push(`学校：${profile.school}`);
    if (profile.internshipQuality) recognized.push(`实习质量：${profile.internshipQuality}`);
    if (profile.degree) recognized.push(`学历：${profile.degree}`);

    if (recognized.length > 0) {
      reply = `我收到了你的信息：${recognized.join('，')}。\n\n`;
    }

    reply += generateMissingQuestion(missing);
    return { reply, needsMoreInfo: true };
  }

  // 完整画像 → 跑引擎
  const encoded: EncodedProfile = encodeProfile(profile as RawProfile);
  const report = getMatchReport(encoded);
  const reply = formatReportForChat(report, profile as RawProfile);

  return { reply, needsMoreInfo: false, profile: profile as RawProfile, report };
}

// ============================================================
// 表达链判断力 · chat 接入（A3 能力翻译 / A4 真实性红线）
// 与简历编辑器共用同一引擎：narrative.ts / truthfulness.ts，守住四真红线。
// 只做「从自然语言抽取经历上下文 + 判断是否可跑」，引擎调用由 chat/route.ts 组合（先 A4 后 A3）。
// ============================================================

/** 是否命中「这段经历」角色词（用于识别用户是否提供了可分析的经历） */
function hasRoleContext(text: string): boolean {
  return /(负责|参与|我|在.{0,8}(实习|工作|做)|协助|主导|完成|带领|独立|统筹|做过|实习|任职|承担|项目)/.test(text);
}

/**
 * 从自然语言抽取经历描述 experience。
 * 优先取「：/：」之后的正文；否则用整段文本（用户可能直接粘贴完整经历）。
 * 剥离纯指令引导词（帮我翻译/帮我包装/看看/诊断等），避免污染正文。
 */
function extractExperience(text: string): string | null {
  const trimmed = (text || '').trim();
  if (!trimmed || !hasRoleContext(trimmed)) return null;

  // 取「:」或「：」后的正文（用户常写「帮我翻译这段经历：我在…」）
  const sepIdx = trimmed.indexOf('：') >= 0 ? trimmed.indexOf('：') : trimmed.indexOf(':');
  const hasSep = sepIdx >= 0;
  let body = hasSep ? trimmed.slice(sepIdx + 1) : trimmed;

  // 剥掉纯指令词（只剥前缀，保留真实经历）
  body = body
    .replace(/^(帮我|请|麻烦|能不能|可以|我想|我想让你|你帮我)\s*/g, '')
    .replace(/^(翻译|包装|改写|写成|美化|优化|润色|表述|诊断|检测|分析|看看|评价|读一下|写一下)\s*(一下|这段经历|我的经历|这段|这个|上面|它|这段文字)?\s*/g, '')
    .trim();

  // 信息不全：剥完后为空 / 过短 / 无冒号且仍是纯指令残留（如「帮我翻译这段经历」），
  // 都视为用户没给经历 → 返回 null 触发追问，避免把指令本身当成经历去分析。
  if (!body) return null;
  if (body.length < 4) return null;
  if (!hasSep && !/(负责|参与|完成|主导|带领|独立|获得|实现|优化|搭建|运营|设计|开发|分析|撰写|组织|统筹|处理|开展|协助|做过|实习|任职|承担|项目|课程|课题|论文|研究|系统|数据|整理|编写)/.test(body)) {
    return null;
  }
  return body.replace(/^[，。、！？,.!\s]+/, '');
}

/** 从自然语言抽取目标岗位 targetJob（选填），如「投产品岗」→ 「产品」 */
function extractTargetJob(text: string): string | undefined {
  const m = (text || '').match(
    /(?:投|目标|想做|想投|应聘|面向|去|往|考虑)\s*(?:的)?([\u4e00-\u9fa5A-Za-z]{1,15}?)(?:岗位|岗|职位|方向|职业)/,
  );
  return m ? m[1] : undefined;
}

/** A3：能力翻译/叙事 chat 查询（抽取上下文，引擎调用由 route 联动完成） */
export function handleNarrativeChatQuery(text: string): {
  needsMoreInfo: boolean;
  reply: string;
  experience?: string;
  targetJob?: string;
} {
  const exp = extractExperience(text);
  if (!exp) {
    return {
      needsMoreInfo: true,
      reply: '把这段经历完整发我，再告诉我你想投的岗位，我帮你翻译成企业看得懂的表达～',
    };
  }
  const targetJob = extractTargetJob(text);
  return { needsMoreInfo: false, reply: '', experience: exp, targetJob };
}

/** A4：真实性红线 chat 查询（抽取上下文，引擎调用由 route 联动完成） */
export function handleTruthChatQuery(text: string): {
  needsMoreInfo: boolean;
  reply: string;
  experience?: string;
  targetJob?: string;
} {
  const exp = extractExperience(text);
  if (!exp) {
    return {
      needsMoreInfo: true,
      reply: '把这段经历完整发我，我帮你做一遍真实性红线扫描，看看会不会被背调问倒～',
    };
  }
  const targetJob = extractTargetJob(text);
  return { needsMoreInfo: false, reply: '', experience: exp, targetJob };
}

// ============================================================
// 行业雷达 · chat 接入（B1 面试行业雷达）
// 复用 interview_radar.ts 引擎：从自然语言抽行业/专业 → 跑引擎 → 格式化回复。
// 零模型成本，输出「解释 + 路径 + 建议」，不输出单一分数。
// ============================================================

/** 专业关键词（用于从自然语言里反推推荐行业） */
const MAJOR_HINTS = [
  '计算机', '软件', '通信', '电子', '微电子', '集成电路', '机械', '机电', '车辆',
  '金融', '会计', '财务', '人力', '工商', '市营', '物流', '电子商务', '新媒体',
  '数据', '统计', '信管',
];

function extractMajorFromText(text: string): string | undefined {
  for (const m of MAJOR_HINTS) {
    if (text.includes(m)) return m;
  }
  return undefined;
}

/** 把行业雷达报告格式化成 chat 可读文本 */
function formatRadarForChat(report: InterviewRadarReport): string {
  const radar = report.radar;
  const lines: string[] = [];
  lines.push(`🎯 ${report.matchedIndustry}面试雷达`);
  lines.push(`一句话：${report.summary}`);
  if (report.majorImplication) lines.push(`📌 ${report.majorImplication}`);
  lines.push('');
  lines.push('【考察重点】');
  radar.focus.forEach((f) => lines.push(`• ${f.module}（权重 ${f.weight}%）：${f.how}`));
  lines.push('');
  lines.push('【高频问题 + 潜台词】');
  radar.questions.slice(0, 5).forEach((q) => lines.push(`• Q：${q.question}\n  ⚡ 潜台词：${q.subtext}\n  💡 ${q.tip}`));
  if (radar.redFlags.length > 0) {
    lines.push('');
    lines.push('【雷区·别踩】');
    radar.redFlags.slice(0, 3).forEach((r) => lines.push(`• ${r}`));
  }
  if (radar.prepTips.length > 0) {
    lines.push('');
    lines.push('【准备建议】');
    radar.prepTips.slice(0, 3).forEach((t) => lines.push(`• ${t}`));
  }
  return lines.join('\n');
}

/** B1：面试行业雷达 chat 查询（抽行业/专业 → 跑引擎） */
export function handleInterviewRadarChatQuery(text: string): {
  needsMoreInfo: boolean;
  reply: string;
  industry?: string;
  major?: string;
  report?: InterviewRadarReport;
} {
  const cleaned = (text || '').trim();
  if (!cleaned) {
    return { needsMoreInfo: true, reply: '告诉我你想投的行业或你的专业，我帮你拆这个行业面试会重点考察什么～' };
  }
  const major = extractMajorFromText(cleaned);
  const report = interviewRadar(cleaned, major);
  if (report.needsMoreInfo) {
    return { needsMoreInfo: true, reply: report.summary, industry: undefined, major, report };
  }
  return { needsMoreInfo: false, reply: formatRadarForChat(report), industry: report.input, major, report };
}

// ============================================================
// 潜台词 · chat 接入（B2 潜台词词条库）
// 复用 subtext_dictionary.ts 引擎：从自然语言抽要分析的文本 → decodeSubtext → 格式化回复。
// 零模型成本，只做「翻译」不替用户拔高，守四真。
// ============================================================

/** 从自然语言抽取「要拆解的文本」：优先引号内 / 冒号后，否则剥掉提问前缀 */
function extractSubtextText(text: string): string | null {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;
  // 引号内内容优先（「"..."」「'...'」「『...』」「“...”」）
  const quoted = trimmed.match(/[“"'『「]([^”"'』」]{1,30})[”"'』」]/);
  if (quoted && quoted[1]) return quoted[1].trim();
  // 冒号后正文（用户常写「帮我翻译这句话：弹性工作是福报吗」）
  const sepIdx = trimmed.indexOf('：') >= 0 ? trimmed.indexOf('：') : trimmed.indexOf(':');
  if (sepIdx >= 0) {
    const body = trimmed.slice(sepIdx + 1).trim();
    if (body) return body;
  }
  // 否则剥掉提问/指令前缀
  let body = trimmed
    .replace(/^(帮我|请|麻烦|能不能|可以|我想|我想让你|你帮我|请问|问一下)\s*/g, '')
    .replace(/^(翻译|拆解|解释|看看|分析|理解|说说|讲讲|读一下|说一下|查一下|品味|读懂)\s*(一下|下|一下这个|一句话|这句话|这话|这段|这个|它|上面|这句)?\s*(潜台词|黑话|话外音|言外之意|背后意思|是什么意思|是啥意思|啥意思|真实意思|意思)?(是|有)?\s*/g, '')
    .trim();
  return body.length >= 2 ? body : null;
}

/** 把潜台词报告格式化成 chat 可读文本 */
function formatSubtextForChat(report: SubtextReport): string {
  const lines: string[] = [];
  lines.push(`🕵️ 潜台词翻译`);
  lines.push(`一句话：${report.summary}`);
  lines.push('');
  report.items.forEach((it) => {
    lines.push(`【${it.categoryLabel}】${it.phrase}`);
    lines.push(`  表面：${it.surface}`);
    lines.push(`  人话：${it.meaning}`);
    lines.push(`  风险：${it.risk === 'high' ? '🔴 高' : it.risk === 'medium' ? '🟡 中' : '🟢 低'}`);
    lines.push(`  建议：${it.advice}`);
    lines.push('');
  });
  return lines.join('\n');
}

/** B2：潜台词 chat 查询（抽文本 → decodeSubtext） */
export function handleSubtextChatQuery(text: string): {
  needsMoreInfo: boolean;
  reply: string;
  input?: string;
  report?: SubtextReport;
} {
  const target = extractSubtextText(text);
  if (!target) {
    return { needsMoreInfo: true, reply: '把你想拆的那段话发我（JD、简历、面试问题、公司黑话都可以），我帮你翻译成人话～' };
  }
  const report = decodeSubtext(target);
  if (!report.items || report.items.length === 0) {
    return {
      needsMoreInfo: true,
      reply: `${report.summary}\n\n也可以直接把整段 JD、简历句或面试问题发我，我帮你逐句拆。`,
      input: target,
      report,
    };
  }
  return { needsMoreInfo: false, reply: formatSubtextForChat(report), input: target, report };
}

// ============================================================
// 能力翻译词典 · chat 接入（横向岗位对标 + 差距诊断）
// 复用 capability_dictionary.ts 引擎：从自然语言抽目标岗位 + 经历 → analyzeCapabilityGap → 格式化回复。
// 判断力 ≠ 打分：输出「解释 + 路径 + 建议」，零模型成本，守四真。
// ============================================================

/** 从自然语言抽取「目标岗位」：优先词典内置岗位（findJobInText），否则抽「对标/想做/目标」后的岗位短语 */
function extractCapJobFromText(text: string): string | undefined {
  const cleaned = (text || '').trim();
  if (!cleaned) return undefined;
  const builtin = findJobInText(cleaned);
  if (builtin) return builtin;
  // 自由岗位短语：对标XX / 想做XX / 目标XX / XX岗位 / XX工程师 / XX经理 等
  const m = cleaned.match(/(?:对标|目标|想做|想做|投|求职|匹配|看看|分析|评估|面向|适合|意向)\s*([\u4e00-\u9fa5A-Za-z]{1,12}?(?:工程师|经理|专员|师|运营|分析|研发|岗位|岗))/);
  if (m && m[1]) return m[1].trim();
  // 直接「XX岗位」式
  const m2 = cleaned.match(/([\u4e00-\u9fa5A-Za-z]{1,12}?(?:工程师|经理|专员|师|运营|分析|研发))(?:岗位|岗|方向)/);
  if (m2 && m2[1]) return m2[1].trim();
  return undefined;
}

/** 从自然语言抽取「经历」：引号/冒号后正文，否则剥掉岗位词 + 提问前缀 */
function extractCapExperienceFromText(text: string, targetJob?: string): string | undefined {
  const trimmed = (text || '').trim();
  if (!trimmed) return undefined;
  // 引号内优先
  const quoted = trimmed.match(/[“"『「]([^”"』」]{6,60})[”"』」]/);
  if (quoted && quoted[1]) return quoted[1].trim();
  // 冒号后正文（用户常写「对标产品经理：我做过Moka实习...」）
  const sepIdx = trimmed.indexOf('：') >= 0 ? trimmed.indexOf('：') : trimmed.indexOf(':');
  if (sepIdx >= 0) {
    const body = trimmed.slice(sepIdx + 1).trim().replace(/^[。，,！!？?\s]+/, '');
    if (body.length >= 4) return body;
  }
  // 剥掉岗位词 + 提问前缀
  let body = trimmed
    .replace(targetJob || '', '')
    .replace(/^(帮我|请|麻烦|能不能|可以|我想|我想让你|你帮我|请问|问一下|想看看|帮我看看|看看|分析一下|评估一下|对标一下|测一下)\s*/g, '')
    .replace(/(对标|目标|想做|求职|匹配|看看|分析|评估|面向|适合|意向|岗位|方向|值多少|还差什么|还差|差距|怎么样|如何)\s*/g, '')
    .trim();
  if (body.length >= 4) return body;
  return undefined;
}

/** 把能力翻译词典报告格式化成 chat 可读文本 */
function formatCapabilityForChat(report: CapabilityReport): string {
  const lines: string[] = [];
  lines.push(`🎯 能力翻译：${report.matchedJob}${report.matchedCategory ? `（${report.matchedCategory}）` : ''}`);
  lines.push(`一句话：${report.summary}`);
  if (!report.known) {
    lines.push('');
    lines.push('⚠️ 该岗位词典还没细化到行业级，先用通用四层框架对照。想更准，告诉我具体行业+岗位。');
  }
  lines.push('');
  lines.push('【已有优势】');
  if (report.advantages.length > 0) {
    report.advantages.forEach((a) => lines.push(`• ${a}`));
  } else {
    lines.push('• （还没填经历，无法判断已覆盖哪些）');
  }
  if (report.gaps.length > 0) {
    lines.push('');
    lines.push('【关键差距 + 补课路径】');
    report.gaps.forEach((g) => {
      lines.push(`• ${g.skill}`);
      lines.push(`  ${g.gap}`);
      lines.push(`  💡 ${g.path}`);
    });
  }
  if (report.recommendations.length > 0) {
    lines.push('');
    lines.push('【推荐投递】');
    lines.push(`• ${report.recommendations.join(' / ')}`);
  }
  return lines.join('\n');
}

/** 能力翻译词典 chat 查询（抽岗位+经历 → analyzeCapabilityGap） */
export function handleCapabilityChatQuery(text: string): {
  needsMoreInfo: boolean;
  reply: string;
  targetJob?: string;
  experience?: string;
  report?: CapabilityReport;
} {
  const cleaned = (text || '').trim();
  if (!cleaned) {
    return { needsMoreInfo: true, reply: '告诉我你想对标的目标岗位（如：产品经理 / 工艺工程师），再把你那段经历发我，我帮你翻译成企业语言、标出差距和补课路径～' };
  }
  const targetJob = extractCapJobFromText(cleaned);
  if (!targetJob) {
    return { needsMoreInfo: true, reply: '我没认出你要对标的岗位。可以这样说：「对标产品经理，我做过Moka实习，用Figma做PRD」，我帮你判断经历值多少、还差什么～' };
  }
  const experience = extractCapExperienceFromText(cleaned, targetJob);
  const report = analyzeCapabilityGap({ targetJob, experience });
  return { needsMoreInfo: false, reply: formatCapabilityForChat(report), targetJob, experience, report };
}
