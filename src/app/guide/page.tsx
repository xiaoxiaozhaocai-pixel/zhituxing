'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { 
  ChevronRight, Check, GraduationCap, MapPin, Sparkles, Target,
  Loader2, ChevronDown, ChevronUp
} from 'lucide-react';

const GRADE_OPTIONS = [
  { value: '大一', label: '大一' },
  { value: '大二', label: '大二' },
  { value: '大三', label: '大三' },
  { value: '大四', label: '大四' },
  { value: '研一', label: '研一' },
  { value: '研二', label: '研二' },
  { value: '研三', label: '研三' },
  { value: '其他', label: '其他' },
];

const STATUS_OPTIONS = [
  { value: '求职中', label: '求职中', desc: '正在找实习/工作', color: 'border-blue-500 bg-blue-50' },
  { value: '考研', label: '考研', desc: '准备研究生考试', color: 'border-green-500 bg-green-50' },
  { value: '考公', label: '考公', desc: '准备公务员考试', color: 'border-purple-500 bg-purple-50' },
  { value: '留学', label: '留学', desc: '准备出国留学', color: 'border-orange-500 bg-orange-50' },
  { value: '未决定', label: '未决定', desc: '还在探索中', color: 'border-gray-400 bg-gray-50' },
];

const INDUSTRIES = ['互联网/IT', '金融', '教育', '医疗健康', '制造业', '房地产/建筑', '零售/电商', '文化传媒', '能源/环保', '咨询/专业服务', '政府/公共事业', '其他'];
const CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '西安', '重庆', '长沙', '苏州', '天津', '郑州', '青岛', '大连', '厦门', '其他'];

function QuickStartWizard() {
  const router = useRouter();
  const { } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [grade, setGrade] = useState('');
  const [major, setMajor] = useState('');
  const [userStatus, setUserStatus] = useState('');
  const [targetIndustry, setTargetIndustry] = useState<string[]>([]);
  const [targetCities, setTargetCities] = useState<string[]>([]);
  const [expandedCards, setExpandedCards] = useState<string[]>([]);

  const toggleCard = (id: string) => {
    setExpandedCards(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleIndustry = (v: string) => {
    setTargetIndustry(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  };

  const toggleCity = (v: string) => {
    setTargetCities(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: Record<string, any> = {};
      if (grade) body.grade = grade;
      if (major) body.major = major;
      if (userStatus) body.user_type = userStatus;
      if (targetIndustry.length > 0) body.target_industry = targetIndustry;
      if (targetCities.length > 0) body.target_cities = targetCities;

      const res = await fetch('/api/user/profile', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSaved(true);
        localStorage.setItem('onboarding_done', 'true');
        setTimeout(() => router.push('/assistant'), 800);
      }
    } catch (e) {
      console.error('Failed to save:', e);
    } finally {
      setSaving(false);
    }
  };

  const skipAll = () => {
    localStorage.setItem('onboarding_done', 'true');
    router.push('/assistant');
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <GraduationCap className="w-8 h-8 text-[#165DFF]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">欢迎来到职途星</h2>
        <p className="text-gray-500 mt-2">先简单认识一下你，AI 才能精准服务</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">你的年级</Label>
          <div className="grid grid-cols-4 gap-2">
            {GRADE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setGrade(opt.value)}
                className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all ${
                  grade === opt.value
                    ? 'bg-[#165DFF] text-white border-[#165DFF] shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-[#165DFF] hover:text-[#165DFF]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">你的专业</Label>
          <Input
            placeholder="例如：人力资源管理、计算机科学"
            value={major}
            onChange={e => setMajor(e.target.value)}
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => setStep(2)}
          className="w-full h-11 bg-[#165DFF] hover:bg-[#0d4acc] text-base"
        >
          下一步
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
        <div className="text-center">
          <button onClick={skipAll} className="text-sm text-gray-400 hover:text-gray-600">
            跳过，直接开始
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">你目前在准备什么？</h2>
        <p className="text-gray-500 mt-2">让我们为你推荐更合适的方向</p>
      </div>

      <div className="space-y-3">
        {STATUS_OPTIONS.map(opt => {
          const isSelected = userStatus === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setUserStatus(opt.value)}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-[#165DFF] bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-[#165DFF] bg-[#165DFF]' : 'border-gray-300'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{opt.label}</p>
                  <p className="text-sm text-gray-500">{opt.desc}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => setStep(3)}
          className="w-full h-11 bg-[#165DFF] hover:bg-[#0d4acc] text-base"
        >
          下一步
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
        <button onClick={() => setStep(3)} className="w-full text-center text-sm text-gray-400 hover:text-gray-600">
          跳过此步
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">最后一步（可选）</h2>
        <p className="text-gray-500 mt-2">填了之后所有 AI 功能自动个性化，跳过也行</p>
      </div>

      <div className="space-y-3">
        {/* 意向行业 */}
        <div className="border rounded-xl overflow-hidden">
          <button onClick={() => toggleCard('target_industry')} className="w-full p-4 flex items-center justify-between bg-white hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-blue-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">意向行业</p>
                <p className="text-xs text-gray-400">用于岗位匹配和职业规划</p>
              </div>
            </div>
            {expandedCards.includes('target_industry') ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedCards.includes('target_industry') && (
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map(v => (
                  <button key={v} onClick={() => toggleIndustry(v)} className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${targetIndustry.includes(v) ? 'bg-[#165DFF] text-white border-[#165DFF]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#165DFF]'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 意向城市 */}
        <div className="border rounded-xl overflow-hidden">
          <button onClick={() => toggleCard('target_cities')} className="w-full p-4 flex items-center justify-between bg-white hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-green-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">意向城市</p>
                <p className="text-xs text-gray-400">用于推荐目标城市的岗位</p>
              </div>
            </div>
            {expandedCards.includes('target_cities') ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedCards.includes('target_cities') && (
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {CITIES.map(v => (
                  <button key={v} onClick={() => toggleCity(v)} className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${targetCities.includes(v) ? 'bg-[#165DFF] text-white border-[#165DFF]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#165DFF]'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-11 bg-[#165DFF] hover:bg-[#0d4acc] text-base"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />保存中...</> : saved ? <><Check className="w-4 h-4 mr-1" />已完成</> : '完成，和小职聊聊'}
        </Button>
        <button onClick={skipAll} className="w-full text-center text-sm text-gray-400 hover:text-gray-600">
          先不填了，直接开始
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Progress bar */}
      <div className="w-full bg-white border-b">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  step >= i ? 'bg-[#165DFF] text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > i ? <Check className="w-4 h-4" /> : i}
                </div>
                {i < 3 && <div className={`flex-1 h-0.5 mx-2 transition-all ${step > i ? 'bg-[#165DFF]' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
          <div className="flex justify-between px-1">
            <span className="text-xs text-gray-400">基础信息</span>
            <span className="text-xs text-gray-400">当前状态</span>
            <span className="text-xs text-gray-400">偏好设置</span>
          </div>
        </div>
      </div>

      {/* Wizard Content */}
      <div className="flex-1 flex items-start justify-center px-4 pt-8 pb-12">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function GuidePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // 未登录重定向
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth?redirect=/guide');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" />
      </div>
    );
  }

  if (!user) return null;

  return <QuickStartWizard />;
}
