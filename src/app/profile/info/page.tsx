'use client';

import {useState, useEffect, useMemo, useCallback, Suspense} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { ChevronLeft,
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
  GraduationCap,
  Lightbulb,
  AlertCircle } from 'lucide-react';
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

const MBTI_TYPES = [
  { value: 'INTJ', label: 'INTJ - 策略家' }, { value: 'INTP', label: 'INTP - 逻辑学家' },
  { value: 'ENTJ', label: 'ENTJ - 指挥官' }, { value: 'ENTP', label: 'ENTP - 辩论家' },
  { value: 'INFJ', label: 'INFJ - 提倡者' }, { value: 'INFP', label: 'INFP - 调停者' },
  { value: 'ENFJ', label: 'ENFJ - 主人公' }, { value: 'ENFP', label: 'ENFP - 竞选者' },
  { value: 'ISTJ', label: 'ISTJ - 物流师' }, { value: 'ISFJ', label: 'ISFJ - 守卫者' },
  { value: 'ESTJ', label: 'ESTJ - 总经理' }, { value: 'ESFJ', label: 'ESFJ - 执政官' },
  { value: 'ISTP', label: 'ISTP - 鉴赏家' }, { value: 'ISFP', label: 'ISFP - 探险家' },
  { value: 'ESTP', label: 'ESTP - 企业家' }, { value: 'ESFP', label: 'ESFP - 表演者' },
];

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

// ==================== Combobox 组件 ====================

interface ComboboxProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function Combobox({ options, value, onChange, placeholder = '请选择或输入...' }: ComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={open}
          aria-controls="skills-listbox"
          className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-left hover:border-[#165DFF] focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 outline-none transition-colors bg-white"
        >
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>
            {value || placeholder}
          </span>
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
                onClick={() => { onChange((document.querySelector('[cmdk-input]') as HTMLInputElement)?.value || ''); setOpen(false); }}
              >
                使用当前输入
              </button>
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={(currentValue: string) => {
                    onChange(currentValue);
                    setOpen(false);
                  }}
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

// ==================== SelectCombobox 组件 ====================

interface SelectComboboxProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function SelectCombobox({ options, value, onChange, placeholder = '请选择...' }: SelectComboboxProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-controls="levels-listbox"
          aria-expanded={open}
          className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-left hover:border-[#165DFF] focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 outline-none transition-colors bg-white"
        >
          <span className={selectedLabel ? 'text-gray-900' : 'text-gray-400'}>
            {selectedLabel || placeholder}
          </span>
          <ChevronsUpDown className="w-4 h-4 text-gray-400 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索..." />
          <CommandList>
            <CommandEmpty>未找到匹配项</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
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

// ==================== 进度条组件 ====================

const STEPS = [
  { id: 1, title: '基本信息', icon: User, description: '专业、年级、意向' },
  { id: 2, title: 'AI技能推荐', icon: Sparkles, description: '智能分析推荐' },
  { id: 3, title: '选择技能', icon: Target, description: '勾选并设定熟练度' },
  { id: 4, title: '完成', icon: Check, description: '保存信息' },
];

function StepProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="w-full sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-4 px-2">
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

// ==================== 技能选择项组件 ====================

function SkillSelectItem({
  skill,
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  category,
  selected,
  level,
  onToggle,
  onLevelChange,
}: {
  skill: SkillItem;
  category: string;
  selected: boolean;
  level: ProficiencyLevel;
  onToggle: () => void;
  onLevelChange: (level: ProficiencyLevel) => void;
}) {
  const hotnessLabel = skill.hotness === 'hot' ? '🔥 热门' : skill.hotness === 'optional' ? '可选' : '';
  const hotnessColor = skill.hotness === 'hot' ? 'text-red-500 bg-red-50' : skill.hotness === 'optional' ? 'text-gray-500 bg-gray-50' : '';

  return (
    <div className={`border rounded-lg p-3 transition-all duration-200 ${
      selected ? 'border-[#165DFF]/40 bg-[#165DFF]/5 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
    }`}>
      <div className="flex items-start gap-3">
        {/* 勾选框 */}
        <button
          onClick={onToggle}
          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
            selected
              ? 'bg-[#165DFF] border-[#165DFF] text-white'
              : 'border-gray-300 hover:border-[#165DFF]'
          }`}
        >
          {selected && <Check className="w-3 h-3" />}
        </button>

        {/* 技能信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 text-sm">{skill.name}</span>
            {hotnessLabel && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${hotnessColor}`}>
                {hotnessLabel}
              </span>
            )}
          </div>
          {skill.description && (
            <p className="text-xs text-gray-500 mt-0.5">{skill.description}</p>
          )}

          {/* 熟练度选择 - 仅选中时显示 */}
          {selected && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500 shrink-0">熟练度:</span>
              <div className="flex gap-1.5 flex-wrap">
                {(['了解', '熟悉', '熟练', '精通'] as ProficiencyLevel[]).map((lvl) => {
                  const config = PROFICIENCY_CONFIG[lvl];
                  const isActive = level === lvl;
                  return (
                    <button
                      key={lvl}
                      onClick={() => onLevelChange(lvl)}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                        isActive
                          ? `border-transparent text-white shadow-sm`
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                      }`}
                      style={isActive ? { backgroundColor: config.color } : {}}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== 主页面组件 ====================

interface ProfileForm {
  personality_type: string;
  major: string;
  grade: string;
  graduation_year: string;
  city: string;
  job_intention: string;
  target_industry: string;
  skills: string[];
  internship_experience: string;
  project_experience: string;
  awards: string;
}

export default function ProfileInfoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" />
          <p className="text-sm text-gray-500">加载中...</p>
        </div>
      </div>
    }>
      <ProfileInfoContent />
    </Suspense>
  );
}

function ProfileInfoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPage = searchParams.get('from') || '';
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [_loading, _setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // 表单数据
  const [form, setForm] = useState<ProfileForm>({
    personality_type: '',
    major: '',
    grade: '',
    graduation_year: '',
    city: '',
    job_intention: '',
    target_industry: '',
    skills: [],
    internship_experience: '',
    project_experience: '',
    awards: '',
  });

  // 岗位列表（从job_descriptions表获取）
  const [jobOptions, setJobOptions] = useState<string[]>(JOB_INTENTION_OPTIONS);

  // 获取岗位列表
  useEffect(() => {
    const fetchJobOptions = async () => {
      try {
        const response = await fetch('/api/jobs/list', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.code === 200 && Array.isArray(data.data) && data.data.length > 0) {
            // 从job_descriptions表获取唯一岗位名称
            const jobs = [...new Set(data.data.map((j: { job_title?: string }) => j.job_title).filter(Boolean))];
            if (jobs.length > 0) {
              setJobOptions(jobs as string[]);
            }
          }
        }
      } catch {
        console.log('获取岗位列表失败，使用默认选项');
      }
    };
    fetchJobOptions();
  }, []);

  // AI 推荐结果
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<SkillPortraitResult | null>(null);
  const [aiRawText, setAiRawText] = useState('');

  // 技能选择状态
  const [skillSelections, setSkillSelections] = useState<Record<string, { selected: boolean; level: ProficiencyLevel }>>({});

  // 自定义添加技能
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [customSkillCategory, setCustomSkillCategory] = useState<'professional' | 'office' | 'soft'>('professional');

  // 保存中状态
  const [saving, setSaving] = useState(false);


  // 页面加载时获取用户信息
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
      return;
    }
    if (user) {
// eslint-disable-next-line
      fetchProfile();
    }
  }, [user, authLoading, router]);

  // Bug 2 修复: 监听 skill-portrait 页面保存完成信号
  useEffect(() => {
    const checkSkillPortraitDone = () => {
      const done = localStorage.getItem('skill-portrait-done');
      if (done === 'true') {
        localStorage.removeItem('skill-portrait-done');
        fetchProfile();
      }
    };
    
    // 初始检查
    checkSkillPortraitDone();
    
    // 监听 storage 事件（跨标签页）
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'skill-portrait-done') {
        checkSkillPortraitDone();
      }
    };
    window.addEventListener('storage', handleStorage);
    
    // 轮询检查（同标签页）
    const interval = setInterval(checkSkillPortraitDone, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  // Bug 3 修复: 从 API 获取岗位列表
  useEffect(() => {
    const fetchJobOptions = async () => {
      try {
        const response = await fetch('/api/jobs?limit=100');
        const data = await response.json();
        // 修复 dead bug：原代码读 data.code===200 && data.data?.jobs，俩字段在 /api/jobs 响应中均不存在
        if (data.ok && Array.isArray(data.data?.items)) {
          const uniquePositions = [...new Set(
            data.data.items.map((j: { name?: string }) => j.name).filter(Boolean)
          )];
          if (uniquePositions.length > 0) {
            setJobOptions(uniquePositions as string[]);
          }
        }
      } catch (error) {
        console.error('获取岗位列表失败:', error);
      }
    };
    fetchJobOptions();
  }, []);

  // 获取用户个人信息
  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        credentials: 'include',
      });
      const data = await response.json();
      console.log('[profile/info] 加载数据:', data);

        if (data.code === 200 && data.data?.profile) {
          const profile = data.data.profile;
          // 预填基本字段
          const newForm = {
            personality_type: profile.personality_type || '',
            major: profile.major || '',
            grade: profile.grade || '',
            graduation_year: profile.graduation_year ? String(profile.graduation_year) : '',
            city: profile.target_cities?.[0] || profile.city || '',
            job_intention: profile.target_job || '',
            target_industry: profile.target_industry || '',
            skills: [],
            internship_experience: profile.internship_experience || '',
            project_experience: profile.project_experience || '',
            awards: profile.awards || '',
          };
          setForm(newForm);

          // 如果已有 jsonb 技能数据，恢复选择状态
          const skills = data.data.skills;
          if (Array.isArray(skills) && skills.length > 0 && typeof skills[0] === 'object') {
            const selections: Record<string, { selected: boolean; level: ProficiencyLevel }> = {};
            for (const s of skills) {
              const cat = (s as Record<string, unknown>).category as string;
              const name = (s as Record<string, unknown>).name as string;
              const level = (s as Record<string, unknown>).level as string;
              if (cat && name) {
                const levelMap: Record<string, ProficiencyLevel> = {
                  '了解': '了解', '熟悉': '熟悉', '熟练': '熟练', '精通': '精通',
                };
                selections[`${cat}_${name}`] = { selected: true, level: levelMap[level] || '熟悉' };
              }
            }
            if (Object.keys(selections).length > 0) {
              setSkillSelections(selections);
            }
          }
        } else if (data.code === 404) {
          // 新用户，无画像记录，保持默认空表单
          console.log('[profile/info] 新用户，无已有画像');
        }
    } catch (error) {
      console.error('获取个人信息失败:', error);
    } finally {
      setFetching(false);
    }
  };

  // 表单更新
  const updateForm = (field: keyof ProfileForm, value: string | string[]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // 第1步验证
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
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString(),
        },
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
      if (!reader) {
        showToast('无法读取AI响应', 'error', 3000);
        setAiLoading(false);
        return;
      }

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
                // 解析完整文本
                const result = parseSkillPortrait(fullText);
                setAiResult(result);
                setAiRawText(result.rawText);

                // 初始化选择状态：hot 和 normal 默认选中
                const initialSelections: Record<string, { selected: boolean; level: ProficiencyLevel }> = {};
                for (const skill of result.professionalSkills) {
                  initialSelections[`professional_${skill.name}`] = {
                    selected: skill.hotness !== 'optional',
                    level: skill.hotness === 'hot' ? '熟悉' : '了解',
                  };
                }
                for (const skill of result.officeSkills) {
                  initialSelections[`office_${skill.name}`] = {
                    selected: skill.hotness !== 'optional',
                    level: skill.hotness === 'hot' ? '熟悉' : '了解',
                  };
                }
                for (const skill of result.softSkills) {
                  initialSelections[`soft_${skill.name}`] = {
                    selected: skill.hotness !== 'optional',
                    level: '熟悉',
                  };
                }
                setSkillSelections(prev => ({ ...initialSelections, ...prev }));
                setAiLoading(false);
                return;
              } else if (parsed.type === 'error') {
                showToast(parsed.message || 'AI推荐失败', 'error', 3000);
                setAiLoading(false);
                return;
              }
            } catch {
              // 非JSON行，忽略
            }
          }
        }
      }

      // 流结束但无done事件
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
    if (currentStep === 2 && !aiResult) {
      showToast('请等待AI推荐完成', 'error', 3000);
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

  // 技能选择操作
  const toggleSkill = (key: string, hotness: SkillItem['hotness']) => {
    setSkillSelections(prev => ({
      ...prev,
      [key]: {
        selected: !(prev[key]?.selected ?? (hotness !== 'optional')),
        level: prev[key]?.level || (hotness === 'hot' ? '熟悉' : '了解'),
      },
    }));
  };

  const setSkillLevel = (key: string, level: ProficiencyLevel) => {
    setSkillSelections(prev => ({
      ...prev,
      [key]: { ...prev[key], selected: true, level },
    }));
  };

  // 添加自定义技能
  const addCustomSkill = () => {
    if (!customSkillInput.trim()) return;
    const name = customSkillInput.trim();
    const key = `${customSkillCategory}_${name}`;

    // 添加到AI结果中
    if (aiResult) {
      const newSkill: SkillItem = { name, hotness: 'normal', description: '自定义技能' };
      if (customSkillCategory === 'professional') {
        setAiResult(prev => prev ? { ...prev, professionalSkills: [...prev.professionalSkills, newSkill] } : prev);
      } else if (customSkillCategory === 'office') {
        setAiResult(prev => prev ? { ...prev, officeSkills: [...prev.officeSkills, newSkill] } : prev);
      } else {
        setAiResult(prev => prev ? { ...prev, softSkills: [...prev.softSkills, newSkill] } : prev);
      }
    }

    setSkillSelections(prev => ({
      ...prev,
      [key]: { selected: true, level: '了解' },
    }));

    setCustomSkillInput('');
  };

  // 最终保存
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // 构建技能数据
      const skillsData: SkillForSave[] = aiResult
        ? convertToSaveFormat(aiResult, skillSelections)
        : [];

      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          personality_type: form.personality_type || undefined,
          major: form.major || undefined,
          grade: form.grade || undefined,
          graduation_year: form.graduation_year ? parseInt(form.graduation_year) : undefined,
          target_cities: form.city ? [form.city] : undefined,
          target_job: form.job_intention || undefined,
          target_industry: form.target_industry || undefined,
          hard_skills: skillsData.filter(s => s.category === 'professional' || s.category === 'office').map(s => s.name),
          soft_skills: skillsData.filter(s => s.category === 'soft').map(s => s.name),
          internship_experience: form.internship_experience || undefined,
          project_experience: form.project_experience || undefined,
          awards: form.awards || undefined,
        }),
      });

      const data = await response.json();
      console.log('[profile/info] 保存响应:', data);

      if (data.code === 200) {
        showToast('✅ 信息保存成功', 'success', 3000);
        setTimeout(() => {
          router.push((fromPage || '/profile') + '?updated=1');
        }, 800);
      } else {
        showToast('❌ ' + (data.error || '保存失败，请稍后重试'), 'error', 5000);
      }
    } catch (error) {
      console.error('保存失败:', error);
      showToast('网络错误，请稍后重试', 'error', 5000);
    } finally {
      setSaving(false);
    }
  };

  // 加载中
  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" />
      </div>
    );
  }

  // 统计选中技能数
  const selectedSkillCount = Object.values(skillSelections).filter(s => s.selected).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => currentStep === 1 ? router.push(fromPage || '/profile') : goPrev()}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">完善个人信息</h1>
        </div>
      </div>

      {/* 进度条 */}
      <div className="max-w-2xl mx-auto px-4">
        <StepProgressBar currentStep={currentStep} />
      </div>

      {/* 内容区域 */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
        {/* ============ 第1步：基本信息 ============ */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-[#165DFF]" />
                  学业信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    专业 <span className="text-red-500">*</span>
                  </Label>
                  <Combobox
                    options={MAJOR_OPTIONS}
                    value={form.major}
                    onChange={(v) => updateForm('major', v)}
                    placeholder="选择或输入你的专业"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1.5 block">年级</Label>
                    <SelectCombobox
                      options={GRADE_OPTIONS.map(g => ({ value: g, label: g }))}
                      value={form.grade}
                      onChange={(v) => updateForm('grade', v)}
                      placeholder="选择年级"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1.5 block">毕业年份</Label>
                    <SelectCombobox
                      options={GRADUATION_YEAR_OPTIONS.map(y => ({ value: y, label: y + '年' }))}
                      value={form.graduation_year}
                      onChange={(v) => updateForm('graduation_year', v)}
                      placeholder="选择年份"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">人格类型</Label>
                  <SelectCombobox
                    options={MBTI_TYPES}
                    value={form.personality_type}
                    onChange={(v) => updateForm('personality_type', v)}
                    placeholder="选择你的MBTI人格"
                  />
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
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    意向城市 <span className="text-red-500">*</span>
                  </Label>
                  <Combobox
                    options={CITY_OPTIONS}
                    value={form.city}
                    onChange={(v) => updateForm('city', v)}
                    placeholder="选择或输入意向城市"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    求职意向 <span className="text-red-500">*</span>
                  </Label>
                  <Combobox
                    options={jobOptions}
                    value={form.job_intention}
                    onChange={(v) => updateForm('job_intention', v)}
                    placeholder="选择或输入求职方向"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">意向行业</Label>
                  <Combobox
                    options={INDUSTRY_OPTIONS}
                    value={form.target_industry}
                    onChange={(v) => updateForm('target_industry', v)}
                    placeholder="选择意向行业（可选）"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-[#165DFF]" />
                  经历（可选）
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">实习经历</Label>
                  <Textarea
                    value={form.internship_experience}
                    onChange={(e) => updateForm('internship_experience', e.target.value)}
                    placeholder="简述你的实习经历..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">项目经历</Label>
                  <Textarea
                    value={form.project_experience}
                    onChange={(e) => updateForm('project_experience', e.target.value)}
                    placeholder="简述你的项目经历..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">获奖情况</Label>
                  <Textarea
                    value={form.awards}
                    onChange={(e) => updateForm('awards', e.target.value)}
                    placeholder="简述你的获奖情况..."
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ============ 第2步：AI技能推荐 ============ */}
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
                    基于你的专业「{form.major}」和目标行业「{form.target_industry || '综合'}」，
                    正在为你推荐最佳技能组合...
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
                          基于你的专业「{form.major}」和求职方向「{form.job_intention}」，
                          为你推荐了 <span className="text-[#165DFF] font-semibold">
                            {aiResult.professionalSkills.length + aiResult.officeSkills.length + aiResult.softSkills.length}
                          </span> 项技能
                        </p>
                        <div className="flex gap-3 mt-3">
                          <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                            专业技能 {aiResult.professionalSkills.length} 项
                          </span>
                          <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full">
                            办公技能 {aiResult.officeSkills.length} 项
                          </span>
                          <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-full">
                            软技能 {aiResult.softSkills.length} 项
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {aiRawText && (
                  <Card>
                    <CardContent className="py-4">
                      <p className="text-sm text-gray-600 whitespace-pre-line">{aiRawText}</p>
                    </CardContent>
                  </Card>
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
                  <Button
                    className="mt-4 bg-[#165DFF] hover:bg-[#165DFF]/90"
                    onClick={fetchSkillRecommendation}
                  >
                    重新生成
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ============ 第3步：选择技能+熟练度 ============ */}
        {currentStep === 3 && aiResult && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* 专业核心技能 */}
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
                    <SkillSelectItem
                      key={key}
                      skill={skill}
                      category="professional"
                      selected={sel?.selected ?? (skill.hotness !== 'optional')}
                      level={sel?.level || '了解'}
                      onToggle={() => toggleSkill(key, skill.hotness)}
                      onLevelChange={(lvl) => setSkillLevel(key, lvl)}
                    />
                  );
                })}
              </CardContent>
            </Card>

            {/* 通用办公技能 */}
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
                    <SkillSelectItem
                      key={key}
                      skill={skill}
                      category="office"
                      selected={sel?.selected ?? (skill.hotness !== 'optional')}
                      level={sel?.level || '了解'}
                      onToggle={() => toggleSkill(key, skill.hotness)}
                      onLevelChange={(lvl) => setSkillLevel(key, lvl)}
                    />
                  );
                })}
              </CardContent>
            </Card>

            {/* 软技能 */}
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
                    <SkillSelectItem
                      key={key}
                      skill={skill}
                      category="soft"
                      selected={sel?.selected ?? (skill.hotness !== 'optional')}
                      level={sel?.level || '熟悉'}
                      onToggle={() => toggleSkill(key, skill.hotness)}
                      onLevelChange={(lvl) => setSkillLevel(key, lvl)}
                    />
                  );
                })}
              </CardContent>
            </Card>

            {/* AI总结 */}
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

            {/* 手动添加技能 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-gray-600">+ 手动添加技能</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 items-center">
                  <select
                    value={customSkillCategory}
                    onChange={(e) => setCustomSkillCategory(e.target.value as 'professional' | 'office' | 'soft')}
                    className="px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  >
                    <option value="professional">专业</option>
                    <option value="office">办公</option>
                    <option value="soft">软技能</option>
                  </select>
                  <Input
                    value={customSkillInput}
                    onChange={(e) => setCustomSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addCustomSkill(); }}
                    placeholder="输入技能名称，回车添加"
                    className="flex-1"
                  />
                  <Button
                    onClick={addCustomSkill}
                    disabled={!customSkillInput.trim()}
                    variant="outline"
                    size="sm"
                  >
                    添加
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 已选统计 */}
            <div className="text-center text-sm text-gray-500">
              已选择 <span className="text-[#165DFF] font-semibold">{selectedSkillCount}</span> 项技能
            </div>
          </div>
        )}

        {/* ============ 第4步：完成 ============ */}
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
                  {/* 基本信息 */}
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
                  {form.personality_type && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">人格类型</span>
                      <span className="text-sm font-medium text-gray-900">{form.personality_type}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-500">已选技能</span>
                    <span className="text-sm font-semibold text-[#165DFF]">{selectedSkillCount} 项</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 技能概览 */}
            {aiResult && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-700">技能概览</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {aiResult.professionalSkills.filter((_, i) => {
                      const key = `professional_${aiResult.professionalSkills[i]!.name}`;
                      return skillSelections[key]?.selected;
                    }).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-blue-600 mb-1.5">专业核心技能</p>
                        <div className="flex flex-wrap gap-1.5">
                          {aiResult.professionalSkills.map((skill) => {
                            const key = `professional_${skill.name}`;
                            if (!skillSelections[key]?.selected) return null;
                            const level = skillSelections[key]?.level || '了解';
                            const config = PROFICIENCY_CONFIG[level];
                            return (
                              <span
                                key={key}
                                className="text-xs px-2 py-1 rounded-full border"
                                style={{ color: config.color, borderColor: config.color + '40', backgroundColor: config.bgColor }}
                              >
                                {skill.name} · {level}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {aiResult.officeSkills.filter((_, i) => {
                      const key = `office_${aiResult.officeSkills[i]!.name}`;
                      return skillSelections[key]?.selected;
                    }).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-600 mb-1.5">办公技能</p>
                        <div className="flex flex-wrap gap-1.5">
                          {aiResult.officeSkills.map((skill) => {
                            const key = `office_${skill.name}`;
                            if (!skillSelections[key]?.selected) return null;
                            const level = skillSelections[key]?.level || '了解';
                            const config = PROFICIENCY_CONFIG[level];
                            return (
                              <span
                                key={key}
                                className="text-xs px-2 py-1 rounded-full border"
                                style={{ color: config.color, borderColor: config.color + '40', backgroundColor: config.bgColor }}
                              >
                                {skill.name} · {level}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {aiResult.softSkills.filter((_, i) => {
                      const key = `soft_${aiResult.softSkills[i]!.name}`;
                      return skillSelections[key]?.selected;
                    }).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-purple-600 mb-1.5">软技能</p>
                        <div className="flex flex-wrap gap-1.5">
                          {aiResult.softSkills.map((skill) => {
                            const key = `soft_${skill.name}`;
                            if (!skillSelections[key]?.selected) return null;
                            const level = skillSelections[key]?.level || '熟悉';
                            const config = PROFICIENCY_CONFIG[level];
                            return (
                              <span
                                key={key}
                                className="text-xs px-2 py-1 rounded-full border"
                                style={{ color: config.color, borderColor: config.color + '40', backgroundColor: config.bgColor }}
                              >
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
          </div>
        )}
      </div>

      {/* 底部固定按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={goPrev}
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              上一步
            </Button>
          )}

          {currentStep < 4 ? (
            <Button
              onClick={goNext}
              disabled={currentStep === 1 && !isStep1Valid}
              className="flex-1 bg-[#165DFF] hover:bg-[#165DFF]/90"
            >
              下一步
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-[#165DFF] hover:bg-[#165DFF]/90"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  完成并保存
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
