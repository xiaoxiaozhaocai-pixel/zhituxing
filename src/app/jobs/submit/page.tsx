'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { 
  Upload, 
  Briefcase, 
  Building2,
  MapPin,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Plus,
  Award,
  ArrowLeft,
  Sparkles
} from 'lucide-react';

// 行业列表
const industries = [
  '互联网 / IT', '金融', '制造', '教育 / 培训', '医疗健康 / 生物',
  '快消', '电商', '传媒', '房地产', '新能源', '汽车', 
  '物流', '咨询', '法律', '国企', '外企', '其他'
];

// 企业类型列表
const companyTypes = [
  '民营企业', '国有企业', '上市公司', '外资企业', '事业单位'
];

// 提交表单接口
interface SubmitForm {
  job_name: string;
  industry: string;
  city: string;
  company_name: string;
  company_type: string;
  salary_min: string;
  salary_max: string;
  skills: string[];
  jd_content: string;
}

export default function JdSubmitPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  const [form, setForm] = useState<SubmitForm>({
    job_name: '',
    industry: '',
    city: '',
    company_name: '',
    company_type: '',
    salary_min: '',
    salary_max: '',
    skills: [],
    jd_content: ''
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  // 更新表单字段
  const updateField = (field: keyof SubmitForm, value: string | string[]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // 添加技能
  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !form.skills.includes(skill)) {
      updateField('skills', [...form.skills, skill]);
      setSkillInput('');
    }
  };

  // 移除技能
  const removeSkill = (skill: string) => {
    updateField('skills', form.skills.filter(s => s !== skill));
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!user) return;
    
    // 验证必填字段
    if (!form.job_name.trim()) {
      setMessage({ type: 'error', text: '请填写岗位名称' });
      return;
    }
    if (!form.company_name.trim()) {
      setMessage({ type: 'error', text: '请填写企业名称' });
      return;
    }
    if (!form.jd_content.trim()) {
      setMessage({ type: 'error', text: '请填写JD内容' });
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/jd/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({
          job_name: form.job_name,
          industry: form.industry || null,
          city: form.city || null,
          company_name: form.company_name,
          company_type: form.company_type || null,
          salary_min: form.salary_min ? parseInt(form.salary_min) : null,
          salary_max: form.salary_max ? parseInt(form.salary_max) : null,
          skills: form.skills.length > 0 ? form.skills.join(',') : null,
          jd_content: form.jd_content
        })
      });

      const data = await response.json();
      
      if (data.code === 200) {
        setMessage({ type: 'success', text: data.message });
        // 清空表单
        setForm({
          job_name: '',
          industry: '',
          city: '',
          company_name: '',
          company_type: '',
          salary_min: '',
          salary_max: '',
          skills: [],
          jd_content: ''
        });
      } else {
        setMessage({ type: 'error', text: data.message || '提交失败' });
      }
    } catch (error) {
      console.error('提交失败:', error);
      setMessage({ type: 'error', text: '网络错误，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  // 重置表单
  const handleReset = () => {
    setForm({
      job_name: '',
      industry: '',
      city: '',
      company_name: '',
      company_type: '',
      salary_min: '',
      salary_max: '',
      skills: [],
      jd_content: ''
    });
    setMessage(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#165DFF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 返回按钮 */}
        <Link href="/jobs" className="inline-flex items-center text-gray-600 hover:text-[#165DFF] mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回岗位百科
        </Link>

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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Upload className="w-7 h-7 text-[#165DFF]" />
            上传真实JD，赢取免费会员
          </h1>
          <p className="text-gray-500 mt-2">
            上传1条真实校招JD，审核通过即可获得
            <span className="text-[#FF7D00] font-semibold mx-1">3次免费AI次数+7天会员</span>
          </p>
        </div>

        <div className="space-y-6">
          {/* 奖励说明卡片 */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-[#165DFF]/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#165DFF]/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Award className="w-6 h-6 text-[#165DFF]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">奖励说明</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      上传1条真实校招JD（审核通过）
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      获得3次免费AI次数
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      获得7天会员体验
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 必填信息 */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="text-red-500">*</span>
                <Briefcase className="w-5 h-5 text-[#165DFF]" />
                岗位基本信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 岗位名称 */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="job_name">
                    岗位名称 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="job_name"
                    value={form.job_name}
                    onChange={(e) => updateField('job_name', e.target.value)}
                    placeholder="如：Java开发工程师（2026届校招）"
                  />
                </div>

                {/* 所属行业 */}
                <div className="space-y-2">
                  <Label htmlFor="industry">所属行业</Label>
                  <select
                    id="industry"
                    value={form.industry}
                    onChange={(e) => updateField('industry', e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 focus:border-[#165DFF]"
                  >
                    <option value="">请选择行业</option>
                    {industries.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>

                {/* 工作城市 */}
                <div className="space-y-2">
                  <Label htmlFor="city">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    工作城市
                  </Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="如：上海、北京、深圳"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 企业信息 */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="w-5 h-5 text-[#FF7D00]" />
                企业信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 企业名称 */}
                <div className="space-y-2">
                  <Label htmlFor="company_name">
                    企业名称 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="company_name"
                    value={form.company_name}
                    onChange={(e) => updateField('company_name', e.target.value)}
                    placeholder="请输入企业全称"
                  />
                </div>

                {/* 企业类型 */}
                <div className="space-y-2">
                  <Label htmlFor="company_type">企业类型</Label>
                  <select
                    id="company_type"
                    value={form.company_type}
                    onChange={(e) => updateField('company_type', e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 focus:border-[#165DFF]"
                  >
                    <option value="">请选择企业类型</option>
                    {companyTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* 薪资范围 */}
                <div className="space-y-2">
                  <Label htmlFor="salary">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    薪资范围（元/月）
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="salary_min"
                      type="number"
                      value={form.salary_min}
                      onChange={(e) => updateField('salary_min', e.target.value)}
                      placeholder="最低薪资"
                    />
                    <span className="text-gray-400">-</span>
                    <Input
                      id="salary_max"
                      type="number"
                      value={form.salary_max}
                      onChange={(e) => updateField('salary_max', e.target.value)}
                      placeholder="最高薪资"
                    />
                  </div>
                </div>

                {/* 技能要求 */}
                <div className="space-y-2">
                  <Label>技能要求</Label>
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
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      placeholder="输入技能后按回车添加"
                    />
                    <Button variant="outline" onClick={addSkill} disabled={!skillInput.trim()}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* JD内容 */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-purple-500" />
                JD内容
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jd_content">
                  完整JD内容 <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="jd_content"
                  value={form.jd_content}
                  onChange={(e) => updateField('jd_content', e.target.value)}
                  placeholder="请粘贴完整的岗位描述内容，包括岗位职责、任职要求等"
                  rows={10}
                  className="resize-none"
                />
                <p className="text-xs text-gray-400">
                  请尽量提供完整的JD信息，这将有助于我们更快审核
                </p>
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
              <X className="w-4 h-4 mr-2" />
              重置
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading}
              className="bg-[#165DFF] hover:bg-[#165DFF]/90"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              提交JD
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
