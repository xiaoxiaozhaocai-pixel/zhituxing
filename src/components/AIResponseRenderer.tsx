'use client';

import { useMemo } from 'react';
import { parseAIResponse, stripDataMarkers, type ParsedSegment, type CardItem, type TimelineItem, type TagGroup, type ScoreItem, type PromotionData } from '@/lib/ai-response-parser';
import { Lock, ChevronRight, CheckCircle, AlertTriangle, Flame, Clock, Award, TrendingUp } from 'lucide-react';

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
                <h4 className="font-semibold text-gray-900 truncate">{card.title}</h4>
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

/** 多维评分渲染 */
function ScoreListRenderer({ scores }: { scores: ScoreItem[] }) {
  return (
    <div className="mt-3 space-y-3">
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
  );
}

/** 会员推广渲染 */
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
    return parseAIResponse(rawText);
  }, [rawText, role]);

  return (
    <div className="space-y-0">
      {segments.map((seg, idx) => {
        switch (seg.type) {
          case 'text':
            return (
              <div key={idx} className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                {seg.data as string}
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

          case 'promotion':
            return <PromotionRenderer key={idx} data={seg.data as PromotionData} />;

          case 'disclaimer':
            return (
              <div key={idx} className="text-xs text-gray-400 mt-2 leading-relaxed">
                {seg.data as string}
              </div>
            );

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
