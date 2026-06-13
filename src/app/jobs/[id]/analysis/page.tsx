'use client';

/**
 * /jobs/[id]/analysis — 单岗位 AI 深度分析专属页（2026-06-13 重设计）
 *
 * 不复用 /assistant 的对话 UI，专门做单岗位 5 维度分析的展示：
 *  - 顶部岗位卡片（公司/岗位/城市/薪资）
 *  - 流式 Markdown 渲染（5 个维度小节）
 *  - 完成后底部「投递性价比卡片」+「下载 PDF」按钮
 *
 * 数据流：POST /api/job-analysis { jobId } → SSE stream → setText
 */

import { useEffect, useState, useRef } from 'react';
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

export default function JobAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = String((params as Record<string, unknown>)?.id || '');

  const [job, setJob] = useState<JobMeta | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(false);

  // 拉岗位元信息（用于顶部卡片，不依赖 SSE）
  useEffect(() => {
    if (!jobId) return;
    fetch(`/api/jobs/${encodeURIComponent(jobId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.job) setJob(d.job);
      })
      .catch(() => { /* 元信息拉不到不影响主流程 */ });
  }, [jobId]);

  // 启动 SSE 分析（严格只跑一次，避免 React 18 StrictMode 双调用）
  useEffect(() => {
    if (!jobId) return;
    if (startedRef.current) return;
    startedRef.current = true;

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStreaming(true);
    setLoading(false);

    (async () => {
      try {
        const resp = await fetch('/api/job-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId }),
          signal: ctrl.signal,
        });

        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({}));
          if (resp.status === 401) {
            router.replace(`/auth?redirect=/jobs/${encodeURIComponent(jobId)}/analysis`);
            return;
          }
          if (resp.status === 429) {
            setError(errBody?.error?.message || '今日深度分析配额已用完，请明天再来或升级会员');
            return;
          }
          if (resp.status === 404) {
            setError('该岗位不存在或已下架');
            return;
          }
          setError(errBody?.error?.message || `分析失败（${resp.status}）`);
          return;
        }

        if (!resp.body) {
          setError('服务器返回空响应');
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

          // SSE 标准：以 \n\n 分隔事件
          const events = buf.split('\n\n');
          buf = events.pop() || '';

          for (const ev of events) {
            const lines = ev.split('\n');
            for (const line of lines) {
              if (!line.startsWith('data:')) continue;
              const payload = line.slice(5).trim();
              if (!payload) continue;
              if (payload === '[DONE]') continue;
              try {
                const parsed = JSON.parse(payload);
                const delta =
                  parsed?.choices?.[0]?.delta?.content ||
                  parsed?.choices?.[0]?.message?.content ||
                  parsed?.content ||
                  '';
                if (delta) {
                  acc += delta;
                  setText(acc);
                }
              } catch {
                // 非 JSON chunk 容错
              }
            }
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('aborted') || msg.includes('AbortError')) return;
        setError(`网络错误：${msg}`);
      } finally {
        setStreaming(false);
      }
    })();

    return () => {
      ctrl.abort();
    };
  }, [jobId, router]);

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
                小职 · 5 维度深度分析
              </span>
            </div>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[400px]">
          {loading && (
            <div className="text-center text-gray-500 py-12">
              <p>正在准备分析...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">⚠️ {error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-[#165DFF] text-white text-sm hover:bg-[#1448CC] transition"
              >
                重试
              </button>
            </div>
          )}

          {!error && text && (
            <article className="prose prose-blue max-w-none prose-headings:scroll-mt-20 prose-h2:text-xl prose-h2:font-bold prose-h2:text-[#165DFF] prose-h2:mt-8 prose-h2:mb-3 prose-strong:text-gray-900">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
              {streaming && (
                <span className="inline-block w-2 h-4 bg-[#165DFF] animate-pulse ml-1" aria-hidden />
              )}
            </article>
          )}

          {!error && !text && !loading && streaming && (
            <div className="text-center text-gray-500 py-12">
              <p>小职正在分析这个岗位，预计 30-60 秒...</p>
            </div>
          )}
        </div>

        {/* 底部说明 */}
        {!error && !streaming && text && (
          <div className="mt-6 text-center text-xs text-gray-400">
            <p>分析仅供参考，AI 可能存在偏差。具体投递决策请结合实际情况判断。</p>
          </div>
        )}
      </div>
    </div>
  );
}