'use client';

/**
 * /jobs/[id]/analysis — 单岗位 AI 深度分析专属页（v2 并行卡片版，2026-06-13 17:42）
 *
 * v2 改动（主人需求"控制感"）：
 * - 进页面立刻发 5 路并行 fetch（每路一个 dimension）
 * - UI 改为 5 个折叠 Card，默认全部收起
 * - 头部状态徽章：⏳ 生成中 / ✅ 已就绪 / ❌ 失败 / ⏸ 等待
 * - 用户点 Card 才展开看内容（实现"控制感"）
 * - 单维度失败可独立重试，不影响其他维度
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface JobMeta {
  id: string;
  job_title: string;
  company_name?: string;
  company?: string;
  city?: string;
  salary_range?: string;
  industry?: string;
}

type DimensionKey = 'company' | 'daily' | 'salary' | 'skills' | 'apply';

interface DimensionMeta {
  key: DimensionKey;
  title: string;
  icon: string;
  hint: string;
}

const DIMENSIONS: DimensionMeta[] = [
  { key: 'company', title: '公司基本面', icon: '🏢', hint: '规模 / 业务 / 口碑 / 风险' },
  { key: 'daily',   title: '岗位实际做什么', icon: '🛠️', hint: '画饼 vs 真实日常' },
  { key: 'salary',  title: '薪资水平', icon: '💰', hint: '市场对标 / 福利拆解' },
  { key: 'skills',  title: '技能差距', icon: '📊', hint: '已有 vs 要求 / 补法' },
  { key: 'apply',   title: '投递建议', icon: '🎯', hint: '时机 / 性价比 / 简历红线' },
];

type Status = 'pending' | 'streaming' | 'done' | 'error';

interface DimensionState {
  status: Status;
  text: string;
  error?: string;
  expanded: boolean;
}

const initState = (): Record<DimensionKey, DimensionState> => ({
  company: { status: 'pending', text: '', expanded: false },
  daily:   { status: 'pending', text: '', expanded: false },
  salary:  { status: 'pending', text: '', expanded: false },
  skills:  { status: 'pending', text: '', expanded: false },
  apply:   { status: 'pending', text: '', expanded: false },
});

export default function JobAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = String((params as Record<string, unknown>)?.id || '');

  const [job, setJob] = useState<JobMeta | null>(null);
  const [dims, setDims] = useState<Record<DimensionKey, DimensionState>>(initState);
  const startedRef = useRef(false);
  const abortsRef = useRef<AbortController[]>([]);

  // 拉岗位元信息（用于顶部卡片）
  useEffect(() => {
    if (!jobId) return;
    fetch(`/api/jobs/${encodeURIComponent(jobId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.job) setJob(d.job); })
      .catch(() => { /* 元信息拉不到不影响主流程 */ });
  }, [jobId]);

  // 单维度 SSE 拉取
  const fetchDimension = useCallback(async (dim: DimensionKey) => {
    const ctrl = new AbortController();
    abortsRef.current.push(ctrl);

    setDims(prev => ({ ...prev, [dim]: { ...prev[dim], status: 'streaming', text: '', error: undefined } }));

    try {
      const resp = await fetch('/api/job-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, dimension: dim }),
        signal: ctrl.signal,
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        if (resp.status === 401) {
          router.replace(`/auth?redirect=/jobs/${encodeURIComponent(jobId)}/analysis`);
          return;
        }
        const msg = resp.status === 429
          ? (errBody?.error?.message || '今日深度分析配额已用完')
          : resp.status === 404
            ? '该岗位不存在或已下架'
            : (errBody?.error?.message || `分析失败（${resp.status}）`);
        setDims(prev => ({ ...prev, [dim]: { ...prev[dim], status: 'error', error: msg } }));
        return;
      }

      if (!resp.body) {
        setDims(prev => ({ ...prev, [dim]: { ...prev[dim], status: 'error', error: '空响应' } }));
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let acc = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const events = buf.split('\n\n');
        buf = events.pop() || '';

        for (const ev of events) {
          for (const line of ev.split('\n')) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload);
              const delta =
                parsed?.choices?.[0]?.delta?.content ||
                parsed?.choices?.[0]?.message?.content ||
                parsed?.content ||
                '';
              if (delta) {
                acc += delta;
                setDims(prev => ({ ...prev, [dim]: { ...prev[dim], text: acc } }));
              }
            } catch { /* 容错非 JSON chunk */ }
          }
        }
      }

      setDims(prev => ({ ...prev, [dim]: { ...prev[dim], status: 'done' } }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('aborted') || msg.includes('AbortError')) return;
      setDims(prev => ({ ...prev, [dim]: { ...prev[dim], status: 'error', error: `网络错误：${msg}` } }));
    }
  }, [jobId, router]);

  // 5 路并行 SSE（StrictMode 双调用守卫）
  useEffect(() => {
    if (!jobId) return;
    if (startedRef.current) return;
    startedRef.current = true;

    DIMENSIONS.forEach(({ key }) => fetchDimension(key));

    const aborts = abortsRef.current;
    return () => {
      aborts.forEach(a => a.abort());
    };
  }, [jobId, fetchDimension]);

  const toggle = (dim: DimensionKey) => {
    setDims(prev => ({ ...prev, [dim]: { ...prev[dim], expanded: !prev[dim].expanded } }));
  };

  const retry = (dim: DimensionKey) => {
    setDims(prev => ({ ...prev, [dim]: { status: 'pending', text: '', expanded: true } }));
    fetchDimension(dim);
  };

  const overall = (() => {
    const total = DIMENSIONS.length;
    const done = DIMENSIONS.filter(d => dims[d.key].status === 'done').length;
    const error = DIMENSIONS.filter(d => dims[d.key].status === 'error').length;
    return { total, done, error, streaming: total - done - error };
  })();

  if (!jobId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafd] via-white to-[#f0f5ff]/40 flex items-center justify-center">
        <p className="text-gray-500">缺少岗位 ID</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafd] via-white to-[#f0f5ff]/40">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 顶部返回 */}
        <div className="mb-6">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#165DFF] transition"
          >
            <span aria-hidden>←</span>
            <span>返回岗位列表</span>
          </Link>
        </div>

        {/* 岗位卡片 */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {job?.job_title || '岗位深度分析'}
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                {(job?.company_name || job?.company) && (
                  <span>🏢 {job?.company_name || job?.company}</span>
                )}
                {job?.city && <span>📍 {job.city}</span>}
                {job?.salary_range && <span>💰 {job.salary_range}</span>}
                {job?.industry && <span>🏭 {job.industry}</span>}
              </div>
            </div>
            <div className="shrink-0">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white text-xs font-medium">
                小职 · 5 维度并行分析
              </span>
            </div>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mb-4 px-2 flex items-center justify-between text-xs text-gray-500 flex-wrap gap-2">
          <span>
            ✅ {overall.done} 已就绪
            {overall.streaming > 0 && ` · ⏳ ${overall.streaming} 生成中`}
            {overall.error > 0 && ` · ❌ ${overall.error} 失败`}
          </span>
          <span className="text-gray-400">点击卡片展开查看 →</span>
        </div>

        {/* 5 个 Card */}
        <div className="space-y-3">
          {DIMENSIONS.map(({ key, title, icon, hint }, idx) => {
            const s = dims[key];
            const badge =
              s.status === 'done'      ? { label: '✅ 已就绪', cls: 'bg-green-50 text-green-700 border-green-200' } :
              s.status === 'streaming' ? { label: '⏳ 生成中', cls: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse' } :
              s.status === 'error'     ? { label: '❌ 失败',   cls: 'bg-red-50 text-red-700 border-red-200' } :
                                         { label: '⏸ 等待',   cls: 'bg-gray-50 text-gray-500 border-gray-200' };

            const canExpand = s.status === 'done' || s.text.length > 0 || s.status === 'error';

            return (
              <div key={key} className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-shadow hover:shadow-md">
                <button
                  type="button"
                  onClick={() => canExpand && toggle(key)}
                  className={`w-full p-5 flex items-center gap-4 text-left transition ${canExpand ? 'cursor-pointer hover:bg-gray-50/60' : 'cursor-not-allowed'}`}
                  disabled={!canExpand}
                  aria-expanded={s.expanded}
                >
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#165DFF]/10 to-[#3D7FFF]/10 flex items-center justify-center text-xl">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-400">维度 {idx + 1}</span>
                      <h3 className="text-base font-bold text-gray-900">{title}</h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <span className={`shrink-0 text-gray-400 text-sm transition-transform ${s.expanded ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                {s.expanded && (
                  <div className="border-t border-gray-100 p-5 md:p-6">
                    {s.status === 'error' ? (
                      <div className="text-center py-6">
                        <p className="text-red-500 text-sm mb-3">⚠️ {s.error}</p>
                        <button
                          onClick={() => retry(key)}
                          className="px-4 py-1.5 rounded-lg bg-[#165DFF] text-white text-sm hover:bg-[#1448CC] transition"
                        >
                          重试该维度
                        </button>
                      </div>
                    ) : s.text ? (
                      <article className="prose prose-blue prose-sm max-w-none prose-strong:text-gray-900">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.text}</ReactMarkdown>
                        {s.status === 'streaming' && (
                          <span className="inline-block w-2 h-4 bg-[#165DFF] animate-pulse ml-1" aria-hidden />
                        )}
                      </article>
                    ) : (
                      <p className="text-gray-400 text-sm text-center py-4">等待数据...</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 底部说明 */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>分析仅供参考，AI 可能存在偏差。具体投递决策请结合实际情况判断。</p>
        </div>
      </div>
    </div>
  );
}
