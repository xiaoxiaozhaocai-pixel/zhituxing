'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import SkillTagInput from '@/components/resume/SkillTagInput';
import { Loader2, Save, ArrowLeft, FileText, CheckCircle2, AlertCircle, Sparkles, Lightbulb, AlertTriangle, ChevronDown, ChevronUp, ArrowRight, Target } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ResumeSection {
  school?: string;
  degree?: string;
  major?: string;
  time?: string;
  gpa?: string;
  company?: string;
  role?: string;
  description?: string[];
}

interface ResumeData {
  id: number;
  name: string;
  content: string;
  sections?: {
    basic?: { name: string; phone: string; email: string; school: string; major: string; graduation: string };
    education?: ResumeSection[];
    experience?: ResumeSection[];
    projects?: ResumeSection[];
    skills?: string[];
  };
  is_default: boolean;
  template_id?: string;
}

export default function ResumeEditPage() {
  const router = useRouter();
  const params = useParams();
  const resumeId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [resume, setResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  // AI 评分状态
  const [scoreLoading, setScoreLoading] = useState(false);
  const [overallScore, setOverallScore] = useState(0);
  const [scoreDimensions, setScoreDimensions] = useState<{ name: string; score: number; maxScore: number }[]>([]);
  const [scoreSummary, setScoreSummary] = useState('');
  const [scoreExpanded, setScoreExpanded] = useState(false);

  // AI 逐段分析
  const [analyzing, setAnalyzing] = useState('');
  const [analysis, setAnalysis] = useState<{
    score: number; strengths: string[]; weaknesses: string[]; suggestions: string[]; rewritten: string;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [appliedRewrite, setAppliedRewrite] = useState(false);

  // 表单状态
  const [resumeName, setResumeName] = useState('');
  const [content, setContent] = useState('');
  const [basicName, setBasicName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [major, setMajor] = useState('');
  const [graduation, setGraduation] = useState('');
  const [skillsList, setSkillsList] = useState<string[]>([]);

  // 完整度计算
  const completeness = useCallback(() => {
    let score = 0;
    if (basicName || phone || email || school || major || graduation) score += 20;
    if (resume?.sections?.education && resume.sections.education.length > 0) score += 20;
    if (skillsList.length > 0) score += 20;
    if (resume?.sections?.experience && resume.sections.experience.length > 0) score += 20;
    if (resume?.sections?.projects && resume.sections.projects.length > 0) score += 20;
    return score;
  }, [basicName, phone, email, school, major, graduation, skillsList, resume]);
  const completenessScore = completeness();

  // 加载已有简历
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/auth'); return; }

    async function loadResume() {
      try {
        const res = await fetch(`/api/resume/${resumeId}`);
        const json = await res.json();
        if (json.success && json.data) {
          const r = json.data;
          setResume(r);
          setResumeName(r.name || '');
          setContent(r.content || '');

          if (r.sections?.basic) {
            setBasicName(r.sections.basic.name || '');
            setPhone(r.sections.basic.phone || '');
            setEmail(r.sections.basic.email || '');
            setSchool(r.sections.basic.school || '');
            setMajor(r.sections.basic.major || '');
            setGraduation(r.sections.basic.graduation || '');
          }
          if (r.sections?.skills) {
            setSkillsList(r.sections.skills);
          }
        }
      } catch (err) {
        console.error('加载简历失败:', err);
      } finally {
        setLoading(false);
      }
    }
    loadResume();
  }, [resumeId, user, authLoading, router]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      const sections = {
        basic: {
          name: basicName,
          phone,
          email,
          school,
          major,
          graduation,
        },
        education: resume?.sections?.education || [],
        experience: resume?.sections?.experience || [],
        projects: resume?.sections?.projects || [],
        skills: skillsList,
      };

      const res = await fetch(`/api/resume/${resumeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: resumeName, content, sections }),
      });
      const json = await res.json();
      if (json.success) {
        // 同步技能标签到 user_profiles
        try {
          const tagsRes = await fetch('/api/skills/tags');
          const tagsJson = await tagsRes.json();
          if (tagsJson.success) {
            const categorySkills = new Map<string, string[]>();
            for (const cat of (tagsJson.data.categories || [])) {
              for (const s of cat.skills) {
                if (!categorySkills.has(cat.name)) categorySkills.set(cat.name, []);
                categorySkills.get(cat.name)!.push(s);
              }
            }
            const hardSkills: string[] = [];
            const softSkills: string[] = [];
            const hardCategories = ['编程语言', '开发框架', '数据库', '工具', '技术栈', '云服务', '数据分析', '人工智能', '机器学习', '网络安全', '前端开发', '后端开发', '移动开发', 'DevOps'];
            for (const skill of skillsList) {
              let foundCategory = '';
              for (const [cat, skills] of categorySkills) {
                if (skills.includes(skill)) { foundCategory = cat; break; }
              }
              if (hardCategories.includes(foundCategory)) {
                hardSkills.push(skill);
              } else {
                softSkills.push(skill);
              }
            }
            await fetch('/api/user/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ hard_skills: hardSkills, soft_skills: softSkills }),
            });
          }
        } catch (e) {
          console.error('同步技能到user_profiles失败:', e);
        }

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }, [resumeName, content, basicName, phone, email, school, major, graduation, skillsList, resumeId, resume]);


  // AI 综合评分
  const fetchScore = useCallback(async () => {
    if (!resume) return;
    setScoreLoading(true);
    try {
      const sections = {
        basic: { name: basicName, school, major, graduation },
        education: resume.sections?.education || [],
        experience: resume.sections?.experience || [],
        projects: resume.sections?.projects || [],
        skills: skillsList,
        content,
      };
      const resp = await fetch('/api/resume/score', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData: sections }),
      });
      const data = await resp.json();
      if (!data.error) {
        setOverallScore(data.overallScore || 0);
        setScoreDimensions(data.dimensions || []);
        setScoreSummary(data.summary || '');
      }
    } catch { /* silent */ }
    finally { setScoreLoading(false); }
  }, [resume, basicName, school, major, graduation, skillsList, content]);

  useEffect(() => {
    if (resume && !scoreLoading && overallScore === 0) fetchScore();
  }, [resume]); // eslint-disable-line

  // AI 逐段分析
  const analyzeSection = async (type: string, label: string) => {
    setAnalyzing(label);
    setAnalysis(null);
    setAnalysisError('');
    setAppliedRewrite(false);
    let text = '';
    if (type === 'skills') text = skillsList.join('、');
    else if (type === 'content') text = content;
    else {
      const arr = resume?.sections?.[type as keyof typeof resume.sections] as Array<Record<string,unknown>> | undefined;
      if (arr?.length) text = arr.map((item: Record<string,unknown>) =>
        `${item.school || item.company || ''} ${item.major || item.role || ''} ${item.time || ''} ${Array.isArray(item.description) ? (item.description as string[]).join('；') : ''}`
      ).join('\n');
    }
    if (!text.trim()) { setAnalysisError('该部分暂无内容'); setAnalyzing(''); return; }
    try {
      const resp = await fetch('/api/resume/analyze-section', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionType: type, sectionText: text, resumeContext: content?.slice(0, 500) || '' }),
      });
      const data = await resp.json();
      if (data.error) setAnalysisError(data.error);
      else setAnalysis(data);
    } catch { setAnalysisError('分析失败，请重试'); }
    finally { setAnalyzing(''); }
  };

  const applyRewrite = () => {
    if (!analysis?.rewritten) return;
    if (analyzing === '技能标签') setSkillsList(analysis.rewritten.split(/[、,，]/).map(s => s.trim()).filter(Boolean));
    else if (analyzing === '简历正文') setContent(analysis.rewritten);
    else setContent((prev: string) => prev + '\n\n【AI 优化】' + analysis.rewritten);
    setAppliedRewrite(true);
    setTimeout(() => fetchScore(), 1000);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }


  if (!resume) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#f8fafd] to-white gap-5">
        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center">
          <FileText className="h-9 w-9 text-gray-300" />
        </div>
        <p className="text-[#999] text-sm">简历不存在或已被删除</p>
        <Link href="/resume-builder">
          <Button className="bg-[#165DFF] hover:bg-[#165DFF]/90 rounded-xl">创建新简历</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafd] to-white">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-gray-100/80">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/resume-builder">
              <Button variant="ghost" size="sm" className="text-[#888] hover:text-[#1a1a1a] rounded-lg">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                返回
              </Button>
            </Link>
            <div className="h-5 w-px bg-gray-200" />
            <h1 className="font-bold text-[#1a1a1a] text-sm">编辑简历</h1>
            {/* 完整度进度条 */}
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-100">
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-[#165DFF]" />
                <span className="text-xs text-[#888]">完整度</span>
              </div>
              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    completenessScore >= 80 ? 'bg-green-500' : completenessScore >= 60 ? 'bg-[#FF7D00]' : completenessScore >= 40 ? 'bg-[#165DFF]' : 'bg-gray-300'
                  }`}
                  style={{ width: `${completenessScore}%` }}
                />
              </div>
              <span className={`text-xs font-semibold min-w-[2.5rem] text-right ${
                completenessScore >= 80 ? 'text-green-600' : completenessScore >= 60 ? 'text-[#FF7D00]' : 'text-[#888]'
              }`}>
                {completenessScore}%
              </span>
            </div>
            {resume.is_default && (
              <Badge className="bg-[#165DFF]/8 text-[#165DFF] border-0 text-xs font-medium px-2 py-0.5 rounded-full">
                默认
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {saveStatus === 'saved' && (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> 已保存
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> 保存失败
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
              size="sm"
              className="bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] hover:from-[#165DFF] hover:to-[#165DFF] text-white font-semibold rounded-xl shadow-md shadow-[#165DFF]/20"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              保存
            </Button>
          </div>
        </div>
      </header>

      {/* 主编辑区 */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* ========== 左侧表单 (40%) ========== */}
          <div className="w-[42%] shrink-0 space-y-3">
            {/* 简历名称 */}
            <Card className="shadow-sm border-0 overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-[#165DFF]/30 to-transparent" />
              <CardContent className="p-4">
                <label className="text-xs font-semibold text-[#888] mb-2 block uppercase tracking-wide">简历名称</label>
                <Input
                  value={resumeName}
                  onChange={e => setResumeName(e.target.value)}
                  placeholder="例如：校招版、实习版"
                  className="border-gray-200 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/8 rounded-lg h-10 text-sm"
                />
              </CardContent>
            </Card>

            {/* 基本信息 */}
            <Card className="shadow-sm border-0 overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-[#165DFF]/30 to-transparent" />
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-bold text-[#1a1a1a]">基本信息</CardTitle>
                <CardDescription className="text-xs">HR 最先看到的内容，请认真填写</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-x-3 gap-y-2.5 pb-4">
                {[
                  { label: '姓名', value: basicName, setter: setBasicName, placeholder: '你的姓名', type: 'text', hint: '' },
                  { label: '手机', value: phone, setter: setPhone, placeholder: '手机号', type: 'tel', hint: '' },
                  { label: '邮箱', value: email, setter: setEmail, placeholder: '邮箱地址', type: 'email', hint: '' },
                  { label: '学校', value: school, setter: setSchool, placeholder: '学校全称', type: 'text', hint: '例如：桂林电子科技大学' },
                  { label: '专业', value: major, setter: setMajor, placeholder: '专业名称', type: 'text', hint: '例如：人力资源管理' },
                  { label: '毕业时间', value: graduation, setter: setGraduation, placeholder: '2027年7月', type: 'text', hint: '例如：2024-2028' },
                ].map((field) => (
                  <div key={field.label} className="space-y-1">
                    <label className="text-xs text-[#aaa]">{field.label}</label>
                    <Input
                      value={field.value}
                      onChange={e => field.setter(e.target.value)}
                      placeholder={field.placeholder}
                      className="h-9 text-sm border-gray-200 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/8 rounded-lg"
                    />
                    {field.hint && <p className="text-[10px] text-gray-300 pl-0.5">{field.hint}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 技能标签 - 结构化录入 */}
            <Card className="shadow-sm border-0 overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-[#165DFF]/30 to-transparent" />
              <CardContent className="p-4 space-y-2">
                <label className="text-xs font-semibold text-[#888] block uppercase tracking-wide">技能标签</label>
                <SkillTagInput
                  value={skillsList}
                  onChange={setSkillsList}
                  placeholder="搜索并选择技能标签..."
                />
                <p className="text-[11px] text-gray-400">从预设技能库中搜索添加，支持多选</p>
              </CardContent>
            </Card>

            {/* 简历正文 */}
            <Card className="shadow-sm border-0 overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-[#165DFF]/30 to-transparent" />
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#888] uppercase tracking-wide">简历正文</label>
                  <Link href="/resume-builder" className="text-xs text-[#165DFF] hover:text-[#3D7FFF] font-medium transition-colors">
                    让小职帮你写 →
                  </Link>
                </div>
                <Textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="在此编辑简历内容…&#10;&#10;可包含：教育经历、实习经历、项目经历、获奖情况等"
                  className="min-h-[180px] text-sm leading-relaxed border-gray-200 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/8 rounded-lg resize-y"
                />
              </CardContent>
            </Card>
          </div>

          {/* ========== 右侧预览 (58%) ========== */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* AI 综合评分条 */}
            {(overallScore > 0 || scoreLoading) && (
              <div className={`rounded-xl border transition-all duration-300 ${
                scoreLoading ? 'bg-[#f0f5ff] border-[#165DFF]/15' :
                overallScore >= 80 ? 'bg-green-50 border-green-200' :
                overallScore >= 60 ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'
              }`}>
                {scoreLoading ? (
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <Sparkles className="h-4 w-4 text-[#165DFF]/60 animate-pulse" />
                    <span className="text-xs text-[#165DFF]/60">AI 正在分析…</span>
                  </div>
                ) : (
                  <>
                    <button onClick={() => setScoreExpanded(!scoreExpanded)} className="w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer">
                      <Sparkles className="h-4 w-4 text-[#165DFF] shrink-0" />
                      <span className={`text-xl font-bold shrink-0 ${overallScore >= 80 ? 'text-green-600' : overallScore >= 60 ? 'text-[#FF7D00]' : 'text-red-500'}`}>{overallScore}</span>
                      <span className="text-xs text-[#666] truncate text-left flex-1">{scoreSummary}</span>
                      <button onClick={(e) => { e.stopPropagation(); fetchScore(); }} className="text-xs text-[#165DFF] font-medium shrink-0">刷新</button>
                      {scoreExpanded ? <ChevronUp className="h-3.5 w-3.5 text-[#aaa] shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-[#aaa] shrink-0" />}
                    </button>
                    {scoreExpanded && (
                      <div className="px-4 pb-3 space-y-2">
                        {scoreDimensions.map((dim: { name: string; score: number; maxScore: number }) => {
                          const pct = Math.round((dim.score / dim.maxScore) * 100);
                          return (
                            <div key={dim.name} className="flex items-center gap-2">
                              <span className="text-xs text-[#666] w-20 shrink-0">{dim.name}</span>
                              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-[#FF7D00]' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-medium w-6 text-right">{dim.score}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* AI 逐段分析面板 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-gradient-to-r from-[#f0f5ff]/60 to-white">
                <Sparkles className="h-4 w-4 text-[#165DFF]" />
                <span className="text-sm font-bold text-[#1a1a1a]">小职 AI 分析</span>
                <Badge className="bg-[#165DFF]/8 text-[#165DFF] border-0 text-[10px] ml-auto">逐段精准反馈</Badge>
              </div>
              <div className="p-3 grid grid-cols-2 gap-1.5">
                {[
                  ['education', '🎓 教育经历'],
                  ['experience', '💼 实习经历'],
                  ['projects', '🚀 项目经历'],
                  ['skills', '🛠️ 技能标签'],
                  ['content', '📝 简历正文'],
                ].map(([type, label]) => (
                  <button key={type} onClick={() => analyzeSection(type, label.split(' ')[1])} disabled={!!analyzing}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      analyzing === label.split(' ')[1] ? 'bg-[#165DFF]/10 text-[#165DFF]' : 'text-[#666] hover:bg-gray-50 hover:text-[#1a1a1a]'
                    }`}>
                    <span>{label}</span>
                    {analyzing === label.split(' ')[1] && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-50">
                {analysisError && <div className="p-4 text-center"><p className="text-xs text-[#999]">{analysisError}</p></div>}
                {!analyzing && !analysis && !analysisError && (
                  <div className="p-6 text-center">
                    <Lightbulb className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-[#bbb]">点击上方模块，逐段获取 AI 分析建议</p>
                  </div>
                )}
                {analysis && (
                  <div className="p-3 space-y-3">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50">
                      <span className="text-2xl font-bold text-[#165DFF]">{analysis.score}</span>
                      <span className="text-xs text-[#999]">/ 10 分</span>
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] rounded-full" style={{ width: `${analysis.score * 10}%` }} />
                      </div>
                    </div>
                    {analysis.strengths.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> 亮点</span>
                        {analysis.strengths.map((s: string, i: number) => <p key={i} className="text-xs text-[#555] pl-5">• {s}</p>)}
                      </div>
                    )}
                    {analysis.weaknesses.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-[#FF7D00] flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> 待改进</span>
                        {analysis.weaknesses.map((w: string, i: number) => <p key={i} className="text-xs text-[#555] pl-5">• {w}</p>)}
                      </div>
                    )}
                    {analysis.suggestions.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-[#165DFF] flex items-center gap-1"><Lightbulb className="h-3 w-3" /> 建议</span>
                        {analysis.suggestions.map((sg: string, i: number) => <p key={i} className="text-xs text-[#555] pl-5">• {sg}</p>)}
                      </div>
                    )}
                    {analysis.rewritten && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-semibold flex items-center gap-1"><ArrowRight className="h-3 w-3" /> AI 改写</span>
                        <div className="p-2.5 bg-[#f0fdf4] border border-green-200 rounded-lg">
                          <p className="text-xs leading-relaxed whitespace-pre-wrap">{analysis.rewritten}</p>
                        </div>
                        <Button onClick={applyRewrite} disabled={appliedRewrite} size="sm"
                          className="w-full text-xs h-8 rounded-lg bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] hover:from-[#165DFF] hover:to-[#165DFF] text-white font-semibold">
                          {appliedRewrite ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> 已应用</> : <><Sparkles className="h-3.5 w-3.5 mr-1" /> 一键应用改写</>}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            
            {/* 模板选择器 */}
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-semibold text-[#888] uppercase tracking-wide">模板风格</span>
              <div className="flex gap-1.5">
                {[
                  { id: 'simple', name: '简约', desc: '干净利落' },
                  { id: 'business', name: '商务', desc: '专业正式' },
                  { id: 'modern', name: '现代', desc: '设计感' },
                ].map((tpl) => {
                  const active = resume.template_id === tpl.id || (!resume.template_id && tpl.id === 'simple');
                  return (
                    <button
                      key={tpl.id}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                        active
                          ? 'bg-[#165DFF] text-white border-[#165DFF] shadow-sm'
                          : 'bg-white text-[#999] border-gray-200 hover:border-[#165DFF]/40 hover:text-[#165DFF]'
                      }`}
                      title={tpl.desc}
                    >
                      {tpl.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* A4 预览 */}
            <div className="sticky top-20">
              <Card className="shadow-xl border-0 overflow-hidden">
                <div className="bg-[#e8ecf1] p-6 flex items-center justify-center">
                  <div className="bg-white shadow-2xl rounded-sm" style={{
                    width: '210mm',
                    maxWidth: '100%',
                    minHeight: '297mm',
                    padding: '20mm',
                    fontFamily: 'PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif',
                    backgroundImage: 'linear-gradient(rgba(0,0,0,0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.01) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}>
                    {/* 基本信息区 */}
                    <div className="text-center mb-8 pb-6 border-b-2 border-[#165DFF]">
                      <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2 tracking-wide">
                        {basicName || '姓名'}
                      </h2>
                      <div className="flex items-center justify-center gap-3 text-[13px] text-[#666] flex-wrap">
                        {phone && <span>{phone}</span>}
                        {email && <><span className="text-gray-300">|</span><span>{email}</span></>}
                        {school && <><span className="text-gray-300">|</span><span>{school}</span></>}
                        {major && <><span className="text-gray-300">|</span><span>{major}</span></>}
                        {!phone && !email && !school && (
                          <span className="text-gray-300 italic">联系方式将在此显示</span>
                        )}
                      </div>
                    </div>

                    {/* 技能标签 */}
                    {skillsList.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-bold text-[#1a1a1a] mb-3 pb-1.5 border-b-2 border-[#165DFF] inline-block">
                          专业技能
                        </h3>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {skillsList.map((s, i) => (
                            <span key={i} className="px-2.5 py-0.5 bg-[#165DFF]/6 text-[#165DFF] text-xs rounded-full font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 教育经历 */}
                    {resume?.sections?.education && resume.sections.education.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-bold text-[#1a1a1a] mb-3 pb-1.5 border-b-2 border-[#165DFF] inline-block">
                          教育经历
                        </h3>
                        {resume.sections.education.map((edu, i) => (
                          <div key={i} className="mt-3 pl-1">
                            <div className="flex justify-between items-baseline">
                              <span className="font-semibold text-sm text-[#1a1a1a]">{edu.school || ''}</span>
                              <span className="text-xs text-[#aaa]">{edu.time || ''}</span>
                            </div>
                            <p className="text-xs text-[#666] mt-0.5">
                              {edu.major}{edu.degree ? ` · ${edu.degree}` : ''}
                              {edu.gpa ? ` · GPA ${edu.gpa}` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 实习经历 */}
                    {resume?.sections?.experience && resume.sections.experience.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-bold text-[#1a1a1a] mb-3 pb-1.5 border-b-2 border-[#165DFF] inline-block">
                          实习经历
                        </h3>
                        {resume.sections.experience.map((exp, i) => (
                          <div key={i} className="mt-3 pl-1">
                            <div className="flex justify-between items-baseline">
                              <span className="font-semibold text-sm text-[#1a1a1a]">{exp.company || ''}</span>
                              <span className="text-xs text-[#aaa]">{exp.time || ''}</span>
                            </div>
                            <p className="text-xs text-[#555] mt-0.5 font-medium">{exp.role || ''}</p>
                            {exp.description && (
                              <ul className="mt-2 space-y-1">
                                {exp.description.map((d, j) => (
                                  <li key={j} className="text-xs text-[#555] leading-relaxed pl-3.5 relative before:content-['▸'] before:absolute before:left-0 before:text-[#165DFF] before:text-[10px] before:top-0.5">
                                    {d}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 项目经历 */}
                    {resume?.sections?.projects && resume.sections.projects.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-bold text-[#1a1a1a] mb-3 pb-1.5 border-b-2 border-[#165DFF] inline-block">
                          项目经历
                        </h3>
                        {resume.sections.projects.map((proj, i) => (
                          <div key={i} className="mt-3 pl-1">
                            <div className="flex justify-between items-baseline">
                              <span className="font-semibold text-sm text-[#1a1a1a]">{proj.company || ''}</span>
                              <span className="text-xs text-[#aaa]">{proj.time || ''}</span>
                            </div>
                            <p className="text-xs text-[#555] mt-0.5 font-medium">{proj.role || ''}</p>
                            {proj.description && (
                              <ul className="mt-2 space-y-1">
                                {proj.description.map((d, j) => (
                                  <li key={j} className="text-xs text-[#555] leading-relaxed pl-3.5 relative before:content-['▸'] before:absolute before:left-0 before:text-[#165DFF] before:text-[10px] before:top-0.5">
                                    {d}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 正文内容 */}
                    {content && (
                      <div className="mb-6">
                        <h3 className="text-sm font-bold text-[#1a1a1a] mb-3 pb-1.5 border-b-2 border-[#165DFF] inline-block">
                          补充信息
                        </h3>
                        <div className="text-xs text-[#555] leading-relaxed whitespace-pre-wrap mt-2">
                          {content}
                        </div>
                      </div>
                    )}

                    {/* 空状态 */}
                    {skillsList.length === 0 && !resume?.sections?.education?.length && !resume?.sections?.experience?.length && !resume?.sections?.projects?.length && !content && (
                      <div className="flex flex-col items-center justify-center py-24 text-[#ddd]">
                        <FileText className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-sm">在左侧填写信息，这里会实时预览</p>
                        <p className="text-xs mt-1 opacity-60">支持基本信息、技能、经历等模块</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
