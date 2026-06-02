'use client';

import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  User, GraduationCap, Briefcase, FolderGit2, Wrench, Award,
  Plus, Trash2, GripVertical, Eye, Sparkles, Save, FileDown,
  ChevronRight, ChevronDown, X, MessageCircle, Bot, Send,
} from 'lucide-react';
import {
  Resume, ResumeBasicInfo, ResumeEducation, ResumeExperience,
  ResumeProject, ResumeSkill, ResumeCertification,
  createEmptyResume, uid, SKILL_LEVEL_LABELS, DEGREE_OPTIONS,
} from '@/types/resume';

/* ─── 基本避免重复渲染 ─── */
type SectionKey = 'basic' | 'education' | 'experience' | 'projects' | 'skills' | 'certifications';

const SECTION_TABS: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
  { key: 'basic', label: '基本信息', icon: <User className="w-4 h-4" /> },
  { key: 'education', label: '教育经历', icon: <GraduationCap className="w-4 h-4" /> },
  { key: 'experience', label: '工作经历', icon: <Briefcase className="w-4 h-4" /> },
  { key: 'projects', label: '项目经历', icon: <FolderGit2 className="w-4 h-4" /> },
  { key: 'skills', label: '技能证书', icon: <Wrench className="w-4 h-4" /> },
];

/* ─── 编辑区：基本信息 ─── */
function BasicInfoEditor({ data, onChange }: {
  data: ResumeBasicInfo; onChange: (d: ResumeBasicInfo) => void;
}) {
  const set = (field: keyof ResumeBasicInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...data, [field]: e.target.value });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>姓名</Label>
          <Input value={data.name} onChange={set('name')} placeholder="你的姓名" />
        </div>
        <div className="space-y-2">
          <Label>求职意向</Label>
          <Input value={data.title} onChange={set('title')} placeholder="如：前端开发工程师" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>邮箱</Label>
          <Input value={data.email} onChange={set('email')} placeholder="email@example.com" />
        </div>
        <div className="space-y-2">
          <Label>电话</Label>
          <Input value={data.phone} onChange={set('phone')} placeholder="手机号" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>所在地</Label>
        <Input value={data.location} onChange={set('location')} placeholder="城市" />
      </div>
      <div className="space-y-2">
        <Label>个人简介</Label>
        <Textarea value={data.summary} onChange={set('summary')} placeholder="简短介绍自己（2-3行）" rows={3} />
      </div>
    </div>
  );
}

/* ─── 编辑区：教育经历 ─── */
function EducationEditor({ items, onChange }: {
  items: ResumeEducation[]; onChange: (items: ResumeEducation[]) => void;
}) {
  const add = () => onChange([...items, { id: uid(), school: '', major: '', degree: '本科', startDate: '', endDate: '', description: '' }]);
  const remove = (id: string) => onChange(items.filter(i => i.id !== id));
  const update = (id: string, field: keyof ResumeEducation, value: string) =>
    onChange(items.map(i => i.id === id ? { ...i, [field]: value } : i));

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id} className="bg-white border border-[#E2E8F0]">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-[#64748B]">{item.school || '新教育经历'}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => remove(item.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">学校</Label>
                <Input value={item.school} onChange={e => update(item.id, 'school', e.target.value)} placeholder="学校名称" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">专业</Label>
                <Input value={item.major} onChange={e => update(item.id, 'major', e.target.value)} placeholder="专业名称" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">学历</Label>
                <Select value={item.degree} onValueChange={v => update(item.id, 'degree', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEGREE_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">开始</Label>
                <Input value={item.startDate} onChange={e => update(item.id, 'startDate', e.target.value)} placeholder="2021.09" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">结束</Label>
                <Input value={item.endDate} onChange={e => update(item.id, 'endDate', e.target.value)} placeholder="2025.06" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">描述（选填）</Label>
              <Textarea value={item.description || ''} onChange={e => update(item.id, 'description', e.target.value)} placeholder="GPA、荣誉等" rows={2} />
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" className="w-full border-dashed" onClick={add}>
        <Plus className="w-4 h-4 mr-2" />添加教育经历
      </Button>
    </div>
  );
}

/* ─── 编辑区：工作经历 ─── */
function ExperienceEditor({ items, onChange }: {
  items: ResumeExperience[]; onChange: (items: ResumeExperience[]) => void;
}) {
  const add = () => onChange([...items, { id: uid(), company: '', position: '', startDate: '', endDate: '', current: false, description: '', achievements: [] }]);
  const remove = (id: string) => onChange(items.filter(i => i.id !== id));
  const update = (id: string, field: keyof ResumeExperience, value: string | boolean | string[]) =>
    onChange(items.map(i => i.id === id ? { ...i, [field]: value } : i));

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id} className="bg-white border border-[#E2E8F0]">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-[#64748B]">{item.company || item.position || '新工作经历'}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => remove(item.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">公司</Label>
                <Input value={item.company} onChange={e => update(item.id, 'company', e.target.value)} placeholder="公司名称" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">职位</Label>
                <Input value={item.position} onChange={e => update(item.id, 'position', e.target.value)} placeholder="岗位名称" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">开始时间</Label>
                <Input value={item.startDate} onChange={e => update(item.id, 'startDate', e.target.value)} placeholder="2024.07" />
              </div>
              <div className="space-y-1 flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">结束时间</Label>
                  <Input value={item.endDate} onChange={e => update(item.id, 'endDate', e.target.value)} placeholder="2025.01" disabled={item.current} />
                </div>
                <div className="flex items-center gap-1 pb-1">
                  <input type="checkbox" checked={item.current} onChange={e => update(item.id, 'current', e.target.checked)} id={`current-${item.id}`} className="rounded" />
                  <label htmlFor={`current-${item.id}`} className="text-xs text-[#64748B] cursor-pointer">至今</label>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">工作描述</Label>
              <Textarea value={item.description} onChange={e => update(item.id, 'description', e.target.value)} placeholder="主要职责和成果" rows={3} />
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" className="w-full border-dashed" onClick={add}>
        <Plus className="w-4 h-4 mr-2" />添加工作经历
      </Button>
    </div>
  );
}

/* ─── 编辑区：项目经历 ─── */
function ProjectEditor({ items, onChange }: {
  items: ResumeProject[]; onChange: (items: ResumeProject[]) => void;
}) {
  const add = () => onChange([...items, { id: uid(), name: '', role: '', startDate: '', endDate: '', description: '', technologies: [] }]);
  const remove = (id: string) => onChange(items.filter(i => i.id !== id));
  const update = (id: string, field: keyof ResumeProject, value: string | string[]) =>
    onChange(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  const updateTechs = (id: string, raw: string) =>
    onChange(items.map(i => i.id === id ? { ...i, technologies: raw.split(',').map(t => t.trim()).filter(Boolean) } : i));

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id} className="bg-white border border-[#E2E8F0]">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-[#64748B]">{item.name || '新项目'}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => remove(item.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">项目名称</Label>
                <Input value={item.name} onChange={e => update(item.id, 'name', e.target.value)} placeholder="项目名称" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">担任角色</Label>
                <Input value={item.role} onChange={e => update(item.id, 'role', e.target.value)} placeholder="如：项目负责人" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">开始时间</Label>
                <Input value={item.startDate} onChange={e => update(item.id, 'startDate', e.target.value)} placeholder="2025.03" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">结束时间</Label>
                <Input value={item.endDate} onChange={e => update(item.id, 'endDate', e.target.value)} placeholder="2025.06" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">项目描述</Label>
              <Textarea value={item.description} onChange={e => update(item.id, 'description', e.target.value)} placeholder="项目内容、成果" rows={3} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">技术栈（逗号分隔）</Label>
              <Input value={item.technologies.join(', ')} onChange={e => updateTechs(item.id, e.target.value)} placeholder="React, TypeScript, Supabase" />
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" className="w-full border-dashed" onClick={add}>
        <Plus className="w-4 h-4 mr-2" />添加项目经历
      </Button>
    </div>
  );
}

/* ─── 编辑区：技能证书 ─── */
function SkillsEditor({ skills, certifications, onSkillsChange, onCertsChange }: {
  skills: ResumeSkill[]; certifications: ResumeCertification[];
  onSkillsChange: (s: ResumeSkill[]) => void; onCertsChange: (c: ResumeCertification[]) => void;
}) {
  const addSkill = () => onSkillsChange([...skills, { id: uid(), name: '', level: 'intermediate', category: '' }]);
  const removeSkill = (id: string) => onSkillsChange(skills.filter(s => s.id !== id));
  const updateSkill = (id: string, field: keyof ResumeSkill, value: string) =>
    onSkillsChange(skills.map(s => s.id === id ? { ...s, [field]: value } : s));

  const addCert = () => onCertsChange([...certifications, { id: uid(), name: '', issuer: '', date: '' }]);
  const removeCert = (id: string) => onCertsChange(certifications.filter(c => c.id !== id));
  const updateCert = (id: string, field: keyof ResumeCertification, value: string) =>
    onCertsChange(certifications.map(c => c.id === id ? { ...c, [field]: value } : c));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[#1E293B] mb-3">技能</h3>
        <div className="space-y-3">
          {skills.map(s => (
            <div key={s.id} className="flex items-center gap-2">
              <Input className="flex-1" value={s.name} onChange={e => updateSkill(s.id, 'name', e.target.value)} placeholder="技能名称" />
              <Select value={s.level} onValueChange={v => updateSkill(s.id, 'level', v)}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SKILL_LEVEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input className="w-24" value={s.category} onChange={e => updateSkill(s.id, 'category', e.target.value)} placeholder="分类" />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 shrink-0" onClick={() => removeSkill(s.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full border-dashed" onClick={addSkill}>
            <Plus className="w-3 h-3 mr-1" />添加技能
          </Button>
        </div>
      </div>
      <Separator />
      <div>
        <h3 className="text-sm font-semibold text-[#1E293B] mb-3">证书</h3>
        <div className="space-y-3">
          {certifications.map(c => (
            <Card key={c.id} className="bg-white border border-[#E2E8F0]">
              <CardContent className="p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-[#64748B]">{c.name || '新证书'}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => removeCert(c.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input size={1} value={c.name} onChange={e => updateCert(c.id, 'name', e.target.value)} placeholder="证书名称" />
                  <Input size={1} value={c.issuer} onChange={e => updateCert(c.id, 'issuer', e.target.value)} placeholder="颁发机构" />
                  <Input size={1} value={c.date} onChange={e => updateCert(c.id, 'date', e.target.value)} placeholder="获得时间" />
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" size="sm" className="w-full border-dashed" onClick={addCert}>
            <Plus className="w-3 h-3 mr-1" />添加证书
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── 预览区：简历预览卡片 ─── */
function ResumePreview({ resume }: { resume: Resume }) {
  const { basic, education, experience, projects, skills, certifications } = resume;

  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-6 min-h-[600px] max-w-[800px] mx-auto">
      {/* 头部 */}
      <div className="text-center mb-6 pb-4 border-b border-[#E2E8F0]">
        <h2 className="text-2xl font-bold text-[#1E293B]">{basic.name || '你的姓名'}</h2>
        <p className="text-base text-[#3B82F6] font-medium mt-1">{basic.title || '求职意向'}</p>
        <div className="flex justify-center gap-4 mt-2 text-sm text-[#64748B]">
          {basic.email && <span>{basic.email}</span>}
          {basic.phone && <span>{basic.phone}</span>}
          {basic.location && <span>{basic.location}</span>}
        </div>
      </div>

      {/* 个人简介 */}
      {basic.summary && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-[#1E293B] uppercase tracking-wider mb-2">个人简介</h3>
          <p className="text-sm text-[#475569] leading-relaxed">{basic.summary}</p>
        </div>
      )}

      {/* 教育经历 */}
      {education.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-[#1E293B] uppercase tracking-wider mb-2 border-b border-[#E2E8F0] pb-1">教育经历</h3>
          {education.map(edu => (
            <div key={edu.id} className="mt-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium text-[#1E293B] text-sm">{edu.school}</span>
                  <span className="text-xs text-[#64748B] ml-2">{edu.major} · {edu.degree}</span>
                </div>
                <span className="text-xs text-[#94A3B8] shrink-0 ml-4">{edu.startDate} - {edu.endDate}</span>
              </div>
              {edu.description && <p className="text-xs text-[#64748B] mt-1">{edu.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* 工作经历 */}
      {experience.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-[#1E293B] uppercase tracking-wider mb-2 border-b border-[#E2E8F0] pb-1">工作经历</h3>
          {experience.map(exp => (
            <div key={exp.id} className="mt-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium text-[#1E293B] text-sm">{exp.company}</span>
                  <span className="text-xs text-[#64748B] ml-2">{exp.position}</span>
                </div>
                <span className="text-xs text-[#94A3B8] shrink-0 ml-4">
                  {exp.startDate} - {exp.current ? '至今' : exp.endDate}
                </span>
              </div>
              {exp.description && <p className="text-xs text-[#64748B] mt-1">{exp.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* 项目经历 */}
      {projects.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-[#1E293B] uppercase tracking-wider mb-2 border-b border-[#E2E8F0] pb-1">项目经历</h3>
          {projects.map(proj => (
            <div key={proj.id} className="mt-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium text-[#1E293B] text-sm">{proj.name}</span>
                  <span className="text-xs text-[#64748B] ml-2">{proj.role}</span>
                </div>
                <span className="text-xs text-[#94A3B8] shrink-0 ml-4">{proj.startDate} - {proj.endDate}</span>
              </div>
              <p className="text-xs text-[#64748B] mt-1">{proj.description}</p>
              {proj.technologies.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {proj.technologies.map((t, i) => <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 技能 */}
      {skills.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-[#1E293B] uppercase tracking-wider mb-2 border-b border-[#E2E8F0] pb-1">技能</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            {skills.map(s => (
              <Badge key={s.id} className="bg-[#EFF6FF] text-[#3B82F6] border border-[#BFDBFE] text-xs">
                {s.name} · {SKILL_LEVEL_LABELS[s.level] || s.level}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* 证书 */}
      {certifications.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-[#1E293B] uppercase tracking-wider mb-2 border-b border-[#E2E8F0] pb-1">证书</h3>
          {certifications.map(cert => (
            <div key={cert.id} className="flex justify-between text-xs text-[#475569] mt-1">
              <span>{cert.name}{cert.issuer ? ` · ${cert.issuer}` : ''}</span>
              {cert.date && <span className="text-[#94A3B8]">{cert.date}</span>}
            </div>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {!basic.name && !basic.email && education.length === 0 && experience.length === 0 && projects.length === 0 && skills.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
          <Eye className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">在左侧填写内容，实时预览将在此展示</p>
        </div>
      )}
    </div>
  );
}

/* ─── 主页面 ─── */
export default function ResumeEditorPage() {
  const [resume, setResume] = useState<Resume>(() => {
    // 尝试从 localStorage 恢复
    try {
      const saved = localStorage.getItem('resume-editor-draft');
      if (saved) return JSON.parse(saved);
    } catch {}
    return createEmptyResume();
  });
  const [activeSection, setActiveSection] = useState<SectionKey>('basic');
  const [saving, setSaving] = useState(false);
  const [conversationMode, setConversationMode] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role:'assistant'|'user';content:string}[]>([
    { role: 'assistant' as const, content: '嗨！我是小职，我来帮你写简历。\n\n先聊聊基本信息吧——你叫什么名字？' },
  ]);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动保存到 localStorage

  /** 将对话 API 返回的 updates 合并到简历状态 */
  const applyUpdates = useCallback((prev: Resume, updates: Record<string, unknown>): Resume => {
    const next = { ...prev };
    for (const [key, value] of Object.entries(updates)) {
      if (!value) continue;
      // basic.xxx → 合并到 basic 字段
      if (key.startsWith("basic.")) {
        const field = key.slice(6) as keyof ResumeBasicInfo;
        if (typeof value === "string" && field in next.basic) {
          next.basic = { ...next.basic, [field]: value };
        }
        continue;
      }
      // 完整替换数组字段
      if (["education", "experience", "projects", "skills", "certifications"].includes(key) && Array.isArray(value)) {
        (next as any)[key] = value;
        continue;
      }
      // 整个 basic 对象替换
      if (key === "basic" && typeof value === "object" && !Array.isArray(value)) {
        next.basic = { ...next.basic, ...(value as Partial<ResumeBasicInfo>) };
        continue;
      }
    }
    return next;
  }, []);
  const sendMessage = useCallback(async (text: string) => {
    if (sending || !text.trim()) return;
    const userMsg = { role: 'user' as const, content: text.trim() };
    setChatMessages(prev => [...prev, userMsg]);
    setSending(true);

    // 构建对话历史（不含最新的用户消息，因为已经加了）
    const history = [...chatMessages, userMsg];

    try {
      const res = await fetch('/api/resume/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          collectedFields: resume,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);

      // 根据 data.updates 更新简历字段
      if (data.updates && Object.keys(data.updates).length > 0) {
        setResume(prev => applyUpdates(prev, data.updates));
      }
    } catch (err) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: '抱歉，我这边出了点小问题，能再说一遍吗？',
      }]);
    } finally {
      setSending(false);
    }
  }, [chatMessages, sending, resume]);

  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem('resume-editor-draft', JSON.stringify(resume));
    } catch {}
  }, [resume]);

  const updateBasic = (basic: ResumeBasicInfo) => setResume(prev => ({ ...prev, basic }));
  const updateEducation = (education: ResumeEducation[]) => setResume(prev => ({ ...prev, education }));
  const updateExperience = (experience: ResumeExperience[]) => setResume(prev => ({ ...prev, experience }));
  const updateProjects = (projects: ResumeProject[]) => setResume(prev => ({ ...prev, projects }));
  const updateSkills = (skills: ResumeSkill[]) => setResume(prev => ({ ...prev, skills }));
  const updateCerts = (certifications: ResumeCertification[]) => setResume(prev => ({ ...prev, certifications }));

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* 顶栏 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E2E8F0] px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-[#1E293B]">简历编辑器</h1>
          <Badge variant="outline" className="text-xs text-[#3B82F6] border-[#BFDBFE] bg-[#EFF6FF]">预览</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={saveDraft}>
            <Save className="w-4 h-4 mr-1" />保存草稿
          </Button>
          <Button
            variant={conversationMode ? "default" : "outline"}
            size="sm"
            onClick={() => setConversationMode(!conversationMode)}
            className={conversationMode ? "bg-[#8B5CF6] hover:bg-[#7C3AED] text-white" : "border-[#8B5CF6] text-[#8B5CF6]"}
          >
            {conversationMode ? <X className="w-4 h-4 mr-1" /> : <MessageCircle className="w-4 h-4 mr-1" />}
            {conversationMode ? "手动编辑" : "让小职帮你写"}
          </Button>
          <Button size="sm" className="bg-[#3B82F6] hover:bg-[#2563EB]">
            <Sparkles className="w-4 h-4 mr-1" />AI 优化
          </Button>
        </div>
      </div>

      {/* 主体：双栏布局 */}
      <div className="flex h-[calc(100vh-56px)]">
        {/* 左栏：编辑区 */}
        <div className="w-[480px] shrink-0 border-r border-[#E2E8F0] bg-white overflow-hidden flex flex-col">
          {conversationMode ? (
            <div className="flex-1 flex flex-col">
              <div className="px-4 pt-4 pb-2 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-5 h-5 text-[#8B5CF6]" />
                  <span className="text-sm font-medium text-[#1E293B]">与小职对话</span>
                  <Badge variant="outline" className="text-xs text-[#8B5CF6] border-[#DDD6FE] bg-[#F5F3FF]">
                    简历自动填充中
                  </Badge>
                </div>
                <p className="text-xs text-[#64748B]">小职会通过对话帮你填写简历，你只需要聊天即可</p>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'assistant'
                        ? 'bg-[#F1F5F9] text-[#334155]'
                        : 'bg-[#8B5CF6] text-white'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-[#E2E8F0]">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    placeholder="输入你的回答..."
                    className="flex-1 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const val = e.currentTarget.value;
                        e.currentTarget.value = '';
                        sendMessage(val);
                      }
                    }}
                  />
                  <Button size="sm" className="bg-[#8B5CF6] hover:bg-[#7C3AED] shrink-0" disabled={sending} onClick={() => { const inp = inputRef.current; if (inp && inp.value.trim()) { const val = inp.value; inp.value = ''; sendMessage(val); } }}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
          <Tabs value={activeSection} onValueChange={v => setActiveSection(v as SectionKey)} className="flex-1 flex flex-col">
            <div className="px-4 pt-4">
              <TabsList className="w-full justify-start gap-1 bg-transparent h-auto flex-wrap">
                {SECTION_TABS.map(t => (
                  <TabsTrigger key={t.key} value={t.key}
                    className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white text-xs gap-1 px-3 py-1.5">
                    {t.icon}{t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <TabsContent value="basic" className="mt-0">
                <BasicInfoEditor data={resume.basic} onChange={updateBasic} />
              </TabsContent>
              <TabsContent value="education" className="mt-0">
                <EducationEditor items={resume.education} onChange={updateEducation} />
              </TabsContent>
              <TabsContent value="experience" className="mt-0">
                <ExperienceEditor items={resume.experience} onChange={updateExperience} />
              </TabsContent>
              <TabsContent value="projects" className="mt-0">
                <ProjectEditor items={resume.projects} onChange={updateProjects} />
              </TabsContent>
              <TabsContent value="skills" className="mt-0">
                <SkillsEditor
                  skills={resume.skills} certifications={resume.certifications}
                  onSkillsChange={updateSkills} onCertsChange={updateCerts}
                />
              </TabsContent>
            </div>
          </Tabs>
          )}
        </div>

        {/* 右栏：预览区 */}
        <div className="flex-1 overflow-y-auto bg-[#F1F5F9] p-6">
          <ResumePreview resume={resume} />
        </div>
      </div>
    </div>
  );
}
