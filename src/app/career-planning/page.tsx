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
import {
  Sparkles,
  Loader2,
  FileText,
  ChevronRight,
  Lightbulb,
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
