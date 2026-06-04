/**
 * AI Response Parser — 通用AI输出解析器
 * 将AI智能体返回的混合文本（自然语言+结构化数据）解析为分段渲染指令
 */

// ========== 类型定义 ==========

export type SegmentType = 'text' | 'cards' | 'timeline' | 'tags' | 'scores' | 'promotion' | 'disclaimer' | 'table';

export interface ParsedSegment {
  type: SegmentType;
  data: unknown;
}

export interface CardItem {
  title: string;
  subtitle?: string;
  description?: string;
  score?: number;
  tags?: string[];
  isBest?: boolean;
}

export interface TimelineItem {
  phase: string;
  title: string;
  tasks: string[];
}

export interface TagGroup {
  label: string;
  tags: { name: string; variant: 'success' | 'warning' | 'info' }[];
}

export interface ScoreItem {
  name: string;
  score: number;
  max?: number;
  label?: string;
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface PromotionData {
  featureName: string;
  features: string[];
}

// ========== 字段名映射 ==========

import { FIELD_LABEL_MAP } from './field-label-map';

// FIELD_LABEL_MAP 已迁移到 field-label-map.ts 统一管理

// ========== 工具函数 ==========

/** URL编码的中文解码 */
function decodeUrlStr(s: string): string {
  try {
    if (/%[0-9A-Fa-f]{2}/.test(s)) {
      return decodeURIComponent(s);
    }
  } catch { /* ignore */ }
  return s;
}

/** 字段名转中文标签 */
function fieldToLabel(field: string): string {
  const clean = field.replace(/[*_`#]/g, '').trim();
  return FIELD_LABEL_MAP[clean] || FIELD_LABEL_MAP[clean.toLowerCase()] || clean;
}

/** 提取数值 */
function extractNumber(val: unknown): number | null {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const m = val.match(/(\d+\.?\d*)/);
    if (m) return parseFloat(m[1]);
  }
  return null;
}

/** 安全JSON解析 */
function tryParseJSON(text: string): unknown | null {
  try {
    // 尝试直接解析
    const r = JSON.parse(text);
    return r;
  } catch { /* continue */ }
  try {
    // 尝试修复常见问题：末尾逗号
    const fixed = text.replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(fixed);
  } catch { /* continue */ }
  return null;
}

// ========== 核心解析逻辑 ==========

/** 检测文本是否包含结构化数据 */
function hasStructuredContent(text: string): boolean {
  const indicators = [
    /^\s*\w+:\s*[/<{[]/m,           // field: value 结构
    /^\s*-\s+/m,                      // YAML列表
    /^\s*\d+\.\s+/m,                  // 编号列表
    /<<DATA:/,                         // DATA标记
    /<<END>>/,                         // DATA标记
    /match_score|salary_range|top_jobs|career_path|timeline|probability|dimension|competency|gap_analysis/i,
    /"(\w+)":\s*"/,                   // JSON key-value
    /\*\*\w+\*\*:/,                   // Markdown bold key
    /^\s*\|.+\|\s*$/m,               // Markdown 表格行
  ];
  return indicators.some(p => p.test(text));
}

/** 移除<<DATA>>标记块，返回纯文本部分 */
export function stripDataMarkers(text: string): string {
  return text.replace(/<<DATA:type=\w+>>[\s\S]*?<<END>>/g, '').trim();
}

/** 尝试从文本中提取<<DATA>>块 */
function extractDataBlocks(text: string): { type: string; json: unknown }[] {
  const results: { type: string; json: unknown }[] = [];
  const regex = /<<DATA:type=(\w+)>>\s*([\s\S]*?)\s*<<END>>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const type = match[1];
    const content = match[2].trim();
    const parsed = tryParseJSON(content);
    if (parsed) {
      results.push({ type, json: parsed });
    }
  }
  return results;
}

/** 解析键值对段落（如 "match_score: 90" 或 "**匹配度**: 90%"） */
function parseKeyValueLines(lines: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of lines) {
    const kvMatch = line.match(/^\s*(?:\*\*)?(\w+)(?:\*\*)?\s*[:：]\s*(.*)/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const value = decodeUrlStr(kvMatch[2].trim().replace(/\*\*/g, ''));
      result[key] = value;
    }
  }
  return result;
}

/** 从列表项中提取卡片数据 */
function extractCardsFromList(items: string[]): CardItem[] {
  return items.map(item => {
    const decoded = decodeUrlStr(item.replace(/^\s*[-*]\s*/, '').replace(/^\s*\d+\.\s*/, '').trim());
    // 尝试提取分数
    const scoreMatch = decoded.match(/(\d+)\s*[%％分]/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : undefined;
    // 尝试提取标题和描述
    const colonIdx = decoded.indexOf('：') > -1 ? decoded.indexOf('：') : decoded.indexOf(': ');
    if (colonIdx > 0 && colonIdx < 30) {
      return {
        title: decoded.substring(0, colonIdx).replace(/\*\*/g, '').trim(),
        description: decoded.substring(colonIdx + 1).replace(/\*\*/g, '').trim(),
        score,
      };
    }
    return {
      title: decoded.replace(/\*\*/g, ''),
      score,
    };
  });
}

/** 解析JSON对象为卡片列表 */
function extractCardsFromJSON(obj: Record<string, unknown>): CardItem[] {
  const cards: CardItem[] = [];

  // 查找数组字段
  for (const [key, val] of Object.entries(obj)) {
    if (Array.isArray(val) && val.length > 0) {
      const items = val;
      if (typeof items[0] === 'object' && items[0] !== null) {
        // 对象数组 → 卡片
        for (let i = 0; i < items.length; i++) {
          const item = items[i] as Record<string, unknown>;
          const card: CardItem = {
            title: String(item.job_name || item.title || item.name || item.school_name || item.position || `推荐项 ${i + 1}`),
            isBest: i === 0,
          };
          if (item.salary_range || item.salary) card.subtitle = String(item.salary_range || item.salary);
          if (item.match_reason || item.reason || item.description) card.description = String(item.match_reason || item.reason || item.description);
          if (item.match_score || item.score || item.probability) {
            card.score = extractNumber(item.match_score || item.score || item.probability) ?? undefined;
          }
          if (item.industry || item.city || item.company) {
            card.subtitle = [item.industry, item.city, item.company].filter(Boolean).map(String).join(' · ');
          }
          // 技能标签
          const skillKeys = ['required_skills', 'missing_skills', 'skills', 'tags', 'exam_subjects'];
          for (const sk of skillKeys) {
            if (Array.isArray(item[sk])) {
              card.tags = (item[sk] as unknown[]).map(s => String(s));
              break;
            }
          }
          cards.push(card);
        }
      } else if (typeof items[0] === 'string') {
        // 字符串数组 → 简单卡片
        return extractCardsFromList(items as string[]);
      }
    }
  }

  // 如果没有找到数组，把整个对象当作单张卡片
  if (cards.length === 0) {
    const title = String(obj.job_name || obj.title || obj.name || obj.position || '分析结果');
    const card: CardItem = { title };
    if (obj.salary_range || obj.salary) card.subtitle = String(obj.salary_range || obj.salary);
    if (obj.match_reason || obj.reason || obj.description) card.description = String(obj.match_reason || obj.reason || obj.description);
    const score = extractNumber(obj.match_score || obj.score || obj.probability || obj.overall_score);
    if (score !== null) card.score = score;
    cards.push(card);
  }

  return cards;
}

/** 解析JSON对象为评分列表 */
function extractScoresFromJSON(obj: Record<string, unknown>): ScoreItem[] {
  const scores: ScoreItem[] = [];
  const scoreFields = ['dimensions', 'dimension_scores', 'scores', 'competency', 'abilities', 'career_diagnosis', 'skill_analysis'];

  for (const field of scoreFields) {
    const val = obj[field];
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === 'object' && item !== null) {
          const i = item as Record<string, unknown>;
          const name = String(i.name || i.dimension || i.title || i.skill || i.label || '');
          const score = extractNumber(i.score || i.level || i.value || i.match_score || i.percentile);
          if (name && score !== null) {
            scores.push({ name, score, max: extractNumber(i.max || i.total) ?? undefined });
          }
        }
      }
    }
  }

  // 也检查顶层数值字段
  const topLevelScoreFields = ['match_score', 'overall_score', 'probability', 'personality', 'percentile'];
  for (const field of topLevelScoreFields) {
    if (obj[field] !== undefined) {
      const score = extractNumber(obj[field]);
      if (score !== null) {
        scores.push({ name: fieldToLabel(field), score });
      }
    }
  }

  return scores;
}

/** 解析JSON对象为标签组 */
function extractTagsFromJSON(obj: Record<string, unknown>): TagGroup[] {
  const groups: TagGroup[] = [];
  const tagFields: Record<string, 'success' | 'warning' | 'info'> = {
    current_skills: 'success',
    required_skills: 'info',
    missing_skills: 'warning',
    gap_skills: 'warning',
    strength: 'success',
    strengths: 'success',
    weakness: 'warning',
    weaknesses: 'warning',
    tags: 'info',
    exam_subjects: 'info',
  };

  for (const [field, variant] of Object.entries(tagFields)) {
    const val = obj[field];
    if (Array.isArray(val) && val.length > 0) {
      groups.push({
        label: fieldToLabel(field),
        tags: (val as unknown[]).map(s => ({ name: decodeUrlStr(String(s)), variant })),
      });
    }
  }

  return groups;
}

/** 解析JSON对象为时间线 */
function extractTimelineFromJSON(obj: Record<string, unknown>): TimelineItem[] {
  const timeline: TimelineItem[] = [];
  const timelineFields = ['timeline', 'career_path', 'phases', 'stages', 'action_items', 'learning_path'];

  for (const field of timelineFields) {
    const val = obj[field];
    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        const item = val[i];
        if (typeof item === 'object' && item !== null) {
          const obj2 = item as Record<string, unknown>;
          const phase = String(obj2.phase || obj2.stage || `第${i + 1}阶段`);
          const title = String(obj2.title || obj2.goal || obj2.name || phase);
          const rawTasks = (obj2.tasks || obj2.action_items || obj2.items || []) as unknown[];
          const tasks = Array.isArray(rawTasks)
            ? rawTasks.map((t: unknown) => String(t))
            : obj2.description ? [String(obj2.description)] : [];
          timeline.push({ phase, title, tasks });
        } else if (typeof item === 'string') {
          timeline.push({ phase: `第${i + 1}阶段`, title: decodeUrlStr(item), tasks: [] });
        }
      }
      break; // 只取第一个匹配的时间线字段
    }
  }

  return timeline;
}

// ========== 主解析函数 ==========

export function parseAIResponse(rawText: string): ParsedSegment[] {
  if (!rawText || !rawText.trim()) return [];

  const segments: ParsedSegment[] = [];

  // Step 1: 提取<<DATA>>块
  const dataBlocks = extractDataBlocks(rawText);
  let cleanText = stripDataMarkers(rawText);

  // Step 2: 尝试将整个文本作为JSON解析
  const fullJson = tryParseJSON(cleanText.trim());
  if (fullJson && typeof fullJson === 'object' && !Array.isArray(fullJson)) {
    const obj = fullJson as Record<string, unknown>;
    return parseJSONObject(obj);
  }

  // Step 3: 处理DATA块中的JSON
  for (const block of dataBlocks) {
    if (block.json && typeof block.json === 'object' && !Array.isArray(block.json)) {
      const parsed = parseJSONObject(block.json as Record<string, unknown>);
      segments.push(...parsed);
    }
  }

  // Step 4: 解析剩余的纯文本
  if (cleanText.trim()) {
    const textSegments = parsePlainText(cleanText);
    segments.push(...textSegments);
  }

  // 如果没有任何segment，至少返回原文
  if (segments.length === 0) {
    segments.push({ type: 'text', data: rawText });
  }

  return segments;
}

/** 解析JSON对象为渲染段 */
function parseJSONObject(obj: Record<string, unknown>): ParsedSegment[] {
  const segments: ParsedSegment[] = [];

  // 1. 提取文本/结论部分
  const textFields = ['conclusion', 'summary', 'precise_match_conclusion', 'basic_version', 'description', 'advice', 'suggestions'];
  for (const field of textFields) {
    if (typeof obj[field] === 'string' && (obj[field] as string).length > 5) {
      segments.push({ type: 'text', data: decodeUrlStr(obj[field] as string) });
    }
  }
  // 也检查full_version字段（可能包含完整版提示）
  if (typeof obj.full_version === 'string') {
    segments.push({ type: 'promotion', data: { featureName: '完整版报告', features: ['详细分析', '个性化建议', '行动计划'] } });
  }

  // 2. 提取卡片列表
  const cards = extractCardsFromJSON(obj);
  if (cards.length > 0) {
    segments.push({ type: 'cards', data: cards });
  }

  // 3. 提取评分
  const scores = extractScoresFromJSON(obj);
  if (scores.length > 0) {
    segments.push({ type: 'scores', data: scores });
  }

  // 4. 提取标签
  const tags = extractTagsFromJSON(obj);
  if (tags.length > 0) {
    segments.push({ type: 'tags', data: tags });
  }

  // 5. 提取时间线
  const timeline = extractTimelineFromJSON(obj);
  if (timeline.length > 0) {
    segments.push({ type: 'timeline', data: timeline });
  }

  return segments;
}

/** 解析纯文本（含部分结构化内容） */
/** 把 Markdown 表格段用空行包围，便于后续按空行分段识别 */
function isolateMarkdownTables(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let i = 0;
  const isTableRow = (l: string) => {
    const t = l.trim();
    return t.startsWith('|') && t.endsWith('|') && t.length >= 3;
  };
  const isSeparator = (l: string) => /^\|[\s\-:|]+\|$/.test(l.trim());

  while (i < lines.length) {
    if (isTableRow(lines[i]) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      // 表格起点：前面补空行
      if (result.length > 0 && result[result.length - 1].trim() !== '') {
        result.push('');
      }
      // 收集所有连续的表格行
      while (i < lines.length && isTableRow(lines[i])) {
        result.push(lines[i]);
        i++;
      }
      // 表格结尾：后面补空行
      if (i < lines.length && lines[i].trim() !== '') {
        result.push('');
      }
    } else {
      result.push(lines[i]);
      i++;
    }
  }
  return result.join('\n');
}

function parsePlainText(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];

  // 预处理：把 Markdown 表格用空行隔离出来，便于按空行分段
  text = isolateMarkdownTables(text);

  if (!hasStructuredContent(text)) {
    // 纯自然语言，直接返回
    segments.push({ type: 'text', data: decodeUrlStr(text) });
    return segments;
  }

  // 按空行分段
  const blocks = text.split(/\n\s*\n/);
  let currentText = '';

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // 检测是否是结构化段落
    const lines = trimmed.split('\n');

    // 检测JSON块
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const parsed = tryParseJSON(trimmed);
      if (parsed) {
        // 先flush之前的文本
        if (currentText.trim()) {
          segments.push({ type: 'text', data: decodeUrlStr(currentText.trim()) });
          currentText = '';
        }
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
          segments.push(...parseJSONObject(parsed as Record<string, unknown>));
        } else if (Array.isArray(parsed)) {
          segments.push({ type: 'cards', data: extractCardsFromList(parsed.map(String)) });
        }
        continue;
      }
    }

    // 检测 Markdown 表格段（至少 3 行，且第 2 行是分隔行）
    const tableLines = lines.filter(l => {
      const t = l.trim();
      return t.startsWith('|') && t.endsWith('|') && t.length >= 3;
    });
    if (
      tableLines.length >= 3 &&
      tableLines.length === lines.length &&
      /^\|[\s\-:|]+\|$/.test(tableLines[1].trim())
    ) {
      if (currentText.trim()) {
        segments.push({ type: 'text', data: decodeUrlStr(currentText.trim()) });
        currentText = '';
      }
      const parseRow = (line: string) =>
        line.trim().slice(1, -1).split('|').map(c => decodeUrlStr(c.trim()));
      const headers = parseRow(tableLines[0]);
      const rows = tableLines.slice(2).map(parseRow);
      segments.push({ type: 'table', data: { headers, rows } });
      continue;
    }

    // 检测列表段（以 - 或数字开头）
    const listLines = lines.filter(l => /^\s*[-*]\s+/.test(l) || /^\s*\d+\.\s+/.test(l));
    if (listLines.length >= 2 && listLines.length / lines.length > 0.6) {
      // 先flush之前的文本
      if (currentText.trim()) {
        segments.push({ type: 'text', data: decodeUrlStr(currentText.trim()) });
        currentText = '';
      }
      // 检测是否带有分数/百分比 → 卡片
      const hasScores = listLines.some(l => /\d+\s*[%％分]/.test(l));
      if (hasScores) {
        segments.push({ type: 'cards', data: extractCardsFromList(listLines) });
      } else {
        segments.push({ type: 'cards', data: extractCardsFromList(listLines) });
      }
      continue;
    }

    // 检测键值对段
    const kvLines = lines.filter(l => /^\s*(?:\*\*)?\w+(?:\*\*)?\s*[:：]/.test(l));
    if (kvLines.length >= 2) {
      if (currentText.trim()) {
        segments.push({ type: 'text', data: decodeUrlStr(currentText.trim()) });
        currentText = '';
      }
      const kv = parseKeyValueLines(lines);

      // 判断是评分还是普通键值对
      const scoreKeys = Object.keys(kv).filter(k => /\d+/.test(kv[k]));
      if (scoreKeys.length >= 2 && scoreKeys.length / Object.keys(kv).length > 0.4) {
        // 多数是数值 → 评分
        const scores: ScoreItem[] = [];
        for (const [k, v] of Object.entries(kv)) {
          const num = extractNumber(v);
          if (num !== null) {
            scores.push({ name: fieldToLabel(k), score: num });
          } else {
            // 非数值的键值对，添加到文本
            currentText += `${fieldToLabel(k)}：${decodeUrlStr(v)}\n`;
          }
        }
        if (scores.length > 0) segments.push({ type: 'scores', data: scores });
      } else {
        // 普通键值对 → 转为自然语言
        for (const [k, v] of Object.entries(kv)) {
          currentText += `${fieldToLabel(k)}：${decodeUrlStr(v)}\n`;
        }
      }
      continue;
    }

    // 检测免责声明（必须以"免责声明"开头才识别，避免误判 AI 提问）
    // 兼容前缀：📄/📋/💡 等emoji，或 "---" 分隔符
    if (/^[\s\-—=*]*[\u{1F4C4}\u{1F4CB}\u{1F4A1}\u{26A0}\u{2139}]?\s*免责声明[:：]/u.test(trimmed) && trimmed.length < 400) {
      if (currentText.trim()) {
        segments.push({ type: 'text', data: decodeUrlStr(currentText.trim()) });
        currentText = '';
      }
      segments.push({ type: 'disclaimer', data: decodeUrlStr(trimmed) });
      continue;
    }

    // 检测会员提示
    if (/解锁|升级|会员|完整版|付费/.test(trimmed)) {
      if (currentText.trim()) {
        segments.push({ type: 'text', data: decodeUrlStr(currentText.trim()) });
        currentText = '';
      }
      segments.push({ type: 'promotion', data: { featureName: '完整功能', features: ['详细分析', '个性化建议', '行动计划'] } });
      continue;
    }

    // 普通文本段落
    currentText += trimmed + '\n\n';
  }

  // flush最后的文本
  if (currentText.trim()) {
    segments.push({ type: 'text', data: decodeUrlStr(currentText.trim()) });
  }

  return segments;
}
