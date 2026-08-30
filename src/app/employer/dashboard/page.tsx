'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Coins, Users, TrendingUp, Sparkles, ArrowRight, Loader2,
  Briefcase, Award, GraduationCap,
} from 'lucide-react';

interface Me {
  employer_id: string;
  real_name: string;
  credit_balance: number;
  company: { name: string } | null;
}
interface Balance {
  credit_balance: number;
  total_recharged: number;
  total_consumed: number;
}
interface Candidate {
  user_id: string;
  nickname: string;
  grade: string | null;
  major: string | null;
  target_job: string | null;
  graduation_year: string | null;
  portrait_completeness_score: number | null;
  assessment_overall_score: number | null;
  top_strengths: string[] | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/employer/auth/me', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/employer/credits/balance', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/employer/candidates?page_size=6&sort=completeness', {
        credentials: 'include',
      }).then((r) => r.json()),
    ])
      .then(([meRes, balRes, candRes]) => {
        if (!meRes.ok) {
          router.push('/employer/auth/login');
          return;
        }
        setMe(meRes.data);
        if (balRes.ok) setBalance(balRes.data);
        if (candRes.success) setCandidates(candRes.data.items);
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-400">
        <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
        加载中...
      </div>
    );
  }
  if (!me) return null;

  return (
    <div className="space-y-6">
      {/* Hero · 欢迎语 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#165DFF] via-[#3D7FFF] to-[#5A9FFF] text-white p-6 md:p-8 shadow-xl shadow-[#165DFF]/20">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#FF7D00]/20 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-sm text-white/80 mb-1">
            <Sparkles className="w-4 h-4" />
            雇主工作台
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            你好，{me.real_name}
          </h1>
          <p className="text-white/80 text-sm">
            {me.company?.name ?? '未关联公司'} · 让我们一起找到对的人
          </p>
        </div>
      </div>

      {/* 余额 + 数据卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/employer/billing"
          className="group bg-white/80 backdrop-blur-md border border-[#FF7D00]/20 rounded-2xl p-5 hover:shadow-lg hover:shadow-[#FF7D00]/10 transition hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">当前余额</span>
            <Coins className="w-5 h-5 text-[#FF7D00]" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-[#FF7D00]">
              {balance?.credit_balance ?? 0}
            </span>
            <span className="text-sm text-gray-500">条</span>
          </div>
          <div className="text-xs text-[#FF7D00] mt-2 flex items-center gap-1 group-hover:gap-2 transition-all">
            前往充值 <ArrowRight className="w-3 h-3" />
          </div>
        </Link>

        <div className="bg-white/80 backdrop-blur-md border border-[#165DFF]/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">已解锁</span>
            <Users className="w-5 h-5 text-[#165DFF]" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900">
              {balance?.total_consumed ?? 0}
            </span>
            <span className="text-sm text-gray-500">人</span>
          </div>
          <div className="text-xs text-gray-400 mt-2">累计候选人解锁次数</div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-[#165DFF]/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">累计充值</span>
            <TrendingUp className="w-5 h-5 text-[#165DFF]" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900">
              {balance?.total_recharged ?? 0}
            </span>
            <span className="text-sm text-gray-500">条</span>
          </div>
          <div className="text-xs text-gray-400 mt-2">¥10/条 · 解锁完整画像</div>
        </div>
      </div>

      {/* 推荐候选人 */}
      <div className="bg-white/60 backdrop-blur-md border border-[#165DFF]/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#165DFF]" />
            推荐候选人
          </h2>
          <Link
            href="/employer/candidates"
            className="text-sm text-[#165DFF] hover:underline flex items-center gap-1"
          >
            查看全部
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {candidates.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">暂无候选人</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {candidates.map((c) => (
              <CandidateCard key={c.user_id} c={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CandidateCard({ c }: { c: Candidate }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 hover:border-[#165DFF]/30 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-medium text-gray-900">{c.nickname || '匿名候选人'}</div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
            <GraduationCap className="w-3 h-3" />
            {c.grade ?? '—'} · {c.major ?? '—'}
          </div>
        </div>
        {c.portrait_completeness_score !== null && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#165DFF]/10 text-[#165DFF] font-medium">
            画像 {c.portrait_completeness_score}
          </span>
        )}
      </div>
      <div className="text-xs text-gray-600 mb-2 flex items-center gap-1">
        <Briefcase className="w-3 h-3" />
        意向：{c.target_job ?? '—'}
      </div>
      {c.top_strengths && c.top_strengths.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {c.top_strengths.slice(0, 3).map((s) => (
            <span
              key={s}
              className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100"
            >
              {s}
            </span>
          ))}
        </div>
      )}
      {c.assessment_overall_score !== null && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Award className="w-3 h-3" />
          测评综合：{c.assessment_overall_score}
        </div>
      )}
    </div>
  );
}
