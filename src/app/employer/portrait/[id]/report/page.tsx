"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, BarChart3, TrendingUp, Users, AlertTriangle } from 'lucide-react';

interface ReportData {
  portrait: {
    id: string; title: string; candidate_count: number; evaluated_count: number;
  };
  candidates: Array<{
    name: string; education: string | null; edu_level: number | null;
    experience_summary: string | null;
    skill_level: number; exp_level: number; soft_level: number; notes: string | null;
  }>;
}

const LEVEL_SCORES = [0, 10, 30, 55, 75, 95]; // v2 encoding scores

export default function PortraitReportPage() {
  const params = useParams();
  const router = useRouter();
  const portraitId = params.id as string;
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/employer/portrait/${portraitId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(async (pRes) => {
        if (pRes.error === 'UNAUTHORIZED') { router.push('/employer/auth/login'); return; }
        if (!pRes.ok) { setError('画像项目不存在'); setLoading(false); return; }
        
        const cRes = await fetch(`/api/employer/portrait/${portraitId}/candidates`, { credentials: 'include' });
        const cData = await cRes.json();
        
        if (cData.ok) {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
          const evaluated = (cData.data.items || []).filter((c: any) => c.evaluation);
          setData({
            portrait: pRes.data.item,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
            candidates: evaluated.map((c: any) => ({
              name: c.name,
              education: c.education,
              edu_level: c.edu_level,
              experience_summary: c.experience_summary,
              skill_level: c.evaluation.skill_level,
              exp_level: c.evaluation.exp_level,
              soft_level: c.evaluation.soft_level,
              notes: c.evaluation.notes,
            })),
          });
        }
        setLoading(false);
      });
  }, [portraitId, router]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-[#165DFF]" />
    </div>
  );

  if (error) return <div className="text-gray-500 text-center py-16">{error}</div>;
  if (!data || data.candidates.length === 0) return (
    <div className="text-center py-16">
      <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500">暂无评估数据</p>
      <p className="text-sm text-gray-400 mt-2">需要至少评估1位候选人后才能生成报告</p>
      <Link href={`/employer/portrait/${portraitId}`} className="inline-block mt-4 text-sm text-[#165DFF] hover:underline">返回盲评</Link>
    </div>
  );

  const n = data.candidates.length;

  // Compute dimension distributions
  const dist = (dim: 'skill_level' | 'exp_level' | 'soft_level') => {
    const counts = [0,0,0,0,0,0];
    for (const c of data.candidates) counts[c[dim]] = (counts[c[dim]] || 0) + 1;
    return counts;
  };
  const skillDist = dist('skill_level');
  const expDist = dist('exp_level');
  const softDist = dist('soft_level');

  // Compute composite score
  const scored = data.candidates.map(c => {
    const s = LEVEL_SCORES[c.skill_level] * 0.30 + LEVEL_SCORES[c.exp_level] * 0.25 + LEVEL_SCORES[c.soft_level] * 0.35;
    return { ...c, score: Math.round(s) };
  }).sort((a, b) => b.score - a.score);

  // Top candidates
  const top5 = scored.slice(0, Math.min(5, scored.length));

  // Find patterns (simplified group analysis)
  const highSkill = data.candidates.filter(c => c.skill_level >= 4).length;
  const highExp = data.candidates.filter(c => c.exp_level >= 4).length;
  const highSoft = data.candidates.filter(c => c.soft_level >= 4).length;
  const allHigh = data.candidates.filter(c => c.skill_level >= 4 && c.exp_level >= 4 && c.soft_level >= 4).length;
  const skillExp = data.candidates.filter(c => c.skill_level >= 4 && c.exp_level >= 4).length;
  const skillSoft = data.candidates.filter(c => c.skill_level >= 4 && c.soft_level >= 4).length;
  const expSoft = data.candidates.filter(c => c.exp_level >= 4 && c.soft_level >= 4).length;

  const DistributionBar = ({ label, data }: { label: string; data: number[] }) => {
    const max = Math.max(...data, 1);
    return (
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span className="font-medium">{label}</span>
        </div>
        <div className="flex gap-1 h-5">
          {data.slice(1).map((v, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end">
              {v > 0 && (
                <div
                  className="w-full rounded-t-sm bg-gradient-to-t from-[#165DFF] to-[#3D7FFF]"
                  style={{ height: `${(v / max) * 100}%`, opacity: 0.3 + i * 0.15 }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-1 text-[10px] text-gray-400 mt-0.5">
          {['极低','低','中','高','极高'].map((l, i) => (
            <div key={i} className="flex-1 text-center">{l}</div>
          ))}
        </div>
        <div className="flex gap-1 text-[10px] text-gray-500 mt-0.5">
          {data.slice(1).map((v, i) => (
            <div key={i} className="flex-1 text-center">{v}人</div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <Link href={`/employer/portrait/${portraitId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#165DFF] mb-4 transition">
        <ArrowLeft className="w-4 h-4" />
        返回盲评
      </Link>

      <h1 className="text-xl font-bold text-gray-900 mb-2">{data.portrait.title} · 真实画像报告</h1>
      <p className="text-sm text-gray-500 mb-6">基于 {n} 位候选人的盲评数据生成</p>

      {/* Overview */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <Users className="w-5 h-5 text-[#165DFF] mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">{n}</div>
          <div className="text-xs text-gray-500">评估人数</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <TrendingUp className="w-5 h-5 text-[#165DFF] mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">{Math.round(highSkill / n * 100)}%</div>
          <div className="text-xs text-gray-500">技能高占比(≥4级)</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <BarChart3 className="w-5 h-5 text-[#165DFF] mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">{allHigh}</div>
          <div className="text-xs text-gray-500">全维度强型</div>
        </div>
      </div>

      {/* Distribution */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">各维度分布</h2>
        <DistributionBar label="Skill（技术能力）" data={skillDist} />
        <DistributionBar label="Exp（经验对口度）" data={expDist} />
        <DistributionBar label="Soft（软素质）" data={softDist} />
      </div>

      {/* Pattern Analysis */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">组态路径分析</h2>
        <div className="space-y-2">
          {highSkill >= n * 0.5 && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <span className="text-lg">🔵</span>
              <div>
                <div className="text-sm font-medium text-gray-900">技能主导型路径</div>
                <div className="text-xs text-gray-600 mt-0.5">{highSkill}/{n} 人技能≥4级（{Math.round(highSkill/n*100)}%），技能可能是该岗位的基础门槛</div>
              </div>
            </div>
          )}
          {expSoft >= n * 0.3 && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <span className="text-lg">🟢</span>
              <div>
                <div className="text-sm font-medium text-gray-900">经验+软素质型路径</div>
                <div className="text-xs text-gray-600 mt-0.5">{expSoft}/{n} 人经验且软素质同时≥4级，经验+软素质的组态效应明显</div>
              </div>
            </div>
          )}
          {skillSoft >= n * 0.3 && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <span className="text-lg">🟣</span>
              <div>
                <div className="text-sm font-medium text-gray-900">技能+软素质型路径</div>
                <div className="text-xs text-gray-600 mt-0.5">{skillSoft}/{n} 人技能且软素质同时≥4级</div>
              </div>
            </div>
          )}
          {allHigh === 0 && n >= 5 && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
              <span className="text-lg">⚠️</span>
              <div>
                <div className="text-sm font-medium text-gray-900">无全维度强型候选人</div>
                <div className="text-xs text-gray-600 mt-0.5">没有人在 Skill/Exp/Soft 三维度同时达到4级以上</div>
              </div>
            </div>
          )}
          {n >= 10 && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-lg">📊</span>
              <div>
                <div className="text-sm font-medium text-gray-900">fsQCA 完整分析</div>
                <div className="text-xs text-gray-600 mt-0.5">当前 {n} 人，达到 15 人后自动跑完整模糊集定性比较分析（模糊校准→真值表→组态解→决策规则）</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Ranking */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          推荐排名 Top{top5.length}
          <span className="text-gray-400 font-normal text-xs ml-2">综合评分 = Skill×30% + Exp×25% + Soft×35%</span>
        </h2>
        <div className="space-y-2">
          {top5.map((c, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] text-white text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{c.name}</div>
                  <div className="text-xs text-gray-500">
                    Skl={c.skill_level} · Exp={c.exp_level} · Sft={c.soft_level}
                    {c.education && ` · ${c.education}`}
                  </div>
                </div>
              </div>
              <div className="text-lg font-bold text-[#165DFF]">{c.score}</div>
            </div>
          ))}
        </div>
      </div>

      {/* All candidates table */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">全部候选人评分明细</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-gray-500 font-medium">姓名</th>
                <th className="text-center py-2 text-gray-500 font-medium">Skill</th>
                <th className="text-center py-2 text-gray-500 font-medium">Exp</th>
                <th className="text-center py-2 text-gray-500 font-medium">Soft</th>
                <th className="text-center py-2 text-gray-500 font-medium">综合分</th>
                <th className="text-left py-2 text-gray-500 font-medium">学历</th>
              </tr>
            </thead>
            <tbody>
              {scored.map((c, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-2 font-medium text-gray-900">{c.name}</td>
                  <td className="py-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${c.skill_level >= 4 ? 'bg-blue-100 text-[#165DFF]' : 'bg-gray-100 text-gray-600'}`}>{c.skill_level}</span>
                  </td>
                  <td className="py-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${c.exp_level >= 4 ? 'bg-blue-100 text-[#165DFF]' : 'bg-gray-100 text-gray-600'}`}>{c.exp_level}</span>
                  </td>
                  <td className="py-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${c.soft_level >= 4 ? 'bg-blue-100 text-[#165DFF]' : 'bg-gray-100 text-gray-600'}`}>{c.soft_level}</span>
                  </td>
                  <td className="py-2 text-center font-semibold text-gray-900">{c.score}</td>
                  <td className="py-2 text-gray-500 text-xs">{c.education || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
