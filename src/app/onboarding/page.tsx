'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import {
  ChevronRight, ChevronLeft, Check, GraduationCap,
  BookOpen, MapPin, DollarSign, Sparkles, Target,
  Brain, Loader2, X, ChevronDown, ChevronUp,
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
  { value: '求职中', label: '求职中', icon: 'Target', desc: '正在找实习/工作', color: 'border-blue-500 bg-blue-50' },
  { value: '考研', label: '考研', icon: 'BookOpen', desc: '准备研究生考试', color: 'border-green-500 bg-green-50' },
  { value: '考公', label: '考公', icon: 'GraduationCap', desc: '准备公务员考试', color: 'border-purple-500 bg-purple-50' },
  { value: '留学', label: '留学', icon: 'Sparkles', desc: '准备出国留学', color: 'border-orange-500 bg-orange-50' },
  { value: '未决定', label: '未决定', icon: 'Brain', desc: '还在探索中', color: 'border-gray-400 bg-gray-50' },
];

const ECONOMY_OPTIONS = [
  { value: '低', label: '无压力', desc: '家庭经济条件较好，可以支持深造' },
  { value: '中', label: '有一定压力', desc: '需要平衡收支，可能优先考虑就业' },
  { value: '高', label: '压力较大', desc: '家庭经济条件需要尽快就业支持' },
];

const TENDENCY_OPTIONS = [
  { value: '学术型', label: '学术型', desc: '更喜欢理论学习、研究分析' },
  { value: '实践型', label: '实践型', desc: '更喜欢动手实践、项目落地' },
  { value: '均衡型', label: '均衡型', desc: '学术和实践都喜欢，能灵活切换' },
];

const INDUSTRIES = ['互联网/IT', '金融', '教育', '医疗健康', '制造业', '房地产/建筑', '零售/电商', '文化传媒', '能源/环保', '咨询/专业服务', '政府/公共事业', '其他'];
const CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '西安', '重庆', '长沙', '苏州', '天津', '郑州', '青岛', '大连', '厦门', '其他'];


function OnboardingWizard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [grade, setGrade] = useState('');
  const [major, setMajor] = useState('');
  const [userStatus, setUserStatus] = useState('');
  const [targetIndustry, setTargetIndustry] = useState<string[]>([]);
  const [targetCities, setTargetCities] = useState<string[]>([]);
  const [gpa, setGpa] = useState('');
  const [economicPressure, setEconomicPressure] = useState('');
  const [careerTendency, setCareerTendency] = useState('');
  const [expandedCards, setExpandedCards] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=/onboarding');
    }
  }, [user, authLoading, router]);

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
  /**
   * Persona 双路径路由：根据年级+求职状态，将新用户引导到最适合的入口
   * - 大一大二探索期 → /guide（新手引导）或 /resources（探索资源）
   * - 大三大四求职期 → /match（直接匹配）或 /resources
   */
  const getPersonaRoute = (g: string, status: string): string => {
    const isEarly = ["大一", "大二"].includes(g);
    const isLate = ["大三", "大四", "研二", "研三"].includes(g);
    if (isEarly) {
      if (status === "求职中") return "/match";
      if (["考研", "考公", "留学"].includes(status)) return "/resources";
      if (status === "未决定") return "/guide";
    }
    if (isLate) {
      if (status === "求职中") return "/match";
      if (["考研", "考公", "留学"].includes(status)) return "/resources";
      if (status === "未决定") return "/career-planning";
    }
    return "/";
  };


  const handleSave = async (redirectToHome = true) => {
    setSaving(true);
    try {
      const body: Record<string, any> = {};
      if (grade) body.grade = grade;
      if (major) body.major = major;
      if (userStatus) body.user_type = userStatus;
      if (targetIndustry.length > 0) body.target_industry = targetIndustry;
      if (targetCities.length > 0) body.target_cities = targetCities;
      if (gpa) body.gpa = gpa;
      if (economicPressure) body.economic_pressure = economicPressure;
      if (careerTendency) body.career_tendency = careerTendency;

      const res = await fetch('/api/user/profile', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSaved(true);
        localStorage.setItem('onboarding_done', 'true');
        if (redirectToHome) {
          setTimeout(() => router.push(getPersonaRoute(grade, userStatus)), 800);
        }
      }
    } catch (e) {
      console.error('Failed to save:', e);
    } finally {
      setSaving(false);
    }
  };

  const skipAll = () => {
    localStorage.setItem('onboarding_done', 'true');
    router.push('/');
  };

  const renderStep1 = () => (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <GraduationCap className="w-8 h-8 text-[#165DFF]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">欢迎来到职途星</h2>
        <p className="text-gray-500 mt-2">先简单认识一下你</p>
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
          <p className="text-xs text-gray-400">填写专业后，AI能更精准地推荐适合你的岗位</p>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => setStep(2)}
          disabled={!grade && !major}
          className="w-full h-11 bg-[#165DFF] hover:bg-[#0d4acc] text-base"
        >
          下一步
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
        <div className="text-center">
          <button
            onClick={skipAll}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            我自己看看，跳过引导
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8">
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
        <button
          onClick={() => setStep(3)}
          className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
        >
          跳过此步
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">补充更多信息（可选）</h2>
        <p className="text-gray-500 mt-2">
          填写后所有AI服务自动使用，一次填写处处生效
        </p>
      </div>

      <div className="space-y-4">
        {/* 意向行业 */}
        <div className="border rounded-xl overflow-hidden">
          <button onClick={() => toggleCard('target_industry')} className="w-full p-4 flex items-center justify-between bg-white hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-blue-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">意向行业</p>
                <p className="text-xs text-gray-400">用于岗位匹配推荐和职业规划</p>
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
                <p className="text-xs text-gray-400">用于推荐目标城市的岗位和实习</p>
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

        {/* GPA */}
        <div className="border rounded-xl overflow-hidden">
          <button onClick={() => toggleCard('gpa')} className="w-full p-4 flex items-center justify-between bg-white hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-5 h-5 text-orange-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">GPA / 学业成绩</p>
                <p className="text-xs text-gray-400">用于评估学业竞争力，匹配不同门槛的岗位</p>
              </div>
            </div>
            {expandedCards.includes('gpa') ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedCards.includes('gpa') && (
            <div className="px-4 pb-4">
              <Input type="text" placeholder="例如：3.5 / 4.0" value={gpa} onChange={e => setGpa(e.target.value)} className="h-11" />
            </div>
          )}
        </div>

        {/* 经济压力 */}
        <div className="border rounded-xl overflow-hidden">
          <button onClick={() => toggleCard('economic_pressure')} className="w-full p-4 flex items-center justify-between bg-white hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-red-500" />
              <div className="text-left">
                <p className="font-medium text-gray-900">家庭经济情况</p>
                <p className="text-xs text-gray-400">用于考研/就业决策分析，给出更贴合的建议</p>
              </div>
            </div>
            {expandedCards.includes('economic_pressure') ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedCards.includes('economic_pressure') && (
            <div className="px-4 pb-4 space-y-2">
              {ECONOMY_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setEconomicPressure(opt.value)} className={`w-full p-3 rounded-lg border text-left transition-all ${economicPressure === opt.value ? 'border-[#165DFF] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <p className="font-medium text-sm text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 学术vs实践 */}
        <div className="border rounded-xl overflow-hidden">
          <button onClick={() => toggleCard('career_tendency')} className="w-full p-4 flex items-center justify-between bg-white hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-purple-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">学术 vs 实践偏好</p>
                <p className="text-xs text-gray-400">用于个性化推荐学习路径和能力提升方案</p>
              </div>
            </div>
            {expandedCards.includes('career_tendency') ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedCards.includes('career_tendency') && (
            <div className="px-4 pb-4 space-y-2">
              {TENDENCY_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setCareerTendency(opt.value)} className={`w-full p-3 rounded-lg border text-left transition-all ${careerTendency === opt.value ? 'border-[#165DFF] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <p className="font-medium text-sm text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="w-full h-11 bg-[#165DFF] hover:bg-[#0d4acc] text-base"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />保存中...</> : saved ? <><Check className="w-4 h-4 mr-1" />已完成，即将跳转</> : '完成，开启职途星'}
        </Button>
        <button
          onClick={() => handleSave(true)}
          className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
        >
          先不填了，直接开始
        </button>
      </div>
    </div>
  );

  // ====== Render ======
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
            <span className="text-xs text-gray-400">扩展信息</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 pt-8 pb-12">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
            </CardContent>
          </Card>

          {/* Step indicator */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-400">
              {step === 1 ? '第 1 步，共 3 步' : step === 2 ? '第 2 步，共 3 步' : '最后一步'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
