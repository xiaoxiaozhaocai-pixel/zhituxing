'use client';

import { useState, useEffect } from 'react';
import { SITE_URL } from '@/lib/config';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Compass, 
  Target, 
  TrendingUp, 
  MessageSquare, 
  Briefcase, 
  GraduationCap,
  Brain,
  Users,
  Zap,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Building2,
  MapPin,
  Scale,
  FileSearch,
  Mic,
  Calendar
} from 'lucide-react';

// 计算距离秋招的天数（目标日期：9月1日）
function getDaysToAutumnRecruit(): { days: number; color: string; text: string } {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // 秋招目标日期：每年9月1日
  let targetDate = new Date(currentYear, 8, 1); // 月份从0开始，8表示9月
  
  // 如果已经过了今年的9月1日，则计算明年的
  if (now > targetDate) {
    targetDate = new Date(currentYear + 1, 8, 1);
  }
  
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let color = 'text-gray-500';
  let text = '准备时间充裕';
  
  if (diffDays <= 60) {
    color = 'text-red-500';
    text = '时间紧迫，立即行动';
  } else if (diffDays <= 90) {
    color = 'text-orange-500';
    text = '进入冲刺阶段';
  }
  
  return { days: diffDays, color, text };
}

// 痛点共鸣数据
const painPoints = [
  {
    icon: <Compass className="w-8 h-8" />,
    title: '我到底适合做什么？',
    description: '专业不对口、兴趣不清晰，看着同学都找到方向，自己还在原地打转。',
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    icon: <Scale className="w-8 h-8" />,
    title: '考研还是就业？',
    description: '身边有人说考研好，有人说早点工作积累经验，到底怎么选？',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    icon: <FileSearch className="w-8 h-8" />,
    title: '投了很多简历没回音',
    description: '海投了几十份简历，要么石沉大海，要么面试挂掉，不知道问题出在哪。',
    gradient: 'from-orange-500 to-red-500',
  },
];

// 产品路径数据
const productPath = [
  {
    step: 1,
    icon: <Compass className="w-6 h-6" />,
    title: 'AI职业规划',
    description: '对话式诊断，找到你的方向',
    gradient: 'from-violet-500 to-purple-600',
    isHero: true, // 主角标记
  },
  {
    step: 2,
    icon: <Scale className="w-6 h-6" />,
    title: '考研就业决策',
    description: '数据推演，不做盲选',
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    step: 3,
    icon: <TrendingUp className="w-6 h-6" />,
    title: '技能补强',
    description: '差距分析+学习路径',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    step: 4,
    icon: <Briefcase className="w-6 h-6" />,
    title: '岗位匹配',
    description: '精准推荐，告别海投',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    step: 5,
    icon: <Mic className="w-6 h-6" />,
    title: '面试练习',
    description: 'AI模拟，实战提升',
    gradient: 'from-orange-500 to-amber-500',
  },
];

// 数据信任亮点
const trustData = [
  {
    icon: <Building2 className="w-6 h-6" />,
    value: '2万+',
    label: '真实岗位数据',
    description: '覆盖全行业主流岗位',
  },
  {
    icon: <CheckCircle2 className="w-6 h-6" />,
    value: '100%',
    label: 'AI评测通过率',
    description: '专业模型，结果可靠',
  },
  {
    icon: <Brain className="w-6 h-6" />,
    value: '6大',
    label: 'AI智能体',
    description: '全链路覆盖求职旅程',
  },
];

// 6个智能体功能卡片
const agentFeatures = [
  {
    icon: <Compass className="w-8 h-8" />,
    title: 'AI职业规划师',
    description: '苏格拉底式引导，帮你找到方向',
    link: '/assistant?bot=career',
    gradient: 'from-violet-500 to-purple-600',
    isHero: true, // 主角，卡片更大
  },
  {
    icon: <Scale className="w-7 h-7" />,
    title: '考研就业决策',
    description: '数据推演，帮你做选择',
    link: '/assistant?bot=decision',
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    icon: <Target className="w-7 h-7" />,
    title: '能力测评',
    description: '专业技能量化评估',
    link: '/assessment',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: <Briefcase className="w-7 h-7" />,
    title: '岗位匹配',
    description: '基于技能精准推荐',
    link: '/match',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: <Mic className="w-7 h-7" />,
    title: 'AI模拟面试',
    description: '真实场景模拟练习',
    link: '/assistant?bot=interview',
    gradient: 'from-orange-500 to-amber-500',
  },
  {
    icon: <Users className="w-7 h-7" />,
    title: '职搭子',
    description: 'HR岗位JD助手',
    link: '/assistant?bot=jobs',
    gradient: 'from-pink-500 to-rose-500',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="min-h-screen bg-white text-[#1E293B] font-[system-ui,-apple-system,'Segoe_UI',Roboto,'Helvetica_Neue',Arial,'Noto_Sans',sans-serif] leading-relaxed">
      {/* ====== Global Animations ====== */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,.35), 0 0 60px rgba(99,102,241,.15); }
          50%      { box-shadow: 0 0 30px rgba(99,102,241,.5), 0 0 80px rgba(99,102,241,.25); }
        }
        .anim-up      { animation: fadeInUp .8s ease-out forwards; }
        .anim-up-d1   { opacity:0; animation: fadeInUp .8s ease-out .15s forwards; }
        .anim-up-d2   { opacity:0; animation: fadeInUp .8s ease-out .30s forwards; }
        .anim-up-d3   { opacity:0; animation: fadeInUp .8s ease-out .45s forwards; }
        .anim-up-d4   { opacity:0; animation: fadeInUp .8s ease-out .60s forwards; }
        .glow-btn     { animation: glow-pulse 3s ease-in-out infinite; }
        .glow-btn:hover {
          animation: none;
          box-shadow: 0 0 40px rgba(99,102,241,.6), 0 0 100px rgba(99,102,241,.3);
          transform: scale(1.05);
        }
      `}</style>

      {/* ================================================
           1. HERO 区域 — 故事线的起点
      ================================================ */}
      <section className="relative pt-16 sm:pt-20 md:pt-28 pb-12 sm:pb-16 md:pb-20 bg-gradient-to-b from-blue-50/60 via-white to-white overflow-hidden">
        {/* 装饰背景 */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-violet-100/30 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

        <div className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 ${mounted ? 'anim-up' : 'opacity-0'}`}>
          {/* 主标题 */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 leading-[1.15] tracking-tight anim-up-d1">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
              先想清楚，再投简历
            </span>
          </h1>
          
          {/* 副标题 */}
          <p className="text-lg md:text-xl text-[#64748B] max-w-2xl mx-auto mb-8 md:mb-10 anim-up-d2">
            职途星 — 大学生的AI职业规划师。<br className="sm:hidden" />
            从迷茫到清晰，只需一次对话。
          </p>
          
          {/* CTA 按钮 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 anim-up-d3">
            <Link href="/assistant?bot=career">
              <button className="glow-btn bg-gradient-to-r from-violet-600 via-purple-500 to-indigo-600 text-white text-lg px-10 py-4 rounded-2xl font-semibold transition-all duration-300 shadow-xl flex items-center gap-2">
                <Compass className="w-5 h-5" />
                开始我的职业规划
              </button>
            </Link>
            <Link href="/jobs">
              <button className="px-8 py-3.5 rounded-xl font-medium border-2 border-[#E2E8F0] text-[#1E293B] hover:border-violet-300 hover:bg-violet-50 transition-all duration-300 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                浏览岗位百科
              </button>
            </Link>
          </div>
          
          {/* 秋招倒计时 */}
          {(() => {
            const { days, color, text } = getDaysToAutumnRecruit();
            return (
              <p className={`mt-6 text-sm ${color} anim-up-d4 flex items-center justify-center gap-1.5`}>
                <Calendar className="w-4 h-4" />
                距离{new Date().getMonth() >= 8 ? '明年' : ''}秋招还有 <strong className="font-bold">{days}</strong> 天，你的准备进度如何？
              </p>
            );
          })()}
        </div>
      </section>

      {/* ================================================
           2. 痛点共鸣区 — 情感连接
      ================================================ */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl md:text-2xl font-bold text-[#1E293B] mb-8 text-center anim-up-d2">
            你是不是也在想……
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {painPoints.map((item, i) => (
              <div
                key={i}
                className={`bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-500 group ${mounted ? 'anim-up' : 'opacity-0'}`}
                style={{ animationDelay: `${(i + 2) * 0.15}s` }}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-[#1E293B] mb-2">{item.title}</h3>
                <p className="text-[#64748B] text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================
           3. 产品路径区 — 核心价值展示
      ================================================ */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-[#F8FAFC] to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl md:text-2xl font-bold text-[#1E293B] mb-4 text-center">
            从迷茫到入职，AI陪你走完全程
          </h2>
          <p className="text-[#64748B] text-center mb-10 max-w-xl mx-auto">
            不只是工具，而是懂你的职业伙伴。每一步都有AI智能体为你把关。
          </p>
          
          {/* 路径可视化 - 横向流程图 */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-2">
            {productPath.map((item, i) => (
              <div key={i} className="flex items-center">
                {/* 步骤卡片 */}
                <div
                  className={`relative rounded-2xl p-5 transition-all duration-500 group ${
                    item.isHero 
                      ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-xl scale-105 md:scale-110' 
                      : 'bg-white border border-[#E2E8F0] shadow-sm hover:shadow-lg hover:-translate-y-1'
                  }`}
                >
                  {/* 主角标识 */}
                  {item.isHero && (
                    <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      主角
                    </div>
                  )}
                  
                  {/* 图标 */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                    item.isHero 
                      ? 'bg-white/20' 
                      : `bg-gradient-to-br ${item.gradient} text-white shadow-lg`
                  } group-hover:scale-110 transition-transform duration-300`}>
                    {item.icon}
                  </div>
                  
                  {/* 内容 */}
                  <h3 className={`font-bold mb-1 ${item.isHero ? 'text-white' : 'text-[#1E293B]'}`}>
                    ① {item.title}
                  </h3>
                  <p className={`text-sm ${item.isHero ? 'text-white/80' : 'text-[#64748B]'}`}>
                    {item.description}
                  </p>
                </div>
                
                {/* 箭头连接（最后一步不显示） */}
                {i < productPath.length - 1 && (
                  <ArrowRight className="hidden md:block w-6 h-6 text-[#CBD5E1] mx-2 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================
           4. 数据信任区
      ================================================ */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {trustData.map((item, i) => (
              <div
                key={i}
                className="text-center p-6 bg-gradient-to-br from-blue-50 to-violet-50/50 rounded-2xl border border-blue-100/50"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
                  {item.icon}
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent mb-1">
                  {item.value}
                </div>
                <div className="font-semibold text-[#1E293B] mb-1">{item.label}</div>
                <div className="text-[#64748B] text-sm">{item.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================
           5. 功能卡片区 — 6个智能体
      ================================================ */}
      <section className="py-16 md:py-20 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl md:text-2xl font-bold text-[#1E293B] mb-4 text-center">
            AI智能体全家桶
          </h2>
          <p className="text-[#64748B] text-center mb-10">
            覆盖求职全流程，每个环节都有AI助手
          </p>
          
          {/* 功能卡片网格 — 主角更大 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agentFeatures.map((item, i) => (
              <div
                key={i}
                className={`bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 group ${
                  item.isHero ? 'md:col-span-1 lg:row-span-1' : ''
                } ${item.isHero ? 'ring-2 ring-violet-200 ring-offset-2' : ''}`}
              >
                {/* 主角标识 */}
                {item.isHero && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      核心推荐
                    </span>
                  </div>
                )}
                
                {/* 图标 */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {item.icon}
                </div>
                
                {/* 内容 */}
                <h3 className={`font-bold mb-2 ${item.isHero ? 'text-xl' : 'text-lg'} text-[#1E293B]`}>
                  {item.title}
                </h3>
                <p className="text-[#64748B] text-sm mb-4 leading-relaxed">{item.description}</p>
                
                {/* 按钮 */}
                <Link href={item.link}>
                  <button className={`w-full py-2.5 rounded-xl bg-gradient-to-r ${item.gradient} text-white font-medium hover:opacity-90 transition-opacity duration-300 shadow-sm flex items-center justify-center gap-2`}>
                    立即体验
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================
           6. CTA 区 — 底部号召
      ================================================ */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 relative overflow-hidden">
        {/* 装饰背景 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            还在迷茫？让AI帮你找到方向
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            职业规划不是拍脑袋，而是数据推演。让AI陪你理清思路，找到属于你的路。
          </p>
          <Link href="/assistant?bot=career">
            <button className="bg-white text-violet-600 hover:bg-slate-50 px-10 py-4 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 shadow-xl flex items-center gap-2 mx-auto">
              <Compass className="w-5 h-5" />
              免费开始规划
            </button>
          </Link>
        </div>
      </section>

      {/* 页脚由全局 Footer 组件渲染 */}

      {/* Schema.org JSON-LD 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "职途星",
            "url": SITE_URL,
            "description": "AI职业规划与模拟面试平台，为大学生提供一站式求职服务"
          })
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "职途星",
            "url": SITE_URL
          })
        }}
      />
    </div>
  );
}
