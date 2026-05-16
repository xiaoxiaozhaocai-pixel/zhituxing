'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Target, TrendingUp, Gift, Users, Zap, Star, ThumbsUp, ChevronRight, Sparkles, Briefcase, MessageSquare, GraduationCap, Calendar } from 'lucide-react';

const hotTags = [
  'Java开发', 'Python开发', '前端开发', '产品经理', 'UI设计',
  '新媒体运营', '电商运营', 'HRBP', '会计', '销售',
  '教师', '护士', '工程师', '管培生', '行政', '数据分析师', '测试工程师'
];

const careerPlanningAdvantages = [
  {
    icon: <Calendar className="w-8 h-8" />,
    title: '分年级定制',
    description: '大一到大四，不同阶段不同规划',
    gradient: 'from-violet-500 to-purple-600'
  },
  {
    icon: <Target className="w-8 h-8" />,
    title: '6维精准匹配',
    description: '人格、专业、能力、兴趣、价值观、风险承受力',
    gradient: 'from-blue-500 to-indigo-600'
  },
  {
    icon: <Check className="w-8 h-8" />,
    title: '可落地行动项',
    description: '每个建议都带可点击的执行按钮',
    gradient: 'from-cyan-500 to-blue-600'
  },
  {
    icon: <TrendingUp className="w-8 h-8" />,
    title: '动态更新',
    description: '每月自动复盘，规划随你成长',
    gradient: 'from-emerald-500 to-teal-600'
  }
];

const features = [
  {
    icon: <GraduationCap className="w-10 h-10" />,
    title: 'AI职业规划',
    description: '30秒生成专属大学四年职业规划，精准匹配专业、年级和兴趣',
    badge: '永久免费',
    badgeColor: 'bg-violet-500/20 text-violet-300 border border-violet-400/30',
    buttonText: '立即免费生成',
    buttonLink: '/career-planning',
    gradient: 'from-violet-500 to-purple-600',
    glowColor: 'rgba(139, 92, 246, 0.4)'
  },
  {
    icon: <Briefcase className="w-10 h-10" />,
    title: '全行业岗位百科',
    description: '覆盖互联网/金融/制造/教育/医疗等15+主流行业，匹配最适合你的岗位',
    badge: '无限次免费',
    badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-400/30',
    buttonText: '免费查询岗位',
    buttonLink: '/jobs',
    gradient: 'from-blue-500 to-cyan-500',
    glowColor: 'rgba(59, 130, 246, 0.4)'
  },
  {
    icon: <MessageSquare className="w-10 h-10" />,
    title: 'AI模拟面试',
    description: '基于真实招聘要求，AI模拟真实面试场景，精准测算应聘成功率',
    badge: '免费3次',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30',
    buttonText: '免费体验3次',
    buttonLink: '/assistant?bot=interview',
    gradient: 'from-emerald-500 to-teal-500',
    glowColor: 'rgba(16, 185, 129, 0.4)'
  }
];

const sampleQuestions = [
  { text: 'Java开发应届生薪资多少？', icon: '💰' },
  { text: '计算机专业适合什么岗位？', icon: '💻' },
  { text: '帮我模拟HR面试', icon: '🎯' }
];

const whyChooseUs = [
  {
    number: '1',
    icon: <Check className="w-6 h-6" />,
    gradient: 'from-emerald-500 to-teal-500',
    title: '100%真实校招数据',
    description: '所有JD均来自国家官方招聘平台，每周自动更新，拒绝虚假岗位'
  },
  {
    number: '2',
    icon: <Target className="w-6 h-6" />,
    gradient: 'from-violet-500 to-purple-600',
    title: 'AI个性化规划',
    description: '基于你的专业、年级和意向城市，生成专属大学四年成长路径'
  },
  {
    number: '3',
    icon: <Gift className="w-6 h-6" />,
    gradient: 'from-blue-500 to-cyan-500',
    title: '基础功能永久免费',
    description: '职业规划、岗位查询、求职干货全部免费，无任何次数限制'
  },
  {
    number: '4',
    icon: <Users className="w-6 h-6" />,
    gradient: 'from-amber-500 to-orange-500',
    title: '9.9元终身会员',
    description: '首1000名用户仅需9.9元，永久解锁全部求职工具'
  }
];

const userReviews = [
  {
    name: '张三',
    school: '某985大学',
    content: '计算机专业大三，生成的职业规划报告非常详细，帮我明确了前端开发的学习路径，免费次数完全够用！',
    rating: 5,
    likes: 128
  },
  {
    name: '李四',
    school: '某211大学',
    content: '之前不知道自己适合什么岗位，用职途星测了一下，推荐的HR岗位真的很适合我，已经拿到offer了！',
    rating: 5,
    likes: 256
  },
  {
    name: '王五',
    school: '某普通本科',
    content: '学期会员才29.9元，6个月无限用AI服务，比线下求职咨询便宜太多了！',
    rating: 5,
    likes: 89
  }
];

// 动态数字滚动组件
function AnimatedNumber({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;

    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [started, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

// 浮动粒子组件 — 仅客户端渲染，避免 SSR/CSR Math.random() 不一致导致 hydration 错误
function FloatingParticles() {
  const [particles, setParticles] = useState<Array<{w:number;h:number;l:number;t:number;dur:number;delay:number;dx:string}>>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 20 }).map(() => ({
        w: Math.random() * 4 + 2,
        h: Math.random() * 4 + 2,
        l: Math.random() * 100,
        t: Math.random() * 100,
        dur: Math.random() * 20 + 15,
        delay: Math.random() * -20,
        dx: Math.random() > 0.5 ? '' : '-',
      }))
    );
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white/[0.03]"
          style={{
            width: `${p.w}px`,
            height: `${p.h}px`,
            left: `${p.l}%`,
            top: `${p.t}%`,
            animation: `float-particle ${p.dur}s linear infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const tagsRef = useRef<HTMLDivElement>(null);
  const [showMoreTags, setShowMoreTags] = useState(false);
  const [likedReviews, setLikedReviews] = useState<number[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTagClick = (tag: string) => {
    router.push(`/assistant?query=${encodeURIComponent(tag)}`);
  };

  const handleLike = (index: number) => {
    if (!likedReviews.includes(index)) {
      setLikedReviews([...likedReviews, index]);
    }
  };

  const handleSampleClick = (question: string) => {
    router.push(`/assistant?query=${encodeURIComponent(question)}`);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] font-[system-ui,-apple-system,'Segoe_UI',Roboto,'Helvetica_Neue',Arial,'Noto_Sans',sans-serif] leading-relaxed">
      {/* Global Fade-in Animation */}
      <style jsx global>{`
        @keyframes float-particle {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) translateX(-50px); opacity: 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.5), 0 0 60px rgba(99, 102, 241, 0.2); }
          50% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.7), 0 0 80px rgba(99, 102, 241, 0.3); }
        }
        @keyframes grid-move {
          0% { transform: translateY(0); }
          100% { transform: translateY(60px); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .animate-fade-in-up-delay-1 {
          opacity: 0;
          animation: fadeInUp 0.8s ease-out 0.15s forwards;
        }
        .animate-fade-in-up-delay-2 {
          opacity: 0;
          animation: fadeInUp 0.8s ease-out 0.3s forwards;
        }
        .animate-fade-in-up-delay-3 {
          opacity: 0;
          animation: fadeInUp 0.8s ease-out 0.45s forwards;
        }
        .animate-fade-in-up-delay-4 {
          opacity: 0;
          animation: fadeInUp 0.8s ease-out 0.6s forwards;
        }
        .glow-btn {
          animation: glow-pulse 3s ease-in-out infinite;
        }
        .glow-btn:hover {
          animation: none;
          box-shadow: 0 0 40px rgba(99, 102, 241, 0.8), 0 0 100px rgba(99, 102, 241, 0.4);
          transform: scale(1.05);
        }
      `}</style>

      {/* ============ Hero Section ============ */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        {/* 深蓝渐变背景 */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#0F172A]" />

        {/* 网格纹理 */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* 装饰光晕 */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[128px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[160px]" />

        {/* 浮动粒子 */}
        <FloatingParticles />

        {/* Hero Content */}
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 py-24 md:py-32 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
          {/* 标签 */}
          <div className="animate-fade-in-up-delay-1">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] text-sm text-blue-300 mb-8 backdrop-blur-sm">
              <Sparkles className="w-4 h-4" />
              全行业全岗位 AI 模拟甄选与职业能力发展平台
            </span>
          </div>

          {/* 主标题 */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-[1.2] tracking-tight animate-fade-in-up-delay-2">
            AI生成你的专属
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
              大学四年职业规划
            </span>
          </h1>

          {/* 副标题 */}
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-4 animate-fade-in-up-delay-2">
            <span className="text-white font-semibold">永久免费</span>{' '}
            <span className="text-slate-500">·</span>{' '}
            <span className="text-white font-semibold">无次数限制</span>{' '}
            <span className="text-slate-500">·</span>{' '}
            <span className="text-white font-semibold">30秒生成</span>
          </p>

          {/* CTA 按钮 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 animate-fade-in-up-delay-3">
            <Link href="/career-planning">
              <button className="glow-btn bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 text-white text-lg px-10 py-4 rounded-xl font-semibold transition-all duration-300">
                立即免费生成我的规划
              </button>
            </Link>
          </div>

          {/* 用户数量 */}
          <p className="text-base text-slate-500 flex items-center justify-center gap-2 animate-fade-in-up-delay-4">
            已帮助 <AnimatedNumber target={15680} />+ 大学生找到心仪工作
          </p>
        </div>

        {/* 底部渐变过渡 */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0F172A] to-transparent" />
      </section>

      {/* ============ Core Features Section ============ */}
      <section className="py-20 bg-[#0F172A] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className={`relative overflow-hidden bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_60px_-15px_${feature.glowColor}] group`}
              >
                {/* 悬浮光晕 */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${feature.gradient} rounded-full blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity duration-700`} />

                <CardHeader className="pb-4 relative z-10">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-xl font-bold text-white">{feature.title}</CardTitle>
                    {feature.badge && (
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${feature.badgeColor || 'bg-slate-700 text-slate-300'}`}>
                        {feature.badge}
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-slate-400 mt-2 leading-relaxed">{feature.description}</CardDescription>
                </CardHeader>
                <CardFooter className="relative z-10">
                  <Link href={feature.buttonLink} className="w-full">
                    <Button className={`w-full bg-gradient-to-r ${feature.gradient} hover:opacity-90 text-white border-0 transition-all duration-300`}>
                      {feature.buttonText}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ Hot Tags Section ============ */}
      <section className="py-16 bg-[#0B1120]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-orange-400">🔥</span> 热门岗位一键查
            </h2>
            <button
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              onClick={() => setShowMoreTags(!showMoreTags)}
            >
              {showMoreTags ? '收起' : '更多'}
              <ChevronRight className={`w-4 h-4 transition-transform ${showMoreTags ? 'rotate-90' : ''}`} />
            </button>
          </div>
          <div ref={tagsRef} className="relative">
            <div className={`flex flex-wrap gap-3 transition-all duration-300 ${showMoreTags ? '' : 'max-h-16 overflow-hidden'}`}>
              {hotTags.map((tag, index) => (
                <button
                  key={index}
                  onClick={() => handleTagClick(tag)}
                  className="px-5 py-2.5 bg-slate-800/80 border border-slate-700/50 rounded-full text-slate-300 font-medium hover:bg-blue-600 hover:text-white hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ AI Assistant Section ============ */}
      <section className="py-20 bg-[#0F172A]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-400" />
              免费体验AI岗位查询
            </h2>
            <p className="text-slate-400 leading-relaxed">
              你好！我是「职途星——职搭子」，大学生专属的全行业岗位JD库助手~所有信息均来自真实招聘JD，拒绝空泛鸡汤！
            </p>
          </div>

          <div className="border border-slate-700/50 rounded-2xl overflow-hidden bg-slate-800/30 backdrop-blur-sm">
            <div className="p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* AI 图标 */}
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <span className="text-white text-2xl font-bold">AI</span>
                  </div>
                </div>

                {/* 示例对话气泡 */}
                <div className="flex-1 space-y-4">
                  <p className="text-slate-300 mb-4">✨ 我能帮你做什么：</p>
                  <div className="space-y-3">
                    {sampleQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSampleClick(q.text)}
                        className="w-full text-left px-5 py-3.5 bg-slate-800/80 border border-slate-700/50 rounded-xl hover:border-blue-500/50 hover:bg-slate-700/50 transition-all duration-300 group flex items-center gap-3"
                      >
                        <span className="text-xl">{q.icon}</span>
                        <span className="text-slate-300 group-hover:text-blue-300 transition-colors">{q.text}</span>
                      </button>
                    ))}
                  </div>

                  <Link href="/assistant" className="inline-block mt-4">
                    <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 text-white shadow-lg shadow-blue-500/20 border-0">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      立即体验
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Why Choose Us Section ============ */}
      <section className="py-20 bg-[#0B1120]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-14 text-center">
            为什么<AnimatedNumber target={15680} />+大学生选择职途星？
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {whyChooseUs.map((item, index) => (
              <div key={index} className="text-center group">
                <div className="relative mb-5">
                  <div className="w-14 h-14 bg-slate-800/80 rounded-full flex items-center justify-center mx-auto border border-slate-700/50">
                    <div className={`w-10 h-10 bg-gradient-to-br ${item.gradient} rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}>
                      {item.icon}
                    </div>
                  </div>
                  <span className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-blue-500/30">
                    {item.number}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ Career Planning Advantages Section ============ */}
      <section className="py-20 bg-[#0F172A] relative overflow-hidden">
        {/* 装饰光晕 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-violet-600/5 rounded-full blur-[120px]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-14 text-center flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-violet-400" />
            职业规划核心优势
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {careerPlanningAdvantages.map((item, index) => (
              <Card
                key={index}
                className="bg-slate-800/50 border-slate-700/50 hover:border-violet-500/30 hover:shadow-[0_12px_40px_-10px_rgba(139,92,246,0.2)] transition-all duration-500 hover:-translate-y-1 group backdrop-blur-sm"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-white mb-1">{item.title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ User Reviews Section ============ */}
      <section className="py-20 bg-[#0B1120]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-14 text-center flex items-center justify-center gap-2">
            <span>💬</span> 用户真实评价
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {userReviews.map((review, index) => (
              <Card
                key={index}
                className="bg-slate-800/50 border-slate-700/50 hover:border-blue-500/30 transition-all duration-500 hover:shadow-[0_12px_40px_-10px_rgba(59,130,246,0.15)] hover:-translate-y-1 group backdrop-blur-sm"
              >
                <CardContent className="pt-6">
                  {/* 评分 */}
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`}
                      />
                    ))}
                  </div>

                  <p className="text-slate-300 mb-4 leading-relaxed">「{review.content}」</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-3 border-2 border-blue-400/30">
                        <span className="text-white font-medium">{review.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-white">{review.name}</p>
                        <p className="text-xs text-slate-500">{review.school}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleLike(index)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all ${
                        likedReviews.includes(index)
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700 hover:text-slate-400'
                      }`}
                    >
                      <ThumbsUp className={`w-3 h-3 ${likedReviews.includes(index) ? 'fill-current' : ''}`} />
                      <span>{review.likes + (likedReviews.includes(index) ? 1 : 0)}</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ Referral Banner ============ */}
      <section className="py-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 relative overflow-hidden">
        {/* 装饰 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between text-center md:text-left">
            <div className="mb-6 md:mb-0">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-2">
                🎉 邀请好友得免费会员！
              </h2>
              <p className="text-white/80 leading-relaxed">
                邀请1人得7天会员+3次AI次数，邀请3人得30天会员，上不封顶！
              </p>
            </div>
            <Link href="/profile/invite">
              <Button className="bg-white text-indigo-600 hover:bg-slate-100 text-lg px-8 py-6 h-auto rounded-xl shadow-lg font-semibold transition-all duration-300 hover:scale-105">
                立即邀请
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
