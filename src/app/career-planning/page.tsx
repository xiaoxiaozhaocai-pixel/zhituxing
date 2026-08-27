'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import type { CognitiveCorrectionResult } from '@/lib/career-paths/engine/cognitive_correction';
import {
  Sparkles,
  Loader2,
  FileText,
  ChevronRight,
  Lightbulb,
  Compass,
} from 'lucide-react';

export default function CareerPlanningPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [major, setMajor] = useState('');
  const [grade, setGrade] = useState('');
  const [city, setCity] = useState('');
  const [targetIndustry, setTargetIndustry] = useState('');
  const [targetJob, setTargetJob] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cogResult, setCogResult] = useState<CognitiveCorrectionResult | null>(null);
  const [cogLoading, setCogLoading] = useState(false);
  const [cogError, setCogError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!major.trim() || !grade) {
      setError('请填写专业和年级');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/career-planning/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          major: major.trim(),
          grade,
          city: city.trim(),
          targetIndustry: targetIndustry.trim() || undefined,
          targetJob: targetJob.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (data.code === 200 && data.data?.id) {
        router.push(`/career-planning/report/${data.data.id}`);
      } else {
        setError(data.message || '生成失败，请重试');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleCognitiveCheck = async () => {
    if (!major.trim() || !grade) {
      setCogError('请填写专业和年级');
      return;
    }

    setCogLoading(true);
    setCogError(null);
    setCogResult(null);

    try {
      const res = await fetch('/api/career-planning/cognitive-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ major: major.trim(), grade }),
      });

      const data = await res.json();

      if (data.code === 200 && data.data) {
        setCogResult(data.data);
      } else {
        setCogError(data.message || '认知校正失败，请重试');
      }
    } catch {
      setCogError('网络错误，请稍后重试');
    } finally {
      setCogLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8fafd] via-white to-[#f0f5ff]/40 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#165DFF] animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.push('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafd] via-white to-[#f0f5ff]/40">
      {/* Hero */}
      <section className="relative overflow-hidden pt-16 pb-12">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#165DFF]/3 rounded-full blur-[120px] -translate-y-1/4 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#3D7FFF]/3 rounded-full blur-[100px] translate-y-1/4 -translate-x-1/4 pointer-events-none" />

        <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#165DFF]/8 text-[#165DFF] text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              AI 职业规划
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1E293B] tracking-tight mb-3">
              30秒生成专属职业规划报告
            </h1>
            <p className="text-[#64748B] text-base max-w-lg mx-auto">
              基于你的专业、年级和偏好，AI 智能分析最适合你的岗位方向和发展路径
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-10 max-w-lg mx-auto">
            {[
              { icon: '🎯', label: '精准匹配', desc: '岗位推荐' },
              { icon: '📊', label: '6维诊断', desc: '能力画像' },
              { icon: '📅', label: '行动清单', desc: '6个月计划' },
            ].map((s) => (
              <div key={s.label} className="bg-white/80 rounded-2xl border border-[#E2E8F0] p-3 text-center hover:shadow-md transition-all">
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-sm font-semibold text-[#1E293B]">{s.label}</div>
                <div className="text-xs text-[#94A3B8]">{s.desc}</div>
              </div>
            ))}
          </div>

          {/* Generate Form */}
          <Card className="max-w-xl mx-auto border-[#E2E8F0] shadow-lg shadow-[#165DFF]/5">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-[#1E293B] mb-6 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-[#165DFF]" />
                填写信息，一键生成
              </h2>

              <div className="space-y-5">
                {/* Major */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">
                    专业 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="例如：计算机科学与技术"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    className="rounded-xl border-[#E2E8F0] focus:border-[#165DFF]"
                  />
                </div>

                {/* Grade */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">
                    年级 <span className="text-red-500">*</span>
                  </Label>
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger className="rounded-xl border-[#E2E8F0]">
                      <SelectValue placeholder="选择年级" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="大一">大一</SelectItem>
                      <SelectItem value="大二">大二</SelectItem>
                      <SelectItem value="大三">大三</SelectItem>
                      <SelectItem value="大四">大四</SelectItem>
                      <SelectItem value="研一">研一</SelectItem>
                      <SelectItem value="研二">研二</SelectItem>
                      <SelectItem value="研三">研三</SelectItem>
                      <SelectItem value="已毕业">已毕业</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">
                    意向城市 <span className="text-[#94A3B8]">（选填）</span>
                  </Label>
                  <Input
                    placeholder="例如：深圳、广州"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="rounded-xl border-[#E2E8F0] focus:border-[#165DFF]"
                  />
                </div>

                {/* Target Industry */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">
                    目标行业 <span className="text-[#94A3B8]">（选填）</span>
                  </Label>
                  <Input
                    placeholder="例如：互联网、金融、制造业"
                    value={targetIndustry}
                    onChange={(e) => setTargetIndustry(e.target.value)}
                    className="rounded-xl border-[#E2E8F0] focus:border-[#165DFF]"
                  />
                </div>

                {/* Target Job */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">
                    目标岗位 <span className="text-[#94A3B8]">（选填）</span>
                  </Label>
                  <Input
                    placeholder="例如：产品经理、前端开发"
                    value={targetJob}
                    onChange={(e) => setTargetJob(e.target.value)}
                    className="rounded-xl border-[#E2E8F0] focus:border-[#165DFF]"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full rounded-xl font-semibold py-4 border-[#165DFF]/30 text-[#165DFF] hover:bg-[#165DFF]/5"
                  onClick={handleCognitiveCheck}
                  disabled={cogLoading}
                  type="button"
                >
                  {cogLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      认知校正中...
                    </>
                  ) : (
                    <>
                      <Compass className="w-5 h-5 mr-2" />
                      先看清方向：认知校正你能投什么
                    </>
                  )}
                </Button>

                <Button
                  className="w-full btn-gradient rounded-xl font-semibold text-base py-6"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      AI 正在分析...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      生成职业规划报告
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 认知校正结果展示 */}
          {(cogResult || cogError) && (
            <div className="mt-8">
              {cogError && (
                <Card className="border-red-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{cogError}</div>
                  </CardContent>
                </Card>
              )}
              {cogResult && (
                <Card className="border-[#165DFF]/20 shadow-lg shadow-[#165DFF]/5">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3 mb-5">
                      <div className="w-10 h-10 shrink-0 rounded-xl bg-[#165DFF]/10 flex items-center justify-center">
                        <Compass className="w-5 h-5 text-[#165DFF]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#1E293B]">认知校正：你学的「{cogResult.major}」能投这些</h3>
                        <p className="text-sm text-[#64748B] mt-1">{cogResult.summary}</p>
                      </div>
                    </div>

                    {cogResult.derivedSkills.length > 0 && (
                      <div className="mb-5">
                        <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-2">从课程反推的核心能力</p>
                        <div className="flex flex-wrap gap-2">
                          {cogResult.derivedSkills.map((sk, i) => (
                            <span key={i} className="px-2.5 py-1 bg-[#165DFF]/8 text-[#165DFF] text-xs rounded-full">{sk}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {cogResult.jobDirections.map((d, i) => (
                        <div key={i} className="rounded-xl border border-[#E2E8F0] p-4">
                          <div className="flex items-center justify-between mb-2">
                            {d.route_id ? (
                          <Link
                            href={`/career-paths?major=${encodeURIComponent(cogResult.major)}`}
                            className="font-semibold text-[#1E293B] underline decoration-[#165DFF]/30 underline-offset-4 hover:text-[#165DFF] transition"
                          >
                            {d.job} →
                          </Link>
                        ) : (
                          <span className="font-semibold text-[#1E293B]">{d.job}</span>
                        )}
                            <span className={`px-2.5 py-1 text-xs rounded-full ${
                              d.matchLevel === '高度对口' ? 'bg-green-50 text-green-600' :
                              d.matchLevel === '中等对口' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'
                            }`}>{d.matchLevel}</span>
                          </div>
                          <p className="text-sm text-[#64748B] leading-relaxed">{d.why}</p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {d.skills.map((sk, j) => (
                              <span key={j} className="px-2 py-0.5 bg-gray-50 text-gray-600 text-xs rounded-md border border-gray-200">{sk}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {cogResult.actions.length > 0 && (
                      <div className="mt-5">
                        <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-2">给你的行动建议</p>
                        <ul className="space-y-2">
                          {cogResult.actions.map((a, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-[#475569]">
                              <span className="text-[#165DFF] mt-0.5">›</span>
                              <span>{a}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-6">
                      <Button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="w-full btn-gradient rounded-xl font-semibold text-base py-5"
                      >
                        {generating ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            AI 正在生成...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5 mr-2" />
                            基于这个方向，生成完整职业规划报告
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Link to reports */}
          <div className="text-center mt-8">
            <Link
              href="/career-planning/my-reports"
              className="inline-flex items-center gap-1 text-[#165DFF] text-sm font-medium hover:underline"
            >
              <FileText className="w-4 h-4" />
              查看我的历史报告
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
