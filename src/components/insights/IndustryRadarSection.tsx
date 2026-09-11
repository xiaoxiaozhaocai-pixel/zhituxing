'use client';

// 行业雷达 · 行业切换 + 单行业详情视图
// 解决：12 行业全平铺挤爆一页、单条内容过长无折叠
// 交互：顶部行业 chip 切换；高频问题「怎么答」默认折叠；考察重点典型问题默认 2 条

import React, { useState } from 'react';
import {
  ALL_INDUSTRY_RADAR,
  RadarFocusItem,
  RadarQuestion,
} from '@/lib/career-paths/engine/interview_radar';

/** 单条高频问题：问题 + 潜台词直出，「怎么答」点击展开 */
function QuestionCard({ q }: { q: RadarQuestion }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <p className="text-[15px] font-medium leading-relaxed text-[#1E293B]">{q.question}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-[#64748B]">
        <span className="font-medium text-[#165DFF]">潜台词：</span>
        {q.subtext}
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 text-[13px] font-medium text-[#165DFF] hover:underline"
      >
        {open ? '收起回答要点 ▴' : '怎么答 ▾'}
      </button>
      {open && (
        <p className="mt-2 rounded-lg bg-[#F0F5FF] p-3 text-sm leading-relaxed text-[#1E293B]">{q.tip}</p>
      )}
    </div>
  );
}

/** 单个考察模块：权重条 + 考法 + 典型问题（默认 2 条，可展开） */
function FocusCard({ f }: { f: RadarFocusItem }) {
  const [open, setOpen] = useState(false);
  const qs = f.questions || [];
  const shown = open ? qs : qs.slice(0, 2);
  const hidden = qs.length - shown.length;
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-semibold text-[#1E293B]">{f.module}</span>
        <span className="shrink-0 text-xs font-bold text-[#165DFF]">{f.weight}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#165DFF] to-[#3D7FFF]"
          style={{ width: `${Math.max(0, Math.min(100, f.weight))}%` }}
        />
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-[#475569]">{f.how}</p>
      {shown.length > 0 && (
        <ul className="mt-2 space-y-1 text-[13px] leading-relaxed text-[#64748B]">
          {shown.map((q, j) => (
            <li key={j}>· {q}</li>
          ))}
        </ul>
      )}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1.5 text-xs font-medium text-[#165DFF] hover:underline"
        >
          {open ? '收起 ▴' : `还有 ${hidden} 个典型问题 ▾`}
        </button>
      )}
    </div>
  );
}

export default function IndustryRadarSection() {
  const [active, setActive] = useState(ALL_INDUSTRY_RADAR[0]?.key ?? '');
  const ind = ALL_INDUSTRY_RADAR.find((i) => i.key === active) ?? ALL_INDUSTRY_RADAR[0];
  if (!ind) return null;

  return (
    <div>
      {/* 行业切换 chips */}
      <div className="flex flex-wrap gap-2">
        {ALL_INDUSTRY_RADAR.map((i) => (
          <button
            key={i.key}
            type="button"
            onClick={() => setActive(i.key)}
            className={
              active === i.key
                ? 'rounded-full bg-[#165DFF] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#3D7FFF]'
                : 'rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm text-[#475569] transition hover:border-[#165DFF]/40 hover:text-[#165DFF]'
            }
          >
            {i.label}
          </button>
        ))}
      </div>

      {/* 单行业详情 */}
      <div key={ind.key} className="mt-6 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 sm:p-7">
        {/* 行业画像 */}
        <div className="rounded-xl border-l-4 border-[#165DFF] bg-white p-4">
          <p className="text-sm leading-relaxed text-[#475569]">
            <span className="font-semibold text-[#1E293B]">{ind.label}：</span>
            {ind.blurb}
          </p>
        </div>

        {/* 考察重点 */}
        {ind.focus && ind.focus.length > 0 && (
          <>
            <h3 className="mt-6 text-base font-semibold text-[#1E293B]">面试考察重点</h3>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {ind.focus.map((f, i) => (
                <FocusCard key={i} f={f} />
              ))}
            </div>
          </>
        )}

        {/* 高频问题与潜台词 */}
        {ind.questions && ind.questions.length > 0 && (
          <>
            <h3 className="mt-6 text-base font-semibold text-[#1E293B]">高频问题与潜台词</h3>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {ind.questions.map((q, i) => (
                <QuestionCard key={i} q={q} />
              ))}
            </div>
          </>
        )}

        {/* 雷区 + 准备建议 */}
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {ind.redFlags && ind.redFlags.length > 0 && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <h4 className="text-sm font-semibold text-red-600">雷区 · 这些表现会被扣分</h4>
              <ul className="mt-2 space-y-1 text-[13px] leading-relaxed text-[#7F1D1D]">
                {ind.redFlags.map((r, i) => (
                  <li key={i}>· {r}</li>
                ))}
              </ul>
            </div>
          )}
          {ind.prepTips && ind.prepTips.length > 0 && (
            <div className="rounded-xl border border-[#BFDBFE] bg-[#F0F5FF] p-4">
              <h4 className="text-sm font-semibold text-[#165DFF]">这样准备</h4>
              <ul className="mt-2 space-y-1 text-[13px] leading-relaxed text-[#1E40AF]">
                {ind.prepTips.map((t, i) => (
                  <li key={i}>· {t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
