'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import {
  ArrowLeft, Loader2, Briefcase, RefreshCw,
  Send, PauseCircle, XCircle, PlayCircle,
  Settings,
} from 'lucide-react';

interface JobPost {
  id: number; job_title: string; description: string | null;
  required_hard_skills: string[]; required_soft_skills: string[];
  target_grade: string | null; target_major: string | null; target_school: string | null;
  target_cities: string[]; target_industry: string | null;
  min_completeness: number; min_assessment: number;
  has_internship_required: string; graduation_year: string | null;
  auto_push: boolean; push_frequency: string; status: string;
  created_at: string; updated_at: string;
}

interface MatchCandidate {
  nickname: string | null; major: string | null; grade: string | null;
  graduation_year: string | null; target_industry: string | null;
  target_cities: string[] | null; target_job: string | null;
  hard_skills: string[] | null;
  portrait_completeness_score: number | null;
  assessment_overall_score: number | null;
}

interface MatchDim {
  key: string; label: string; enabled: boolean; weight: number;
  gained: number; level: 'high' | 'mid' | 'low' | 'na'; detail: string;
}

interface MatchBreakdownData {
  summary: string; dimensions: MatchDim[];
  strengths: string[]; shortfalls: string[]; advice: string;
}

interface MatchResult {
  id: number; job_post_id: number; candidate_user_id: string;
  match_score: number; matched_at: string; is_viewed: boolean;
  is_notified: boolean; notes: string | null;
  candidate: MatchCandidate | null;
  breakdown: MatchBreakdownData | null;
}

function dimColor(level: MatchDim['level']): string {
  switch (level) {
    case 'high': return 'bg-[#165DFF]';
    case 'mid': return 'bg-[#FF7D00]';
    case 'low': return 'bg-red-400';
    default: return 'bg-gray-200';
  }
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [post, setPost] = useState<JobPost | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pushing, setPushing] = useState(false);

  const loadPost = () => {
    fetch(`/employer/jobs/${id}/api`).catch(() => {});
    fetch(`/api/employer/job-posts/${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success) setPost(d.data); });
  };

  const loadMatches = () => {
    fetch(`/api/employer/job-posts/${id}/match?page_size=50`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setMatches(d.data.items);
          setMatchCount(d.data.total);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPost(); loadMatches(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMatch = async () => {
    setMatching(true);
    const res = await fetch(`/api/employer/job-posts/${id}/match`, {
      method: 'POST', credentials: 'include',
    });
    const d = await res.json();
    if (d.success) loadMatches();
    setMatching(false);
  };

  const handlePush = async () => {
    if (selectedIds.size === 0) return;
    setPushing(true);
    await fetch('/api/employer/push', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_user_ids: Array.from(selectedIds),
        message: `${post?.job_title} 岗位有新的机会，欢迎了解！`,
      }),
    });
    setPushing(false);
    setSelectedIds(new Set());
  };

  const handleStatusChange = async (status: string) => {
    await fetch(`/api/employer/job-posts/${id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    loadPost();
  };

  const toggleSelect = (uid: string) => {
    const next = new Set(selectedIds);
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === matches.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(matches.map(m => m.candidate_user_id)));
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-400"><Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />加载中...</div>;
  }
  if (!post) {
    return <div className="text-center py-20 text-gray-400">岗位不存在</div>;
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    closed: 'bg-gray-100 text-gray-500',
  };

  const statusLabels: Record<string, string> = {
    active: '进行中', paused: '已暂停', closed: '已关闭',
  };

  return (
    <div className="space-y-6">
      {/* 返回 */}
      <button onClick={() => router.push('/employer/jobs')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#165DFF] transition">
        <ArrowLeft className="w-4 h-4" />返回岗位列表
      </button>

      {/* 岗位信息头部 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold text-gray-900">{post.job_title}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[post.status]}`}>
                {statusLabels[post.status]}
              </span>
            </div>
            {post.description && <p className="text-sm text-gray-500 mb-3">{post.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {post.status === 'active' && (
              <>
                <button onClick={() => handleStatusChange('paused')}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition">
                  <PauseCircle className="w-4 h-4" />暂停
                </button>
                <button onClick={() => handleStatusChange('closed')}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition">
                  <XCircle className="w-4 h-4" />关闭
                </button>
              </>
            )}
            {post.status === 'paused' && (
              <button onClick={() => handleStatusChange('active')}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition">
                <PlayCircle className="w-4 h-4" />恢复
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 匹配条件 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">匹配条件</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">技能要求</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {post.required_hard_skills.map(s => (
                <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{s}</span>
              ))}
              {post.required_soft_skills.map(s => (
                <span key={s} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">{s}</span>
              ))}
              {!post.required_hard_skills.length && !post.required_soft_skills.length && <span className="text-gray-400">无</span>}
            </div>
          </div>
          <div><span className="text-gray-500">目标年级</span><p className="mt-1 font-medium">{post.target_grade || '不限'}</p></div>
          <div><span className="text-gray-500">目标专业</span><p className="mt-1 font-medium">{post.target_major || '不限'}</p></div>
          <div><span className="text-gray-500">目标行业</span><p className="mt-1 font-medium">{post.target_industry || '不限'}</p></div>
          <div><span className="text-gray-500">目标城市</span><p className="mt-1 font-medium">{post.target_cities?.join(', ') || '不限'}</p></div>
          <div><span className="text-gray-500">最低完整度</span><p className="mt-1 font-medium">{post.min_completeness}%</p></div>
          <div><span className="text-gray-500">最低测评分</span><p className="mt-1 font-medium">{post.min_assessment}%</p></div>
          <div><span className="text-gray-500">实习要求</span><p className="mt-1 font-medium">{{'any': '不限', 'yes': '必须有', 'no': '无要求'}[post.has_internship_required]}</p></div>
        </div>
      </div>

      {/* 匹配结果区 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            匹配结果
            <span className="ml-2 text-sm font-normal text-gray-500">({matchCount} 人)</span>
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={handleMatch} disabled={matching}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#165DFF] bg-[#165DFF]/10 rounded-lg hover:bg-[#165DFF]/20 transition disabled:opacity-50">
              {matching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              触发匹配
            </button>
            {selectedIds.size > 0 && (
              <button onClick={handlePush} disabled={pushing}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] rounded-lg hover:opacity-90 transition disabled:opacity-50">
                {pushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                推送消息 ({selectedIds.size})
              </button>
            )}
          </div>
        </div>

        {/* 全选 */}
        {matches.length > 0 && (
          <label className="flex items-center gap-2 mb-3 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={selectedIds.size === matches.length && matches.length > 0}
              onChange={toggleAll} className="rounded border-gray-300 text-[#165DFF] focus:ring-[#165DFF]" />
            全选
          </label>
        )}

        {/* 列表 */}
        {matches.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Briefcase className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p>暂无匹配结果</p>
            <p className="text-xs mt-1">点击&quot;触发匹配&quot;开始匹配候选人</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => {
              const cand = m.candidate;
              const bd = m.breakdown;
              return (
                <div key={m.candidate_user_id}
                  className="p-4 rounded-xl border border-gray-100 hover:border-[#165DFF]/20 transition">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selectedIds.has(m.candidate_user_id)}
                      onChange={() => toggleSelect(m.candidate_user_id)}
                      className="rounded border-gray-300 text-[#165DFF] focus:ring-[#165DFF]" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">{cand?.nickname || '未实名候选人'}</span>
                        {cand?.major && <span className="text-xs text-gray-500">{cand.major}</span>}
                        {cand?.grade && <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{cand.grade}</span>}
                        {cand?.graduation_year && <span className="text-xs text-gray-400">{cand.graduation_year}届</span>}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                        <span>匹配于 {new Date(m.matched_at).toLocaleDateString('zh-CN')}</span>
                        {cand?.portrait_completeness_score != null && <span>画像 {cand.portrait_completeness_score}%</span>}
                        {cand?.assessment_overall_score != null && <span>测评 {cand.assessment_overall_score}分</span>}
                        {cand?.target_cities?.length ? <span>{cand.target_cities.join('、')}</span> : null}
                        {cand?.hard_skills?.length ? <span>技能 {(cand.hard_skills || []).slice(0, 3).join('、')}</span> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] rounded-full transition-all duration-500"
                          style={{ width: `${m.match_score}%` }} />
                      </div>
                      <span className="text-sm font-bold text-[#165DFF] w-8 text-right">{m.match_score}%</span>
                    </div>
                  </div>

                  {bd && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-600">{bd.summary}</p>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5">
                        {bd.dimensions.filter((d) => d.enabled).map((d) => (
                          <div key={d.key} className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-500 w-14 shrink-0">{d.label}</span>
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${dimColor(d.level)}`}
                                style={{ width: `${d.weight ? (d.gained / d.weight) * 100 : 0}%` }} />
                            </div>
                            <span className="text-[11px] text-gray-500 w-10 text-right">{d.gained}/{d.weight}</span>
                          </div>
                        ))}
                      </div>
                      {bd.shortfalls.length > 0 && (
                        <div className="mt-2">
                          <span className="text-[11px] text-red-500 font-medium">短板：</span>
                          <span className="text-[11px] text-gray-600">{bd.shortfalls.join('；')}</span>
                        </div>
                      )}
                      <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">建议：{bd.advice}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 自动推送设置 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">自动推送设置</h2>
          </div>
          <button onClick={() => handleStatusChange(post.auto_push ? 'paused' : 'active')}
            className="text-sm text-[#165DFF] hover:underline">
            {post.auto_push ? '关闭' : '启用'}
          </button>
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
          <span>状态：{post.auto_push ? <span className="text-green-600 font-medium">已启用</span> : '未启用'}</span>
          {post.auto_push && <span>频率：{post.push_frequency === 'daily' ? '每天' : '每周'}</span>}
        </div>
      </div>
    </div>
  );
}
