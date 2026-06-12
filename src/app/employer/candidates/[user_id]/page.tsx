'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Lock, Phone, GraduationCap, Briefcase, MapPin,
  Award, Sparkles, TrendingUp, Target, AlertTriangle, BookOpen,
  CheckCircle2, XCircle, Clock, User, Star, Languages, Users,
} from 'lucide-react';

interface UnlockInfo {
  unlocked_at: string;
  expires_at: string;
  hours_remaining: number;
}

interface Portrait {
  user_id: string;
  nickname: string | null;
  phone: string | null;
  major: string | null;
  grade: string | null;
  graduation_year: string | null;
  gpa: number | null;
  english_level: string | null;
  target_cities: string[] | null;
  target_industry: string | null;
  target_job: string | null;
  career_tendency: string | null;
  personality_type: string | null;
  hard_skills: string[] | null;
  soft_skills: string[] | null;
  has_internship: boolean | null;
  has_project: boolean | null;
  awards: unknown[] | null;
  internship_experience: unknown[] | null;
  project_experience: unknown[] | null;
  assessment_at: string | null;
  assessment_overall_score: number | null;
  major_match_score: number | null;
  tech_skill_score: number | null;
  industry_awareness_score: number | null;
  practice_score: number | null;
  soft_skill_score: number | null;
  job_readiness_score: number | null;
  top_strengths: string[] | null;
  top_weaknesses: string[] | null;
  matched_jobs: unknown[] | null;
  skill_gaps: string[] | null;
  improvement_plan: unknown;
  career_plan_at: string | null;
  plan_target_job: string | null;
  plan_target_industry: string | null;
  career_paths: unknown[] | null;
  skill_learning_path: unknown;
  current_match_score: number | null;
  action_plan: unknown;
  interview_at: string | null;
  interview_target_job: string | null;
  interview_overall_score: number | null;
  resume_match_score: number | null;
  hr_round_score: number | null;
  technical_round_score: number | null;
  executive_round_score: number | null;
  key_strengths: string[] | null;
  key_weaknesses: string[] | null;
  gap_skills: string[] | null;
  portrait_completeness_score: number;
}

interface DetailResp {
  ok: boolean;
  data?: { unlock: UnlockInfo; portrait: Portrait };
  code?: string;
  message?: string;
  details?: { hint?: string; expired_at?: string };
}

function Section({ icon: Icon, title, children, action }: {
  icon: typeof User;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-[#165DFF]/10 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Icon className="w-5 h-5 text-[#165DFF]" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number | null }) {
  if (score == null) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">{label}</span>
        <span className="text-slate-300 text-xs">未评估</span>
      </div>
    );
  }
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-[#165DFF]' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900 tabular-nums">{score}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TagList({ items, color = 'blue' }: { items: string[] | null; color?: 'blue' | 'amber' | 'emerald' | 'rose' | 'slate' }) {
  if (!items || items.length === 0) return <span className="text-sm text-slate-300">—</span>;
  const cls = {
    blue: 'bg-[#165DFF]/8 text-[#165DFF] border-[#165DFF]/20',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  }[color];
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t, i) => (
        <span key={i} className={`px-2.5 py-1 rounded-md text-xs border ${cls}`}>{t}</span>
      ))}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-sm text-slate-900 font-medium">
        {value ?? <span className="text-slate-300">—</span>}
      </div>
    </div>
  );
}

export default function CandidateDetailPage() {
  const params = useParams<{ user_id: string }>();
  const router = useRouter();
  const userId = params?.user_id;
  const [data, setData] = useState<DetailResp['data'] | null>(null);
  const [error, setError] = useState<{ code: string; message: string; hint?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const r = await fetch(`/api/employer/candidates/${userId}`, { credentials: 'include' });
        const json: DetailResp = await r.json();
        if (json.ok && json.data) {
          setData(json.data);
        } else {
          if (json.code === 'UNAUTHORIZED') {
            router.push('/employer/auth/login');
            return;
          }
          setError({
            code: json.code || 'ERROR',
            message: json.message || '加载失败',
            hint: json.details?.hint,
          });
        }
      } catch (e) {
        setError({ code: 'NETWORK', message: e instanceof Error ? e.message : '网络异常' });
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#165DFF] animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    const isLocked = error?.code === 'FORBIDDEN' || error?.hint === 'not_unlocked' || error?.hint === 'expired';
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/employer/candidates" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#165DFF] mb-6 transition">
          <ArrowLeft className="w-4 h-4" />
          返回候选人列表
        </Link>
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-[#165DFF]/10 p-10 shadow-sm text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isLocked ? 'bg-amber-50' : 'bg-rose-50'}`}>
            {isLocked ? <Lock className="w-8 h-8 text-amber-500" /> : <XCircle className="w-8 h-8 text-rose-500" />}
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            {isLocked ? '该候选人尚未解锁' : '加载失败'}
          </h2>
          <p className="text-sm text-slate-500 mb-6">{error?.message || '未知错误'}</p>
          {isLocked && (
            <Link
              href={`/employer/candidates?focus=${userId}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white text-sm font-medium hover:-translate-y-0.5 transition shadow-md shadow-[#165DFF]/20"
            >
              <Sparkles className="w-4 h-4" />
              前往解锁（消耗 1 条）
            </Link>
          )}
        </div>
      </div>
    );
  }

  const { unlock, portrait } = data;
  const fmt = (s: string | null) => (s ? new Date(s).toLocaleString('zh-CN', { hour12: false }) : '—');
  const fmtArrSize = (a: unknown[] | null) => (Array.isArray(a) ? a.length : 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* 顶部返回 + 解锁状态条 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/employer/candidates" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#165DFF] transition">
          <ArrowLeft className="w-4 h-4" />
          返回候选人列表
        </Link>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" />
          已解锁 · 剩余 {unlock.hours_remaining} 小时（至 {fmt(unlock.expires_at)}）
        </div>
      </div>

      {/* Hero 候选人卡片 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#165DFF] via-[#3D7FFF] to-[#5A9FFF] text-white p-8 shadow-lg shadow-[#165DFF]/20">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -translate-y-20 translate-x-20" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#FF7D00]/20 rounded-full blur-3xl translate-y-16 -translate-x-16" />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-2xl font-bold">
                {(portrait.nickname || '匿').charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{portrait.nickname || '匿名候选人'}</h1>
                <div className="text-sm text-white/80 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                  {portrait.major && <span className="inline-flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />{portrait.major}</span>}
                  {portrait.grade && <span>{portrait.grade}</span>}
                  {portrait.graduation_year && <span>{portrait.graduation_year} 届</span>}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {portrait.phone && (
                <span className="inline-flex items-center gap-1.5 text-white/90">
                  <Phone className="w-4 h-4" />
                  <span className="tabular-nums select-all">{portrait.phone}</span>
                </span>
              )}
              {portrait.target_job && (
                <span className="inline-flex items-center gap-1.5 text-white/90">
                  <Target className="w-4 h-4" />
                  目标：{portrait.target_job}
                </span>
              )}
              {portrait.target_cities && portrait.target_cities.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-white/90">
                  <MapPin className="w-4 h-4" />
                  {portrait.target_cities.join(' / ')}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/70 mb-1">画像完整度</div>
            <div className="text-4xl font-bold tabular-nums">{portrait.portrait_completeness_score}</div>
            <div className="text-xs text-white/70">/ 100</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左列 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 基础信息 */}
          <Section icon={User} title="基础信息">
            <div className="grid grid-cols-2 gap-4">
              <Field label="GPA" value={portrait.gpa != null ? portrait.gpa.toFixed(2) : null} />
              <Field label="英语水平" value={portrait.english_level} />
              <Field label="性格类型" value={portrait.personality_type} />
              <Field label="职业倾向" value={portrait.career_tendency} />
              <Field label="期望行业" value={portrait.target_industry} />
              <Field label="实习经历" value={portrait.has_internship ? `${fmtArrSize(portrait.internship_experience)} 段` : '暂无'} />
              <Field label="项目经历" value={portrait.has_project ? `${fmtArrSize(portrait.project_experience)} 段` : '暂无'} />
              <Field label="获奖记录" value={fmtArrSize(portrait.awards) > 0 ? `${fmtArrSize(portrait.awards)} 项` : '暂无'} />
            </div>
          </Section>

          {/* 测评分项 */}
          {portrait.assessment_overall_score != null && (
            <Section icon={Award} title="求职竞争力评估" action={
              <span className="text-xs text-slate-400">{portrait.assessment_at ? new Date(portrait.assessment_at).toLocaleDateString('zh-CN') : ''}</span>
            }>
              <div className="text-center mb-4 pb-4 border-b border-slate-100">
                <div className="text-3xl font-bold text-[#165DFF] tabular-nums">{portrait.assessment_overall_score}</div>
                <div className="text-xs text-slate-500 mt-1">综合得分</div>
              </div>
              <div className="space-y-3">
                <ScoreBar label="专业匹配" score={portrait.major_match_score} />
                <ScoreBar label="硬技能" score={portrait.tech_skill_score} />
                <ScoreBar label="行业认知" score={portrait.industry_awareness_score} />
                <ScoreBar label="实践经验" score={portrait.practice_score} />
                <ScoreBar label="软实力" score={portrait.soft_skill_score} />
                <ScoreBar label="求职准备度" score={portrait.job_readiness_score} />
              </div>
            </Section>
          )}

          {/* 面试模拟 */}
          {portrait.interview_overall_score != null && (
            <Section icon={Users} title="模拟面试结果" action={
              <span className="text-xs text-slate-400">{portrait.interview_at ? new Date(portrait.interview_at).toLocaleDateString('zh-CN') : ''}</span>
            }>
              <div className="text-center mb-4 pb-4 border-b border-slate-100">
                <div className="text-3xl font-bold text-[#165DFF] tabular-nums">{portrait.interview_overall_score}</div>
                <div className="text-xs text-slate-500 mt-1">{portrait.interview_target_job || '面试综合分'}</div>
              </div>
              <div className="space-y-3">
                <ScoreBar label="简历匹配" score={portrait.resume_match_score} />
                <ScoreBar label="HR 面" score={portrait.hr_round_score} />
                <ScoreBar label="技术面" score={portrait.technical_round_score} />
                <ScoreBar label="高管面" score={portrait.executive_round_score} />
              </div>
            </Section>
          )}
        </div>

        {/* 右列（主区） */}
        <div className="lg:col-span-2 space-y-6">
          {/* 优势 */}
          {(portrait.top_strengths || portrait.key_strengths) && (
            <Section icon={Sparkles} title="核心优势">
              {portrait.top_strengths && portrait.top_strengths.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-slate-500 mb-2">来自测评</div>
                  <TagList items={portrait.top_strengths} color="emerald" />
                </div>
              )}
              {portrait.key_strengths && portrait.key_strengths.length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-2">来自模拟面试</div>
                  <TagList items={portrait.key_strengths} color="emerald" />
                </div>
              )}
              {!portrait.top_strengths?.length && !portrait.key_strengths?.length && (
                <span className="text-sm text-slate-300">暂无</span>
              )}
            </Section>
          )}

          {/* 技能 */}
          <Section icon={Briefcase} title="技能图谱">
            <div className="space-y-4">
              <div>
                <div className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-[#165DFF]" />
                  硬技能
                </div>
                <TagList items={portrait.hard_skills} color="blue" />
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-[#165DFF]" />
                  软技能
                </div>
                <TagList items={portrait.soft_skills} color="slate" />
              </div>
              {portrait.skill_gaps && portrait.skill_gaps.length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    技能缺口
                  </div>
                  <TagList items={portrait.skill_gaps} color="amber" />
                </div>
              )}
              {portrait.gap_skills && portrait.gap_skills.length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    面试发现的差距
                  </div>
                  <TagList items={portrait.gap_skills} color="amber" />
                </div>
              )}
            </div>
          </Section>

          {/* 待改进 */}
          {((portrait.top_weaknesses && portrait.top_weaknesses.length > 0) || (portrait.key_weaknesses && portrait.key_weaknesses.length > 0)) && (
            <Section icon={AlertTriangle} title="待改进">
              {portrait.top_weaknesses && portrait.top_weaknesses.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-slate-500 mb-2">来自测评</div>
                  <TagList items={portrait.top_weaknesses} color="rose" />
                </div>
              )}
              {portrait.key_weaknesses && portrait.key_weaknesses.length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-2">来自面试</div>
                  <TagList items={portrait.key_weaknesses} color="rose" />
                </div>
              )}
            </Section>
          )}

          {/* 职业规划 */}
          {portrait.career_plan_at && (
            <Section icon={TrendingUp} title="职业规划" action={
              <span className="text-xs text-slate-400">{portrait.current_match_score != null ? `当前匹配 ${portrait.current_match_score}` : ''}</span>
            }>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Field label="规划目标岗位" value={portrait.plan_target_job} />
                <Field label="规划目标行业" value={portrait.plan_target_industry} />
              </div>
              {portrait.career_paths && portrait.career_paths.length > 0 && (
                <div className="text-xs text-slate-500">
                  共生成 <span className="font-medium text-slate-700">{portrait.career_paths.length}</span> 条职业路径建议
                </div>
              )}
            </Section>
          )}

          {/* 经历 */}
          {(fmtArrSize(portrait.internship_experience) > 0 || fmtArrSize(portrait.project_experience) > 0 || fmtArrSize(portrait.awards) > 0) && (
            <Section icon={BookOpen} title="经历摘要">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-xl bg-slate-50/80">
                  <div className="text-2xl font-bold text-slate-900 tabular-nums">{fmtArrSize(portrait.internship_experience)}</div>
                  <div className="text-xs text-slate-500 mt-1">实习</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-slate-50/80">
                  <div className="text-2xl font-bold text-slate-900 tabular-nums">{fmtArrSize(portrait.project_experience)}</div>
                  <div className="text-xs text-slate-500 mt-1">项目</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-slate-50/80">
                  <div className="text-2xl font-bold text-slate-900 tabular-nums">{fmtArrSize(portrait.awards)}</div>
                  <div className="text-xs text-slate-500 mt-1">获奖</div>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                详细经历明细页 P5-D2 即将上线
              </p>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
