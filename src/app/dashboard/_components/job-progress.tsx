'use client';

/**
 * 求职进度四步条（F4）
 * 测评 → 简历评分 → 模拟面试 → 职业规划报告
 * 全部读既有数据源，零新表；明确不含投递记录（自动投递是 ToS 红线）。
 */

import React from 'react';
import { ClipboardList, FileText, MessagesSquare, Map, Check } from 'lucide-react';
import { GlassCard, cn } from './shared';

export interface JobProgressData {
  assessDone: boolean;
  scoreDone: boolean;
  interviewDone: boolean;
  reportDone: boolean;
  loading: boolean;
}

const STEPS: Array<{
  key: 'assessDone' | 'scoreDone' | 'interviewDone' | 'reportDone';
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: 'assessDone', label: '职业测评', desc: '了解自己的起点', icon: ClipboardList },
  { key: 'scoreDone', label: '简历评分', desc: '简历先过一遍机筛', icon: FileText },
  { key: 'interviewDone', label: '模拟面试', desc: '练一次真实问答', icon: MessagesSquare },
  { key: 'reportDone', label: '职业规划报告', desc: '拿到完整行动路线', icon: Map },
];

export function JobProgress({ data }: { data: JobProgressData }) {
  const doneCount = STEPS.filter((s) => data[s.key]).length;
  const pct = Math.round((doneCount / STEPS.length) * 100);

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-[#1E293B]">求职准备进度</h2>
          <p className="text-xs text-gray-500 mt-0.5">四步走完，投递不迷茫（投递按自己节奏来，我们不做代投）</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-extrabold text-[#165DFF]">{pct}%</div>
          <div className="text-xs text-gray-400">{data.loading ? '统计中…' : `${doneCount}/${STEPS.length} 完成`}</div>
        </div>
      </div>

      <div className="relative">
        {/* 连接线 */}
        <div className="absolute top-5 left-[12.5%] right-[12.5%] h-0.5 bg-[#E2E8F0]" />
        <div
          className="absolute top-5 left-[12.5%] h-0.5 bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] transition-all duration-500"
          style={{ width: `calc((100% - 25%) * ${doneCount / STEPS.length})` }}
        />

        <div className="relative grid grid-cols-4 gap-2">
          {STEPS.map((step) => {
            const done = data[step.key];
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex flex-col items-center text-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300',
                    done
                      ? 'bg-[#165DFF] border-[#165DFF] text-white'
                      : 'bg-white border-[#E2E8F0] text-gray-300'
                  )}
                >
                  {done ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <div className={cn('text-sm font-medium mt-2', done ? 'text-[#1E293B]' : 'text-gray-400')}>
                  {step.label}
                </div>
                <div className="text-xs text-gray-400 mt-0.5 hidden sm:block">{step.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}
