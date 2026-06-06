'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, ArrowLeft, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
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

  // 表单状态
  const [resumeName, setResumeName] = useState('');
  const [content, setContent] = useState('');
  const [basicName, setBasicName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [major, setMajor] = useState('');
  const [graduation, setGraduation] = useState('');
  const [skillsText, setSkillsText] = useState('');

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
            setSkillsText(r.sections.skills.join('、'));
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
        skills: skillsText.split(/[、,，]/).map(s => s.trim()).filter(Boolean),
      };

      const res = await fetch(`/api/resume/${resumeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: resumeName, content, sections }),
      });
      const json = await res.json();
      if (json.success) {
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
  }, [resumeName, content, basicName, phone, email, school, major, graduation, skillsText, resumeId, resume]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }


  if (!resume) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-blue-50/30 gap-4">
        <FileText className="h-16 w-16 text-gray-300" />
        <p className="text-gray-500">简历不存在或已被删除</p>
        <Link href="/resume-builder">
          <Button className="bg-[#165DFF] hover:bg-[#165DFF]/90">创建新简历</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50/30">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/resume-builder">
              <Button variant="ghost" size="sm" className="text-[#666] hover:text-[#1a1a1a]">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                返回
              </Button>
            </Link>
            <div className="h-5 w-px bg-gray-200" />
            <h1 className="font-semibold text-[#1a1a1a] text-sm">编辑简历</h1>
            {resume.is_default && (
              <Badge variant="secondary" className="bg-[#165DFF]/10 text-[#165DFF] border-0 text-xs">
                默认
              </Badge>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="bg-[#165DFF] hover:bg-[#165DFF]/90 text-white"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : saveStatus === 'saved' ? (
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
            ) : saveStatus === 'error' ? (
              <AlertCircle className="h-4 w-4 mr-1.5" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            {saveStatus === 'saved' ? '已保存' : saveStatus === 'error' ? '失败' : '保存'}
          </Button>
        </div>
      </header>

      {/* 主编辑区：左表单 + 右预览 */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* ========== 左侧表单 (40%) ========== */}
          <div className="w-[42%] shrink-0 space-y-4">
            {/* 简历名称 */}
            <Card className="shadow-sm border-0">
              <CardContent className="p-4">
                <label className="text-xs font-medium text-[#999] mb-2 block">简历名称</label>
                <Input
                  value={resumeName}
                  onChange={e => setResumeName(e.target.value)}
                  placeholder="例如：校招版、实习版"
                  className="border-gray-200 focus:border-[#165DFF] focus:ring-[#165DFF]/20"
                />
              </CardContent>
            </Card>

            {/* 基本信息 */}
            <Card className="shadow-sm border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-[#1a1a1a]">基本信息</CardTitle>
                <CardDescription className="text-xs">HR 最先看到的内容</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {[
                  { label: '姓名', key: 'name', value: basicName, setter: setBasicName, placeholder: '你的姓名' },
                  { label: '手机', key: 'phone', value: phone, setter: setPhone, placeholder: '手机号' },
                  { label: '邮箱', key: 'email', value: email, setter: setEmail, placeholder: '邮箱地址' },
                  { label: '学校', key: 'school', value: school, setter: setSchool, placeholder: '学校名称' },
                  { label: '专业', key: 'major', value: major, setter: setMajor, placeholder: '专业名称' },
                  { label: '毕业时间', key: 'graduation', value: graduation, setter: setGraduation, placeholder: '如：2027年7月' },
                ].map((field) => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-xs text-[#999]">{field.label}</label>
                    <Input
                      value={field.value}
                      onChange={e => field.setter(e.target.value)}
                      placeholder={field.placeholder}
                      className="h-9 text-sm border-gray-200 focus:border-[#165DFF] focus:ring-[#165DFF]/20"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 技能标签 */}
            <Card className="shadow-sm border-0">
              <CardContent className="p-4 space-y-2">
                <label className="text-xs font-medium text-[#999] block">技能标签</label>
                <Input
                  value={skillsText}
                  onChange={e => setSkillsText(e.target.value)}
                  placeholder="Python、SQL、Excel、团队协作"
                  className="border-gray-200 focus:border-[#165DFF] focus:ring-[#165DFF]/20"
                />
                {skillsText && (
                  <div className="flex flex-wrap gap-1.5">
                    {skillsText.split(/[、,，]/).filter(Boolean).map((s, i) => (
                      <Badge key={i} variant="secondary" className="bg-[#165DFF]/5 text-[#165DFF] border-0 text-xs font-normal">
                        {s.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 简历正文 */}
            <Card className="shadow-sm border-0">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#999]">简历正文</label>
                  <Link href="/resume-builder" className="text-xs text-[#165DFF] hover:underline">
                    让小职帮你写 →
                  </Link>
                </div>
                <Textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="在此编辑简历内容...&#10;&#10;可包含：教育经历、实习经历、项目经历、获奖情况等"
                  className="min-h-[200px] text-sm leading-relaxed border-gray-200 focus:border-[#165DFF] focus:ring-[#165DFF]/20 resize-y"
                />
              </CardContent>
            </Card>
          </div>

          {/* ========== 右侧预览 (58%) ========== */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* 模板选择器 */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs text-[#999] shrink-0">模板风格：</span>
              <div className="flex gap-1.5">
                {[
                  { id: 'simple', name: '简约', bg: 'bg-white', border: 'border-gray-200', text: 'text-[#1a1a1a]' },
                  { id: 'business', name: '商务', bg: 'bg-[#165DFF]/5', border: 'border-[#165DFF]/30', text: 'text-[#165DFF]' },
                  { id: 'modern', name: '现代', bg: 'bg-gradient-to-r from-[#165DFF]/10 to-blue-50', border: 'border-[#165DFF]/20', text: 'text-[#165DFF]' },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      resume.template_id === tpl.id || (!resume.template_id && tpl.id === 'simple')
                        ? `${tpl.bg} ${tpl.border} ${tpl.text}`
                        : 'border-gray-200 text-[#999] hover:border-[#165DFF]/30 hover:text-[#165DFF]'
                    }`}
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
            </div>

            {/* A4 预览 */}
            <div className="sticky top-20">
              <Card className="shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-[#f5f5f5] p-6 flex items-center justify-center">
                  <div className="bg-white shadow-md" style={{ width: '210mm', maxWidth: '100%', minHeight: '297mm', padding: '20mm', fontFamily: 'PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif' }}>
                    {/* 基本信息区 */}
                    <div className="text-center mb-8 pb-6 border-b border-gray-200">
                      <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">
                        {basicName || '姓名'}
                      </h2>
                      <div className="flex items-center justify-center gap-4 text-sm text-[#666] flex-wrap">
                        {phone && <span>{phone}</span>}
                        {email && (
                          <>
                            {phone && <span className="text-gray-300">|</span>}
                            <span>{email}</span>
                          </>
                        )}
                        {school && (
                          <>
                            {(phone || email) && <span className="text-gray-300">|</span>}
                            <span>{school}</span>
                          </>
                        )}
                        {!phone && !email && !school && (
                          <span className="text-gray-400">联系方式将在此显示</span>
                        )}
                      </div>
                    </div>

                    {/* 技能标签 */}
                    {skillsText && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-[#1a1a1a] mb-2 pb-1 border-b-2 border-[#165DFF] inline-block">
                          专业技能
                        </h3>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {skillsText.split(/[、,，]/).filter(Boolean).map((s, i) => (
                            <span key={i} className="px-2 py-0.5 bg-[#165DFF]/5 text-[#165DFF] text-xs rounded">
                              {s.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 教育经历 */}
                    {resume?.sections?.education && resume.sections.education.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-[#1a1a1a] mb-2 pb-1 border-b-2 border-[#165DFF] inline-block">
                          教育经历
                        </h3>
                        {resume.sections.education.map((edu, i) => (
                          <div key={i} className="mt-2 pl-1">
                            <div className="flex justify-between items-baseline">
                              <span className="font-medium text-sm text-[#1a1a1a]">{edu.school || ''}</span>
                              <span className="text-xs text-[#999]">{edu.time || ''}</span>
                            </div>
                            <p className="text-xs text-[#666] mt-0.5">
                              {edu.major}{edu.degree ? ` · ${edu.degree}` : ''}
                              {edu.gpa ? ` · GPA ${edu.gpa}` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 实习/工作经历 */}
                    {resume?.sections?.experience && resume.sections.experience.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-[#1a1a1a] mb-2 pb-1 border-b-2 border-[#165DFF] inline-block">
                          实习经历
                        </h3>
                        {resume.sections.experience.map((exp, i) => (
                          <div key={i} className="mt-2 pl-1">
                            <div className="flex justify-between items-baseline">
                              <span className="font-medium text-sm text-[#1a1a1a]">{exp.company || ''}</span>
                              <span className="text-xs text-[#999]">{exp.time || ''}</span>
                            </div>
                            <p className="text-xs text-[#666] mt-0.5">{exp.role || ''}</p>
                            {exp.description && (
                              <ul className="mt-1.5 space-y-0.5">
                                {exp.description.map((d, j) => (
                                  <li key={j} className="text-xs text-[#555] leading-relaxed pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-[#165DFF]">
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
                        <h3 className="text-sm font-semibold text-[#1a1a1a] mb-2 pb-1 border-b-2 border-[#165DFF] inline-block">
                          项目经历
                        </h3>
                        {resume.sections.projects.map((proj, i) => (
                          <div key={i} className="mt-2 pl-1">
                            <div className="flex justify-between items-baseline">
                              <span className="font-medium text-sm text-[#1a1a1a]">{proj.company || ''}</span>
                              <span className="text-xs text-[#999]">{proj.time || ''}</span>
                            </div>
                            <p className="text-xs text-[#666] mt-0.5">{proj.role || ''}</p>
                            {proj.description && (
                              <ul className="mt-1.5 space-y-0.5">
                                {proj.description.map((d, j) => (
                                  <li key={j} className="text-xs text-[#555] leading-relaxed pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-[#165DFF]">
                                    {d}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 正文内容（自由文本） */}
                    {content && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-[#1a1a1a] mb-2 pb-1 border-b-2 border-[#165DFF] inline-block">
                          其他信息
                        </h3>
                        <div className="text-xs text-[#555] leading-relaxed whitespace-pre-wrap mt-2">
                          {content}
                        </div>
                      </div>
                    )}

                    {/* 空状态提示 */}
                    {!skillsText && !resume?.sections?.education?.length && !resume?.sections?.experience?.length && !resume?.sections?.projects?.length && !content && (
                      <div className="flex flex-col items-center justify-center py-20 text-[#ccc]">
                        <FileText className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm">在左侧填写信息，这里会实时预览</p>
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
