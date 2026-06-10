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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-white gap-4">
        <FileText className="h-16 w-16 text-gray-300" />
        <p className="text-gray-500">简历不存在或已被删除</p>
        <Link href="/resume-builder">
          <Button>创建新简历</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-blue-100">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/resume-builder">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                返回
              </Button>
            </Link>
            <h1 className="font-semibold text-gray-800">编辑简历</h1>
            {resume.is_default && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">默认</Badge>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : saveStatus === 'saved' ? (
              <CheckCircle2 className="h-4 w-4 mr-1" />
            ) : saveStatus === 'error' ? (
              <AlertCircle className="h-4 w-4 mr-1" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {saveStatus === 'saved' ? '已保存' : saveStatus === 'error' ? '保存失败' : '保存'}
          </Button>
        </div>
      </div>

      {/* 编辑区域 */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 简历名称 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">简历名称</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={resumeName}
              onChange={e => setResumeName(e.target.value)}
              placeholder="例如：校招版、实习版"
            />
          </CardContent>
        </Card>

        {/* 基本信息 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">基本信息</CardTitle>
            <CardDescription>HR首先看到的内容，请认真填写</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">姓名</label>
              <Input value={basicName} onChange={e => setBasicName(e.target.value)} placeholder="你的姓名" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">手机</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="手机号" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">邮箱</label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="邮箱地址" type="email" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">学校</label>
              <Input value={school} onChange={e => setSchool(e.target.value)} placeholder="学校名称" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">专业</label>
              <Input value={major} onChange={e => setMajor(e.target.value)} placeholder="专业名称" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">毕业时间</label>
              <Input value={graduation} onChange={e => setGraduation(e.target.value)} placeholder="如：2027年7月" />
            </div>
          </CardContent>
        </Card>

        {/* 技能标签 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">技能标签</CardTitle>
            <CardDescription>用顿号或逗号分隔，如：Python、SQL、数据分析</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              value={skillsText}
              onChange={e => setSkillsText(e.target.value)}
              placeholder="Python、SQL、Excel、团队协作"
            />
            {skillsText && (
              <div className="flex flex-wrap gap-2 mt-3">
                {skillsText.split(/[、,，]/).filter(Boolean).map((s, i) => (
                  <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-700">
                    {s.trim()}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 自由编辑区 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">简历正文</CardTitle>
            <CardDescription>
              完整简历文本。如需结构化编辑（教育经历、项目经历等），请前往
              <Link href="/resume-builder" className="text-blue-600 hover:underline ml-1">
                对话式简历编辑器
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="在此编辑简历内容..."
              className="min-h-[300px] font-mono text-sm"
            />
          </CardContent>
        </Card>

        {/* 页面底部提示 */}
        <div className="text-center text-sm text-gray-400 pb-8">
          需要深度编辑？前往
          <Link href="/resume-builder" className="text-blue-600 hover:underline mx-1">
            对话式简历编辑器
          </Link>
          让小职帮你写
        </div>
      </div>
    </div>
  );
}
