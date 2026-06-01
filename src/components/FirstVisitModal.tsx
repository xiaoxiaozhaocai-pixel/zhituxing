'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Target, Briefcase, BookOpen, ChevronRight, ChevronLeft, X, Compass, Bot, Search, CheckCircle2 } from 'lucide-react';

interface FirstVisitModalProps {
  onComplete?: () => void;
}

// 首次访问3步引导配置
const GUIDE_STEPS = [
  {
    id: 'assessment',
    title: '职业能力测评',
    description: '3分钟快速测评，AI分析你的职业性格、专业技能和发展潜力',
    icon: Target,
    color: 'from-purple-500 to-violet-600',
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
    link: '/assessment',
    linkText: '开始测评',
  },
  {
    id: 'match',
    title: '智能岗位匹配',
    description: '基于2万+真实岗位数据，AI为你匹配最适合的职业方向',
    icon: Briefcase,
    color: 'from-blue-500 to-cyan-600',
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    link: '/match',
    linkText: '查看匹配',
  },
  {
    id: 'learning-path',
    title: '个性化学习路径',
    description: '根据目标岗位生成专属学习计划，追踪你的成长进度',
    icon: BookOpen,
    color: 'from-green-500 to-emerald-600',
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    link: '/learning-path',
    linkText: '查看路径',
  },
] as const;

// Onboarding后续航浮层 - 4步首页关键功能引导
const ONBOARDING_TOUR_STEPS = [
  {
    id: 'career-plan',
    title: '职业规划',
    description: '从AI职业规划开始，先想清楚再投简历',
    icon: Compass,
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    link: '/career-planning',
    linkText: '去规划',
  },
  {
    id: 'agent-cards',
    title: '智能体卡片区',
    description: '6个AI助手覆盖求职全流程',
    icon: Bot,
    color: 'from-violet-500 to-purple-600',
    bgColor: 'bg-violet-100',
    iconColor: 'text-violet-600',
    link: '/assistant',
    linkText: '去看看',
  },
  {
    id: 'job-matching',
    title: '岗位匹配',
    description: '基于2万+真实岗位，AI精准匹配',
    icon: Search,
    color: 'from-cyan-500 to-teal-600',
    bgColor: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    link: '/match',
    linkText: '去匹配',
  },
  {
    id: 'complete',
    title: '准备好了',
    description: '准备好了，开始你的求职之旅吧！',
    icon: CheckCircle2,
    color: 'from-green-500 to-emerald-600',
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    link: '/',
    linkText: '开始求职',
  },
] as const;

export default function FirstVisitModal({ onComplete }: FirstVisitModalProps) {
  const [show, setShow] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [mode, setMode] = useState<'first_visit' | 'onboarding_tour'>('first_visit');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasGuided = localStorage.getItem('first_visit_guided');
    if (hasGuided === 'true') {
      return;
    }

    const currentPath = window.location.pathname;
    if (currentPath !== '/' && currentPath !== '') {
      return;
    }

    // 检测是否是onboarding完成后首次访问首页 → 显示后续航浮层
    const onboardingDone = localStorage.getItem('onboarding_done');
    if (onboardingDone === 'true') {
      setMode('onboarding_tour');
    }

    const timer = setTimeout(() => {
      setShow(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleComplete = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('first_visit_guided', 'true');
    }
    setShow(false);
    onComplete?.();
  };

  const handleSkip = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('first_visit_guided', 'true');
    }
    setShow(false);
    onComplete?.();
  };

  const handleNext = () => {
    const steps = mode === 'onboarding_tour' ? ONBOARDING_TOUR_STEPS : GUIDE_STEPS;
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!show) {
    return null;
  }

  const steps = mode === 'onboarding_tour' ? ONBOARDING_TOUR_STEPS : GUIDE_STEPS;
  const step = steps[currentStep];
  const StepIcon = step.icon;
  const isLastStep = currentStep === steps.length - 1;
  const isOnboardingTour = mode === 'onboarding_tour';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-gray-100 transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className={`bg-gradient-to-r ${step.color} h-32 flex items-center justify-center relative`}>
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <StepIcon className="w-12 h-12 text-white" />
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-white scale-125'
                    : index < currentStep
                    ? 'bg-white/80'
                    : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${step.bgColor} ${step.iconColor}`}>
              {isOnboardingTour ? `功能 ${currentStep + 1}/${steps.length}` : `步骤 ${currentStep + 1}/${steps.length}`}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
            {step.title}
          </h2>
          <p className="text-gray-500 text-center mb-8 leading-relaxed">
            {step.description}
          </p>

          <div className="space-y-3">
            {/* 主要CTA: 首次引导显示跳转链接，onboarding浮层最后一步显示"开始使用" */}
            {isOnboardingTour && isLastStep ? (
              <button
                onClick={handleComplete}
                className={`w-full py-4 bg-gradient-to-r ${step.color} text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2`}
              >
                开始使用
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : !isOnboardingTour ? (
              <Link href={step.link} onClick={handleComplete}>
                <button className={`w-full py-4 bg-gradient-to-r ${step.color} text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2`}>
                  {step.linkText}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </Link>
            ) : null}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className={`flex items-center gap-1 text-sm ${
                  currentStep === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                上一步
              </button>

              {isLastStep ? (
                isOnboardingTour ? (
                  <button
                    onClick={handleComplete}
                    className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    完成引导
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSkip}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    跳过引导
                  </button>
                )
              ) : (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  下一步
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={handleSkip}
              className="w-full mt-4 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              跳过，直接使用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
