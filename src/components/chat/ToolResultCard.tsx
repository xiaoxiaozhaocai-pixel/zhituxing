import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ToolResultData } from './chat-shared';
import { trStr, trArr, trNum } from './chat-shared';

/** 工具结果分数徽标 */
export function ToolScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'text-emerald-600 bg-emerald-50'
      : score >= 60
        ? 'text-[#165DFF] bg-blue-50'
        : 'text-slate-500 bg-slate-100';
  return (
    <span className={`flex-shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${color}`}>
      {Math.round(score)}分
    </span>
  );
}

/** 小职对话内直接动手的工具结果卡片（方向四）：5 种视图 */
export default function ToolResultCard({ result }: { result: ToolResultData }) {
  const { data, view } = result;
  return (
    <div className="mt-3 rounded-xl border border-blue-100 bg-gradient-to-br from-[#f8fafd] via-white to-[#f0f5ff]/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-900">{result.title}</div>
        {result.pageUrl && result.pageLabel && (
          <Link
            href={result.pageUrl}
            className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-[#165DFF] hover:underline"
          >
            {result.pageLabel}完整版
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {view === 'matches' && (
        <div className="mt-3 space-y-2">
          {trArr(data.matches).length === 0 && (
            <div className="text-xs text-slate-500">这轮没跑出匹配岗位，去岗位匹配页看完整结果。</div>
          )}
          {trArr(data.matches).slice(0, 5).map((m, i) => {
            const job = m as Record<string, unknown>;
            const score = trNum(job.match_score) ?? 0;
            return (
              <div key={i} className="rounded-lg border border-slate-100 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-900">{trStr(job.job_title, '岗位')}</span>
                  <ToolScoreBadge score={score} />
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {[trStr(job.city), trStr(job.industry), trStr(job.salary_range)].filter(Boolean).join(' · ') || '—'}
                </div>
                {trArr(job.matched_skills).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {trArr(job.matched_skills).slice(0, 6).map((sk, j) => (
                      <span key={j} className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-[#165DFF]">
                        {trStr(sk)}
                      </span>
                    ))}
                  </div>
                )}
                {trArr(job.gap_skills).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {trArr(job.gap_skills).slice(0, 4).map((sk, j) => (
                      <span key={j} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                        待补:{trStr(sk)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {view === 'resume_suggestions' && (
        <div className="mt-3 space-y-2">
          {trArr(data.suggestions).map((sg, i) => {
            const sug = sg as Record<string, unknown>;
            const type = trStr(sug.type, 'suggestion');
            const label = type === 'highlight' ? '亮点' : type === 'improvement' ? '硬伤' : '建议';
            const cls =
              type === 'highlight'
                ? 'bg-emerald-50 text-emerald-700'
                : type === 'improvement'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-blue-50 text-[#165DFF]';
            return (
              <div key={i} className="rounded-lg border border-slate-100 bg-white p-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>{label}</span>
                  <span className="text-sm font-medium text-slate-900">{trStr(sug.title)}</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{trStr(sug.suggestion)}</p>
              </div>
            );
          })}
        </div>
      )}

      {view === 'plan_report' && (
        <div className="mt-3 space-y-3">
          <div className="space-y-2">
            {trArr(data.core_jobs).slice(0, 3).map((jb, i) => {
              const job = jb as Record<string, unknown>;
              const score = trNum(job.match_score);
              return (
                <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white p-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {i + 1}. {trStr(job.name, '推荐岗位')}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {[trStr(job.industry), trStr(job.city), trStr(job.salary_range)].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {score !== null && <ToolScoreBadge score={score} />}
                </div>
              );
            })}
          </div>
          {trArr(data.dimensions).length > 0 && (
            <div className="rounded-lg border border-slate-100 bg-white p-3">
              <div className="text-xs font-semibold text-slate-700">六维评估</div>
              <div className="mt-2 space-y-1.5">
                {trArr(data.dimensions).slice(0, 6).map((d, i) => {
                  const dim = d as Record<string, unknown>;
                  const score = trNum(dim.score) ?? 0;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-20 flex-shrink-0 text-xs text-slate-600">{trStr(dim.name, '维度')}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#165DFF] to-[#3D7FFF]"
                          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                        />
                      </div>
                      <span className="w-8 flex-shrink-0 text-right text-xs text-slate-500">{Math.round(score)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'one_jd' && (
        <div className="mt-3 space-y-2">
          <div className="rounded-lg border border-slate-100 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900">投递建议：{trStr(data.verdict, '—')}</span>
              {trNum(data.match_score) !== null && <ToolScoreBadge score={trNum(data.match_score) as number} />}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{trStr(data.match_assessment)}</p>
          </div>
          {trArr(data.hidden_requirements).length > 0 && (
            <div className="rounded-lg border border-slate-100 bg-white p-3">
              <div className="text-xs font-semibold text-slate-700">JD 潜台词</div>
              <ul className="mt-1.5 space-y-1">
                {trArr(data.hidden_requirements).slice(0, 3).map((h, i) => (
                  <li key={i} className="text-xs leading-relaxed text-slate-600">· {trStr(h)}</li>
                ))}
              </ul>
            </div>
          )}
          {trArr(data.rewrite_points).length > 0 && (
            <div className="rounded-lg border border-slate-100 bg-white p-3">
              <div className="text-xs font-semibold text-slate-700">简历改写点</div>
              <div className="mt-1.5 space-y-1.5">
                {trArr(data.rewrite_points).slice(0, 4).map((p, i) => {
                  const pt = p as Record<string, unknown>;
                  return (
                    <div key={i} className="text-xs leading-relaxed">
                      <span className="text-slate-500">{trStr(pt.jdRequirement)} → </span>
                      <span className="text-slate-800">{trStr(pt.rewriteAdvice)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'translate' && (
        <div className="mt-3 space-y-2">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">你的原话</div>
            <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-600">{trStr(data.original)}</p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-white p-3">
            <div className="text-[11px] font-medium uppercase tracking-wide text-[#165DFF]">简历用语</div>
            <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-800">
              {trStr(data.translated, '（生成结果为空，可重试）')}
            </p>
          </div>
          {trArr(data.gaps).length > 0 && (
            <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-amber-600">建议补强</div>
              <ul className="mt-1 space-y-1">
                {trArr(data.gaps).slice(0, 3).map((g, i) => (
                  <li key={i} className="text-xs leading-relaxed text-amber-700">· {trStr(g)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** 过滤文本中残留的 <<DATA:type=xxx>>...<<END>> 标记（安全网） */
