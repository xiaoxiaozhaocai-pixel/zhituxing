'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo, useRef } from 'react';
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
import {
  User,
  Briefcase,
  GraduationCap,
  Award,
  MapPin,
  Save,
  RotateCcw,
  Loader2,
  X,
  Plus,
  Sparkles,
  CircleCheck,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== 预设选项数据 ====================

// MBTI类型列表（带描述）
const MBTI_TYPES = [
  { value: 'INTJ', label: 'INTJ - 策略家' },
  { value: 'INTP', label: 'INTP - 逻辑学家' },
  { value: 'ENTJ', label: 'ENTJ - 指挥官' },
  { value: 'ENTP', label: 'ENTP - 辩论家' },
  { value: 'INFJ', label: 'INFJ - 提倡者' },
  { value: 'INFP', label: 'INFP - 调停者' },
  { value: 'ENFJ', label: 'ENFJ - 主人公' },
  { value: 'ENFP', label: 'ENFP - 竞选者' },
  { value: 'ISTJ', label: 'ISTJ - 物流师' },
  { value: 'ISFJ', label: 'ISFJ - 守卫者' },
  { value: 'ESTJ', label: 'ESTJ - 总经理' },
  { value: 'ESFJ', label: 'ESFJ - 执政官' },
  { value: 'ISTP', label: 'ISTP - 鉴赏家' },
  { value: 'ISFP', label: 'ISFP - 探险家' },
  { value: 'ESTP', label: 'ESTP - 企业家' },
  { value: 'ESFP', label: 'ESFP - 表演者' },
];

// 专业选项
const MAJOR_OPTIONS = [
  '计算机科学与技术', '软件工程', '电子信息工程', '通信工程', '自动化',
  '机械工程', '土木工程', '会计学', '金融学', '工商管理',
  '市场营销', '人力资源管理', '法学', '英语', '新闻学',
  '汉语言文学', '数学与应用数学', '物理学', '化学', '生物科学',
  '临床医学', '护理学', '药学', '艺术设计', '环境设计',
  '信息安全', '人工智能', '数据科学与大数据技术', '物联网工程', '电气工程及其自动化',
  '建筑学', '统计学', '经济学', '国际经济与贸易', '公共事业管理',
  '信息管理与信息系统', '电子商务', '物流管理', '旅游管理', '心理学',
];

// 年级选项
const GRADE_OPTIONS = [
  { value: '大一', label: '大一' },
  { value: '大二', label: '大二' },
  { value: '大三', label: '大三' },
  { value: '大四', label: '大四' },
  { value: '研究生一年级', label: '研究生一年级' },
  { value: '研究生二年级', label: '研究生二年级' },
  { value: '研究生三年级', label: '研究生三年级' },
];

// 毕业年份选项
const GRADUATION_YEAR_OPTIONS = [
  { value: '2026', label: '2026' },
  { value: '2027', label: '2027' },
  { value: '2028', label: '2028' },
  { value: '2029', label: '2029' },
  { value: '2030', label: '2030' },
];

// 意向城市选项
const CITY_OPTIONS = [
  '北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京',
  '重庆', '长沙', '西安', '苏州', '郑州', '东莞', '青岛', '合肥',
  '佛山', '宁波', '昆明', '厦门', '福州', '无锡', '济南', '大连', '珠海',
];

// 求职意向选项
const JOB_INTENTION_OPTIONS = [
  'Java开发', 'Python开发', '前端开发', '后端开发', '产品经理',
  'UI设计', '数据分析', '运营', '市场营销', '人力资源',
  '财务', '管培生', '教师', '考公', '考研',
  '算法工程师', '测试工程师', '运维工程师', '项目管理', '咨询顾问',
];

// 技能标签预设
const SKILL_PRESETS = [
  'Python', 'Java', 'JavaScript', 'C++', 'SQL', 'Excel', 'PPT', 'Word',
  '数据分析', '产品设计', '项目管理', '机器学习', '深度学习', 'React',
  'Vue', 'Node.js', 'Go', 'Docker', 'Linux', 'Git',
  'Photoshop', 'Figma', 'SPSS', 'Tableau', 'Power BI',
  '沟通能力', '团队协作', '领导力', '演讲能力', '写作能力',
];

// 预设办公软件选项
const OFFICE_SOFTWARE_OPTIONS = ['Word', 'Excel', 'PPT', 'Outlook', 'WPS'];

// 语种选项
const LANGUAGE_OPTIONS = ['英语', '日语', '韩语', '法语', '德语', '其他'];

// 熟练程度选项
const PROFICIENCY_OPTIONS = ['入门', '日常交流', '熟练读写', '母语水平'];

// ==================== Combobox 组件 ====================

interface ComboboxProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}

function Combobox({
  options,
  value,
  onChange,
  placeholder = '请选择...',
  searchPlaceholder = '搜索...',
  emptyText = '未找到匹配项',
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 focus:border-[#165DFF]',
            'hover:border-gray-300 transition-colors',
            !value && 'text-gray-400',
            className
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>
              <div className="p-2">
                <button
                  className="w-full text-left px-2 py-1.5 text-sm text-[#165DFF] hover:bg-[#165DFF]/5 rounded"
                  onClick={() => {
                    // 允许自定义输入 - 使用搜索框当前值
                    const input = document.querySelector('[cmdk-input]') as HTMLInputElement;
                    if (input?.value?.trim()) {
                      onChange(input.value.trim());
                      setOpen(false);
                    }
                  }}
                >
                  使用自定义输入
                </button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? '' : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option ? 'opacity-100' : 'opacity-0'
                    )}
                  />
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

// Select Combobox（用于选项固定的下拉，如年级、毕业年份、MBTI）
interface SelectComboboxProps {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}

function SelectCombobox({
  options,
  value,
  onChange,
  placeholder = '请选择...',
  searchPlaceholder = '搜索...',
  emptyText = '未找到匹配项',
  className,
}: SelectComboboxProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 focus:border-[#165DFF]',
            'hover:border-gray-300 transition-colors',
            !value && 'text-gray-400',
            className
          )}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value === value ? '' : option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
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

// Tag Input 组件（技能标签输入器）
interface TagInputProps {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  suggestions: string[];
  placeholder?: string;
}

function TagInput({ tags, onAdd, onRemove, suggestions, placeholder = '输入技能后按回车添加' }: TagInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 过滤建议
  useEffect(() => {
    if (input.trim()) {
      const filtered = suggestions.filter(
        s => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
  }, [input, suggestions, tags]);

  // 点击外部关闭建议
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const tag = input.trim();
      if (tag && !tags.includes(tag)) {
        onAdd(tag);
        setInput('');
        setShowSuggestions(false);
      }
    }
  };

  const handleSelect = (suggestion: string) => {
    if (!tags.includes(suggestion)) {
      onAdd(suggestion);
    }
    setInput('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* 已选标签 */}
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#165DFF]/10 text-[#165DFF] text-sm"
          >
            {tag}
            <button
              onClick={() => onRemove(tag)}
              className="hover:text-red-500 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      {/* 输入框 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (input.trim() && filteredSuggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder={placeholder}
          />
          {/* 自动补全下拉 */}
          {showSuggestions && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredSuggestions.map(suggestion => (
                <button
                  key={suggestion}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[#165DFF]/5 text-gray-700 transition-colors"
                  onClick={() => handleSelect(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => {
            const tag = input.trim();
            if (tag && !tags.includes(tag)) {
              onAdd(tag);
              setInput('');
              setShowSuggestions(false);
            }
          }}
          disabled={!input.trim()}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ==================== 主页面组件 ====================

// 用户信息表单接口
interface ProfileForm {
  personality_type: string;
  major: string;
  grade: string;
  graduation_year: string;
  city: string;
  job_intention: string;
  skills: string[];
  internship_experience: string;
  project_experience: string;
  awards: string;
}

// 能力背景数据结构
interface AbilityBackground {
  professional_skills: string[];
  office_skills: {
    default_selected: string[];
    custom_skills: string[];
  };
  language_abilities: Array<{
    language: string;
    level: string;
    proficiency: string;
  }>;
  certificates: string[];
}

export default function ProfileInfoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPage = searchParams.get('from') || '';
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // 自定义办公软件输入
  const [customOfficeInput, setCustomOfficeInput] = useState('');

  // 能力背景数据
  const [abilityBackground, setAbilityBackground] = useState<AbilityBackground>({
    professional_skills: [],
    office_skills: {
      default_selected: [],
      custom_skills: []
    },
    language_abilities: [
      { language: '', level: '', proficiency: '' }
    ],
    certificates: []
  });

  // 表单数据
  const [form, setForm] = useState<ProfileForm>({
    personality_type: '',
    major: '',
    grade: '',
    graduation_year: '',
    city: '',
    job_intention: '',
    skills: [],
    internship_experience: '',
    project_experience: '',
    awards: ''
  });

  // 计算信息完善度
  const completionPercent = useMemo(() => {
    const fields = [
      form.personality_type,
      form.major,
      form.grade,
      form.graduation_year,
      form.city,
      form.job_intention,
      abilityBackground.professional_skills.length > 0 ? abilityBackground.professional_skills.join(',') : '',
      form.internship_experience,
      form.project_experience,
      form.awards
    ];
    const filledCount = fields.filter(f => f && f.toString().trim().length > 0).length;
    return Math.round((filledCount / fields.length) * 100);
  }, [form, abilityBackground.professional_skills]);

  // 页面加载时获取用户信息
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
      return;
    }

    if (user) {
      fetchProfile();
    }
  }, [user, authLoading, router]);

  // 获取用户个人信息
  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          'x-user-id': user?.id?.toString() || ''
        }
      });

      const data = await response.json();

      if (data.code === 200 && data.data?.profile) {
        const profile = data.data.profile;

        // 处理能力背景数据回填
        let abilityData: AbilityBackground = {
          professional_skills: [],
          office_skills: { default_selected: [], custom_skills: [] },
          language_abilities: [{ language: '', level: '', proficiency: '' }],
          certificates: []
        };

        if (profile.ability_background) {
          try {
            const parsed = typeof profile.ability_background === 'string'
              ? JSON.parse(profile.ability_background)
              : profile.ability_background;
            abilityData = {
              professional_skills: parsed.professional_skills || [],
              office_skills: {
                default_selected: parsed.office_skills?.default_selected || [],
                custom_skills: parsed.office_skills?.custom_skills || []
              },
              language_abilities: parsed.language_abilities?.length > 0
                ? parsed.language_abilities
                : [{ language: '', level: '', proficiency: '' }],
              certificates: parsed.certificates || []
            };
          } catch {
            // JSON解析失败，兼容旧数据格式
            const skillsArr = profile.skills
              ? (Array.isArray(profile.skills) ? profile.skills : String(profile.skills).split(',').filter(Boolean))
              : [];
            abilityData.professional_skills = skillsArr;
          }
        } else if (profile.skills) {
          // 兼容旧数据：已有skills字段迁移到专业核心技能
          abilityData.professional_skills = Array.isArray(profile.skills)
            ? profile.skills
            : String(profile.skills).split(',').filter(Boolean);
        }

        setAbilityBackground(abilityData);

        // skills 可能是 text[] 或逗号分隔字符串
        const skillsArray = profile.skills
          ? (Array.isArray(profile.skills) ? profile.skills : String(profile.skills).split(',').filter(Boolean))
          : [];

        setForm({
          personality_type: profile.personality_type || '',
          major: profile.major || '',
          grade: profile.grade || '',
          graduation_year: profile.graduation_year?.toString() || '',
          city: profile.city || '',
          job_intention: profile.job_intention || '',
          skills: skillsArray,
          internship_experience: profile.internship_experience || '',
          project_experience: profile.project_experience || '',
          awards: profile.awards || ''
        });
      }
    } catch (error) {
      console.error('获取个人信息失败:', error);
    } finally {
      setFetching(false);
    }
  };

  // 更新表单字段
  const updateField = (field: keyof ProfileForm, value: string | string[]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // ========== 专业核心技能 ==========
  const addProfessionalSkill = (skill: string) => {
    if (!abilityBackground.professional_skills.includes(skill)) {
      setAbilityBackground(prev => ({
        ...prev,
        professional_skills: [...prev.professional_skills, skill]
      }));
    }
  };

  const removeProfessionalSkill = (skill: string) => {
    setAbilityBackground(prev => ({
      ...prev,
      professional_skills: prev.professional_skills.filter(s => s !== skill)
    }));
  };

  // ========== 办公软件技能 ==========
  const toggleOfficeSkill = (skill: string) => {
    setAbilityBackground(prev => {
      const isSelected = prev.office_skills.default_selected.includes(skill);
      return {
        ...prev,
        office_skills: {
          ...prev.office_skills,
          default_selected: isSelected
            ? prev.office_skills.default_selected.filter(s => s !== skill)
            : [...prev.office_skills.default_selected, skill]
        }
      };
    });
  };

  const addCustomOfficeSkill = () => {
    const skill = customOfficeInput.trim();
    if (skill && !abilityBackground.office_skills.custom_skills.includes(skill)
        && !abilityBackground.office_skills.default_selected.includes(skill)) {
      setAbilityBackground(prev => ({
        ...prev,
        office_skills: {
          ...prev.office_skills,
          custom_skills: [...prev.office_skills.custom_skills, skill]
        }
      }));
      setCustomOfficeInput('');
    }
  };

  const removeCustomOfficeSkill = (skill: string) => {
    setAbilityBackground(prev => ({
      ...prev,
      office_skills: {
        ...prev.office_skills,
        custom_skills: prev.office_skills.custom_skills.filter(s => s !== skill)
      }
    }));
  };

  const handleCustomOfficeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomOfficeSkill();
    }
  };

  // ========== 外语能力 ==========
  const updateLanguageAbility = (index: number, field: string, value: string) => {
    setAbilityBackground(prev => {
      const newAbilities = [...prev.language_abilities];
      newAbilities[index] = { ...newAbilities[index], [field]: value };
      return { ...prev, language_abilities: newAbilities };
    });
  };

  const addLanguageAbility = () => {
    setAbilityBackground(prev => ({
      ...prev,
      language_abilities: [...prev.language_abilities, { language: '', level: '', proficiency: '' }]
    }));
  };

  const removeLanguageAbility = (index: number) => {
    setAbilityBackground(prev => ({
      ...prev,
      language_abilities: prev.language_abilities.filter((_, i) => i !== index)
    }));
  };

  // ========== 职业技能证书 ==========
  const [certificateInput, setCertificateInput] = useState('');

  const addCertificate = () => {
    const cert = certificateInput.trim();
    if (cert && !abilityBackground.certificates.includes(cert)) {
      setAbilityBackground(prev => ({
        ...prev,
        certificates: [...prev.certificates, cert]
      }));
      setCertificateInput('');
    }
  };

  const removeCertificate = (cert: string) => {
    setAbilityBackground(prev => ({
      ...prev,
      certificates: prev.certificates.filter(c => c !== cert)
    }));
  };

  const handleCertificateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCertificate();
    }
  };

  // 保存表单
  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({
          personality_type: form.personality_type || null,
          major: form.major || null,
          grade: form.grade || null,
          graduation_year: form.graduation_year ? parseInt(form.graduation_year) : null,
          target_city: form.city || null,
          job_intention: form.job_intention || null,
          skills: abilityBackground.professional_skills.length > 0
            ? abilityBackground.professional_skills
            : (form.skills.length > 0 ? form.skills : null),
          internship_experience: form.internship_experience || null,
          project_experience: form.project_experience || null,
          awards: form.awards || null,
          ability_background: abilityBackground
        })
      });

      const data = await response.json();

      if (data.code === 200) {
        showToast('个人信息保存成功', 'success', 2000);
        // 保存成功后跳回来源页面
        setTimeout(() => {
          router.push(fromPage || '/profile');
        }, 800);
      } else {
        showToast(data.message || '保存失败，请稍后重试', 'error', 5000);
      }
    } catch (error) {
      console.error('保存失败:', error);
      showToast('网络错误，请稍后重试', 'error', 5000);
    } finally {
      setLoading(false);
    }
  };

  // 重置表单
  const handleReset = () => {
    setForm({
      personality_type: '',
      major: '',
      grade: '',
      graduation_year: '',
      city: '',
      job_intention: '',
      skills: [],
      internship_experience: '',
      project_experience: '',
      awards: ''
    });
    setAbilityBackground({
      professional_skills: [],
      office_skills: { default_selected: [], custom_skills: [] },
      language_abilities: [{ language: '', level: '', proficiency: '' }],
      certificates: []
    });
    setCustomOfficeInput('');
    setCertificateInput('');
    showToast('表单已清空', 'success');
  };

  if (authLoading || fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#165DFF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            个人信息将严格保护，仅用于生成更精准的职业规划
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">完善你的个人信息</h1>
          <p className="text-gray-500">以下信息仅用于生成更精准的职业规划，我们将严格保护你的隐私</p>
        </div>

        <div className="space-y-6">
          {/* 基本信息卡片 */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5 text-[#165DFF]" />
                基本信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 人格测评结果 - SelectCombobox */}
                <div className="space-y-2">
                  <Label>人格测评结果</Label>
                  <SelectCombobox
                    options={MBTI_TYPES}
                    value={form.personality_type}
                    onChange={(value) => updateField('personality_type', value)}
                    placeholder="请选择MBTI类型（可选）"
                    searchPlaceholder="搜索MBTI类型..."
                    emptyText="未找到匹配类型"
                  />
                </div>

                {/* 所属专业 - Combobox */}
                <div className="space-y-2">
                  <Label>所属专业</Label>
                  <Combobox
                    options={MAJOR_OPTIONS}
                    value={form.major}
                    onChange={(value) => updateField('major', value)}
                    placeholder="请选择或输入专业"
                    searchPlaceholder="搜索专业..."
                    emptyText="未找到匹配专业"
                  />
                </div>

                {/* 当前年级 - SelectCombobox */}
                <div className="space-y-2">
                  <Label>当前年级</Label>
                  <SelectCombobox
                    options={GRADE_OPTIONS}
                    value={form.grade}
                    onChange={(value) => updateField('grade', value)}
                    placeholder="请选择年级（可选）"
                    searchPlaceholder="搜索年级..."
                    emptyText="未找到匹配年级"
                  />
                </div>

                {/* 毕业年份 - SelectCombobox */}
                <div className="space-y-2">
                  <Label>毕业年份</Label>
                  <SelectCombobox
                    options={GRADUATION_YEAR_OPTIONS}
                    value={form.graduation_year}
                    onChange={(value) => updateField('graduation_year', value)}
                    placeholder="请选择毕业年份（可选）"
                    searchPlaceholder="搜索年份..."
                    emptyText="未找到匹配年份"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 求职意向卡片 */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="w-5 h-5 text-[#FF7D00]" />
                求职意向
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 意向工作城市 - Combobox */}
                <div className="space-y-2">
                  <Label>
                    <MapPin className="w-4 h-4 inline mr-1" />
                    意向工作城市
                  </Label>
                  <Combobox
                    options={CITY_OPTIONS}
                    value={form.city}
                    onChange={(value) => updateField('city', value)}
                    placeholder="请选择或输入城市"
                    searchPlaceholder="搜索城市..."
                    emptyText="未找到匹配城市"
                  />
                  <p className="text-xs text-gray-400">我们将为你推荐该城市的热门岗位和薪资</p>
                </div>

                {/* 求职意向 - Combobox */}
                <div className="space-y-2">
                  <Label>
                    <GraduationCap className="w-4 h-4 inline mr-1" />
                    求职意向
                  </Label>
                  <Combobox
                    options={JOB_INTENTION_OPTIONS}
                    value={form.job_intention}
                    onChange={(value) => updateField('job_intention', value)}
                    placeholder="请选择或输入求职意向"
                    searchPlaceholder="搜索岗位方向..."
                    emptyText="未找到匹配岗位"
                  />
                  <p className="text-xs text-gray-400">帮助我们更精准地为你匹配合适的岗位方向</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 能力背景卡片 */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="w-5 h-5 text-purple-500" />
                能力背景
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* 子板块1：专业核心技能 - TagInput */}
              <div className="space-y-2">
                <Label>专业核心技能</Label>
                <TagInput
                  tags={abilityBackground.professional_skills}
                  onAdd={addProfessionalSkill}
                  onRemove={removeProfessionalSkill}
                  suggestions={SKILL_PRESETS}
                  placeholder="输入技能后按回车添加，如：Python、数据分析"
                />
                <p className="text-xs text-gray-400">输入你的专业相关核心技能，支持自动补全和手动输入</p>
              </div>

              {/* 子板块2：办公软件技能 */}
              <div className="space-y-2">
                <Label>办公软件技能</Label>
                {/* 预设选项 */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {OFFICE_SOFTWARE_OPTIONS.map(skill => {
                    const isSelected = abilityBackground.office_skills.default_selected.includes(skill);
                    return (
                      <button
                        key={skill}
                        onClick={() => toggleOfficeSkill(skill)}
                        className={`px-3 py-1 rounded-lg text-sm transition-all ${
                          isSelected
                            ? 'bg-purple-500 text-white'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-300'
                        }`}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>
                {/* 自定义输入 */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {abilityBackground.office_skills.custom_skills.map(skill => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 text-purple-600 text-sm"
                    >
                      {skill}
                      <button
                        onClick={() => removeCustomOfficeSkill(skill)}
                        className="hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customOfficeInput}
                    onChange={(e) => setCustomOfficeInput(e.target.value)}
                    onKeyDown={handleCustomOfficeKeyDown}
                    placeholder="输入其他办公软件（如：PS、XMind、SPSS）"
                  />
                  <Button
                    variant="outline"
                    onClick={addCustomOfficeSkill}
                    disabled={!customOfficeInput.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-400">选择你熟练掌握的办公软件，可自定义补充</p>
              </div>

              {/* 子板块3：外语等级能力 */}
              <div className="space-y-2">
                <Label>外语等级能力</Label>
                <div className="space-y-3">
                  {abilityBackground.language_abilities.map((lang, index) => (
                    <div key={index} className="flex flex-wrap md:flex-nowrap gap-2 items-start">
                      <select
                        value={lang.language}
                        onChange={(e) => updateLanguageAbility(index, 'language', e.target.value)}
                        className="w-full md:w-28 h-10 px-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
                      >
                        <option value="">选择语种</option>
                        {LANGUAGE_OPTIONS.map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                      <Input
                        value={lang.level}
                        onChange={(e) => updateLanguageAbility(index, 'level', e.target.value)}
                        placeholder="如：CET-6 520分、N2、雅思7.0"
                        className="flex-1"
                      />
                      <select
                        value={lang.proficiency}
                        onChange={(e) => updateLanguageAbility(index, 'proficiency', e.target.value)}
                        className="w-full md:w-32 h-10 px-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
                      >
                        <option value="">选择熟练程度</option>
                        {PROFICIENCY_OPTIONS.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <div className="flex gap-1">
                        {index === abilityBackground.language_abilities.length - 1 && abilityBackground.language_abilities.length < 5 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={addLanguageAbility}
                            className="h-10 px-2"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        ) : abilityBackground.language_abilities.length > 1 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLanguageAbility(index)}
                            className="h-10 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        ) : <div className="w-10" />}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400">选择你的外语等级与掌握程度</p>
              </div>

              {/* 子板块4：职业技能证书 */}
              <div className="space-y-2">
                <Label>职业技能证书</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {abilityBackground.certificates.map(cert => (
                    <span
                      key={cert}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-sm"
                    >
                      {cert}
                      <button
                        onClick={() => removeCertificate(cert)}
                        className="hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={certificateInput}
                    onChange={(e) => setCertificateInput(e.target.value)}
                    onKeyDown={handleCertificateKeyDown}
                    placeholder="输入职业资格、技能等级证书（如：人力资源管理师、计算机二级）"
                  />
                  <Button
                    variant="outline"
                    onClick={addCertificate}
                    disabled={!certificateInput.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-400">输入你获得的职业资格、技能等级证书，按回车添加</p>
              </div>
            </CardContent>
          </Card>

          {/* 经历背景卡片 */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="w-5 h-5 text-green-500" />
                经历背景
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 实习经历 */}
              <div className="space-y-2">
                <Label htmlFor="internship_experience">实习经历</Label>
                <Textarea
                  id="internship_experience"
                  value={form.internship_experience}
                  onChange={(e) => updateField('internship_experience', e.target.value)}
                  placeholder="简要描述您的实习经历，如：2026年1-3月在XX公司人力资源部实习，负责招聘支持工作"
                  rows={3}
                />
              </div>

              {/* 项目经历 */}
              <div className="space-y-2">
                <Label htmlFor="project_experience">项目经历</Label>
                <Textarea
                  id="project_experience"
                  value={form.project_experience}
                  onChange={(e) => updateField('project_experience', e.target.value)}
                  placeholder="简要描述您的项目经历，如：参与XX大创项目，负责市场调研和用户访谈"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 荣誉奖项卡片 */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="w-5 h-5 text-yellow-500" />
                荣誉奖项
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="awards">获奖情况</Label>
                <Textarea
                  id="awards"
                  value={form.awards}
                  onChange={(e) => updateField('awards', e.target.value)}
                  placeholder="简要描述您的获奖情况，如：2025年校级一等奖学金、2024年优秀学生干部"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 进度提示 */}
          <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <CardContent className="p-6">
              {/* 进度条 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">当前信息完善度：</span>
                  <span className={`font-bold ${completionPercent === 100 ? 'text-green-600' : 'text-purple-600'}`}>
                    {completionPercent}%
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${completionPercent === 100 ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'}`}
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>

              {/* 完善度提示 */}
              {completionPercent === 100 ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-700">
                    <CircleCheck className="w-5 h-5" />
                    <span className="font-medium">信息已完善，快去生成你的专属职业规划吧！</span>
                  </div>
                  <Link href="/career-planning">
                    <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg">
                      <Sparkles className="w-4 h-4 mr-2" />
                      立即生成规划
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  {completionPercent < 50 ? '完善度较低，建议至少填写专业和年级' : '完善度较好，再完善一些信息规划会更精准'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-4 pt-4">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={loading}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              重置
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-[#165DFF] hover:bg-[#165DFF]/90"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {loading ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
