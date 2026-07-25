// 职途星组态引擎 · 小职对话适配器
// 从自然语言提取画像 → 跑引擎 → 格式化输出

import { RawProfile, EncodedProfile, MatchReport, FIELD_LABELS } from '@/lib/career-paths/types';
import { encodeProfile } from '@/lib/career-paths/engine/condition_encoder';
import { getMatchReport } from '@/lib/career-paths/engine/rule_engine';

/** 从自然语言文本提取画像字段 */
export function extractProfileFromText(text: string): Partial<RawProfile> {
  const lower = text.toLowerCase();
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
export function formatReportForChat(report: MatchReport, raw: RawProfile): string {
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
