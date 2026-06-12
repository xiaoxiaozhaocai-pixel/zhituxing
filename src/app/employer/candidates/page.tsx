'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, Search, Briefcase, GraduationCap, MapPin, Award, Sparkles,
  Lock, Unlock, ArrowLeft, ArrowRight, X, Coins,
} from 'lucide-react';

interface Candidate {
  user_id: string;
  nickname: string;
  grade: string | null;
  major: string | null;
  target_job: string | null;
  graduation_year: string | null;
  target_cities: string[] | null;
  target_industry: string | null;
  english_level: string | null;
  hard_skills: string[] | null;
  soft_skills: string[] | null;
  top_strengths: string[] | null;
  top_weaknesses: string[] | null;
  has_internship: boolean | null;
  has_project: boolean | null;
  membership_tier: string | null;
  portrait_completeness_score: number | null;
  assessment_overall_score: number | null;
  current_match_score: number | null;
  matched_jobs: { job: string; match: number }[] | null;
  internship_experience: { role?: string; company?: string; duration?: string }[] | null;
  project_experience: { name?: string; role?: string; tech_stack?: string }[] | null;
}

interface ListResp {
  items: Candidate[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const GRADES = ['', '大一', '大二', '大三', '大四', '研一', '研二', '研三'];

export default function CandidatesPage() {
  const router = useRouter();
  const [data, setData] = useState<ListResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);

  // 筛选
  const [grade, setGrade] = useState('');
  const [major, setMajor] = useState('');
  const [targetJob, setTargetJob] = useState('');
  const [city, setCity] = useState('');
  const [hasInternship, setHasInternship] = useState('');
  const [sort, setSort] = useState<'completeness' | 'assessment' | 'recent'>('completeness');
  const [page, setPage] = useState(1);

  // 解锁弹窗
  const [unlockTarget, setUnlockTarget] = useState<Candidate | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: '12', sort });
    if (grade) params.set('grade', grade);
    if (major) params.set('major', major);
    if (targetJob) params.set('target_job', targetJob);
    if (city) params.set('city', city);
    if (hasInternship) params.set('has_internship', hasInternship);

    fetch(`/api/employer/candidates?${params.toString()}`, { credentials: 'include' })
      .then(async (r) => {
        if (r.status === 404 || r.status === 401) {
          router.push('/employer/auth/login');
          return null;
        }
        const j = await r.json();
        return j.success ? (j.data as ListResp) : null;
      })
      .then((d) => {
        if (d) setData(d);
        setLoading(false);
      });
  }, [page, sort, grade, major, targetJob, city, hasInternship, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetch('/api/employer/credits/balance', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setBalance(j.data.credit_balance);
      });
  }, []);

  function applyFilter() {
    setPage(1);
    fetchData();
  }
  function resetFilter() {
    setGrade('');
    setMajor('');
    setTargetJob('');
    setCity('');
    setHasInternship('');
    setSort('completeness');
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#165DFF]" />
            候选人库
          </h1>
          <p className="text-sm text-gray-500 mt-1">¥10/条 · 24 小时内重复查看免费</p>
        </div>
        {balance !== null && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF7D00]/10 border border-[#FF7D00]/20">
            <Coins className="w-4 h-4 text-[#FF7D00]" />
            <span className="text-sm">余额 <span className="font-semibold text-[#FF7D00]">{balance}</span> 条</span>
          </div>
        )}
      </div>

      {/* 筛选条 */}
      <div className="bg-white/70 backdrop-blur-md border border-[#165DFF]/10 rounded-xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:border-[#165DFF] outline-none"
          >
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g || '全部年级'}
              </option>
            ))}
          </select>
          <input
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            placeholder="专业"
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:border-[#165DFF] outline-none"
          />
          <input
            value={targetJob}
            onChange={(e) => setTargetJob(e.target.value)}
            placeholder="目标岗位"
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:border-[#165DFF] outline-none"
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="目标城市"
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:border-[#165DFF] outline-none"
          />
          <select
            value={hasInternship}
            onChange={(e) => setHasInternship(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:border-[#165DFF] outline-none"
          >
            <option value="">实习经历不限</option>
            <option value="true">有实习</option>
            <option value="false">无实习</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as 'completeness' | 'assessment' | 'recent')}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:border-[#165DFF] outline-none"
          >
            <option value="completeness">画像完整度</option>
            <option value="assessment">测评得分</option>
            <option value="recent">最新更新</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={resetFilter}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition"
          >
            重置
          </button>
          <button
            onClick={applyFilter}
            className="px-3 py-1.5 text-sm bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white rounded-md shadow-md shadow-[#165DFF]/20 hover:opacity-90 transition flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" />
            筛选
          </button>
        </div>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">
          <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
          加载中...
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">没有符合条件的候选人</div>
      ) : (
        <>
          <div className="text-xs text-gray-500">
            共 {data.total} 名候选人，第 {data.page}/{data.total_pages} 页
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.items.map((c) => (
              <CandidateCard key={c.user_id} c={c} onUnlock={() => setUnlockTarget(c)} />
            ))}
          </div>
          {/* 分页 */}
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-2 rounded-md border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">
              {page} / {data.total_pages}
            </span>
            <button
              disabled={page >= data.total_pages}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded-md border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* 解锁弹窗 */}
      {unlockTarget && (
        <UnlockDialog
          candidate={unlockTarget}
          balance={balance}
          onClose={() => setUnlockTarget(null)}
          onSuccess={(newBalance) => {
            if (typeof newBalance === 'number') setBalance(newBalance);
          }}
        />
      )}
    </div>
  );
}

function CandidateCard({ c, onUnlock }: { c: Candidate; onUnlock: () => void }) {
  return (
    <div className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-xl p-4 hover:border-[#165DFF]/30 hover:shadow-lg hover:shadow-[#165DFF]/5 transition hover:-translate-y-0.5 flex flex-col">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-semibold text-gray-900">{c.nickname || '匿名候选人'}</div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
            <GraduationCap className="w-3 h-3" />
            {c.grade ?? '—'} · {c.graduation_year ?? '—'}届 · {c.major ?? '—'}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {c.portrait_completeness_score !== null && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#165DFF]/10 text-[#165DFF] font-medium">
              画像 {c.portrait_completeness_score}
            </span>
          )}
          {c.assessment_overall_score !== null && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              测评 {c.assessment_overall_score}
            </span>
          )}
        </div>
      </div>
      <div className="text-xs text-gray-600 mb-1.5 flex items-center gap-1">
        <Briefcase className="w-3 h-3" />
        意向：{c.target_job ?? '—'}
      </div>
      {c.target_cities && c.target_cities.length > 0 && (
        <div className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {c.target_cities.slice(0, 3).join('·')}
        </div>
      )}
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
      {c.hard_skills && c.hard_skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {c.hard_skills.slice(0, 4).map((s) => (
            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
              {s}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-3 flex-1">
        {c.has_internship && <span className="flex items-center gap-0.5"><Award className="w-3 h-3" />实习</span>}
        {c.has_project && <span className="flex items-center gap-0.5"><Sparkles className="w-3 h-3" />项目</span>}
      </div>
      <button
        onClick={onUnlock}
        className="w-full py-1.5 px-3 bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white text-sm font-medium rounded-md shadow-md shadow-[#165DFF]/20 hover:opacity-90 transition flex items-center justify-center gap-1.5"
      >
        <Lock className="w-3.5 h-3.5" />
        解锁完整画像 · 1 条
      </button>
    </div>
  );
}

function UnlockDialog({
  candidate,
  balance,
  onClose,
  onSuccess,
}: {
  candidate: Candidate;
  balance: number | null;
  onClose: () => void;
  onSuccess: (newBalance: number | null) => void;
}) {
  const [stage, setStage] = useState<'confirm' | 'unlocked' | 'error'>('confirm');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [unlockedData, setUnlockedData] = useState<{
    status: string;
    balance_after: number | null;
    expires_at: string;
    message: string;
  } | null>(null);

  async function handleConfirm() {
    setLoading(true);
    try {
      const r = await fetch('/api/employer/credits/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ candidate_user_id: candidate.user_id }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setErrorMsg(j.error?.message ?? '解锁失败');
        setStage('error');
        return;
      }
      setUnlockedData(j.data);
      onSuccess(j.data.balance_after ?? null);
      setStage('unlocked');
    } catch {
      setErrorMsg('网络错误');
      setStage('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            {stage === 'unlocked' ? (
              <><Unlock className="w-5 h-5 text-emerald-500" />解锁成功</>
            ) : (
              <><Lock className="w-5 h-5 text-[#165DFF]" />解锁候选人</>
            )}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          {stage === 'confirm' && (
            <>
              <div className="bg-gradient-to-br from-[#f0f5ff] to-white border border-[#165DFF]/10 rounded-xl p-4 mb-4">
                <div className="font-medium text-gray-900">{candidate.nickname}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {candidate.grade} · {candidate.major} · {candidate.target_job ?? '未填意向'}
                </div>
              </div>
              <div className="text-sm text-gray-600 mb-2">解锁后可查看：</div>
              <ul className="text-sm text-gray-700 space-y-1 mb-4 list-disc pl-5">
                <li>完整实习/项目经历</li>
                <li>测评雷达图与详细得分</li>
                <li>真实姓名（如对方授权）</li>
                <li>24 小时内重复查看免费</li>
              </ul>
              <div className="bg-[#FF7D00]/5 border border-[#FF7D00]/20 rounded-lg px-3 py-2 mb-4 text-sm flex items-center justify-between">
                <span className="text-gray-600">本次扣费</span>
                <span className="font-semibold text-[#FF7D00]">1 条 · ¥10</span>
              </div>
              {balance !== null && balance < 1 && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
                  余额不足，请先充值
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading || (balance !== null && balance < 1)}
                  className="flex-1 py-2 bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white rounded-lg shadow-md shadow-[#165DFF]/20 hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-1.5"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                  确认解锁
                </button>
              </div>
            </>
          )}
          {stage === 'unlocked' && unlockedData && (
            <>
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 text-emerald-500 mb-3">
                  <Unlock className="w-7 h-7" />
                </div>
                <div className="text-base font-medium text-gray-900 mb-1">{unlockedData.message}</div>
                <div className="text-xs text-gray-500">
                  到期时间：{new Date(unlockedData.expires_at).toLocaleString('zh-CN')}
                </div>
                {unlockedData.balance_after !== null && (
                  <div className="mt-3 text-sm text-gray-600">
                    余额：<span className="font-semibold text-[#FF7D00]">{unlockedData.balance_after}</span> 条
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-full py-2 bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white rounded-lg shadow-md shadow-[#165DFF]/20 hover:opacity-90 transition"
              >
                查看完整画像（开发中）
              </button>
            </>
          )}
          {stage === 'error' && (
            <>
              <div className="text-center py-4">
                <div className="text-red-600 mb-3">{errorMsg}</div>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-700"
                >
                  关闭
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
