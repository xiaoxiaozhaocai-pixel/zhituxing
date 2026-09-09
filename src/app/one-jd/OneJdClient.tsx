'use client';

/**
 * C8 一岗一策 · 客户端交互组件
 *
 * 流程：贴JD（+可选贴简历）→ POST /api/career/one-jd-strategy → 三段式策略报告
 * 视觉：蓝白Token（#165DFF 主色），禁暗色；用户可见文案零"智能体"
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Target, FileText, ShieldAlert, Lightbulb, Send, Loader2,
  AlertTriangle, CheckCircle2, ArrowRight, ChevronDown, ChevronUp,
} from 'lucide-react';

interface SubtextItem {
  phrase: string;
  surface: string;
  meaning: string;
  risk: 'low' | 'medium' | 'high';
  advice: string;
}
interface RewritePoint {
  jdRequirement: string;
  rewriteAdvice: string;
  priority: 'high' | 'medium' | 'low';
}
interface Report {
  jdTitle: string;
  decoded: { summary: string; subtextItems: SubtextItem[]; hiddenRequirements: string[] };
  rewrite: {
    matchScore: number;
    matchedJob: string;
    knownDictionary: boolean;
    advantages: string[];
    rewritePoints: RewritePoint[];
    gaps: Array<{ skill: string; gap: string; path: string }>;
  } | null;
  applyStrategy: {
    verdict: string;
    matchAssessment: string;
    differentiators: string[];
    timing: string;
    riskWarnings: string[];
  };
}

const RISK_STYLE: Record<string, string> = {
  high: 'bg-[#F53F3F]/10 text-[#F53F3F]',
  medium: 'bg-[#FF7D00]/10 text-[#FF7D00]',
  low: 'bg-[#00B42A]/10 text-[#00B42A]',
};
const RISK_LABEL: Record<string, string> = { high: '警惕', medium: '留意', low: '无坑' };
const PRIORITY_STYLE: Record<string, string> = {
  high: 'bg-[#F53F3F]/10 text-[#F53F3F]',
  medium: 'bg-[#FF7D00]/10 text-[#FF7D00]',
  low: 'bg-[#165DFF]/10 text-[#165DFF]',
};
const PRIORITY_LABEL: Record<string, string> = { high: '优先改', medium: '建议改', low: '前置强化' };

export default function OneJdClient() {
  const [jdText, setJdText] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [showResume, setShowResume] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  async function handleGenerate() {
    if (jdText.trim().length < 40) {
      setError('JD文本至少40字——把「岗位职责」和「任职要求」整段贴进来。');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/career/one-jd-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdText: jdText.trim(), resumeText: resumeText.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message || data?.error?.message || '生成失败，请稍后重试');
        setReport(null);
      } else {
        setReport(data?.data ?? data);
      }
    } catch {
      setError('网络异常，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#1E293B]">
      <section className="relative pt-16 sm:pt-24 pb-14 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] blob-primary -translate-y-1/4 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] blob-accent translate-y-1/4 -translate-x-1/4 pointer-events-none" />

        <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 relative z-10">
          {/* 头部 */}
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card mb-6 text-[#165DFF] text-sm font-medium">
              <Target className="w-4 h-4" /> 一岗一策
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 heading-tight">
              一份JD，一份专属策略
            </h1>
            <p className="text-[#64748B] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              把目标岗位的JD整段贴进来，小职帮你解码潜台词、对照能力词典找差距、
              给出简历改写点和投递策略——不做代投，帮你投得准。
            </p>
          </div>

          {/* 输入区 */}
          <div className="bento-card mb-8">
            <label className="flex items-center gap-2 text-sm font-semibold text-[#1E293B] mb-2">
              <FileText className="w-4 h-4 text-[#165DFF]" /> 目标JD（岗位职责 + 任职要求）
            </label>
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              rows={8}
              maxLength={8000}
              placeholder={'把招聘信息原文整段贴进来，例如：\n\n岗位职责：\n1. 负责XX产品的用户增长…\n任职要求：\n1. 本科及以上学历，熟练使用SQL…'}
              className="w-full rounded-xl border border-[#165DFF]/15 bg-[#f8fafd] px-4 py-3 text-sm leading-relaxed focus:border-[#165DFF] focus:outline-none focus:ring-2 focus:ring-[#165DFF]/15 resize-y"
            />

            <button
              type="button"
              onClick={() => setShowResume((v) => !v)}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#165DFF]"
            >
              {showResume ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showResume ? '收起简历输入' : '可选：贴上简历文本，获得定制改写点'}
            </button>
            {showResume && (
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={6}
                maxLength={8000}
                placeholder="把简历内容（教育/实习/项目/技能）贴进来，将获得匹配分和逐条改写建议"
                className="mt-2 w-full rounded-xl border border-[#165DFF]/15 bg-[#f8fafd] px-4 py-3 text-sm leading-relaxed focus:border-[#165DFF] focus:outline-none focus:ring-2 focus:ring-[#165DFF]/15 resize-y"
              />
            )}

            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-xs text-[#94A3B8]">纯规则引擎 · 秒级出结果 · 内容仅用于本次分析</p>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="btn-gradient px-6 py-2.5 rounded-xl font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? '生成中…' : '生成一岗一策'}
              </button>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-8 flex items-start gap-3 rounded-xl border border-[#F53F3F]/20 bg-[#F53F3F]/5 px-4 py-3 text-sm text-[#F53F3F]">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* 报告区 */}
          {report && (
            <div className="space-y-6">
              {/* ① JD解码 */}
              <div className="bento-card">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="w-5 h-5 text-[#165DFF]" />
                  <h2 className="text-lg font-bold">① JD解码：这份JD真正在筛什么</h2>
                </div>
                <p className="text-sm text-[#64748B] mb-4">目标岗位：{report.jdTitle}</p>
                <p className="text-sm leading-relaxed text-[#1E293B] mb-4">{report.decoded.summary}</p>

                {report.decoded.subtextItems.length > 0 && (
                  <div className="space-y-3 mb-5">
                    {report.decoded.subtextItems.map((it, i) => (
                      <div key={i} className="rounded-xl border border-[#165DFF]/10 bg-[#f8fafd] px-4 py-3">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-[#1E293B]">「{it.phrase}」</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RISK_STYLE[it.risk]}`}>
                            {RISK_LABEL[it.risk]}
                          </span>
                        </div>
                        <p className="text-sm text-[#1E293B] leading-relaxed">人话翻译：{it.meaning}</p>
                        <p className="text-sm text-[#64748B] leading-relaxed mt-1">应对：{it.advice}</p>
                      </div>
                    ))}
                  </div>
                )}

                {report.decoded.hiddenRequirements.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-[#FF7D00]" /> 隐性要求与门槛
                    </p>
                    <ul className="space-y-1.5">
                      {report.decoded.hiddenRequirements.map((h, i) => (
                        <li key={i} className="text-sm text-[#64748B] leading-relaxed flex gap-2">
                          <span className="text-[#165DFF] shrink-0">·</span>{h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* ② 简历改写点 */}
              {report.rewrite ? (
                <div className="bento-card">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-[#165DFF]" />
                    <h2 className="text-lg font-bold">② 简历改写点：对着这份JD怎么改</h2>
                  </div>

                  <div className="flex items-center gap-5 mb-5 rounded-xl border border-[#165DFF]/10 bg-gradient-to-r from-[#165DFF]/5 to-[#3D7FFF]/5 px-5 py-4">
                    <div className="text-center">
                      <div className="text-4xl font-extrabold text-[#165DFF]">{report.rewrite.matchScore}</div>
                      <div className="text-xs text-[#94A3B8] mt-0.5">匹配分</div>
                    </div>
                    <div className="text-sm text-[#64748B] leading-relaxed">
                      对照词典：{report.rewrite.matchedJob}
                      {!report.rewrite.knownDictionary && '（通用框架版——补充行业+岗位名可更准）'}
                      <br />
                      命中优势 {report.rewrite.advantages.length} 项 · 待补差距 {report.rewrite.gaps.length} 项
                    </div>
                  </div>

                  {report.rewrite.rewritePoints.length > 0 && (
                    <div className="space-y-3 mb-5">
                      {report.rewrite.rewritePoints.map((p, i) => (
                        <div key={i} className="rounded-xl border border-[#165DFF]/10 bg-[#f8fafd] px-4 py-3">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[p.priority]}`}>
                              {PRIORITY_LABEL[p.priority]}
                            </span>
                            <span className="text-sm font-semibold text-[#1E293B]">{p.jdRequirement}</span>
                          </div>
                          <p className="text-sm text-[#64748B] leading-relaxed">{p.rewriteAdvice}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {report.rewrite.gaps.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-[#FF7D00]" /> 差距与补课路径
                      </p>
                      <div className="space-y-2">
                        {report.rewrite.gaps.map((g, i) => (
                          <div key={i} className="text-sm leading-relaxed">
                            <span className="font-medium text-[#1E293B]">{g.skill}</span>
                            <span className="text-[#64748B]"> — {g.gap}</span>
                            <div className="text-[#165DFF] text-sm">补法：{g.path}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bento-card flex items-center gap-4">
                  <CheckCircle2 className="w-5 h-5 text-[#00B42A] shrink-0" />
                  <p className="text-sm text-[#64748B] leading-relaxed">
                    想要简历改写点和匹配分？回到上方展开「简历输入」，把简历文本贴进来重新生成一次即可。
                  </p>
                </div>
              )}

              {/* ③ 投递策略 */}
              <div className="bento-card">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-[#165DFF]" />
                  <h2 className="text-lg font-bold">③ 投递策略：值不值得投、怎么打</h2>
                </div>

                <div className="rounded-xl border border-[#165DFF]/15 bg-gradient-to-r from-[#165DFF]/5 to-[#3D7FFF]/5 px-5 py-4 mb-4">
                  <p className="text-sm font-semibold text-[#1E293B] leading-relaxed">{report.applyStrategy.verdict}</p>
                  <p className="text-sm text-[#64748B] leading-relaxed mt-1">{report.applyStrategy.matchAssessment}</p>
                </div>

                {report.applyStrategy.differentiators.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold mb-2">差异化打法</p>
                    <ol className="space-y-1.5">
                      {report.applyStrategy.differentiators.map((d, i) => (
                        <li key={i} className="text-sm text-[#64748B] leading-relaxed flex gap-2">
                          <span className="text-[#165DFF] font-semibold shrink-0">{i + 1}.</span>{d}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {report.applyStrategy.riskWarnings.length > 0 && (
                  <div className="mb-4 rounded-xl border border-[#FF7D00]/20 bg-[#FF7D00]/5 px-4 py-3">
                    <p className="text-sm font-semibold text-[#FF7D00] mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> 投递前先想清楚这几条
                    </p>
                    <ul className="space-y-1">
                      {report.applyStrategy.riskWarnings.map((r, i) => (
                        <li key={i} className="text-sm text-[#64748B] leading-relaxed">{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-sm text-[#64748B] leading-relaxed">{report.applyStrategy.timing}</p>
              </div>

              {/* 延伸入口 */}
              <div className="text-center pb-4">
                <p className="text-[#94A3B8] text-sm mb-3">想让小职针对这份JD做模拟面试追问？</p>
                <Link
                  href="/assistant?bot=xiaozhi"
                  className="btn-gradient px-7 py-3 rounded-2xl font-semibold text-sm inline-flex items-center gap-2"
                >
                  找小职聊聊 <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
