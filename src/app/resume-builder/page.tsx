'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, FileText, Eye, MessageCircle, ArrowRight, History, Save, CheckCircle2, AlertCircle, Download, X, Target, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

// 简历结构化字段
interface ResumeSections {
  basic: { name: string; phone: string; email: string; school: string; major: string; graduation: string };
  education: Array<{ school: string; degree: string; major: string; time: string; gpa?: string }>;
  experience: Array<{ company: string; role: string; time: string; description: string[] }>;
  projects: Array<{ name: string; role: string; time: string; description: string[] }>;
  skills: string[];
}

const emptyResume: ResumeSections = {
  basic: { name: '', phone: '', email: '', school: '', major: '', graduation: '' },
  education: [],
  experience: [],
  projects: [],
  skills: [],
};

export default function ResumeBuilderPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [resume, setResume] = useState<ResumeSections>(emptyResume);
  const [activeTab, setActiveTab] = useState<'chat' | 'preview'>('preview');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [_resumeId, setResumeId] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const resumeRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const [scoreSuggestions, setScoreSuggestions] = useState<string[]>([]);

  // ===== P2.3 技能匹配状态 =====
  const [showSkillMatch, setShowSkillMatch] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [skillMatchResult, setSkillMatchResult] = useState<{required:string[];matched:string[];missing:string[];match_rate:number} | null>(null);
  const [isSkillMatching, setIsSkillMatching] = useState(false);
  const [skillMatchError, setSkillMatchError] = useState('');

  // ===== P4 能力翻译状态 =====
  const [showTranslate, setShowTranslate] = useState(false);
  const [translateInput, setTranslateInput] = useState('');
  const [targetIndustry, setTargetIndustry] = useState('');
  const [translateResult, setTranslateResult] = useState<{original:string;translated:string;gaps:string[]} | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState('');

  // 按关键词匹配评分建议到对应section
  const getSectionSuggestions = useCallback((section: string): string[] => {
    const keywordMap: Record<string, string[]> = {
      education: ['教育', '学校', '专业', '学历', '学位', '毕业'],
      experience: ['经历', '实习', '工作', '经验'],
      projects: ['项目', '项目经验', '项目经历'],
      skills: ['技能', '技术', '工具', '语言', '证书'],
    };
    const keywords = keywordMap[section] || [];
    return scoreSuggestions.filter(s => keywords.some(kw => s.includes(kw)));
  }, [scoreSuggestions]);

  useEffect(() => {
    if (!loading && !user) router.push('/auth');
  }, [user, loading, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 自动加载已保存的简历
  useEffect(() => {
    if (!user) return;
    fetch(`/api/user/resume?userId=${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.resume?.data) {
          setResume(prev => ({ ...prev, ...data.resume.data }));
        }
        if (data.resume?.id) setResumeId(data.resume.id);
      })
      .catch(() => {});
  }, [user]);

  // 获取最新评分建议
  useEffect(() => {
    if (!user) return;
    fetch('/api/resume/score/history?limit=1', {
      headers: { 'x-user-id': user.id }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.records?.length > 0) {
          const latest = data.data.records[0];
          if (latest.improvements?.length > 0) {
            setScoreSuggestions(latest.improvements);
          }
        }
      })
      .catch(() => {});
  }, [user]);

  // 处理 focus 参数滚动到对应区域
  useEffect(() => {
    const focus = searchParams.get('focus');
    if (focus && resumeRef.current) {
      setTimeout(() => {
        resumeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
  }, [searchParams]);

  // 保存简历
  const handleSave = async () => {
    if (!user) return;
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/user/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, title: '我的简历', data: resume }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.id) setResumeId(data.id);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // 导出 PDF（动态导入重型库 html2canvas + jsPDF，按需加载 ~500KB）
  const handleExportPDF = async () => {
    if (!resumeRef.current) return;
    setSaveStatus('saving');
    try {
      const [html2canvasMod, jsPDFMod] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const html2canvas = html2canvasMod.default;
      const { jsPDF } = jsPDFMod;
      const canvas = await html2canvas(resumeRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 10;
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - 20);
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - 20);
      }
      
      pdf.save(`简历_${resume.basic.name || '未命名'}.pdf`);
      setSaveStatus('idle');
    } catch {
      setSaveStatus('idle');
    }
  };

  // 从 AI 回复中提取结构化简历数据
  const extractResumeData = useCallback((content: string) => {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
    if (!jsonMatch) return;
    try {
      const data = JSON.parse(jsonMatch[1]!)!;
      if (data.resume) {
        setResume(prev => ({ ...prev, ...data.resume }));
      }
    } catch { /* 不是有效的 JSON，忽略 */ }
  }, []);

  // ===== P2.3 技能匹配 =====
  const handleSkillMatch = async () => {
    if (!jobTitle.trim() || !user) return;
    setIsSkillMatching(true);
    setSkillMatchError('');
    setSkillMatchResult(null);
    try {
      const res = await fetch(`/api/skill-tags/match?job_description=${encodeURIComponent(jobTitle.trim())}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '请求失败');
      }
      const data = await res.json();
      if (data.success && data.data) {
        setSkillMatchResult(data.data);
      } else {
        throw new Error(data.error || '数据异常');
      }
    } catch (err) {
      setSkillMatchError(err instanceof Error ? err.message : '技能匹配失败');
    } finally {
      setIsSkillMatching(false);
    }
  };

  const handleAddMissingSkill = async (skillName: string) => {
    if (!user) return;
    try {
      const tagRes = await fetch(`/api/skill-tags?search=${encodeURIComponent(skillName)}`);
      const tagData = await tagRes.json();
      if (!tagData.success || !tagData.data || tagData.data.length === 0) return;
      const skillId = tagData.data[0].id;

      const userSkillRes = await fetch('/api/user/skill-tags');
      const userSkillData = await userSkillRes.json();
      const existingIds: number[] = (userSkillData.success ? userSkillData.data || [] : []).map(
        (s: { skill_id: number }) => s.skill_id
      );

      const allIds = [...new Set([...existingIds, skillId])];
      await fetch('/api/user/skill-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill_ids: allIds }),
      });

      setSkillMatchResult(prev => {
        if (!prev) return prev;
        const newMatched = [...prev.matched, skillName];
        return {
          ...prev,
          matched: newMatched,
          missing: prev.missing.filter(s => s !== skillName),
          match_rate: Math.round((newMatched.length / prev.required.length) * 100),
        };
      });
    } catch {
      console.error('添加技能失败');
    }
  };

  // ===== P4 能力翻译 =====
  const handleTranslate = async () => {
    if (!translateInput.trim() || !user) return;
    setIsTranslating(true);
    setTranslateError('');
    setTranslateResult(null);
    try {
      const res = await fetch('/api/resume/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experience: translateInput.trim(),
          target_industry: targetIndustry || undefined,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '请求失败');
      }
      const data = await res.json();
      if (data.success && data.data) {
        setTranslateResult(data.data);
      } else {
        throw new Error(data.error || '数据异常');
      }
    } catch (err) {
      setTranslateError(err instanceof Error ? err.message : '翻译失败');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleReplaceExperience = () => {
    if (!translateResult) return;
    setResume(prev => {
      const newExp = [...prev.experience];
      if (newExp.length === 0) return prev;
      const lines = translateResult.translated.split('\n').filter(Boolean);
      newExp[0] = { ...newExp[0], description: lines };
      return { ...prev, experience: newExp };
    });
    setShowTranslate(false);
  };
    const handleSend = async () => {
    if (!input.trim() || isStreaming || !user) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsStreaming(true);
    
    abortRef.current = new AbortController();
    let fullResponse = '';
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          message: userMsg,
          botType: 'resume',
          history: messages,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error('请求失败');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            last.content = fullResponse;
          } else {
            updated.push({ role: 'assistant', content: fullResponse });
          }
          return updated;
        });
      }
      
      extractResumeData(fullResponse);
    } catch (err: unknown) {
      const _err_ = err as Error;
      if (_err_.name !== 'AbortError') {
        setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，出了点问题，请重试。' }]);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  if (!user) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="h-14 bg-white border-b flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-blue-600 font-bold text-lg">职途星</Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-700 font-medium">简历创作助手</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleSave} disabled={saveStatus === 'saving'}>
            {saveStatus === 'saving' ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> 保存中</>
            ) : saveStatus === 'saved' ? (
              <><CheckCircle2 className="h-4 w-4 mr-1 text-green-500" /> 已保存</>
            ) : saveStatus === 'error' ? (
              <><AlertCircle className="h-4 w-4 mr-1 text-red-500" /> 保存失败</>
            ) : (
              <><Save className="h-4 w-4 mr-1" /> 保存</>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportPDF} disabled={saveStatus === 'saving'}>
            <Download className="h-4 w-4 mr-1" /> 导出PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setResume(emptyResume)}>
            <History className="h-4 w-4 mr-1" /> 清空简历
          </Button>
          <Dialog open={showSkillMatch} onOpenChange={setShowSkillMatch}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Target className="h-4 w-4 mr-1" /> 技能匹配
              </Button>
            </DialogTrigger>
          </Dialog>
          <Dialog open={showTranslate} onOpenChange={setShowTranslate}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Sparkles className="h-4 w-4 mr-1" /> 能力翻译
              </Button>
            </DialogTrigger>
          </Dialog>
          <Link href="/assistant?botType=interview">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              模拟面试 <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </header>

      {/* 主内容区：双栏 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左栏：对话 */}
        <div className="w-[45%] min-w-[400px] border-r bg-white flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-12">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-blue-300" />
                <p className="text-lg font-medium mb-2">我是小职，帮你写简历～</p>
                <p className="text-sm">告诉我你的教育背景、项目经历、实习经验</p>
                <p className="text-sm">我会一边聊一边帮你填好简历</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {isStreaming && messages[messages.length - 1]?.role === 'assistant' && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-xl px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* 输入区 */}
          <div className="border-t p-3">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="说说你的经历，比如「我在校学生会做过部长」..."
                className="min-h-[44px] max-h-[120px] resize-none text-sm"
                rows={1}
                disabled={isStreaming}
              />
              <Button 
                onClick={handleSend} 
                disabled={!input.trim() || isStreaming}
                size="icon"
                className="shrink-0 bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 右栏：简历预览 */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="max-w-[700px] mx-auto" ref={resumeRef}>
            <Card className="shadow-sm">
              <CardContent className="p-8">
                {/* 基本信息 */}
                {resume.basic.name && (
                  <div className="text-center mb-6">
                    {scoreSuggestions.length > 0 && (
                      <div className="mb-4 p-3 bg-blue-50/80 border border-blue-100 rounded-lg text-xs text-blue-700 leading-relaxed">
                        {scoreSuggestions.map((s, i) => (
                          <div key={i} className="flex items-start gap-1.5 mb-1 last:mb-0">
                            <span>💡</span>
                            <span>评分建议：{s}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{resume.basic.name || '姓名'}</h1>
                    <div className="text-sm text-gray-500 space-x-3">
                      {resume.basic.phone && <span>📱 {resume.basic.phone}</span>}
                      {resume.basic.email && <span>📧 {resume.basic.email}</span>}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {resume.basic.school && <span>{resume.basic.school}</span>}
                      {resume.basic.major && <span> · {resume.basic.major}</span>}
                      {resume.basic.graduation && <span> · {resume.basic.graduation}届</span>}
                    </div>
                  </div>
                )}

                {/* 教育经历 */}
                {resume.education.length > 0 && (
                  <Section title="教育经历">
                    {getSectionSuggestions('education').length > 0 && (
                      <div className="mb-3 p-3 bg-blue-50/80 border border-blue-100 rounded-lg text-xs text-blue-700 leading-relaxed">
                        {getSectionSuggestions('education').map((s, i) => (
                          <div key={i} className="flex items-start gap-1.5 mb-1 last:mb-0">
                            <span>💡</span>
                            <span>评分建议：{s}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {resume.education.map((edu, i) => (
                      <div key={i} className="mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{edu.school}</span>
                          <span className="text-gray-500">{edu.time}</span>
                        </div>
                        <div className="text-sm text-gray-600">{edu.major} · {edu.degree}</div>
                        {edu.gpa && <div className="text-xs text-gray-400">GPA: {edu.gpa}</div>}
                      </div>
                    ))}
                  </Section>
                )}

                {/* 实习/工作经历 */}
                {resume.experience.length > 0 && (
                  <Section title="实习经历">
                    {getSectionSuggestions('experience').length > 0 && (
                      <div className="mb-3 p-3 bg-blue-50/80 border border-blue-100 rounded-lg text-xs text-blue-700 leading-relaxed">
                        {getSectionSuggestions('experience').map((s, i) => (
                          <div key={i} className="flex items-start gap-1.5 mb-1 last:mb-0">
                            <span>💡</span>
                            <span>评分建议：{s}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {resume.experience.map((exp, i) => (
                      <div key={i} className="mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{exp.company} · {exp.role}</span>
                          <span className="text-gray-500">{exp.time}</span>
                        </div>
                        <ul className="mt-1 list-disc list-inside text-sm text-gray-700 space-y-0.5">
                          {exp.description.map((desc, j) => (
                            <li key={j}>{desc}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </Section>
                )}

                {/* 项目经历 */}
                {resume.projects.length > 0 && (
                  <Section title="项目经历">
                    {getSectionSuggestions('projects').length > 0 && (
                      <div className="mb-3 p-3 bg-blue-50/80 border border-blue-100 rounded-lg text-xs text-blue-700 leading-relaxed">
                        {getSectionSuggestions('projects').map((s, i) => (
                          <div key={i} className="flex items-start gap-1.5 mb-1 last:mb-0">
                            <span>💡</span>
                            <span>评分建议：{s}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {resume.projects.map((proj, i) => (
                      <div key={i} className="mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{proj.name} · {proj.role}</span>
                          <span className="text-gray-500">{proj.time}</span>
                        </div>
                        <ul className="mt-1 list-disc list-inside text-sm text-gray-700 space-y-0.5">
                          {proj.description.map((desc, j) => (
                            <li key={j}>{desc}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </Section>
                )}

                {/* 技能 */}
                {resume.skills.length > 0 && (
                  <Section title="专业技能">
                    {getSectionSuggestions('skills').length > 0 && (
                      <div className="mb-3 p-3 bg-blue-50/80 border border-blue-100 rounded-lg text-xs text-blue-700 leading-relaxed">
                        {getSectionSuggestions('skills').map((s, i) => (
                          <div key={i} className="flex items-start gap-1.5 mb-1 last:mb-0">
                            <span>💡</span>
                            <span>评分建议：{s}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {resume.skills.map((skill, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                {/* 空白状态 */}
                {!resume.basic.name && resume.education.length === 0 && resume.experience.length === 0 && (
                  <div className="text-center text-gray-300 py-16">
                    <FileText className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-lg">简历预览区</p>
                    <p className="text-sm mt-1">在左侧和小职聊聊，简历会实时生成</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* P2.3 技能匹配弹窗 */}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            技能匹配度分析
          </DialogTitle>
          <DialogClose className="absolute right-4 top-4">
            <X className="h-4 w-4" />
          </DialogClose>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="输入目标岗位，如「HR实习生」"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSkillMatch()}
            />
            <Button onClick={handleSkillMatch} disabled={isSkillMatching || !jobTitle.trim()}>
              {isSkillMatching ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> 分析中</>
              ) : '查询匹配'}
            </Button>
          </div>
          {skillMatchError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{skillMatchError}</div>
          )}
          {skillMatchResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">匹配度</span>
                <span className={`text-lg font-bold ${
                  skillMatchResult.match_rate >= 70 ? 'text-green-600' :
                  skillMatchResult.match_rate >= 40 ? 'text-yellow-600' : 'text-red-600'
                }`}>{skillMatchResult.match_rate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full ${
                  skillMatchResult.match_rate >= 70 ? 'bg-green-500' :
                  skillMatchResult.match_rate >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                }`} style={{width: `${skillMatchResult.match_rate}%`}} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">已具备的技能（{skillMatchResult.matched.length}项）</p>
                <div className="flex flex-wrap gap-1.5">
                  {skillMatchResult.matched.map((s, i) => (
                    <Badge key={i} variant="secondary" className="bg-green-50 text-green-700 border-green-200">{s}</Badge>
                  ))}
                  {skillMatchResult.matched.length === 0 && <span className="text-xs text-gray-400">暂无</span>}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">待补充的技能（{skillMatchResult.missing.length}项）</p>
                <div className="flex flex-wrap gap-1.5">
                  {skillMatchResult.missing.map((s, i) => (
                    <Badge key={i} variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                      {s}
                      <button
                        onClick={() => handleAddMissingSkill(s)}
                        className="ml-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >添加</button>
                    </Badge>
                  ))}
                  {skillMatchResult.missing.length === 0 && <span className="text-xs text-gray-400">完美匹配！</span>}
                </div>
              </div>
              {skillMatchResult.missing.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">点击「添加」可将缺失技能一键加入你的技能清单</p>
              )}
            </div>
          )}
          {!skillMatchResult && !isSkillMatching && !skillMatchError && (
            <div className="text-center text-gray-400 py-8">
              <Target className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">输入目标岗位，查看你的技能匹配度</p>
            </div>
          )}
        </div>
      </DialogContent>

      {/* P4 能力翻译词典弹窗 */}
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            能力翻译 · 口语→专业简历用语
          </DialogTitle>
          <DialogClose className="absolute right-4 top-4">
            <X className="h-4 w-4" />
          </DialogClose>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">你的口语化经历描述</label>
            <Textarea
              placeholder="用你自己的话说说这段经历，比如「我在学生会组织过活动，负责宣传和协调，效果还不错」..."
              value={translateInput}
              onChange={(e) => setTranslateInput(e.target.value)}
              className="min-h-[100px] text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">目标行业（可选）</label>
            <Input
              placeholder="如：互联网、金融、快消、新能源..."
              value={targetIndustry}
              onChange={(e) => setTargetIndustry(e.target.value)}
            />
          </div>
          <Button
            onClick={handleTranslate}
            disabled={isTranslating || !translateInput.trim()}
            className="w-full"
          >
            {isTranslating ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> 翻译中...</>
            ) : '翻译为专业简历用语'}
          </Button>
          {translateError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{translateError}</div>
          )}
          {translateResult && (
            <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
              <div>
                <p className="text-xs text-gray-400 mb-1">原始描述</p>
                <p className="text-sm text-gray-600 bg-white p-2 rounded border">{translateResult.original}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">专业简历描述</p>
                <div className="text-sm text-gray-800 bg-white p-2 rounded border whitespace-pre-wrap">
                  {translateResult.translated}
                </div>
              </div>
              {translateResult.gaps.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">建议补充突出</p>
                  <div className="flex flex-wrap gap-1">
                    {translateResult.gaps.map((g, i) => (
                      <Badge key={i} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{g}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setShowTranslate(false); }}>
                  关闭
                </Button>
                <Button size="sm" onClick={handleReplaceExperience}>
                  替换当前经历描述
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* 移动端标签切换 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex">
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-center text-sm ${activeTab === 'chat' ? 'text-blue-600 border-t-2 border-blue-600' : 'text-gray-500'}`}
        >
          <MessageCircle className="h-4 w-4 inline mr-1" /> 对话
        </button>
        <button 
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-3 text-center text-sm ${activeTab === 'preview' ? 'text-blue-600 border-t-2 border-blue-600' : 'text-gray-500'}`}
        >
          <Eye className="h-4 w-4 inline mr-1" /> 简历预览
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-bold text-gray-900 border-b-2 border-blue-500 pb-1 mb-3">{title}</h2>
      {children}
    </div>
  );
}

