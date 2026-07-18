"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Check, Send, BarChart3, UserCheck } from 'lucide-react';

interface Portrait {
  id: string; title: string; status: string;
  candidate_count: number; evaluated_count: number;
  report_generated: boolean;
}

interface Candidate {
  id: string; name: string; education: string | null;
  edu_level: number | null; experience_summary: string | null;
  status: string;
  evaluation: { skill_level: number; exp_level: number; soft_level: number; notes: string | null } | null;
}

interface Progress {
  title: string; total: number; evaluated: number; remaining: number;
  distribution: { skill: Record<string,number>; exp: Record<string,number>; soft: Record<string,number> };
  insights: string[];
}

const LEVEL_LABELS = ['极低', '低', '中', '高', '极高'];
const LEVEL_COLORS = ['bg-gray-100 text-gray-500 hover:bg-gray-200 border-gray-200',
  'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200',
  'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
  'bg-blue-100 text-[#165DFF] hover:bg-blue-200 border-[#165DFF]/30',
  'bg-gradient-to-r from-[#165DFF]/10 to-[#3D7FFF]/10 text-[#165DFF] border-[#165DFF]/40 hover:from-[#165DFF]/20 hover:to-[#3D7FFF]/20'];
const LEVEL_SELECTED = ['ring-2 ring-gray-400 bg-gray-200',
  'ring-2 ring-gray-400 bg-gray-200',
  'ring-2 ring-blue-400 bg-blue-100',
  'ring-2 ring-[#165DFF] bg-blue-200',
  'ring-2 ring-[#165DFF] bg-gradient-to-r from-[#165DFF]/20 to-[#3D7FFF]/20'];

const SKILL_ANCHORS = ['零经验，仅接触相关领域', '单一工序入门(<1年)', '1-3年，熟悉1-2道工序', '3-5年，多工序+改善案例', '5年+，全工序/大厂背景'];
const EXP_ANCHORS = ['跨行业/零相关', '锂电行业但方向不匹配', '方向大致对口但深度一般', '对口+独立解决问题记录', '高度对口+大厂经验'];
const SOFT_ANCHORS = ['拒流水/抱怨/态度消极', '沟通一般/动机不放心', '中规中矩/动机合理', '逻辑清晰/稳定/主动', '眼前一亮/沟通老练/自驱'];

export default function BlindReviewPage() {
  const params = useParams();
  const router = useRouter();
  const portraitId = params.id as string;

  const [portrait, setPortrait] = useState<Portrait | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [skillVal, setSkillVal] = useState<number>(0);
  const [expVal, setExpVal] = useState<number>(0);
  const [softVal, setSoftVal] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    const [pRes, cRes, progRes] = await Promise.all([
      fetch(`/api/employer/portrait/${portraitId}`, { credentials: 'include' }),
      fetch(`/api/employer/portrait/${portraitId}/candidates`, { credentials: 'include' }),
      fetch(`/api/employer/portrait/${portraitId}/progress`, { credentials: 'include' }),
    ]);
    const pData = await pRes.json();
    if (pData.error === 'UNAUTHORIZED') { router.push('/employer/auth/login'); return; }
    const cData = await cRes.json();
    const progData = await progRes.json();

    if (pData.ok) setPortrait(pData.data.item);
    if (cData.ok) {
      const items = cData.data.items || [];
      setCandidates(items);
      // Find first unevaluated
      const firstUn = items.findIndex((c: Candidate) => !c.evaluation);
      setCurrentIdx(firstUn >= 0 ? firstUn : items.length - 1);
    }
    if (progData.ok) setProgress(progData.data);
    setLoading(false);
  }, [portraitId, router]);

  useEffect(() => { loadData(); }, [loadData]);

  const current = candidates[currentIdx];

  // Reset form when changing candidate
  useEffect(() => {
    if (current?.evaluation) {
      setSkillVal(current.evaluation.skill_level);
      setExpVal(current.evaluation.exp_level);
      setSoftVal(current.evaluation.soft_level);
      setNotes(current.evaluation.notes || '');
    } else {
      setSkillVal(0); setExpVal(0); setSoftVal(0); setNotes('');
    }
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!current || skillVal === 0 || expVal === 0 || softVal === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/employer/portrait/${portraitId}/candidates/${current.id}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ skill_level: skillVal, exp_level: expVal, soft_level: softVal, notes: notes || null }),
      });
      const data = await res.json();
      if (data.ok) {
        // Refresh data
        loadData();
      }
    } catch (e) {
      console.error('Submit error:', e);
    }
    setSubmitting(false);
  };

  const goNext = () => {
    if (currentIdx < candidates.length - 1) setCurrentIdx(currentIdx + 1);
  };
  const goPrev = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const LevelButton = ({ val, label, desc, selected, onClick }: { val: number; label: string; desc: string; selected: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`relative flex-1 px-3 py-3 rounded-lg border text-sm font-medium transition-all ${
        selected ? LEVEL_SELECTED[val - 1] : LEVEL_COLORS[val - 1]
      }`}
      title={desc}
    >
      <div className="font-semibold">{label}</div>
      <div className="text-[10px] opacity-70 mt-0.5 leading-tight">{desc}</div>
      {selected && <Check className="absolute top-1 right-1 w-3 h-3 text-[#165DFF]" />}
    </button>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-[#165DFF]" />
    </div>
  );

  if (!portrait) return <div className="text-gray-500 text-center py-16">画像项目不存在</div>;

  const evaluatedCount = progress?.evaluated || 0;
  const totalCount = progress?.total || 0;
  const pct = totalCount > 0 ? Math.round(evaluatedCount / totalCount * 100) : 0;
  const allDone = evaluatedCount >= totalCount && totalCount > 0;

  return (
    <div>
      <Link href="/employer/portrait" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#165DFF] mb-4 transition">
        <ArrowLeft className="w-4 h-4" />
        返回列表
      </Link>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">{portrait.title}</h1>
        {allDone && (
          <Link
            href={`/employer/portrait/${portraitId}/report`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            <BarChart3 className="w-4 h-4" />
            生成画像报告
          </Link>
        )}
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">
            <UserCheck className="w-4 h-4 inline mr-1 text-[#165DFF]" />
            评估进度
          </span>
          <span className="text-gray-500">{evaluatedCount}/{totalCount} 人 ({pct}%)</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        {/* Distribution */}
        {progress && evaluatedCount > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-4 text-xs">
            {(['skill', 'exp', 'soft'] as const).map(dim => {
              const labels = ['Skl', 'Exp', 'Sft'];
              const dist = progress.distribution[dim];
              return (
                <div key={dim}>
                  <div className="text-gray-500 mb-1 font-medium">{labels[['skill', 'exp', 'soft'].indexOf(dim)]}</div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(l => (
                      <div key={l} className="flex-1 h-1.5 rounded-full" style={{
                        backgroundColor: (dist[String(l)] || 0) > 0 ? '#165DFF' : '#e5e7eb',
                        opacity: Math.max(0.2, ((dist[String(l)] || 0) / Math.max(...Object.values(dist), 1))),
                      }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Insights */}
        {progress && progress.insights.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-50">
            {progress.insights.map((ins, i) => (
              <div key={i} className="text-xs text-[#165DFF] bg-blue-50 rounded-lg px-3 py-1.5 mb-1 last:mb-0">
                💡 {ins}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Blind review card */}
      {current ? (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          {/* Candidate header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-50">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{current.name}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span>{current.education || '学历未知'}</span>
                {current.edu_level && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">Edu={current.edu_level}</span>}
              </div>
            </div>
            <span className="text-xs text-gray-400">{currentIdx + 1}/{candidates.length}</span>
          </div>

          {/* Experience summary */}
          {current.experience_summary && (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-4">
              {current.experience_summary}
            </div>
          )}

          {/* Skill */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Skill（技术能力）
              <span className="text-gray-400 font-normal ml-1">— 该候选人在目标岗位领域的技术深度</span>
            </label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(v => (
                <LevelButton key={v} val={v} label={LEVEL_LABELS[v-1]} desc={SKILL_ANCHORS[v-1]} selected={skillVal === v} onClick={() => setSkillVal(v)} />
              ))}
            </div>
          </div>

          {/* Exp */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exp（经验对口度）
              <span className="text-gray-400 font-normal ml-1">— 经验与岗位要求的匹配深度</span>
            </label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(v => (
                <LevelButton key={v} val={v} label={LEVEL_LABELS[v-1]} desc={EXP_ANCHORS[v-1]} selected={expVal === v} onClick={() => setExpVal(v)} />
              ))}
            </div>
          </div>

          {/* Soft */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Soft（软素质）
              <span className="text-gray-400 font-normal ml-1">— 沟通/抗压/学习力</span>
            </label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(v => (
                <LevelButton key={v} val={v} label={LEVEL_LABELS[v-1]} desc={SOFT_ANCHORS[v-1]} selected={softVal === v} onClick={() => setSoftVal(v)} />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="备注（可选）：如电聊印象、关注点..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 focus:border-[#165DFF]"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
            <div className="flex gap-2">
              <button onClick={goPrev} disabled={currentIdx === 0}
                className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition">← 上一个</button>
              <button onClick={goNext} disabled={currentIdx >= candidates.length - 1}
                className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition">下一个 →</button>
            </div>
            <button
              onClick={handleSubmit}
              disabled={skillVal === 0 || expVal === 0 || softVal === 0 || submitting}
              className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {current.evaluation ? '更新评估' : '提交评估'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">暂无候选人</p>
          <p className="text-sm text-gray-400 mt-2">请先导入候选人</p>
        </div>
      )}
    </div>
  );
}
