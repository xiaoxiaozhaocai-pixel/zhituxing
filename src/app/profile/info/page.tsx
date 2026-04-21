'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
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
  CheckCircle,
  AlertCircle
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

export default function ProfileInfoPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [skillInput, setSkillInput] = useState('');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
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

  // 添加技能标签
  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !form.skills.includes(skill)) {
      updateField('skills', [...form.skills, skill]);
      setSkillInput('');
    }
  };

  // 移除技能标签
  const removeSkill = (skill: string) => {
    updateField('skills', form.skills.filter(s => s !== skill));
  };

  // 处理技能输入回车
  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
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
          city: form.city || null,
          job_intention: form.job_intention || null,
          skills: form.skills.length > 0 ? form.skills.join(',') : null,
          internship_experience: form.internship_experience || null,
          project_experience: form.project_experience || null,
          awards: form.awards || null
        })
      });

      const data = await response.json();
      
      if (data.code === 200) {
        setMessage({ type: 'success', text: '个人信息保存成功' });
      } else {
        setMessage({ type: 'error', text: data.message || '请稍后重试' });
      }
    } catch (error) {
      console.error('保存失败:', error);
      setMessage({ type: 'error', text: '网络错误，请稍后重试' });
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
    setMessage({ type: 'success', text: '表单已清空' });
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
        {/* 消息提示 */}
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <span>{message.text}</span>
          </div>
        )}
        
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">我的个人信息</h1>
          <p className="text-gray-500 mt-1">完善您的个人信息，获得更精准的AI个性化建议</p>
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
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>已掌握技能</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.skills.map(skill => (
                    <span 
                      key={skill}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#165DFF]/10 text-[#165DFF] text-sm"
                    >
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
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
                    placeholder="输入技能后按回车添加（如：Python、Excel、PS）"
                  />
                  <Button 
                    variant="outline" 
                    onClick={addSkill}
                    disabled={!skillInput.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
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
