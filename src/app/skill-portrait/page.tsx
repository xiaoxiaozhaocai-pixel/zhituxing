'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  ChevronsUpDown,
  Loader2,
  Save,
  Sparkles,
  Brain,
  Target,
  User,
  Briefcase,
  MapPin,
  GraduationCap,
  Lightbulb,
  AlertCircle,
  Lock,
  LogIn,
  Calendar,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import {
  parseSkillPortrait,
  convertToSaveFormat,
  PROFICIENCY_CONFIG,
  type SkillPortraitResult,
  type SkillItem,
  type ProficiencyLevel,
  type SkillForSave,
} from '@/lib/skill-portrait-parser';

// ==================== 预设选项数据 ====================

const MAJOR_OPTIONS = [
  '计算机科学与技术', '软件工程', '人工智能', '数据科学与大数据技术', '信息安全',
  '电子信息工程', '通信工程', '自动化', '电气工程', '机械工程',
  '金融学', '会计学', '经济学', '国际经济与贸易', '工商管理',
  '市场营销', '人力资源管理', '公共事业管理', '行政管理', '物流管理',
  '法学', '知识产权', '社会工作', '汉语言文学', '新闻学', '广告学',
  '英语', '日语', '翻译', '对外汉语',
  '临床医学', '护理学', '药学', '预防医学', '中医学',
  '建筑学', '土木工程', '环境工程', '化学工程', '材料科学',
  '数学与应用数学', '统计学', '物理学', '化学', '生物科学',
  '心理学', '教育学', '体育教育', '艺术设计', '数字媒体艺术',
  '旅游管理', '酒店管理', '会展经济', '食品科学', '农学',
];

const GRADE_OPTIONS = ['大一', '大二', '大三', '大四', '研一', '研二', '研三'];
const GRADUATION_YEAR_OPTIONS = ['2025', '2026', '2027', '2028', '2029', '2030'];

const CITY_OPTIONS = [
  '北京', '上海', '广州', '深圳', '杭州', '成都', '南京', '武汉', '西安', '重庆',
  '苏州', '天津', '长沙', '郑州', '东莞', '青岛', '合肥', '佛山', '宁波', '厦门',
  '无锡', '大连', '福州', '珠海', '济南',
];

const JOB_INTENTION_OPTIONS = [
  '软件开发', '产品经理', '数据分析', 'UI/UX设计', '运营', '市场营销',
  '人力资源', '财务管理', '咨询', '金融投资', '法律', '教育培训',
  '新媒体', '项目管理', '算法工程师', '测试工程师', '运维工程师',
  '销售', '供应链管理', '公务员/事业编',
];

const INDUSTRY_OPTIONS = [
  '互联网/科技', '金融/银行', '教育/培训', '医疗/健康', '制造/工业',
  '房地产/建筑', '咨询/专业服务', '媒体/文化', '零售/电商', '能源/环保',
  '政府/公共事业', '交通/物流', '农业/食品', '旅游/酒店', '其他',
];

// ==================== 步骤配置 ====================

const STEPS = [
  { id: 1, title: '基本信息', icon: User },
  { id: 2, title: 'AI技能推荐', icon: Sparkles },
  { id: 3, title: '选择技能', icon: Target },
  { id: 4, title: '完成', icon: Check },
];

// 秋招备战进度条组件
function AutumnRecruitProgressBar() {
  const [progress, setProgress] = useState(0);
  const [checkedItems, setCheckedItems] = useState({
    skillPortrait: false,
    careerPlan: false,
    jobMatch: false,
    interview: false,
  });

  useEffect(() => {
    // 从 localStorage 读取完成状态
    const skillPortrait = localStorage.getItem('skill-portrait-done') === 'true';
    const careerPlan = localStorage.getItem('career-plan-done') === 'true';
    const jobMatch = localStorage.getItem('job-match-done') === 'true';
    const interview = localStorage.getItem('interview-done') === 'true';
    
    setCheckedItems({ skillPortrait, careerPlan, jobMatch, interview });
    
    // 计算完成度
    const completed = [skillPortrait, careerPlan, jobMatch, interview].filter(Boolean).length;
    setProgress((completed / 4) * 100);
  }, []);

  const getProgressColor = () => {
    if (progress <= 30) return 'bg-red-500';
    if (progress <= 70) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getTextColor = () => {
    if (progress <= 30) return 'text-red-500';
    if (progress <= 70) return 'text-orange-500';
    return 'text-green-500';
  };

  return (
    <div className="bg-white border-b border-gray-100 py-3 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">秋招备战进度</span>
          </div>
          <span className={`text-sm font-bold ${getTextColor()}`}>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${getProgressColor()}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span className={checkedItems.skillPortrait ? 'text-green-600' : ''}>
            {checkedItems.skillPortrait ? '✓' : '○'} 技能画像
          </span>
          <span className={checkedItems.careerPlan ? 'text-green-600' : ''}>
            {checkedItems.careerPlan ? '✓' : '○'} 职业规划
          </span>
          <span className={checkedItems.jobMatch ? 'text-green-600' : ''}>
            {checkedItems.jobMatch ? '✓' : '○'} 岗位匹配
          </span>
          <span className={checkedItems.interview ? 'text-green-600' : ''}>
            {checkedItems.interview ? '✓' : '○'} 面试练习
          </span>
        </div>
        {progress < 100 && (
          <p className="text-xs text-gray-400 mt-1.5">完成所有步骤，秋招胜率提升50%</p>
        )}
      </div>
    </div>
  );
}

// 技能等级转数字（用于计算差距）
const levelToNumber: Record<ProficiencyLevel, number> = { '了解': 1, '熟悉': 2, '熟练': 3, '精通': 4 };
const numberToLevel = ['-', '了解', '熟悉', '熟练', '精通'];

// 目标岗位差距分析组件
function TargetJobGapAnalysis({ userSkills, hasSkillPortrait }: { userSkills: { name: string; level: ProficiencyLevel }[]; hasSkillPortrait: boolean }) {
  const [jobs, setJobs] = useState<{ job_title: string; hard_skills: string[]; city?: string; industry?: string }[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<{
    matchScore: number;
    gaps: { skill: string; current: number; required: number; gap: number; weeks: number }[];
    totalWeeks: number;
  } | null>(null);

  // 获取热门岗位
  useEffect(() => {
    fetch('/api/jobs?limit=20')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.jobs) {
          setJobs(data.data.jobs.map((j: any) => ({
            job_title: j.job_title || j.jobName,
            hard_skills: j.hard_skills || j.requiredSkills || [],
            city: j.city,
            industry: j.industry,
          })));
        }
      })
      .catch(console.error);
  }, []);

  // 分析差距
  const analyzeGap = (jobTitle: string) => {
    setSelectedJob(jobTitle);
    
    const job = jobs.find(j => j.job_title === jobTitle);
    if (!job || userSkills.length === 0) {
      setAnalysis(null);
      return;
    }

    setLoading(true);

    // 计算匹配度和差距
    const requiredSkills = job.hard_skills || [];
    const gaps: { skill: string; current: number; required: number; gap: number; weeks: number }[] = [];

    requiredSkills.forEach((reqSkill: string) => {
      const matched = userSkills.find(s => 
        s.name.toLowerCase().includes(reqSkill.toLowerCase()) || 
        reqSkill.toLowerCase().includes(s.name.toLowerCase())
      );

      const current = matched ? levelToNumber[matched.level] : 0;
      const required = 3; // 假设岗位要求"熟练"级别
      const gap = Math.max(0, required - current);

      if (gap > 0) {
        gaps.push({
          skill: reqSkill,
          current,
          required,
          gap,
          weeks: gap * 2, // 每级差距约2周
        });
      }
    });

    const matchScore = requiredSkills.length > 0 
      ? Math.round(((requiredSkills.length - gaps.length) / requiredSkills.length) * 100)
      : 0;

    const totalWeeks = gaps.reduce((sum, g) => sum + g.weeks, 0);

    setAnalysis({ matchScore, gaps, totalWeeks });
    setLoading(false);
  };

  if (!hasSkillPortrait) {
    return (
      <Card className="border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50">
        <CardContent className="py-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center">
            <Target className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">目标岗位差距分析</h3>
          <p className="text-gray-500 text-sm mb-4">完成技能画像后，解锁与目标岗位的差距分析</p>
          <p className="text-gray-400 text-xs">先完成当前技能画像，再进行差距分析</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-violet-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-5 h-5 text-violet-600" />
          目标岗位差距分析
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 岗位选择 */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">选择目标岗位</label>
          <select
            value={selectedJob}
            onChange={(e) => analyzeGap(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none"
          >
            <option value="">请选择目标岗位...</option>
            {jobs.map((job, i) => (
              <option key={i} value={job.job_title}>{job.job_title} {job.city ? `(${job.city})` : ''}</option>
            ))}
          </select>
        </div>

        {/* 分析结果 */}
        {loading && (
          <div className="py-6 text-center">
            <Loader2 className="w-6 h-6 text-violet-500 animate-spin mx-auto" />
            <p className="text-sm text-gray-500 mt-2">正在分析差距...</p>
          </div>
        )}

        {!loading && analysis && (
          <div className="space-y-4">
            {/* 匹配度环形进度 */}
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#F3E8FF" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="34" fill="none"
                    className={analysis.matchScore >= 70 ? 'stroke-green-500' : analysis.matchScore >= 40 ? 'stroke-orange-500' : 'stroke-red-500'}
                    strokeWidth="6"
                    strokeDasharray={2 * Math.PI * 34}
                    strokeDashoffset={2 * Math.PI * 34 - (analysis.matchScore / 100) * 2 * Math.PI * 34}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-lg font-bold ${analysis.matchScore >= 70 ? 'text-green-500' : analysis.matchScore >= 40 ? 'text-orange-500' : 'text-red-500'}`}>
                    {analysis.matchScore}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">当前匹配度</p>
                <p className="text-xs text-gray-500">与「{selectedJob}」岗位对比</p>
              </div>
            </div>

            {/* 技能差距清单 */}
            {analysis.gaps.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  技能差距清单
                </h4>
                <div className="space-y-2">
                  {analysis.gaps.map((gap, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">{gap.skill}</span>
                        <span className="text-xs text-violet-600 font-medium">预计需 {gap.weeks} 周</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>当前：{'★'.repeat(gap.current)}{'☆'.repeat(4 - gap.current)}</span>
                        <span className="text-gray-300">|</span>
                        <span>需要：{'★'.repeat(gap.required)}{'☆'.repeat(4 - gap.required)}</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-orange-600 font-medium">差距 {gap.gap} 级</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 总结 */}
            <div className="bg-violet-50 rounded-lg p-4 border border-violet-100">
              <p className="text-sm text-violet-800">
                <strong>学习建议：</strong>
                如果每周投入 <strong>5 小时</strong>，约 <strong>{Math.ceil(analysis.totalWeeks)} 周</strong> 可达到目标岗位要求。
              </p>
            </div>
          </div>
        )}

        {!loading && selectedJob && !analysis && (
          <p className="text-sm text-gray-500 text-center py-4">暂无差距数据</p>
        )}
      </CardContent>
    </Card>
  );
}

function StepProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="w-full sticky top-[57px] z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-4 px-2">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {STEPS.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? 'bg-[#165DFF] text-white shadow-md shadow-[#165DFF]/30'
                      : isCurrent
                        ? 'bg-[#165DFF]/10 text-[#165DFF] ring-2 ring-[#165DFF]/30'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={`text-xs mt-1.5 font-medium whitespace-nowrap ${
                  isCurrent ? 'text-[#165DFF]' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mt-[-18px] transition-colors duration-300 ${
                  isCompleted ? 'bg-[#165DFF]' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== Combobox 组件 ====================

function Combobox({ options, value, onChange, placeholder = '请选择或输入...' }: {
  options: string[]; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={open}
          className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-left hover:border-[#165DFF] focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 outline-none transition-colors bg-white"
        >
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>{value || placeholder}</span>
          <ChevronsUpDown className="w-4 h-4 text-gray-400 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索..." />
          <CommandList>
            <CommandEmpty>
              <button
                className="w-full px-3 py-2 text-sm text-left text-[#165DFF] hover:bg-blue-50"
                onClick={() => {
                  onChange((document.querySelector('[cmdk-input]') as HTMLInputElement)?.value || '');
                  setOpen(false);
                }}
              >
                使用当前输入
              </button>
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={(v: string) => { onChange(v); setOpen(false); }}
                >
                  <Check className={`w-4 h-4 mr-2 ${value === option ? 'opacity-100' : 'opacity-0'}`} />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SelectCombobox({ options, value, onChange, placeholder = '请选择...' }: {
  options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-left hover:border-[#165DFF] focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 outline-none transition-colors bg-white"
        >
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>{value ? options.find(o => o.value === value)?.label : placeholder}</span>
          <ChevronsUpDown className="w-4 h-4 text-gray-400 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option.value} value={option.value} onSelect={(v: string) => { onChange(v); setOpen(false); }}>
                  <Check className={`w-4 h-4 mr-2 ${value === option.value ? 'opacity-100' : 'opacity-0'}`} />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ==================== 技能选择项组件 ====================

function SkillSelectItem({ skill, category, selected, level, onToggle, onLevelChange }: {
  skill: SkillItem; category: string; selected: boolean; level: ProficiencyLevel;
  onToggle: () => void; onLevelChange: (lvl: ProficiencyLevel) => void;
}) {
  const levels: ProficiencyLevel[] = ['了解', '熟悉', '熟练', '精通'];

  return (
    <div className={`border rounded-lg p-3 transition-all ${selected ? 'border-[#165DFF]/40 bg-blue-50/30' : 'border-gray-100'}`}>
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#165DFF] focus:ring-[#165DFF]"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${selected ? 'text-gray-900' : 'text-gray-500'}`}>{skill.name}</span>
            {skill.hotness === 'hot' && (
              <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded">热门</span>
            )}
            {skill.hotness === 'optional' && (
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">可选</span>
            )}
          </div>
          {skill.description && (
            <p className="text-xs text-gray-500 mt-0.5">{skill.description}</p>
          )}
          {selected && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {levels.map((lvl) => {
                const config = PROFICIENCY_CONFIG[lvl];
                const isActive = level === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => onLevelChange(lvl)}
                    className={`text-xs px-2 py-1 rounded-full border transition-all ${
                      isActive
                        ? 'text-white border-transparent'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                    style={isActive ? { backgroundColor: config.color } : undefined}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== 主页面组件 ====================

interface ProfileForm {
  major: string;
  grade: string;
  graduation_year: string;
  city: string;
  job_intention: string;
  target_industry: string;
}

export default function SkillPortraitPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [fetching, setFetching] = useState(true);

  const [form, setForm] = useState<ProfileForm>({
    major: '',
    grade: '',
    graduation_year: '',
    city: '',
    job_intention: '',
    target_industry: '',
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<SkillPortraitResult | null>(null);
  const [aiRawText, setAiRawText] = useState('');

  const [skillSelections, setSkillSelections] = useState<Record<string, { selected: boolean; level: ProficiencyLevel }>>({});
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [customSkillCategory, setCustomSkillCategory] = useState<'professional' | 'office' | 'soft'>('professional');
  const [saving, setSaving] = useState(false);

  // 加载时获取已有画像数据预填
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
      return;
    }
    if (user) {
      fetchExistingProfile();
    }
  }, [user, authLoading, router]);

  const fetchExistingProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        credentials: 'include',
      });
      const data = await response.json();
      console.log('[skill-portrait] 加载已有数据:', data);
      if (data.code === 200 && data.data?.profile) {
        const profile = data.data.profile;
        setForm({
          major: profile.major || '',
          grade: profile.grade || '',
          graduation_year: profile.graduation_year ? String(profile.graduation_year) : '',
          city: profile.target_cities?.[0] || profile.city || '',
          job_intention: profile.target_job || '',
          target_industry: '',
        });
        // 恢复已有技能选择
        const skills = data.data.skills;
        if (Array.isArray(skills) && skills.length > 0 && typeof skills[0] === 'object') {
          const selections: Record<string, { selected: boolean; level: ProficiencyLevel }> = {};
          for (const s of skills as Record<string, unknown>[]) {
            const cat = s.category as string;
            const name = s.name as string;
            const level = s.level as string;
            if (cat && name) {
              const levelMap: Record<string, ProficiencyLevel> = { '了解': '了解', '熟悉': '熟悉', '熟练': '熟练', '精通': '精通' };
              selections[`${cat}_${name}`] = { selected: true, level: levelMap[level] || '熟悉' };
            }
          }
          if (Object.keys(selections).length > 0) setSkillSelections(selections);
        }
      }
    } catch (error) {
      console.error('获取已有画像失败:', error);
    } finally {
      setFetching(false);
    }
  };

  const updateForm = (field: keyof ProfileForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const isStep1Valid = useMemo(() => {
    return form.major.trim() !== '' && form.city.trim() !== '' && form.job_intention.trim() !== '';
  }, [form.major, form.city, form.job_intention]);

  // 调用AI技能推荐
  const fetchSkillRecommendation = useCallback(async () => {
    if (!user) return;
    setAiLoading(true);
    setAiRawText('');

    try {
      const response = await fetch('/api/skill-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id.toString() },
        body: JSON.stringify({
          major: form.major,
          target_industry: form.target_industry,
          target_city: form.city,
          job_intention: form.job_intention,
        }),
      });

      if (!response.ok) {
        showToast('AI推荐请求失败，请重试', 'error', 3000);
        setAiLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) { setAiLoading(false); return; }

      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() ?? '';

        for (const block of blocks) {
          const dataLines = block.split('\n')
            .filter(line => line.startsWith('data:'))
            .map(line => line.slice(5).trim());

          for (const line of dataLines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.type === 'text' && parsed.content) {
                fullText += parsed.content;
              } else if (parsed.type === 'done') {
                const result = parseSkillPortrait(fullText);
                setAiResult(result);
                setAiRawText(result.rawText);

                const initialSelections: Record<string, { selected: boolean; level: ProficiencyLevel }> = {};
                for (const skill of result.professionalSkills) {
                  initialSelections[`professional_${skill.name}`] = { selected: skill.hotness !== 'optional', level: skill.hotness === 'hot' ? '熟悉' : '了解' };
                }
                for (const skill of result.officeSkills) {
                  initialSelections[`office_${skill.name}`] = { selected: skill.hotness !== 'optional', level: skill.hotness === 'hot' ? '熟悉' : '了解' };
                }
                for (const skill of result.softSkills) {
                  initialSelections[`soft_${skill.name}`] = { selected: skill.hotness !== 'optional', level: '熟悉' };
                }
                setSkillSelections(prev => ({ ...initialSelections, ...prev }));
                setAiLoading(false);
                return;
              } else if (parsed.type === 'error') {
                showToast(parsed.message || 'AI推荐失败', 'error', 3000);
                setAiLoading(false);
                return;
              }
            } catch { /* non-JSON line */ }
          }
        }
      }

      if (fullText) {
        const result = parseSkillPortrait(fullText);
        setAiResult(result);
        setAiRawText(result.rawText);
      }
    } catch (error) {
      console.error('AI技能推荐失败:', error);
      showToast('网络错误，请重试', 'error', 3000);
    } finally {
      setAiLoading(false);
    }
  }, [user, form.major, form.target_industry, form.city, form.job_intention, showToast]);

  // 步骤切换
  const goNext = () => {
    if (currentStep === 1 && !isStep1Valid) {
      showToast('请至少填写专业、意向城市和求职意向', 'error', 3000);
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const goPrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // 进入第2步时自动调用AI
  useEffect(() => {
    if (currentStep === 2 && !aiResult && !aiLoading && user) {
      fetchSkillRecommendation();
    }
  }, [currentStep, aiResult, aiLoading, user, fetchSkillRecommendation]);

  // 技能选择
  const toggleSkill = (key: string, hotness: SkillItem['hotness']) => {
    setSkillSelections(prev => ({
      ...prev,
      [key]: { selected: !(prev[key]?.selected ?? (hotness !== 'optional')), level: prev[key]?.level || (hotness === 'hot' ? '熟悉' : '了解') },
    }));
  };

  const setSkillLevel = (key: string, level: ProficiencyLevel) => {
    setSkillSelections(prev => ({ ...prev, [key]: { ...prev[key], selected: true, level } }));
  };

  const addCustomSkill = () => {
    if (!customSkillInput.trim()) return;
    const name = customSkillInput.trim();
    const key = `${customSkillCategory}_${name}`;
    if (aiResult) {
      const newSkill: SkillItem = { name, hotness: 'normal', description: '自定义技能' };
      if (customSkillCategory === 'professional') setAiResult(prev => prev ? { ...prev, professionalSkills: [...prev.professionalSkills, newSkill] } : prev);
      else if (customSkillCategory === 'office') setAiResult(prev => prev ? { ...prev, officeSkills: [...prev.officeSkills, newSkill] } : prev);
      else setAiResult(prev => prev ? { ...prev, softSkills: [...prev.softSkills, newSkill] } : prev);
    }
    setSkillSelections(prev => ({ ...prev, [key]: { selected: true, level: '了解' } }));
    setCustomSkillInput('');
  };

  // 保存
  const handleSave = async () => {
    if (!user) {
      showToast('请先登录', 'error', 3000);
      return;
    }
    setSaving(true);
    try {
      const skillsData: SkillForSave[] = aiResult ? convertToSaveFormat(aiResult, skillSelections) : [];
      
      // 按类别分组技能
      const hardSkills = skillsData
        .filter(s => s.category === 'professional' || s.category === 'office')
        .map(s => s.name);
      const softSkills = skillsData
        .filter(s => s.category === 'soft')
        .map(s => s.name);
      
      // 直接发送数据库字段名，不做映射转换
      const requestBody = {
        major: form.major || undefined,
        target_job: form.job_intention || undefined,
        grade: form.grade || undefined,
        target_cities: form.city ? [form.city] : undefined,
        hard_skills: hardSkills.length > 0 ? hardSkills : undefined,
        soft_skills: softSkills.length > 0 ? softSkills : undefined,
      };
      
      console.log('[skill-portrait] 保存请求:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });
      
      console.log('[skill-portrait] 响应状态:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[skill-portrait] HTTP错误:', response.status, errorText);
        showToast(`保存失败 (${response.status}): ${errorText}`, 'error', 5000);
        return;
      }
      
      const data = await response.json();
      console.log('[skill-portrait] 响应数据:', data);
      
      if (data.success) {
        localStorage.setItem('skill-portrait-done', 'true');
        showToast('技能画像保存成功', 'success', 2000);
        setTimeout(() => router.push('/profile'), 800);
      } else {
        showToast(data.error || data.message || '保存失败，请稍后重试', 'error', 5000);
      }
    } catch (error) {
      console.error('[skill-portrait] 保存异常:', error);
      showToast(`网络错误: ${error instanceof Error ? error.message : '请稍后重试'}`, 'error', 5000);
    } finally {
      setSaving(false);
    }
  };

  // 未登录提示
  if (!user && !authLoading && !fetching) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4">
          {/* 页面标题 */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#165DFF] to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-[#165DFF]/30 mb-4">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">AI技能画像</h1>
            <p className="text-gray-500 mt-2">基于你的专业和求职方向，AI为你推荐最匹配的技能组合</p>
          </div>

          {/* 登录提示卡片 */}
          <Card className="border-blue-200 shadow-xl">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Lock className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">登录解锁完整功能</h3>
              <p className="text-gray-500 mb-6">登录后可保存技能画像，追踪学习进度，获取个性化推荐</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <Link href="/auth">
                  <Button className="w-full sm:w-auto px-8 py-6 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
                    <LogIn className="w-5 h-5 mr-2" />
                    立即登录
                  </Button>
                </Link>
                <Link href="/jobs">
                  <Button variant="outline" className="w-full sm:w-auto px-6 py-6">
                    先浏览岗位
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (fetching || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" />
      </div>
    );
  }

  const selectedSkillCount = Object.values(skillSelections).filter(s => s.selected).length;

  // 获取选中的技能列表（用于差距分析）
  const getSelectedSkillsList = () => {
    const skills: { name: string; level: ProficiencyLevel }[] = [];
    
    if (aiResult) {
      // 专业技能
      aiResult.professionalSkills.forEach(skill => {
        const key = `professional_${skill.name}`;
        if (skillSelections[key]?.selected) {
          skills.push({ name: skill.name, level: skillSelections[key].level });
        }
      });
      // 办公技能
      aiResult.officeSkills.forEach(skill => {
        const key = `office_${skill.name}`;
        if (skillSelections[key]?.selected) {
          skills.push({ name: skill.name, level: skillSelections[key].level });
        }
      });
      // 软技能
      aiResult.softSkills.forEach(skill => {
        const key = `soft_${skill.name}`;
        if (skillSelections[key]?.selected) {
          skills.push({ name: skill.name, level: skillSelections[key].level });
        }
      });
    }
    
    return skills;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-gradient-to-r from-[#1E40AF] to-[#1E3A8A] sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => currentStep === 1 ? router.push('/') : goPrev()} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-white">技能画像</h1>
            <p className="text-xs text-blue-200">AI帮你精准定位职业能力</p>
          </div>
        </div>
      </div>

      {/* 秋招备战进度条 */}
      <AutumnRecruitProgressBar />

      {/* 进度条 */}
      <div className="max-w-2xl mx-auto px-4">
        <StepProgressBar currentStep={currentStep} />
      </div>

      {/* 内容区域 */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
        {/* 第1步：基本信息 */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#165DFF] to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-[#165DFF]/30">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mt-4">AI技能画像分析</h2>
              <p className="text-sm text-gray-500 mt-1">基于你的专业和求职方向，AI为你推荐最匹配的技能组合</p>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-[#165DFF]" />
                  学业信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">专业 <span className="text-red-500">*</span></Label>
                  <Combobox options={MAJOR_OPTIONS} value={form.major} onChange={(v) => updateForm('major', v)} placeholder="选择或输入你的专业" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1.5 block">年级</Label>
                    <SelectCombobox options={GRADE_OPTIONS.map(g => ({ value: g, label: g }))} value={form.grade} onChange={(v) => updateForm('grade', v)} placeholder="选择年级" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1.5 block">毕业年份</Label>
                    <SelectCombobox options={GRADUATION_YEAR_OPTIONS.map(y => ({ value: y, label: y + '年' }))} value={form.graduation_year} onChange={(v) => updateForm('graduation_year', v)} placeholder="选择年份" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-[#165DFF]" />
                  求职意向
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">意向城市 <span className="text-red-500">*</span></Label>
                  <Combobox options={CITY_OPTIONS} value={form.city} onChange={(v) => updateForm('city', v)} placeholder="选择或输入意向城市" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">求职意向 <span className="text-red-500">*</span></Label>
                  <Combobox options={JOB_INTENTION_OPTIONS} value={form.job_intention} onChange={(v) => updateForm('job_intention', v)} placeholder="选择或输入求职方向" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">意向行业</Label>
                  <Combobox options={INDUSTRY_OPTIONS} value={form.target_industry} onChange={(v) => updateForm('target_industry', v)} placeholder="选择意向行业（可选）" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 第2步：AI技能推荐 */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {aiLoading ? (
              <Card className="border-0 shadow-md">
                <CardContent className="py-16 flex flex-col items-center justify-center">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#165DFF]/10 to-purple-500/10 flex items-center justify-center">
                      <Brain className="w-10 h-10 text-[#165DFF] animate-pulse" />
                    </div>
                    <div className="absolute -inset-2 rounded-full border-2 border-[#165DFF]/20 border-t-[#165DFF] animate-spin" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mt-6">AI正在分析你的专业能力画像</h3>
                  <p className="text-sm text-gray-500 mt-2 text-center max-w-sm">
                    基于你的专业「{form.major}」和目标行业「{form.target_industry || '综合'}」，正在为你推荐最佳技能组合...
                  </p>
                  <div className="flex items-center gap-1 mt-4">
                    <div className="w-2 h-2 rounded-full bg-[#165DFF] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-[#165DFF] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-[#165DFF] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </CardContent>
              </Card>
            ) : aiResult ? (
              <>
                <Card className="border-0 shadow-md bg-gradient-to-br from-[#165DFF]/5 to-purple-500/5">
                  <CardContent className="py-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#165DFF] to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-[#165DFF]/30">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">技能画像分析完成</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          基于你的专业「{form.major}」和求职方向「{form.job_intention}」，为你推荐了{' '}
                          <span className="text-[#165DFF] font-semibold">{aiResult.professionalSkills.length + aiResult.officeSkills.length + aiResult.softSkills.length}</span> 项技能
                        </p>
                        <div className="flex gap-3 mt-3">
                          <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">专业技能 {aiResult.professionalSkills.length} 项</span>
                          <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full">办公技能 {aiResult.officeSkills.length} 项</span>
                          <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-full">软技能 {aiResult.softSkills.length} 项</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {aiRawText && (
                  <Card><CardContent className="py-4"><p className="text-sm text-gray-600 whitespace-pre-line">{aiRawText}</p></CardContent></Card>
                )}
                {aiResult.summary && (
                  <Card className="border-l-4 border-l-[#165DFF]">
                    <CardContent className="py-4">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-[#165DFF] mt-0.5 shrink-0" />
                        <p className="text-sm text-gray-700">{aiResult.summary}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-12 flex flex-col items-center">
                  <AlertCircle className="w-10 h-10 text-gray-400 mb-3" />
                  <p className="text-gray-500">AI推荐暂未生成</p>
                  <Button className="mt-4 bg-[#165DFF] hover:bg-[#165DFF]/90" onClick={fetchSkillRecommendation}>重新生成</Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 第3步：选择技能 */}
        {currentStep === 3 && aiResult && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  专业核心技能
                  <span className="text-xs font-normal text-gray-500 ml-1">基于你的专业和目标行业推荐</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {aiResult.professionalSkills.map((skill) => {
                  const key = `professional_${skill.name}`;
                  const sel = skillSelections[key];
                  return (
                    <SkillSelectItem key={key} skill={skill} category="professional"
                      selected={sel?.selected ?? (skill.hotness !== 'optional')}
                      level={sel?.level || '了解'}
                      onToggle={() => toggleSkill(key, skill.hotness)}
                      onLevelChange={(lvl) => setSkillLevel(key, lvl)}
                    />
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-green-600" />
                  通用办公技能
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {aiResult.officeSkills.map((skill) => {
                  const key = `office_${skill.name}`;
                  const sel = skillSelections[key];
                  return (
                    <SkillSelectItem key={key} skill={skill} category="office"
                      selected={sel?.selected ?? (skill.hotness !== 'optional')}
                      level={sel?.level || '了解'}
                      onToggle={() => toggleSkill(key, skill.hotness)}
                      onLevelChange={(lvl) => setSkillLevel(key, lvl)}
                    />
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  软技能
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {aiResult.softSkills.map((skill) => {
                  const key = `soft_${skill.name}`;
                  const sel = skillSelections[key];
                  return (
                    <SkillSelectItem key={key} skill={skill} category="soft"
                      selected={sel?.selected ?? (skill.hotness !== 'optional')}
                      level={sel?.level || '熟悉'}
                      onToggle={() => toggleSkill(key, skill.hotness)}
                      onLevelChange={(lvl) => setSkillLevel(key, lvl)}
                    />
                  );
                })}
              </CardContent>
            </Card>

            {aiResult.summary && (
              <Card className="bg-blue-50/50 border-blue-100">
                <CardContent className="py-4">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-[#165DFF] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#165DFF] mb-1">AI综合分析</p>
                      <p className="text-sm text-gray-700">{aiResult.summary}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-gray-600">+ 手动添加技能</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 items-center">
                  <select value={customSkillCategory} onChange={(e) => setCustomSkillCategory(e.target.value as 'professional' | 'office' | 'soft')} className="px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                    <option value="professional">专业</option>
                    <option value="office">办公</option>
                    <option value="soft">软技能</option>
                  </select>
                  <Input value={customSkillInput} onChange={(e) => setCustomSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addCustomSkill(); }}
                    placeholder="输入技能名称，回车添加" className="flex-1" />
                  <Button onClick={addCustomSkill} disabled={!customSkillInput.trim()} variant="outline" size="sm">添加</Button>
                </div>
              </CardContent>
            </Card>

            <div className="text-center text-sm text-gray-500">
              已选择 <span className="text-[#165DFF] font-semibold">{selectedSkillCount}</span> 项技能
            </div>
          </div>
        )}

        {/* 第4步：完成 */}
        {currentStep === 4 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <Card className="border-0 shadow-md">
              <CardContent className="py-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mt-4">信息确认</h3>
                  <p className="text-sm text-gray-500 mt-1">确认以下信息无误后保存</p>
                </div>
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">专业</span>
                    <span className="text-sm font-medium text-gray-900">{form.major || '未填写'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">年级</span>
                    <span className="text-sm font-medium text-gray-900">{form.grade || '未填写'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">意向城市</span>
                    <span className="text-sm font-medium text-gray-900">{form.city || '未填写'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">求职意向</span>
                    <span className="text-sm font-medium text-gray-900">{form.job_intention || '未填写'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-500">已选技能</span>
                    <span className="text-sm font-semibold text-[#165DFF]">{selectedSkillCount} 项</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {aiResult && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-700">技能概览</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {aiResult.professionalSkills.filter((_, i) => skillSelections[`professional_${aiResult.professionalSkills[i].name}`]?.selected).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-blue-600 mb-1.5">专业核心技能</p>
                        <div className="flex flex-wrap gap-1.5">
                          {aiResult.professionalSkills.map((skill) => {
                            const key = `professional_${skill.name}`;
                            if (!skillSelections[key]?.selected) return null;
                            const level = skillSelections[key]?.level || '了解';
                            const config = PROFICIENCY_CONFIG[level];
                            return (
                              <span key={key} className="text-xs px-2 py-1 rounded-full border"
                                style={{ color: config.color, borderColor: config.color + '40', backgroundColor: config.bgColor }}>
                                {skill.name} · {level}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {aiResult.officeSkills.filter((_, i) => skillSelections[`office_${aiResult.officeSkills[i].name}`]?.selected).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-600 mb-1.5">办公技能</p>
                        <div className="flex flex-wrap gap-1.5">
                          {aiResult.officeSkills.map((skill) => {
                            const key = `office_${skill.name}`;
                            if (!skillSelections[key]?.selected) return null;
                            const level = skillSelections[key]?.level || '了解';
                            const config = PROFICIENCY_CONFIG[level];
                            return (
                              <span key={key} className="text-xs px-2 py-1 rounded-full border"
                                style={{ color: config.color, borderColor: config.color + '40', backgroundColor: config.bgColor }}>
                                {skill.name} · {level}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {aiResult.softSkills.filter((_, i) => skillSelections[`soft_${aiResult.softSkills[i].name}`]?.selected).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-purple-600 mb-1.5">软技能</p>
                        <div className="flex flex-wrap gap-1.5">
                          {aiResult.softSkills.map((skill) => {
                            const key = `soft_${skill.name}`;
                            if (!skillSelections[key]?.selected) return null;
                            const level = skillSelections[key]?.level || '熟悉';
                            const config = PROFICIENCY_CONFIG[level];
                            return (
                              <span key={key} className="text-xs px-2 py-1 rounded-full border"
                                style={{ color: config.color, borderColor: config.color + '40', backgroundColor: config.bgColor }}>
                                {skill.name} · {level}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 目标岗位差距分析 */}
            <TargetJobGapAnalysis 
              userSkills={getSelectedSkillsList()} 
              hasSkillPortrait={selectedSkillCount > 0}
            />
          </div>
        )}
      </div>

      {/* 底部固定按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {currentStep > 1 && (
            <Button variant="outline" onClick={goPrev} className="flex-1">
              <ChevronLeft className="w-4 h-4 mr-1" />上一步
            </Button>
          )}
          {currentStep < 4 ? (
            <Button onClick={goNext} disabled={currentStep === 1 && !isStep1Valid} className="flex-1 bg-[#165DFF] hover:bg-[#165DFF]/90">
              下一步 <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[#165DFF] hover:bg-[#165DFF]/90">
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />保存中...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />完成并保存</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
