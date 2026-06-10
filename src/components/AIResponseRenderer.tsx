'use client';

import { useMemo, Fragment } from 'react';
import type { ReactNode } from 'react';
import { parseAIResponse, stripDataMarkers, type CardItem, type TimelineItem, type TagGroup, type ScoreItem, type RadarData, type PromotionData, type TableData } from '@/lib/ai-response-parser';
import {Lock, ChevronRight, CheckCircle, AlertTriangle, Award, TrendingUp} from 'lucide-react';
import TierMatchCard, { type TierMatchData } from '@/components/cards/TierMatchCard';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

// ========== 轻量 Markdown 渲染（无外部依赖） ==========
// 覆盖 AI 输出常见语法：**加粗** / *斜体* / `code` / [text](url) / 表格 / 有序无序列表 / 标题 / 引用 / 分隔线
// 不引入 react-markdown 是为了避免修改 pnpm-lock.yaml；如未来要支持完整 CommonMark，再迁移

// 行内 markdown 解析：把一行字符串转成带 <strong>/<em>/<code>/<a> 的 React 节点数组
function renderInline(text: string, keyPrefix = ''): ReactNode[] {
  const parts: ReactNode[] = [];
  // 复合正则：**bold** | *italic* | `code` | [text](url)
  // 注意：**...** 必须在 *...* 之前匹配
  const regex = /\*\*([^*\n]+?)\*\*|\*([^*\n]+?)\*|`([^`\n]+?)`|\[([^\]\n]+?)\]\(([^)\s]+?)\)/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index));
    const key = `${keyPrefix}-${k++}`;
    if (m[1] !== undefined) {
      parts.push(<strong key={key} className="font-semibold text-gray-900">{m[1]}</strong>);
    } else if (m[2] !== undefined) {
      parts.push(<em key={key} className="italic">{m[2]}</em>);
    } else if (m[3] !== undefined) {
      parts.push(<code key={key} className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs font-mono">{m[3]}</code>);
    } else if (m[4] !== undefined && m[5] !== undefined) {
      parts.push(
        <a key={key} href={m[5]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-700">{m[4]}</a>
      );
    }
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) {
    // 清理 AI 模型残留的孤儿 markdown 标记（** / **** / *），避免原文泄露给用户
    let trailing = text.slice(lastIdx)
      .replace(/\*{2,}/g, '')   // **** / *** / ** 装饰分隔符
      .replace(/(?<!\w)\*(?!\w)/g, '')  // 孤立 * 号
      .trim();
    if (trailing) parts.push(trailing);
  }
  return parts;
}

// 行内 + 行内换行：把多行段落（含 \n）转成节点，单个 \n 渲染为 <br/>
function renderInlineMultiline(text: string, keyPrefix = ''): ReactNode[] {
  const lines = text.split('\n');
  const out: ReactNode[] = [];
  lines.forEach((ln, i) => {
    out.push(<Fragment key={`${keyPrefix}-ln-${i}`}>{renderInline(ln, `${keyPrefix}-ln-${i}`)}</Fragment>);
    if (i < lines.length - 1) out.push(<br key={`${keyPrefix}-br-${i}`} />);
  });
  return out;
}

type Block =
  | { type: 'heading'; level: 1 | 2 | 3 | 4; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'table'; header: string[]; rows: string[][] }
  | { type: 'blockquote'; text: string }
  | { type: 'hr' }
  | { type: 'codeblock'; code: string; lang?: string };

// 把 markdown 文本切成块
function parseBlocks(src: string): Block[] {
  const text = src.replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  const isTableSep = (s: string) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(s);
  const splitRow = (s: string) => {
    let t = s.trim();
    if (t.startsWith('|')) t = t.slice(1);
    if (t.endsWith('|')) t = t.slice(0, -1);
    return t.split('|').map(c => c.trim());
  };

  while (i < lines.length) {
    const line = lines[i];

    // 空行
    if (line.trim() === '') { i++; continue; }

    // 代码块 ```
    if (/^```/.test(line.trim())) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // 跳过结束 ```
      blocks.push({ type: 'codeblock', code: codeLines.join('\n'), lang });
      continue;
    }

    // 分隔线
    if (/^\s*(-\s*){3,}$/.test(line) || /^\s*(\*\s*){3,}$/.test(line) || /^\s*(_\s*){3,}$/.test(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // 标题
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ type: 'heading', level: h[1].length as 1 | 2 | 3 | 4, text: h[2].trim() });
      i++;
      continue;
    }

    // 引用
    if (/^\s*>\s?/.test(line)) {
      const bq: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        bq.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', text: bq.join('\n') });
      continue;
    }

    // 表格（当前行像 | a | b | 且下一行是分隔符）
    if (/\|/.test(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim() !== '' && /\|/.test(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    // 无序列表
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // 有序列表
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // 段落：连续非空、非块级标识行
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^```/.test(lines[i].trim()) &&
      !(/\|/.test(lines[i]) && i + 1 < lines.length && isTableSep(lines[i + 1])) &&
      !/^\s*(-\s*){3,}$/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'paragraph', text: para.join('\n') });
  }

  return blocks;
}

function MarkdownText({ text }: { text: string }) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  return (
    <div className="text-sm leading-relaxed text-gray-800">
      {blocks.map((b, idx) => {
        const k = `b-${idx}`;
        switch (b.type) {
          case 'heading': {
            const cls = b.level === 1 ? 'text-lg font-bold text-gray-900 mt-3 mb-2'
              : b.level === 2 ? 'text-base font-bold text-gray-900 mt-3 mb-2'
              : b.level === 3 ? 'text-sm font-bold text-gray-900 mt-2 mb-1.5'
              : 'text-sm font-semibold text-gray-900 mt-2 mb-1';
            const content = renderInline(b.text, k);
            if (b.level === 1) return <h1 key={k} className={cls}>{content}</h1>;
            if (b.level === 2) return <h2 key={k} className={cls}>{content}</h2>;
            if (b.level === 3) return <h3 key={k} className={cls}>{content}</h3>;
            return <h4 key={k} className={cls}>{content}</h4>;
          }
          case 'paragraph':
            return <p key={k} className="my-2 first:mt-0 last:mb-0">{renderInlineMultiline(b.text, k)}</p>;
          case 'ul':
            return (
              <ul key={k} className="list-disc pl-5 space-y-1 my-2">
                {b.items.map((it, i) => <li key={i} className="leading-relaxed">{renderInline(it, `${k}-${i}`)}</li>)}
              </ul>
            );
          case 'ol':
            return (
              <ol key={k} className="list-decimal pl-5 space-y-1 my-2">
                {b.items.map((it, i) => <li key={i} className="leading-relaxed">{renderInline(it, `${k}-${i}`)}</li>)}
              </ol>
            );
          case 'table':
            return (
              <div key={k} className="overflow-x-auto my-3 rounded-lg border border-gray-200">
                <table className="min-w-full text-sm border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      {b.header.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">{renderInline(h, `${k}-h-${i}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((c, ci) => (
                          <td key={ci} className="px-3 py-2 text-gray-700 border-b border-gray-100 align-top">{renderInline(c, `${k}-${ri}-${ci}`)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'blockquote':
            return (
              <blockquote key={k} className="border-l-4 border-blue-200 pl-3 my-2 text-gray-600 italic">
                {renderInlineMultiline(b.text, k)}
              </blockquote>
            );
          case 'hr':
            return <hr key={k} className="my-3 border-gray-200" />;
          case 'codeblock':
            return (
              <pre key={k} className="my-2">
                <code className="block bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-xs whitespace-pre">{b.code}</code>
              </pre>
            );
          case 'tier_match':
            return <TierMatchCard key={idx} data={seg.data as TierMatchData} />;

          default:
            return null;
        }
      })}
    </div>
  );
}

// ========== 子组件 ==========

/** 卡片列表渲染 */
function CardListRenderer({ cards }: { cards: CardItem[] }) {
  return (
    <div className="space-y-3 mt-3">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`bg-white border rounded-xl p-4 shadow-sm transition-all hover:shadow-md ${
            card.isBest ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {card.isBest && <Award className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                <h4 className="font-semibold text-gray-900 break-words">{card.title}</h4>
              </div>
              {card.subtitle && (
                <p className="text-sm text-gray-500 mt-0.5">{card.subtitle}</p>
              )}
              {card.description && (
                <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{card.description}</p>
              )}
            </div>
            {card.score !== undefined && (
              <div className={`flex-shrink-0 text-lg font-bold ${
                card.score >= 80 ? 'text-green-600' :
                card.score >= 60 ? 'text-blue-600' :
                'text-orange-500'
              }`}>
                {card.score}
                <span className="text-xs font-normal text-gray-400">%</span>
              </div>
            )}
          </div>
          {card.score !== undefined && (
            <div className="mt-2">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    card.score >= 80 ? 'bg-green-500' :
                    card.score >= 60 ? 'bg-blue-500' :
                    'bg-orange-400'
                  }`}
                  style={{ width: `${Math.min(card.score, 100)}%` }}
                />
              </div>
            </div>
          )}
          {card.tags && card.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {card.tags.map((tag, ti) => (
                <span key={ti} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** 时间轴渲染 */
function TimelineRenderer({ items }: { items: TimelineItem[] }) {
  return (
    <div className="mt-3 space-y-0">
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-4">
          {/* 竖线+圆点 */}
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-blue-200 flex-shrink-0 mt-1" />
            {idx < items.length - 1 && (
              <div className="w-0.5 flex-1 bg-blue-200 min-h-[40px]" />
            )}
          </div>
          {/* 内容 */}
          <div className="pb-5 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {item.phase}
              </span>
            </div>
            <h4 className="font-semibold text-gray-900 mt-1">{item.title}</h4>
            {item.tasks.length > 0 && (
              <ul className="mt-1.5 space-y-1">
                {item.tasks.map((task, ti) => (
                  <li key={ti} className="text-sm text-gray-600 flex items-start gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    {task}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** 标签组渲染 */
function TagGroupRenderer({ groups }: { groups: TagGroup[] }) {
  return (
    <div className="mt-3 space-y-3">
      {groups.map((group, gi) => (
        <div key={gi}>
          <h4 className="text-sm font-medium text-gray-700 mb-1.5">{group.label}</h4>
          <div className="flex flex-wrap gap-1.5">
            {group.tags.map((tag, ti) => (
              <span
                key={ti}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-medium ${
                  tag.variant === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : tag.variant === 'warning'
                    ? 'bg-orange-50 text-orange-700 border border-orange-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
              >
                {tag.variant === 'success' && <CheckCircle className="w-3 h-3" />}
                {tag.variant === 'warning' && <AlertTriangle className="w-3 h-3" />}
                {tag.variant === 'info' && <TrendingUp className="w-3 h-3" />}
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** 多维评分渲染 — 饼图 + 详细进度条 */
function ScoreListRenderer({ scores }: { scores: ScoreItem[] }) {
  // 计算每个维度归一化到0-100的实际分数
  const normalized = scores.map(item => {
    const v = item.max ? (item.score / item.max) * 100 : item.score;
    return Math.max(0, Math.min(v, 100));
  });
  const sum = normalized.reduce((a, b) => a + b, 0);
  // 平均分作为综合评分
  const avg = scores.length > 0 ? Math.round(sum / scores.length) : 0;
  // 蓝白主色系 + 暖色点缀（符合品牌）
  const palette = ['#165DFF', '#36BFFA', '#7B61FF', '#FF9F1C', '#10B981', '#06B6D4', '#F472B6'];

  // 计算饼图扇区（按分数占比，分数越高扇区越大）
  const cx = 70, cy = 70, r = 60, rInner = 36;

  // 权重数据：优先使用显式权重，否则按分数占比计算
  const hasWeights = scores.some(s => s.weight !== undefined);
  const weights = scores.map((_, idx) => {
    if (hasWeights) return scores[idx].weight ?? 0;
    return normalized[idx]; // fallback: use score as weight
  });
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const sectors = scores.map((item, idx) => {
    const rawWeight = weights[idx];
    const ratio = weightSum > 0 ? rawWeight / weightSum : 1 / scores.length;
    const angle = ratio * Math.PI * 2;
    // 起始角 = -π/2 + 前面所有扇区累计占比 * 2π（纯函数式，避免可变累加器以兼容 React Compiler）
    const cumBefore = weights.slice(0, idx).reduce((a, b) => a + b, 0);
    const startRatio = weightSum > 0 ? cumBefore / weightSum : idx / scores.length;
    const startAngle = -Math.PI / 2 + startRatio * Math.PI * 2;
    const endAngle = startAngle + angle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const x3 = cx + rInner * Math.cos(endAngle);
    const y3 = cy + rInner * Math.sin(endAngle);
    const x4 = cx + rInner * Math.cos(startAngle);
    const y4 = cy + rInner * Math.sin(startAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    // 单扇区或环：完整圆需特殊处理
    let d: string;
    if (scores.length === 1 || ratio >= 0.999) {
      d = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} M ${cx - rInner} ${cy} A ${rInner} ${rInner} 0 1 0 ${cx + rInner} ${cy} A ${rInner} ${rInner} 0 1 0 ${cx - rInner} ${cy} Z`;
    } else {
      d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    }

    return {
      d,
      color: palette[idx % palette.length],
      name: item.name,
      score: Math.round(normalized[idx]),
      max: item.max,
      weight: hasWeights ? rawWeight : Math.round(ratio * 100),
    };
  });

  return (
    <div className="mt-3">
      {/* 饼图 + 图例 卡片 */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50/30 rounded-xl p-4 mb-3 border border-blue-100">
        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
          {/* SVG 甜甜圈 */}
          <div className="relative flex-shrink-0">
            <svg viewBox="0 0 140 140" className="w-32 h-32 sm:w-36 sm:h-36">
              {sectors.map((s, i) => (
                <path
                  key={i}
                  d={s.d}
                  fill={s.color}
                  opacity={0.92}
                  stroke="white"
                  strokeWidth={1}
                />
              ))}
            </svg>
            {/* 中心总分 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-gray-800 leading-none">{avg}</span>
              <span className="text-xs text-gray-500 mt-1">综合评分</span>
            </div>
          </div>
          {/* 图例 */}
          <div className="flex-1 space-y-1.5 min-w-[180px]">
            {sectors.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ background: s.color }}
                />
                <span className="text-gray-700 flex-1 truncate" title={s.name}>{s.name}</span>
                <span className={`font-semibold tabular-nums ${
                  s.score >= 80 ? 'text-green-600' :
                  s.score >= 60 ? 'text-blue-600' :
                  'text-orange-500'
                }`}>{s.score}{s.max ? `/${s.max}` : ''}</span>
                <span className="text-gray-400 text-[10px] tabular-nums whitespace-nowrap">
                  权重{hasWeights ? weights[i] : s.weight}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 详细进度条（保留作为细节展示） */}
      <div className="space-y-2.5">
        {scores.map((item, idx) => {
          const pct = item.max ? (item.score / item.max) * 100 : item.score;
          const clamped = Math.min(pct, 100);
          return (
            <div key={idx}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">{item.name}</span>
                <span className={`text-sm font-semibold ${
                  clamped >= 80 ? 'text-green-600' :
                  clamped >= 60 ? 'text-blue-600' :
                  'text-orange-500'
                }`}>
                  {Math.round(clamped)}{item.max ? `/${item.max}` : '%'}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    clamped >= 80 ? 'bg-green-500' :
                    clamped >= 60 ? 'bg-blue-500' :
                    'bg-orange-400'
                  }`}
                  style={{ width: `${clamped}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/** 雷达图渲染 */
function RadarChartRenderer({ data }: { data: RadarData }) {
  const { dimensions, overallScore, summary } = data;
  if (!dimensions || dimensions.length === 0) return null;

  const chartData = dimensions.map(d => ({
    dimension: d.name,
    score: Math.min(d.score, d.max),
    fullMark: d.max,
    weight: d.weight,
  }));

  const avgScore = dimensions.length > 0
    ? Math.round(dimensions.reduce((s, d) => s + (d.score / d.max) * 100, 0) / dimensions.length)
    : 0;

  const palette = ['#165DFF', '#36BFFA', '#7B61FF', '#FF9F1C', '#10B981', '#06B6D4'];

  return (
    <div className="mt-3">
      {/* 雷达图卡片 */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50/30 rounded-xl p-4 mb-3 border border-blue-100">
        <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
          {/* 雷达图 */}
          <div className="relative flex-shrink-0 w-full md:w-64 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fontSize: 12, fill: '#475569' }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                />
                <Radar
                  name="你的能力"
                  dataKey="score"
                  stroke="#165DFF"
                  fill="#165DFF"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
            {/* 中心总分 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
              <span className="text-2xl font-bold text-gray-800 leading-none">{overallScore ?? avgScore}</span>
              <span className="text-xs text-gray-500 mt-1">综合评分</span>
            </div>
          </div>
          {/* 图例 */}
          <div className="flex-1 space-y-1.5 min-w-[180px]">
            {dimensions.map((d, i) => {
              const pct = Math.round((d.score / d.max) * 100);
              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ background: palette[i % palette.length] }}
                  />
                  <span className="text-gray-700 flex-1 truncate" title={d.name}>{d.name}</span>
                  <span className={`font-semibold tabular-nums ${
                    pct >= 80 ? 'text-green-600' :
                    pct >= 60 ? 'text-blue-600' :
                    'text-orange-500'
                  }`}>{d.score}/{d.max}</span>
                  {d.weight != null && (
                    <span className="text-gray-400 text-[10px] tabular-nums whitespace-nowrap">权重{d.weight}%</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 汇总文字 + 详细进度条 */}
      {summary && (
        <div className="text-sm text-gray-600 mb-3 leading-relaxed bg-blue-50/50 rounded-lg p-3 border border-blue-100">
          {summary}
        </div>
      )}

      <div className="space-y-2.5">
        {dimensions.map((d, i) => {
          const pct = Math.min((d.score / d.max) * 100, 100);
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">{d.name}</span>
                <span className={`text-sm font-semibold ${
                  pct >= 80 ? 'text-green-600' :
                  pct >= 60 ? 'text-blue-600' :
                  'text-orange-500'
                }`}>
                  {Math.round(pct)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    pct >= 80 ? 'bg-green-500' :
                    pct >= 60 ? 'bg-blue-500' :
                    'bg-orange-400'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 会员推广渲染 */
/** 会员推广渲染 */
function TableRenderer({ data }: { data: TableData }) {
  if (!data?.headers?.length) return null;
  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {data.headers.map((h, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 1 ? 'bg-gray-50/50' : ''}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-3 py-2 text-gray-800 border-b border-gray-100 align-top"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PromotionRenderer({ data }: { data: PromotionData }) {
  return (
    <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Lock className="w-4 h-4 text-blue-600" />
        <span className="font-semibold text-blue-800">解锁{data.featureName}</span>
      </div>
      <ul className="space-y-1">
        {data.features.map((f, i) => (
          <li key={i} className="text-sm text-blue-700 flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3" />
            {f}
          </li>
        ))}
      </ul>
      <button className="mt-3 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
        立即开通
      </button>
    </div>
  );
}

// ========== 主组件 ==========

interface AIResponseRendererProps {
  rawText: string;
  /** 是否正在流式输出（显示光标） */
  streaming?: boolean;
  /** 消息角色，user消息直接显示原文 */
  role?: 'user' | 'assistant';
}

export default function AIResponseRenderer({ rawText, streaming = false, role = 'assistant' }: AIResponseRendererProps) {
  const segments = useMemo(() => {
    if (role === 'user') return [{ type: 'text' as const, data: rawText }];
    const parsed = parseAIResponse(rawText);

    // 兜底：有 scores 但没 radar → 从 scores 自动生成雷达图
    const hasRadar = parsed.some(s => s.type === 'radar');
    const scoresSeg = parsed.find(s => s.type === 'scores');
    if (!hasRadar && scoresSeg) {
      const scores = scoresSeg.data as ScoreItem[];
      if (scores.length >= 2) {
        const dims = scores.map(s => ({
          name: s.name,
          score: s.max ? Math.round((s.score / s.max) * 100) : s.score,
          max: 100,
          weight: s.weight,
        }));
        const overallScore = Math.round(dims.reduce((a, d) => a + d.score, 0) / dims.length);
        // 找到 scores segment 的索引，在其前面插入 radar
        const idx = parsed.indexOf(scoresSeg);
        parsed.splice(idx, 0, {
          type: 'radar' as const,
          data: { dimensions: dims, overallScore, summary: '由胜任力评分自动生成的能力雷达图' } as RadarData,
        });
      }
    }

    return parsed;
  }, [rawText, role]);

  return (
    <div className="space-y-0">
      {segments.map((seg, idx) => {
        switch (seg.type) {
          case 'text':
            return (
              <div key={idx} className="relative">
                <MarkdownText text={seg.data as string} />
                {streaming && idx === segments.length - 1 && (
                  <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5 align-middle" />
                )}
              </div>
            );

          case 'cards':
            return <CardListRenderer key={idx} cards={seg.data as CardItem[]} />;

          case 'timeline':
            return <TimelineRenderer key={idx} items={seg.data as TimelineItem[]} />;

          case 'tags':
            return <TagGroupRenderer key={idx} groups={seg.data as TagGroup[]} />;

          case 'scores':
            return <ScoreListRenderer key={idx} scores={seg.data as ScoreItem[]} />;

          case 'radar':
            return <RadarChartRenderer key={idx} data={seg.data as RadarData} />;

          case 'promotion':
            return <PromotionRenderer key={idx} data={seg.data as PromotionData} />;

          case 'table':
            return <TableRenderer key={idx} data={seg.data as TableData} />;

          case 'disclaimer':
            return (
              <div key={idx} className="text-sm text-gray-500 mt-3 pt-2 border-t border-gray-100 leading-relaxed">
                {seg.data as string}
              </div>
            );

          case 'tier_match':
            return <TierMatchCard key={idx} data={seg.data as TierMatchData} />;

          default:
            return null;
        }
      })}
    </div>
  );
}

/** 便捷函数：仅清理文本（去掉结构化标记），用于简单场景 */
export function cleanAIText(rawText: string): string {
  return stripDataMarkers(rawText);
}
