'use client';


import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Sparkles, Save, FileDown, Plus, Trash2, Eye, User, GraduationCap, Briefcase, FolderGit2, Wrench, FileText, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { SimpleTemplate, ClassicTemplate, ModernTemplate } from '@/components/resume/templates';
import {
  ResumeSections, PersonalInfo, EducationEntry, ExperienceEntry, ProjectEntry,
  SkillEntry, CertificateEntry, SectionKey, TemplateId,
  createEmptySections, uid, DEGREE_OPTIONS, SECTION_META, TEMPLATE_OPTIONS,
} from '@/types/resume-sections';


/* ================================================================
 *  Section Editors
 * ================================================================ */

const SECTION_ICONS: Record<SectionKey, React.ReactNode> = {
  personal: <User className="w-4 h-4" />,
  education: <GraduationCap className="w-4 h-4" />,
  experience: <Briefcase className="w-4 h-4" />,
  projects: <FolderGit2 className="w-4 h-4" />,
  skills: <Wrench className="w-4 h-4" />,
  certificates: <FileText className="w-4 h-4" />,
  skillsCertificates: <Wrench className="w-4 h-4" />,
  selfEval: <FileText className="w-4 h-4" />,
};

/* ---- 个人信息 ---- */
function PersonalInfoEditor({ data, onChange }: { data: PersonalInfo; onChange: (d: PersonalInfo) => void }) {
  const set = (f: keyof PersonalInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...data, [f]: e.target.value });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="姓名"><Input value={data.name} onChange={set('name')} placeholder="你的姓名" /></Field>
        <Field label="邮箱"><Input value={data.email} onChange={set('email')} placeholder="email@example.com" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="电话"><Input value={data.phone} onChange={set('phone')} placeholder="手机号" /></Field>
        <Field label="所在城市"><Input value={data.city} onChange={set('city')} placeholder="如：北京" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="出生年月"><Input value={data.birth} onChange={set('birth')} placeholder="如：2000.01" /></Field>
        <Field label="政治面貌"><Input value={data.political} onChange={set('political')} placeholder="如：中共党员" /></Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-[#64748B]">{label}</Label>{children}</div>;
}

/* ---- 教育背景 ---- */
function EducationEditor({ items, onChange }: { items: EducationEntry[]; onChange: (i: EducationEntry[]) => void }) {
  const add = () => onChange([...items, { id: uid(), school: '', major: '', degree: '本科', start: '', end: '', gpa: '' }]);
  const remove = (id: string) => onChange(items.filter(i => i.id !== id));
  const update = (id: string, f: keyof EducationEntry, v: string) => onChange(items.map(i => i.id === id ? { ...i, [f]: v } : i));
  return (
    <div className="space-y-3">
      {items.map(item => (
        <Card key={item.id} className="border-[#E2E8F0]">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-[#64748B]">{item.school || '新教育经历'}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => remove(item.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="学校"><Input value={item.school} onChange={e => update(item.id, 'school', e.target.value)} placeholder="学校名称" /></Field>
              <Field label="专业"><Input value={item.major} onChange={e => update(item.id, 'major', e.target.value)} placeholder="专业名称" /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="学历">
                <Select value={item.degree} onValueChange={v => update(item.id, 'degree', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEGREE_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="开始"><Input value={item.start} onChange={e => update(item.id, 'start', e.target.value)} placeholder="2021.09" /></Field>
              <Field label="结束"><Input value={item.end} onChange={e => update(item.id, 'end', e.target.value)} placeholder="2025.06" /></Field>
            </div>
            <Field label="GPA（选填）"><Input value={item.gpa} onChange={e => update(item.id, 'gpa', e.target.value)} placeholder="3.8/4.0" /></Field>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" className="w-full border-dashed" onClick={add}><Plus className="w-4 h-4 mr-2" />添加教育经历</Button>
    </div>
  );
}

/* ---- 实习/工作经历 ---- */
function ExperienceEditor({ items, onChange }: { items: ExperienceEntry[]; onChange: (i: ExperienceEntry[]) => void }) {
  const add = () => onChange([...items, { id: uid(), company: '', position: '', start: '', end: '', description: '', highlights: [] }]);
  const remove = (id: string) => onChange(items.filter(i => i.id !== id));
  const update = (id: string, f: keyof ExperienceEntry, v: string) => onChange(items.map(i => i.id === id ? { ...i, [f]: v } : i));
  return (
    <div className="space-y-3">
      {items.map(item => (
        <Card key={item.id} className="border-[#E2E8F0]">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-[#64748B]">{item.company || item.position || '新工作经历'}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => remove(item.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="公司"><Input value={item.company} onChange={e => update(item.id, 'company', e.target.value)} placeholder="公司名称" /></Field>
              <Field label="职位"><Input value={item.position} onChange={e => update(item.id, 'position', e.target.value)} placeholder="岗位名称" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="开始时间"><Input value={item.start} onChange={e => update(item.id, 'start', e.target.value)} placeholder="2024.07" /></Field>
              <Field label="结束时间"><Input value={item.end} onChange={e => update(item.id, 'end', e.target.value)} placeholder="2025.01" /></Field>
            </div>
            <Field label="工作描述"><Textarea value={item.description} onChange={e => update(item.id, 'description', e.target.value)} placeholder="主要职责和成果" rows={3} /></Field>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" className="w-full border-dashed" onClick={add}><Plus className="w-4 h-4 mr-2" />添加实习经历</Button>
    </div>
  );
}

/* ---- 项目经历 ---- */
function ProjectsEditor({ items, onChange }: { items: ProjectEntry[]; onChange: (i: ProjectEntry[]) => void }) {
  const add = () => onChange([...items, { id: uid(), name: '', role: '', start: '', end: '', description: '', highlights: [] }]);
  const remove = (id: string) => onChange(items.filter(i => i.id !== id));
  const update = (id: string, f: keyof ProjectEntry, v: string) => onChange(items.map(i => i.id === id ? { ...i, [f]: v } : i));
  return (
    <div className="space-y-3">
      {items.map(item => (
        <Card key={item.id} className="border-[#E2E8F0]">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-[#64748B]">{item.name || '新项目'}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => remove(item.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="项目名称"><Input value={item.name} onChange={e => update(item.id, 'name', e.target.value)} placeholder="项目名称" /></Field>
              <Field label="担任角色"><Input value={item.role} onChange={e => update(item.id, 'role', e.target.value)} placeholder="如：项目负责人" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="开始时间"><Input value={item.start} onChange={e => update(item.id, 'start', e.target.value)} placeholder="2025.03" /></Field>
              <Field label="结束时间"><Input value={item.end} onChange={e => update(item.id, 'end', e.target.value)} placeholder="2025.06" /></Field>
            </div>
            <Field label="项目描述"><Textarea value={item.description} onChange={e => update(item.id, 'description', e.target.value)} placeholder="项目内容、成果" rows={3} /></Field>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" className="w-full border-dashed" onClick={add}><Plus className="w-4 h-4 mr-2" />添加项目经历</Button>
    </div>
  );
}

/* ---- 技能证书 ---- */
function SkillsCertificatesEditor({
  skills, certificates, onSkillsChange, onCertsChange,
}: {
  skills: SkillEntry[]; certificates: CertificateEntry[];
  onSkillsChange: (s: SkillEntry[]) => void; onCertsChange: (c: CertificateEntry[]) => void;
}) {
  const addSkill = () => onSkillsChange([...skills, { id: uid(), category: '', items: [] }]);
  const removeSkill = (id: string) => onSkillsChange(skills.filter(s => s.id !== id));
  const updateCat = (id: string, v: string) => onSkillsChange(skills.map(s => s.id === id ? { ...s, category: v } : s));
  const updateItems = (id: string, raw: string) => onSkillsChange(skills.map(s => s.id === id ? { ...s, items: raw.split(/[,，、]/).map(t => t.trim()).filter(Boolean) } : s));

  const addCert = () => onCertsChange([...certificates, { id: uid(), name: '', date: '' }]);
  const removeCert = (id: string) => onCertsChange(certificates.filter(c => c.id !== id));
  const updateCert = (id: string, f: keyof CertificateEntry, v: string) => onCertsChange(certificates.map(c => c.id === id ? { ...c, [f]: v } : c));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[#1E293B] mb-3">技能</h3>
        <div className="space-y-3">
          {skills.map(s => (
            <div key={s.id} className="flex items-start gap-2">
              <div className="flex-1 space-y-1">
                <Input value={s.category} onChange={e => updateCat(s.id, e.target.value)} placeholder="技能分类（如：编程语言）" className="text-sm" />
                <Input value={s.items.join('、')} onChange={e => updateItems(s.id, e.target.value)} placeholder="技能项（用逗号分隔）" className="text-sm" />
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 shrink-0 mt-0.5" onClick={() => removeSkill(s.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full border-dashed" onClick={addSkill}><Plus className="w-3 h-3 mr-1" />添加技能分类</Button>
        </div>
      </div>
      <Separator />
      <div>
        <h3 className="text-sm font-semibold text-[#1E293B] mb-3">证书</h3>
        <div className="space-y-2">
          {certificates.map(c => (
            <div key={c.id} className="flex items-center gap-2">
              <Input className="flex-1" value={c.name} onChange={e => updateCert(c.id, 'name', e.target.value)} placeholder="证书名称" />
              <Input className="w-32" value={c.date} onChange={e => updateCert(c.id, 'date', e.target.value)} placeholder="获得时间" />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 shrink-0" onClick={() => removeCert(c.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full border-dashed" onClick={addCert}><Plus className="w-3 h-3 mr-1" />添加证书</Button>
        </div>
      </div>
    </div>
  );
}

/* ---- 自我评价 ---- */
function SelfEvalEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="简要评价自己的专业能力、性格特点、职业规划...（200字以内）"
        rows={8}
        className="text-sm"
      />
      <p className="text-xs text-[#94A3B8] mt-2">{value.length} / 500 字</p>
    </div>
  );
}


/* ================================================================
 *  Template Renderer
 * ================================================================ */
function TemplateRenderer({ templateId, sections }: { templateId: TemplateId; sections: ResumeSections }) {
  switch (templateId) {
    case 'classic': return <ClassicTemplate sections={sections} />;
    case 'modern': return <ModernTemplate sections={sections} />;
    default: return <SimpleTemplate sections={sections} />;
  }
}

/* ================================================================
 *  Main Page
 * ================================================================ */
export default function ResumeEditPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const isNew = params.id === 'new';

  const [resumeId, setResumeId] = useState<string | null>(isNew ? null : (params.id as string));
  const [resumeName, setResumeName] = useState('我的简历');
  const [sections, setSections] = useState<ResumeSections>(createEmptySections);
  const [templateId, setTemplateId] = useState<TemplateId>('simple');
  const [activeTab, setActiveTab] = useState<SectionKey>('personal');
  const [pageLoading, setPageLoading] = useState(true);

  // Dialogs
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiOptimizing, setAiOptimizing] = useState(false);
  const [aiTargetSection, setAiTargetSection] = useState<SectionKey>('personal');

  // Save state
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- Auth guard ---- */
  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth'); }
  }, [user, authLoading, router]);

  /* ---- Load existing resume ---- */
  useEffect(() => {
    if (!user || isNew) { setPageLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`/api/resume/${params.id}`, { credentials: 'include' });
        const data = await res.json();
        if (data.success && data.data) {
          const r = data.data;
          setResumeName(r.name || '我的简历');
          setTemplateId((r.template_id as TemplateId) || 'simple');
          if (r.sections && typeof r.sections === 'object') {
            setSections({
              ...createEmptySections(),
              ...r.sections,
              personal: { ...createEmptySections().personal, ...(r.sections.personal || {}) },
            });
          }
        }
      } catch (err) {
        console.error('加载简历失败:', err);
      } finally {
        setPageLoading(false);
      }
    })();
  }, [user, params.id, isNew]);

  /* ---- Auto-save (3s debounce) ---- */
  const autoSave = useCallback(async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      const payload = { name: resumeName, sections, template_id: templateId };
      let res: Response;
      if (resumeId) {
        res = await fetch(`/api/resume/${resumeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ...payload, isDefault: true }),
        });
      }
      const data = await res.json();
      if (data.success) {
        if (!resumeId && data.data?.id) {
          setResumeId(data.data.id);
          // Replace URL without reload
          window.history.replaceState(null, '', `/resume-edit/${data.data.id}`);
        }
        setLastSaved(new Date());
        setDirty(false);
      }
    } catch (err) {
      console.error('自动保存失败:', err);
    } finally {
      setSaving(false);
    }
  }, [dirty, resumeName, sections, templateId, resumeId]);

  // Debounced save trigger
  useEffect(() => {
    if (!dirty) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(autoSave, 3000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [dirty, autoSave]);

  // Mark dirty on changes (skip initial load)
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (!initialLoadDone.current) { initialLoadDone.current = true; return; }
    setDirty(true);
  }, [sections, templateId, resumeName]);

  /* ---- AI Section Optimize ---- */
  const handleAIOptimize = async () => {
    setAiOptimizing(true);
    try {
      const res = await fetch('/api/resume/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          resumeId: resumeId || undefined,
          targetPosition: `优化"${SECTION_META.find(m => m.key === aiTargetSection)?.label}"区块`,
          optimizedContent: JSON.stringify({
            section: aiTargetSection,
            data: aiTargetSection === 'personal' ? sections.personal
              : aiTargetSection === 'education' ? sections.education
              : aiTargetSection === 'experience' ? sections.experience
              : aiTargetSection === 'projects' ? sections.projects
              : aiTargetSection === 'skillsCertificates' ? { skills: sections.skills, certificates: sections.certificates }
              : { selfEval: sections.selfEval },
          }),
          suggestions: [],
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`"${SECTION_META.find(m => m.key === aiTargetSection)?.label}" 优化请求已提交`);
      } else {
        toast.error(data.error || '优化失败');
      }
    } catch {
      toast.error('AI优化请求失败');
    } finally {
      setAiOptimizing(false);
      setAiDialogOpen(false);
    }
  };

  /* ---- PDF Export ---- */
  const handleExportPDF = () => {
    // Use browser print with a print-specific stylesheet
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('请允许弹出窗口以导出PDF'); return; }

    // Grab the preview content
    const previewEl = document.getElementById('resume-preview-container');
    if (!previewEl) { toast.error('预览区域未找到'); return; }

    const styles = Array.from(document.styleSheets)
      .map(s => { try { return Array.from(s.cssRules).map(r => r.cssText).join('\n'); } catch { return ''; } })
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>${resumeName || '简历'}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: system-ui, -apple-system, sans-serif; color: #1E293B; }
        ${styles}
      </style>
      </head>
      <body>${previewEl.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  /* ---- Section updaters ---- */
  const updatePersonal = (p: PersonalInfo) => setSections(prev => ({ ...prev, personal: p }));
  const updateEducation = (e: EducationEntry[]) => setSections(prev => ({ ...prev, education: e }));
  const updateExperience = (e: ExperienceEntry[]) => setSections(prev => ({ ...prev, experience: e }));
  const updateProjects = (p: ProjectEntry[]) => setSections(prev => ({ ...prev, projects: p }));
  const updateSkills = (s: SkillEntry[]) => setSections(prev => ({ ...prev, skills: s }));
  const updateCertificates = (c: CertificateEntry[]) => setSections(prev => ({ ...prev, certificates: c }));
  const updateSelfEval = (v: string) => setSections(prev => ({ ...prev, selfEval: v }));

  /* ---- Loading states ---- */
  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* ====== Top Bar ====== */}
      <header className="sticky top-0 z-20 bg-white border-b border-[#E2E8F0] px-4 md:px-6 py-2">
        <div className="flex items-center gap-3 flex-wrap max-w-screen-2xl mx-auto">
          {/* Back button */}
          <Button variant="ghost" size="sm" onClick={() => router.push('/resume-optimize')}>
            <ChevronLeft className="w-4 h-4 mr-1" />返回
          </Button>

          {/* Resume name */}
          <Input
            value={resumeName}
            onChange={e => setResumeName(e.target.value)}
            className="w-32 md:w-40 h-8 text-sm font-medium border-[#E2E8F0]"
            placeholder="简历名称"
          />

          {/* Template selector */}
          <Select value={templateId} onValueChange={v => setTemplateId(v as TemplateId)}>
            <SelectTrigger className="w-28 md:w-32 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_OPTIONS.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          {/* Save status */}
          <span className="text-xs text-[#94A3B8] hidden md:inline">
            {saving ? '保存中...' : dirty ? '未保存' : lastSaved ? `已保存 ${lastSaved.toLocaleTimeString('zh-CN')}` : ''}
          </span>

          {/* Save button */}
          <Button
            variant="outline"
            size="sm"
            onClick={autoSave}
            disabled={saving || !dirty}
            className="text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            保存
          </Button>

          {/* Export PDF */}
          <Button size="sm" onClick={handleExportPDF} variant="outline" className="text-sm">
            <FileDown className="w-4 h-4 mr-1" />导出PDF
          </Button>

          {/* Preview toggle for mobile */}
          <Button
            variant="outline"
            size="sm"
            className="md:hidden text-sm"
            onClick={() => {
              const preview = document.getElementById('preview-panel');
              if (preview) preview.classList.toggle('hidden');
            }}
          >
            <Eye className="w-4 h-4 mr-1" />预览
          </Button>
        </div>
      </header>

      {/* ====== Body: Left Editor + Right Preview ====== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Editor Panel */}
        <div className="w-full md:w-[480px] lg:w-[520px] shrink-0 border-r border-[#E2E8F0] bg-white overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as SectionKey)} className="flex-1 flex flex-col">
            <div className="px-3 md:px-4 pt-3 border-b border-[#F1F5F9]">
              <TabsList className="w-full justify-start bg-transparent h-auto flex-wrap gap-1">
                {SECTION_META.map(m => (
                  <TabsTrigger
                    key={m.key}
                    value={m.key}
                    className="data-[state=active]:bg-[#165DFF] data-[state=active]:text-white text-xs gap-1 px-2.5 py-1.5 rounded-md"
                  >
                    {SECTION_ICONS[m.key]}
                    <span className="hidden sm:inline">{m.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-3 md:px-4 py-4">
              <TabsContent value="personal" className="mt-0 space-y-4">
                <PersonalInfoEditor data={sections.personal} onChange={updatePersonal} />
                <AIAssistButton
                  sectionKey="personal"
                  onClick={() => { setAiTargetSection('personal'); setAiDialogOpen(true); }}
                />
              </TabsContent>

              <TabsContent value="education" className="mt-0 space-y-4">
                <EducationEditor items={sections.education} onChange={updateEducation} />
                <AIAssistButton
                  sectionKey="education"
                  onClick={() => { setAiTargetSection('education'); setAiDialogOpen(true); }}
                />
              </TabsContent>

              <TabsContent value="experience" className="mt-0 space-y-4">
                <ExperienceEditor items={sections.experience} onChange={updateExperience} />
                <AIAssistButton
                  sectionKey="experience"
                  onClick={() => { setAiTargetSection('experience'); setAiDialogOpen(true); }}
                />
              </TabsContent>

              <TabsContent value="projects" className="mt-0 space-y-4">
                <ProjectsEditor items={sections.projects} onChange={updateProjects} />
                <AIAssistButton
                  sectionKey="projects"
                  onClick={() => { setAiTargetSection('projects'); setAiDialogOpen(true); }}
                />
              </TabsContent>

              <TabsContent value="skillsCertificates" className="mt-0 space-y-4">
                <SkillsCertificatesEditor
                  skills={sections.skills}
                  certificates={sections.certificates}
                  onSkillsChange={updateSkills}
                  onCertsChange={updateCertificates}
                />
                <AIAssistButton
                  sectionKey="skillsCertificates"
                  onClick={() => { setAiTargetSection('skillsCertificates'); setAiDialogOpen(true); }}
                />
              </TabsContent>

              <TabsContent value="selfEval" className="mt-0 space-y-4">
                <SelfEvalEditor value={sections.selfEval} onChange={updateSelfEval} />
                <AIAssistButton
                  sectionKey="selfEval"
                  onClick={() => { setAiTargetSection('selfEval'); setAiDialogOpen(true); }}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right: Preview Panel */}
        <div
          id="preview-panel"
          className="hidden md:flex flex-1 bg-[#F1F5F9] overflow-y-auto justify-center p-4 md:p-6"
        >
          <div
            id="resume-preview-container"
            className="w-full max-w-[210mm] bg-white shadow-lg rounded-sm overflow-hidden"
            style={{ aspectRatio: '210 / 297', maxHeight: 'fit-content' }}
          >
            <div className="p-5 md:p-8">
              <TemplateRenderer templateId={templateId} sections={sections} />
            </div>
          </div>
        </div>
      </div>

      {/* ====== AI Optimize Dialog ====== */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#165DFF]" />
              AI辅助填充
            </DialogTitle>
            <DialogDescription>
              将使用AI为「{SECTION_META.find(m => m.key === aiTargetSection)?.label}」区块生成内容建议。
              请在优化记录中查看结果。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialogOpen(false)}>取消</Button>
            <Button
              className="bg-[#165DFF] hover:bg-[#165DFF]/90"
              onClick={handleAIOptimize}
              disabled={aiOptimizing}
            >
              {aiOptimizing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {aiOptimizing ? '优化中...' : '开始AI优化'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AIAssistButton({ sectionKey, onClick }: { sectionKey: SectionKey; onClick: () => void }) {
  return (
    <div className="pt-2 border-t border-[#F1F5F9]">
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-[#165DFF] hover:text-[#165DFF] hover:bg-[#165DFF]/5 text-sm"
        onClick={onClick}
      >
        <Sparkles className="w-4 h-4 mr-2" />
        AI辅助填充「{SECTION_META.find(m => m.key === sectionKey)?.label}」
      </Button>
    </div>
  );
}
