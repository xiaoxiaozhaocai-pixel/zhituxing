'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  CircleCheck
} from 'lucide-react';

// MBTI类型列表
const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
];

// 年级列表
const GRADES = [
  '大一', '大二', '大三', '大四', 
  '研一', '研二', '研三', '已毕业'
];

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
  professional_skills: string[];  // 专业核心技能
  office_skills: {
    default_selected: string[];    // 预设选中的办公技能
    custom_skills: string[];       // 自定义添加的办公技能
  };
  language_abilities: Array<{       // 外语能力数组
    language: string;
    level: string;
    proficiency: string;
  }>;
  certificates: string[];          // 职业技能证书
}

// 预设办公软件选项
const OFFICE_SOFTWARE_OPTIONS = ['Word', 'Excel', 'PPT', 'Outlook', 'WPS'];

// 语种选项
const LANGUAGE_OPTIONS = ['英语', '日语', '韩语', '法语', '德语', '其他'];

// 熟练程度选项
const PROFICIENCY_OPTIONS = ['入门', '日常交流', '熟练读写', '母语水平'];

export default function ProfileInfoPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  // 专业核心技能输入
  const [skillInput, setSkillInput] = useState('');
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
      form.skills.length > 0 ? form.skills.join(',') : '',
      form.internship_experience,
      form.project_experience,
      form.awards
    ];
    const filledCount = fields.filter(f => f && f.toString().trim().length > 0).length;
    return Math.round((filledCount / fields.length) * 100);
  }, [form]);

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
          } catch (e) {
            // JSON解析失败，兼容旧数据格式
            abilityData.professional_skills = profile.skills 
              ? profile.skills.split(',').filter(Boolean) 
              : [];
          }
        } else if (profile.skills) {
          // 兼容旧数据：已有skills字段迁移到专业核心技能
          abilityData.professional_skills = profile.skills.split(',').filter(Boolean);
        }
        
        setAbilityBackground(abilityData);
        
        setForm({
          personality_type: profile.personality_type || '',
          major: profile.major || '',
          grade: profile.grade || '',
          graduation_year: profile.graduation_year?.toString() || '',
          city: profile.city || '',
          job_intention: profile.job_intention || '',
          skills: profile.skills ? profile.skills.split(',').filter(Boolean) : [],
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
  const addProfessionalSkill = () => {
    const skill = skillInput.trim();
    if (skill && !abilityBackground.professional_skills.includes(skill)) {
      setAbilityBackground(prev => ({
        ...prev,
        professional_skills: [...prev.professional_skills, skill]
      }));
      setSkillInput('');
    }
  };

  const removeProfessionalSkill = (skill: string) => {
    setAbilityBackground(prev => ({
      ...prev,
      professional_skills: prev.professional_skills.filter(s => s !== skill)
    }));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addProfessionalSkill();
    }
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

  // ========== 技能标签（兼容旧逻辑） ==========
  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !form.skills.includes(skill)) {
      updateField('skills', [...form.skills, skill]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    updateField('skills', form.skills.filter(s => s !== skill));
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
          city: form.city || null,
          job_intention: form.job_intention || null,
          skills: abilityBackground.professional_skills.length > 0 
            ? abilityBackground.professional_skills.join(',') 
            : (form.skills.length > 0 ? form.skills.join(',') : null),
          internship_experience: form.internship_experience || null,
          project_experience: form.project_experience || null,
          awards: form.awards || null,
          ability_background: abilityBackground
        })
      });

      const data = await response.json();
      
      if (data.code === 200) {
        showToast('个人信息保存成功', 'success', 3000);
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
    setSkillInput('');
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
                {/* 人格测评结果 */}
                <div className="space-y-2">
                  <Label htmlFor="personality_type">人格测评结果</Label>
                  <select
                    id="personality_type"
                    value={form.personality_type}
                    onChange={(e) => updateField('personality_type', e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 focus:border-[#165DFF]"
                  >
                    <option value="">请选择MBTI类型（可选）</option>
                    {MBTI_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* 所属专业 */}
                <div className="space-y-2">
                  <Label htmlFor="major">所属专业</Label>
                  <Input
                    id="major"
                    value={form.major}
                    onChange={(e) => updateField('major', e.target.value)}
                    placeholder="如：人力资源管理"
                  />
                </div>

                {/* 当前年级 */}
                <div className="space-y-2">
                  <Label htmlFor="grade">当前年级</Label>
                  <select
                    id="grade"
                    value={form.grade}
                    onChange={(e) => updateField('grade', e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 focus:border-[#165DFF]"
                  >
                    <option value="">请选择年级（可选）</option>
                    {GRADES.map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>

                {/* 毕业年份 */}
                <div className="space-y-2">
                  <Label htmlFor="graduation_year">毕业年份</Label>
                  <Input
                    id="graduation_year"
                    type="number"
                    min="2020"
                    max="2035"
                    value={form.graduation_year}
                    onChange={(e) => updateField('graduation_year', e.target.value)}
                    placeholder="如：2027"
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
                {/* 意向工作城市 */}
                <div className="space-y-2">
                  <Label htmlFor="city">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    意向工作城市
                  </Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="如：深圳、上海"
                  />
                  <p className="text-xs text-gray-400">我们将为你推荐该城市的热门岗位和薪资</p>
                </div>

                {/* 求职意向 */}
                <div className="space-y-2">
                  <Label htmlFor="job_intention">
                    <GraduationCap className="w-4 h-4 inline mr-1" />
                    求职意向
                  </Label>
                  <Input
                    id="job_intention"
                    value={form.job_intention}
                    onChange={(e) => updateField('job_intention', e.target.value)}
                    placeholder="如：互联网产品经理"
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
              {/* 子板块1：专业核心技能 */}
              <div className="space-y-2">
                <Label>专业核心技能</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {abilityBackground.professional_skills.map(skill => (
                    <span 
                      key={skill}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#165DFF]/10 text-[#165DFF] text-sm"
                    >
                      {skill}
                      <button
                        onClick={() => removeProfessionalSkill(skill)}
                        className="hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleSkillKeyDown}
                    placeholder="输入专业技能后按回车添加（如：招聘配置、Python、数据分析）"
                  />
                  <Button 
                    variant="outline" 
                    onClick={addProfessionalSkill}
                    disabled={!skillInput.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-400">输入你的专业相关核心技能，按回车添加</p>
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
              保存
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
