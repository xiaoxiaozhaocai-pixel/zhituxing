'use client';

import { useState, useEffect } from 'react';
import { SITE_URL } from '@/lib/config';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Target, TrendingUp, Gift, Users, Star, ThumbsUp, ChevronRight, Sparkles, Briefcase, MessageSquare, GraduationCap, Calendar, ArrowRight } from 'lucide-react';
import { AnimatedNumber } from '@/components/AnimatedNumber';

const hotTags = [
  'Java开发', 'Python开发', '前端开发', '产品经理', 'UI设计',
  '新媒体运营', '电商运营', 'HRBP', '会计', '数据分析师'
];

const careerPlanningAdvantages = [
  {
    icon: <Calendar className="w-7 h-7" />,
    title: '分年级定制',
    description: '大一到 大四，逐步进阶',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    icon: <Target className="w-7 h-7" />,
    title: '6维精准匹配',
    description: '人格、专业、能力全覆盖',
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    icon: <Check className="w-7 h-7" />,
    title: '可落地行动项',
    description: '每步都有执行指引',
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    icon: <TrendingUp className="w-7 h-7" />,
    title: '动态更新',
    description: '随成长自动调整规划',
    gradient: 'from-emerald-500 to-teal-600',
  }
];

const features = [
  {
    icon: <GraduationCap className="w-9 h-9" />,
    title: 'AI职业规划',
    description: '生成你的专属发展路径',
    badge: '免费',
    badgeClass: 'bg-violet-50 text-violet-600 ring-1 ring-violet-200',
    buttonText: '去体验',
    buttonLink: '/career-planning',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    icon: <Briefcase className="w-9 h-9" />,
    title: '全行业岗位百科',
    description: '2000+岗位，薪资技能全掌握',
    badge: '免费',
    badgeClass: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200',
    buttonText: '去体验',
    buttonLink: '/jobs',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: <MessageSquare className="w-9 h-9" />,
    title: 'AI模拟面试',
    description: '模拟真实面试，获得即时反馈',
    badge: '免费3次',
    badgeClass: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
    buttonText: '去体验',
    buttonLink: '/assistant?bot=interview',
    gradient: 'from-emerald-500 to-teal-500',
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
    icon: <Check className="w-5 h-5" />,
    gradient: 'from-emerald-500 to-teal-500',
    title: '真实校招数据',
    description: '来自官方平台，每周更新'
  },
  {
    number: '2',
    icon: <Target className="w-5 h-5" />,
    gradient: 'from-violet-500 to-purple-600',
    title: 'AI个性化规划',
    description: '匹配你的专业和年级'
  },
  {
    number: '3',
    icon: <Gift className="w-5 h-5" />,
    gradient: 'from-blue-500 to-cyan-500',
    title: '基础功能免费',
    description: '职业规划、岗位查询无限次'
  },
  {
    number: '4',
    icon: <Users className="w-5 h-5" />,
    gradient: 'from-amber-500 to-orange-500',
    title: '9.9元终身会员',
    description: '首1000名用户限时优惠'
  }
];

const userReviews = [
  {
    name: '陈思远',
    school: '华中科技大学',
    content: 'AI简历优化太实用了！能指出简历漏洞，还能根据岗位调整关键词，面试邀请率明显提升。',
    rating: 5,
    likes: 128
  },
  {
    name: '林晓',
    school: '南京大学',
    content: '作为文科生，通过职业测评和模拟面试，清晰了解了自己的优势，成功转行产品运营。',
    rating: 5,
    likes: 256
  },
  {
    name: '赵一凡',
    school: '西安电子科技大学',
    content: '考研还是就业？AI顾问帮我分析行业趋势和能力模型，最终选择就业，决策非常正确。',
    rating: 5,
    likes: 89
  }
];

export default function HomePage() {
  const router = useRouter();
  const [showMoreTags, setShowMoreTags] = useState(false);
  const [likedReviews, setLikedReviews] = useState<number[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleTagClick = (tag: string) => {
    router.push(`/assistant?query=${encodeURIComponent(tag)}`);
  };

  const handleLike = (index: number) => {
    if (!likedReviews.includes(index)) setLikedReviews([...likedReviews, index]);
  };

  const handleSampleClick = (question: string) => {
    router.push(`/assistant?query=${encodeURIComponent(question)}`);
  };

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
           HERO — 白底 + 大标题
      ================================================ */}
      <section className="relative pt-20 sm:pt-24 md:pt-32 pb-16 sm:pb-20 md:pb-24 bg-gradient-to-b from-blue-50/80 via-white to-white overflow-hidden">
        {/* 装饰圆 */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-100/30 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />

        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 ${mounted ? 'anim-up' : 'opacity-0'}`}>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-[1.2] tracking-tight anim-up-d2">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 bg-clip-text text-transparent">3分钟，找到你的职业方向</span>
          </h1>
          <p className="text-lg md:text-xl text-[#64748B] max-w-2xl mx-auto mb-10 anim-up-d2">
            告别迷茫，AI为你定制专属职业报告
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 anim-up-d3">
            <Link href="/assessment">
              <button className="glow-btn bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 text-white text-lg px-10 py-4 rounded-2xl font-semibold transition-all duration-300 shadow-xl">
                免费开始规划
              </button>
            </Link>
            <Link href="/jobs">
              <button className="px-8 py-3.5 rounded-xl font-medium border-2 border-[#E2E8F0] text-[#1E293B] hover:border-blue-300 hover:bg-blue-50 transition-all duration-300">
                浏览岗位
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================
           CORE FEATURES — 3 白色卡片
      ================================================ */}
      <section className="py-20 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-8 flex flex-col gap-5 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 group"
              >
                {/* 图标 */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {f.icon}
                </div>
                {/* 标题 + badge */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="text-xl font-bold text-[#1E293B]">{f.title}</h3>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${f.badgeClass}`}>{f.badge}</span>
                  </div>
                  <p className="text-[#64748B] text-sm leading-relaxed">{f.description}</p>
                </div>
                {/* 按钮 */}
                <Link href={f.buttonLink} className="mt-auto">
                  <button className={`w-full py-2.5 rounded-xl bg-gradient-to-r ${f.gradient} text-white font-medium hover:opacity-90 transition-opacity duration-300 shadow-sm`}>
                    {f.buttonText}
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================
           HOT TAGS — 热门岗位
      ================================================ */}
      <section className="py-16 md:py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-[#1E293B] mb-6 flex items-center gap-2">
            <span className="text-orange-500">🔥</span> 热门岗位
          </h2>
          <div className="flex flex-wrap gap-3">
            {hotTags.map((tag, i) => (
              <button
                key={i}
                onClick={() => handleTagClick(tag)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] rounded-full text-sm text-[#1E293B] hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all duration-300"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================
           AI ASSISTANT — 免费体验
      ================================================ */}
      <section className="py-20 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-[#1E293B] mb-3">
              体验 AI 岗位查询
            </h2>
            <p className="text-[#64748B]">
              输入岗位名，即刻获取薪资、技能、前景全解析
            </p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 md:p-10 shadow-sm">
            <div className="space-y-4">
              <p className="text-[#1E293B] font-medium">✨ 试着问我：</p>
              <div className="space-y-3">
                {sampleQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSampleClick(q.text)}
                    className="w-full text-left px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-300 group flex items-center gap-3"
                  >
                    <span className="text-lg">{q.icon}</span>
                    <span className="text-[#1E293B] group-hover:text-blue-600 transition-colors">{q.text}</span>
                    <ArrowRight className="w-4 h-4 ml-auto text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
              <Link href="/assistant" className="inline-block mt-4">
                <button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 text-white shadow-md px-6 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  去体验
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================
           WHY CHOOSE US — 统计数据
      ================================================ */}
      <section className="py-20 md:py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl md:text-2xl font-bold text-[#1E293B] mb-12 text-center">
            <AnimatedNumber target={10000} />+ 大学生的选择
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {whyChooseUs.map((item, i) => (
              <div
                key={i}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-6 text-center shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-500 group"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${item.gradient} rounded-full flex items-center justify-center mx-auto mb-4 text-white group-hover:scale-110 transition-transform duration-300`}>
                  {item.icon}
                </div>
                <h3 className="font-semibold text-[#1E293B] mb-1">{item.title}</h3>
                <p className="text-[#64748B] text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================
           CAREER PLANNING ADVANTAGES
      ================================================ */}
      <section className="py-20 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl md:text-2xl font-bold text-[#1E293B] mb-10 text-center">
            职业规划核心优势
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {careerPlanningAdvantages.map((item, i) => (
              <div
                key={i}
                className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-[#1E293B]">{item.title}</h3>
                  <p className="text-[#64748B] text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================
           USER REVIEWS
      ================================================ */}
      <section className="py-20 md:py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl md:text-2xl font-bold text-[#1E293B] mb-10 text-center">
            用户评价
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {userReviews.map((review, i) => (
              <div
                key={i}
                className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-500"
              >
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className={`w-4 h-4 ${j < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />
                  ))}
                </div>
                <p className="text-[#1E293B] mb-4 text-sm leading-relaxed">「{review.content}」</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-2">
                      <span className="text-white text-sm font-medium">{review.name.charAt(0)}</span>
                    </div>
                    <p className="font-medium text-[#1E293B] text-sm">{review.name}</p>
                  </div>
                  <span className="text-xs text-[#64748B]">{review.school}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================
           REFERRAL BANNER
      ================================================ */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between text-center md:text-left gap-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">邀请好友，一起规划未来</h2>
              <p className="text-white/80 text-sm">邀请好友得免费会员</p>
            </div>
            <Link href="/profile/invite">
              <button className="bg-white text-indigo-600 hover:bg-slate-50 px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105">
                立即邀请
              </button>
            </Link>
          </div>
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
