'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import type { CognitiveCorrectionResult } from '@/lib/career-paths/engine/cognitive_correction';
import type { InterviewRadarReport } from '@/lib/career-paths/engine/interview_radar';
import type { SubtextReport } from '@/lib/career-paths/engine/subtext_dictionary';
import type { PathPlanReport } from '@/lib/career-paths/engine/career_path_planner';
import type { CapabilityReport } from '@/lib/career-paths/engine/capability_dictionary';
import {
  Sparkles,
  Loader2,
  FileText,
  ChevronRight,
  Lightbulb,
  Compass,
  Radar,
  Languages,
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
  const [radarResult, setRadarResult] = useState<InterviewRadarReport | null>(null);
  const [radarLoading, setRadarLoading] = useState(false);
  const [radarError, setRadarError] = useState<string | null>(null);
  const [radarIndustry, setRadarIndustry] = useState('');
  const [subtextInput, setSubtextInput] = useState('');
  const [subtextResult, setSubtextResult] = useState<SubtextReport | null>(null);
  const [subtextLoading, setSubtextLoading] = useState(false);
  const [subtextError, setSubtextError] = useState<string | null>(null);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [glossaryList, setGlossaryList] = useState<{ phrase: string; category: 'jd' | 'interview' | 'resume' | 'workplace'; categoryLabel: string; meaning: string; risk: 'low' | 'medium' | 'high'; advice: string }[]>([]);
  const [glossaryLoading, setGlossaryLoading] = useState(false);
  const [glossaryError, setGlossaryError] = useState<string | null>(null);
  const [capJobs, setCapJobs] = useState<{ id: string; name: string; category: string }[]>([]);
  const [capJobsLoading, setCapJobsLoading] = useState(false);
  const [capTargetJob, setCapTargetJob] = useState('');
  const [capExperience, setCapExperience] = useState('');
  const [capResult, setCapResult] = useState<CapabilityReport | null>(null);
  const [capLoading, setCapLoading] = useState(false);
  const [capError, setCapError] = useState<string | null>(null);
  const [pathDirection, setPathDirection] = useState('');
  const [pathSkills, setPathSkills] = useState('');
  const [pathResult, setPathResult] = useState<PathPlanReport | null>(null);
  const [pathLoading, setPathLoading] = useState(false);
  const [pathError, setPathError] = useState<string | null>(null);

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

  const handleInterviewRadar = async () => {
    const industry = radarIndustry || targetIndustry.trim();
    if (!industry && !major.trim()) {
      setRadarError('请选择目标行业或填写你的专业');
      return;
    }
    setRadarLoading(true);
    setRadarError(null);
    setRadarResult(null);
    try {
      const res = await fetch('/api/career-planning/interview-radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: industry || undefined,
          major: major.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setRadarResult(data.data);
      } else {
        setRadarError(data.error || data.message || '面试雷达失败，请重试');
      }
    } catch {
      setRadarError('网络错误，请稍后重试');
    } finally {
      setRadarLoading(false);
    }
  };

  const handleSubtextDetect = async () => {
    if (!subtextInput.trim()) {
      setSubtextError('请粘贴要拆解的内容');
      return;
    }
    setSubtextLoading(true);
    setSubtextError(null);
    setSubtextResult(null);
    try {
      const res = await fetch('/api/career-planning/subtext-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: subtextInput.trim() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSubtextResult(data.data);
      } else {
        setSubtextError(data.error || data.message || '潜台词拆解失败，请重试');
      }
    } catch {
      setSubtextError('网络错误，请稍后重试');
    } finally {
      setSubtextLoading(false);
    }
  };

  const handleToggleGlossary = async () => {
    if (glossaryOpen) {
      setGlossaryOpen(false);
      return;
    }
    setGlossaryOpen(true);
    if (glossaryList.length > 0) {
      return;
    }
    setGlossaryLoading(true);
    setGlossaryError(null);
    try {
      const res = await fetch('/api/career-planning/subtext-detect');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setGlossaryList(data.data);
      } else {
        setGlossaryError(data.error || data.message || '词条库加载失败，请重试');
      }
    } catch {
      setGlossaryError('网络错误，请稍后重试');
    } finally {
      setGlossaryLoading(false);
    }
  };

  // 能力翻译词典：加载已支持对标的内置岗位列表（供下拉选择）
  useEffect(() => {
    let alive = true;
    const loadCapJobs = async () => {
      setCapJobsLoading(true);
      try {
        const res = await fetch('/api/career-planning/capability-dictionary');
        const data = await res.json();
        if (alive && data.success && Array.isArray(data.data)) {
          setCapJobs(data.data);
        } else if (alive) {
          setCapError(data.error || data.message || '岗位列表加载失败，请重试');
        }
      } catch {
        if (alive) setCapError('网络错误，请刷新重试');
      } finally {
        if (alive) setCapJobsLoading(false);
      }
    };
    loadCapJobs();
    return () => {
      alive = false;
    };
  }, []);

  const handleAnalyzeCapability = async () => {
    if (!capTargetJob || !capTargetJob.trim()) {
      setCapError('请先选择或输入目标岗位');
      return;
    }
    setCapLoading(true);
    setCapError(null);
    try {
      const res = await fetch('/api/career-planning/capability-dictionary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetJob: capTargetJob.trim(), experience: capExperience.trim() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCapResult(data.data);
      } else {
        setCapError(data.error || data.message || '能力翻译失败，请重试');
      }
    } catch {
      setCapError('网络错误，请稍后重试');
    } finally {
      setCapLoading(false);
    }
  };

  const handleCareerPath = async () => {
    if (!major.trim()) {
      setPathError('请先在上方填写你的专业');
      return;
    }
    setPathLoading(true);
    setPathError(null);
    setPathResult(null);
    try {
      const res = await fetch('/api/career-planning/career-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          major: major.trim(),
          grade,
          direction: pathDirection.trim(),
          skills: pathSkills.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPathResult(data.data);
      } else {
        setPathError(data.error || data.message || '成长路线生成失败，请重试');
      }
    } catch {
      setPathError('网络错误，请稍后重试');
    } finally {
      setPathLoading(false);
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

                <div className="mt-2">
                  <Label className="text-sm font-medium text-[#475569] mb-2 block">
                    目标行业 <span className="text-[#94A3B8]">（选择后拆该行业面试重点，可留空）</span>
                  </Label>
                  <Select value={radarIndustry} onValueChange={setRadarIndustry}>
                    <SelectTrigger className="w-full rounded-xl border-[#E2E8F0] focus:border-[#3D7FFF]">
                      <SelectValue placeholder="选择目标行业（可留空）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="互联网/软件开发">互联网/软件开发</SelectItem>
                      <SelectItem value="电子/半导体/芯片">电子/半导体/芯片</SelectItem>
                      <SelectItem value="汽车/新能源车">汽车/新能源车</SelectItem>
                      <SelectItem value="金融/银行/证券">金融/银行/证券</SelectItem>
                      <SelectItem value="人力资源/HR">人力资源/HR</SelectItem>
                      <SelectItem value="电商/新媒体/运营">电商/新媒体/运营</SelectItem>
                      <SelectItem value="数据分析/BI">数据分析/BI</SelectItem>
                      <SelectItem value="制造/智能制造/机械">制造/智能制造/机械</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  className="w-full rounded-xl font-semibold py-4 border-[#3D7FFF]/30 text-[#3D7FFF] hover:bg-[#3D7FFF]/5"
                  onClick={handleInterviewRadar}
                  disabled={radarLoading}
                  type="button"
                >
                  {radarLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      雷达拆解中...
                    </>
                  ) : (
                    <>
                      <Radar className="w-5 h-5 mr-2" />
                      面试行业雷达：提前知道会被问什么
                    </>
                  )}
                </Button>

                <div className="mt-2">
                  <Label className="text-sm font-medium text-[#475569] mb-2 block">
                    面试/简历潜台词拆解 <span className="text-[#94A3B8]">（粘贴 JD、简历句或面试问题）</span>
                  </Label>
                  <Textarea
                    placeholder="例如：抗压能力强，弹性工作，薪资面议 / 简历写：参与项目，提升效率40% / 面试官问：你最大的缺点是什么"
                    value={subtextInput}
                    onChange={(e) => setSubtextInput(e.target.value)}
                    rows={3}
                    className="rounded-xl border-[#E2E8F0] focus:border-[#3D7FFF]"
                  />
                </div>

                <Button
                  variant="outline"
                  className="w-full rounded-xl font-semibold py-4 border-[#7A5CFF]/30 text-[#7A5CFF] hover:bg-[#7A5CFF]/5"
                  onClick={handleSubtextDetect}
                  disabled={subtextLoading}
                  type="button"
                >
                  {subtextLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      拆解中...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-5 h-5 mr-2" />
                      潜台词词条库：把黑话翻译成人话
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full rounded-xl font-medium py-2.5 text-sm text-[#7A5CFF] hover:bg-[#7A5CFF]/5"
                  onClick={handleToggleGlossary}
                  type="button"
                >
                  {glossaryOpen ? '收起词条库' : '查看全部黑话词条 ›'}
                </Button>

                {glossaryOpen && (
                  <div className="mt-3 rounded-xl border border-[#7A5CFF]/20 bg-[#7A5CFF]/[0.03] p-4">
                    {glossaryLoading ? (
                      <div className="flex items-center justify-center py-8 text-sm text-[#94A3B8]">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        加载词条库...
                      </div>
                    ) : glossaryError ? (
                      <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{glossaryError}</div>
                    ) : (
                      (() => {
                        const groups: { key: 'jd' | 'interview' | 'resume' | 'workplace'; label: string; items: typeof glossaryList }[] = [
                          { key: 'jd', label: 'JD 里的黑话', items: glossaryList.filter((g) => g.category === 'jd') },
                          { key: 'interview', label: '面试官的黑话', items: glossaryList.filter((g) => g.category === 'interview') },
                          { key: 'resume', label: '简历里的黑话', items: glossaryList.filter((g) => g.category === 'resume') },
                          { key: 'workplace', label: '职场/公司黑话', items: glossaryList.filter((g) => g.category === 'workplace') },
                        ];
                        return (
                          <div className="space-y-4">
                            {groups.map((group) => (
                              <div key={group.key} className="space-y-2">
                                <p className="text-xs font-semibold text-[#7A5CFF] uppercase tracking-wide">{group.label}（{group.items.length}）</p>
                                {group.items.length === 0 ? (
                                  <p className="text-xs text-[#94A3B8]">暂无</p>
                                ) : (
                                  <div className="space-y-2">
                                    {group.items.map((g, i) => (
                                      <div key={i} className="rounded-lg bg-white border border-[#E2E8F0] p-3">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="font-semibold text-[#1E293B] text-sm">{g.phrase}</span>
                                          {g.risk === 'high' && <span className="px-2 py-0.5 text-xs bg-red-50 text-red-600 rounded-full">高风险</span>}
                                          {g.risk === 'medium' && <span className="px-2 py-0.5 text-xs bg-amber-50 text-amber-600 rounded-full">要留意</span>}
                                          {g.risk === 'low' && <span className="px-2 py-0.5 text-xs bg-green-50 text-green-600 rounded-full">基本无坑</span>}
                                        </div>
                                        <p className="text-sm text-[#64748B] mb-2">{g.meaning}</p>
                                        <div className="bg-gray-50 rounded-lg p-3 text-xs text-[#7A5CFF]">
                                          <span className="font-medium">应对：</span>{g.advice}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}

                <div className="mt-2">
                  <Label className="text-sm font-medium text-[#475569] mb-2 block">
                    能力翻译词典 <span className="text-[#94A3B8]">（对标目标岗位，看经历值多少、还差什么）</span>
                  </Label>
                  <div className="flex flex-col gap-2">
                    <Input
                      placeholder="目标岗位，如：工艺工程师 / 设备工程师 / 产品经理（也可输入其他岗位）"
                      value={capTargetJob}
                      onChange={(e) => setCapTargetJob(e.target.value)}
                      className="rounded-xl border-[#E2E8F0] focus:border-[#3D7FFF]"
                    />
                    {capJobs.length > 0 && (
                      <p className="text-xs text-[#94A3B8]">已支持对标：{capJobs.map((j) => j.name).join(' / ')}</p>
                    )}
                    <Textarea
                      placeholder="粘贴你的经历（可留空，填了才做差距诊断）：如 做过产线改善，良率92%→97%，用Minitab做DOE"
                      value={capExperience}
                      onChange={(e) => setCapExperience(e.target.value)}
                      rows={3}
                      className="rounded-xl border-[#E2E8F0] focus:border-[#3D7FFF]"
                    />
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full rounded-xl font-semibold py-4 border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/5"
                  onClick={handleAnalyzeCapability}
                  disabled={capLoading}
                  type="button"
                >
                  {capLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      对标中...
                    </>
                  ) : (
                    <>
                      <Languages className="w-5 h-5 mr-2" />
                      能力翻译：你的经历值多少、还差什么
                    </>
                  )}
                </Button>

                <div className="mt-2">
                  <Label className="text-sm font-medium text-[#475569] mb-2 block">
                    成长路线 <span className="text-[#94A3B8]">（从这一步，推下一步，可留空方向/技能）</span>
                  </Label>
                  <div className="flex flex-col gap-2">
                    <Input
                      placeholder="想去的方向（可留空，如：数据分析 / 后端 / 产品）"
                      value={pathDirection}
                      onChange={(e) => setPathDirection(e.target.value)}
                      className="rounded-xl border-[#E2E8F0] focus:border-[#3D7FFF]"
                    />
                    <Input
                      placeholder="已有的技能/经历（可留空，如：会Python、做过校级项目）"
                      value={pathSkills}
                      onChange={(e) => setPathSkills(e.target.value)}
                      className="rounded-xl border-[#E2E8F0] focus:border-[#3D7FFF]"
                    />
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full rounded-xl font-semibold py-4 border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/5"
                  onClick={handleCareerPath}
                  disabled={pathLoading}
                  type="button"
                >
                  {pathLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      规划中...
                    </>
                  ) : (
                    <>
                      <Compass className="w-5 h-5 mr-2" />
                      成长路线：从这一步，推下一步
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

          {/* 面试行业雷达结果展示 */}
          {(radarResult || radarError) && (
            <div className="mt-8">
              {radarError && (
                <Card className="border-red-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{radarError}</div>
                  </CardContent>
                </Card>
              )}
              {radarResult && (
                <Card className="border-[#3D7FFF]/20 shadow-lg shadow-[#3D7FFF]/5">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3 mb-5">
                      <div className="w-10 h-10 shrink-0 rounded-xl bg-[#3D7FFF]/10 flex items-center justify-center">
                        <Radar className="w-5 h-5 text-[#3D7FFF]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#1E293B]">面试雷达：{radarResult.matchedIndustry}</h3>
                        <p className="text-sm text-[#64748B] mt-1">{radarResult.summary}</p>
                        {radarResult.majorImplication && (
                          <p className="text-sm text-[#3D7FFF] mt-2">{radarResult.majorImplication}</p>
                        )}
                      </div>
                    </div>

                    {/* 考察重点 */}
                    <div className="mb-5">
                      <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-3">考察重点（按权重）</p>
                      <div className="space-y-3">
                        {radarResult.radar.focus.map((f, i) => (
                          <div key={i} className="rounded-xl border border-[#E2E8F0] p-4">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-[#1E293B] text-sm">{f.module}</span>
                              <span className="px-2 py-0.5 text-xs bg-[#3D7FFF]/8 text-[#3D7FFF] rounded-full">权重 {f.weight}%</span>
                            </div>
                            <p className="text-sm text-[#64748B] mb-2">{f.how}</p>
                            <div className="flex flex-wrap gap-2">
                              {f.questions.map((q, j) => (
                                <span key={j} className="px-2.5 py-1 bg-gray-50 text-gray-600 text-xs rounded-md border border-gray-200">{q}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 高频问题+潜台词 */}
                    <div className="mb-5">
                      <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-3">高频问题 + 潜台词</p>
                      <div className="space-y-3">
                        {radarResult.radar.questions.map((q, i) => (
                          <div key={i} className="rounded-xl border border-[#E2E8F0] p-4">
                            <p className="text-sm font-semibold text-[#1E293B] mb-1">{q.question}</p>
                            <p className="text-xs text-[#3D7FFF] mb-2">潜台词：{q.subtext}</p>
                            <p className="text-sm text-[#64748B]">建议：{q.tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 雷区 */}
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">这个行业的雷区</p>
                      </div>
                      <ul className="space-y-2">
                        {radarResult.radar.redFlags.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-[#B91C1C]">
                            <span className="mt-0.5">⚠</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 准备建议 */}
                    <div>
                      <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-2">给你的准备建议</p>
                      <ul className="space-y-2">
                        {radarResult.radar.prepTips.map((t, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-[#475569]">
                            <span className="text-[#3D7FFF] mt-0.5">›</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* 潜台词拆解结果展示 */}
          {(subtextResult || subtextError) && (
            <div className="mt-8">
              {subtextError && (
                <Card className="border-red-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{subtextError}</div>
                  </CardContent>
                </Card>
              )}
              {subtextResult && (
                <Card className="border-[#7A5CFF]/20 shadow-lg shadow-[#7A5CFF]/5">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3 mb-5">
                      <div className="w-10 h-10 shrink-0 rounded-xl bg-[#7A5CFF]/10 flex items-center justify-center">
                        <Lightbulb className="w-5 h-5 text-[#7A5CFF]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#1E293B]">潜台词翻译</h3>
                        <p className="text-sm text-[#64748B] mt-1">{subtextResult.summary}</p>
                      </div>
                    </div>

                    {subtextResult.needsMoreInfo ? (
                      <div className="rounded-xl border border-dashed border-[#E2E8F0] p-4 text-sm text-[#94A3B8]">{subtextResult.summary}</div>
                    ) : subtextResult.items.length > 0 ? (
                      <div className="space-y-3">
                        {subtextResult.items.map((it, i) => (
                          <div key={i} className="rounded-xl border border-[#E2E8F0] p-4">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-[#1E293B] text-sm">
                                {it.surface || it.phrase}
                                <span className="ml-2 text-xs font-normal text-[#94A3B8]">{it.categoryLabel}</span>
                              </span>
                              {it.risk === 'high' && <span className="px-2 py-0.5 text-xs bg-red-50 text-red-600 rounded-full">高风险</span>}
                              {it.risk === 'medium' && <span className="px-2 py-0.5 text-xs bg-amber-50 text-amber-600 rounded-full">要留意</span>}
                              {it.risk === 'low' && <span className="px-2 py-0.5 text-xs bg-green-50 text-green-600 rounded-full">基本无坑</span>}
                            </div>
                            <p className="text-sm text-[#64748B] mb-2">{it.meaning}</p>
                            <div className="bg-gray-50 rounded-lg p-3 text-xs text-[#7A5CFF]">
                              <span className="font-medium">应对：</span>{it.advice}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-[#E2E8F0] p-4 text-sm text-[#94A3B8]">
                        没在这些文本里识别到典型黑话。想让拆解更准，可以把完整的 JD、简历或面试问题整段贴进来。
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* 能力翻译词典结果展示 */}
          {(capResult || capError) && (
            <div className="mt-8">
              {capError && (
                <Card className="border-red-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{capError}</div>
                  </CardContent>
                </Card>
              )}
              {capResult && (
                <Card className="border-[#F59E0B]/20 shadow-lg shadow-[#F59E0B]/5">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3 mb-5">
                      <div className="w-10 h-10 shrink-0 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center">
                        <Languages className="w-5 h-5 text-[#F59E0B]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#1E293B]">
                          能力翻译：{capResult.matchedJob}
                          {capResult.matchedCategory && (
                            <span className="ml-2 text-xs font-normal text-[#94A3B8]">{capResult.matchedCategory}</span>
                          )}
                        </h3>
                        <p className="text-sm text-[#64748B] mt-1">{capResult.summary}</p>
                      </div>
                    </div>

                    {!capResult.known && (
                      <div className="rounded-xl border border-dashed border-[#F59E0B]/40 bg-[#F59E0B]/[0.04] px-4 py-3 text-sm text-[#B45309] mb-5">
                        {capResult.matchedJob || '这个岗位'}的能力词典还没细化到行业级，先用通用四层框架帮你对照。想要更准的行业级拆解，告诉我具体行业+岗位（如：锂电工艺工程师 / HRTech 产品经理）。
                      </div>
                    )}

                    {/* 能力分层 */}
                    <div className="mb-5">
                      <p className="text-xs font-semibold text-[#7A5CFF] uppercase tracking-wide mb-2">能力分层</p>
                      <div className="space-y-2">
                        {capResult.layers.map((layer) => (
                          <div key={layer.layer} className="rounded-xl border border-[#E2E8F0] p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-[#1E293B] text-sm">{layer.label}</span>
                              <span className="text-xs text-[#94A3B8]">权重 {layer.weight}%</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {layer.items.map((item, i) => (
                                <span key={i} className="px-2 py-0.5 text-xs bg-gray-50 text-[#475569] rounded-full">{item}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 无经历引导 */}
                    {!capExperience.trim() && (
                      <div className="rounded-xl border border-dashed border-[#E2E8F0] p-4 text-sm text-[#94A3B8] mb-5">
                        贴一段你的经历（项目/实习/社团），我会把它翻译成企业语言，并标出与目标岗位的差距和补课路径。
                      </div>
                    )}

                    {/* 已有优势 */}
                    {capResult.advantages.length > 0 && (
                      <div className="mb-5">
                        <p className="text-xs font-semibold text-[#10B981] uppercase tracking-wide mb-2">
                          你的经历已覆盖（{capResult.advantages.length}）
                        </p>
                        <div className="space-y-1.5">
                          {capResult.advantages.map((a, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-[#475569]">
                              <span className="mt-1 w-1.5 h-1.5 shrink-0 rounded-full bg-[#10B981]" />
                              {a}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 差距与补课路径 */}
                    {capResult.gaps.length > 0 && (
                      <div className="mb-5">
                        <p className="text-xs font-semibold text-[#F59E0B] uppercase tracking-wide mb-2">
                          还差这些 · 补课路径（{capResult.gaps.length}）
                        </p>
                        <div className="space-y-2">
                          {capResult.gaps.map((g, i) => (
                            <div key={i} className="rounded-xl border border-[#E2E8F0] p-3">
                              <p className="font-semibold text-[#1E293B] text-sm mb-1">{g.skill}</p>
                              <p className="text-sm text-[#64748B] mb-1">{g.gap}</p>
                              <div className="bg-amber-50 rounded-lg p-3 text-xs text-[#B45309]">
                                <span className="font-medium">补课路径：</span>{g.path}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 推荐投递 */}
                    {capResult.recommendations.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[#7A5CFF] uppercase tracking-wide mb-2">推荐投递</p>
                        <div className="flex flex-wrap gap-1.5">
                          {capResult.recommendations.map((c, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs bg-[#7A5CFF]/10 text-[#7A5CFF] rounded-full">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* 成长路线结果展示 */}
          {(pathResult || pathError) && (
            <div className="mt-8">
              {pathError && (
                <Card className="border-red-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{pathError}</div>
                  </CardContent>
                </Card>
              )}
              {pathResult && (
                <Card className="border-[#10B981]/20 shadow-lg shadow-[#10B981]/5">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3 mb-5">
                      <div className="w-10 h-10 shrink-0 rounded-xl bg-[#10B981]/10 flex items-center justify-center">
                        <Compass className="w-5 h-5 text-[#10B981]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#1E293B]">成长路线：{pathResult.trackLabel}</h3>
                        <p className="text-sm text-[#64748B] mt-1">{pathResult.summary}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {pathResult.jobDirections.map((d, i) => (
                            <span key={i} className="px-2.5 py-1 bg-[#10B981]/5 text-[#10B981] text-xs rounded-md border border-[#10B981]/15">{d}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 当前阶段 */}
                    <div className="mb-5 rounded-xl bg-[#10B981]/5 border border-[#10B981]/15 p-4">
                      <p className="text-xs font-medium text-[#10B981] uppercase tracking-wide mb-1">当前阶段</p>
                      <p className="text-sm font-semibold text-[#1E293B]">{pathResult.currentStageLabel}</p>
                    </div>

                    {/* 路线步骤 */}
                    <div className="relative pl-5">
                      <div className="absolute left-0 top-1 bottom-1 w-px bg-[#E2E8F0]" />
                      <div className="space-y-5">
                        {pathResult.roadmap.map((step, i) => (
                          <div key={i} className="relative">
                            <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-[#10B981] ring-4 ring-[#10B981]/10" />
                            <p className="text-sm font-semibold text-[#1E293B]">{step.stageLabel}</p>
                            <p className="text-sm text-[#475569] mt-1">{step.focus}</p>
                            <ul className="mt-2 space-y-1.5">
                              {step.actions.map((a, j) => (
                                <li key={j} className="flex items-start gap-2 text-sm text-[#64748B]">
                                  <span className="text-[#10B981] mt-0.5">›</span>
                                  <span>{a}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="mt-2 rounded-lg bg-gray-50 p-3 text-xs">
                              <span className="font-medium text-[#475569]">完成标准：</span>
                              <span className="text-[#64748B]">{step.milestone}</span>
                            </div>
                            <p className="mt-1.5 text-xs text-[#3D7FFF]">下一步：{step.nextHint}</p>
                          </div>
                        ))}
                      </div>
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
