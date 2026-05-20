'use client';

import { useState, useEffect, useRef } from 'react';
import { SITE_URL } from '@/lib/config';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Target, TrendingUp, Gift, Users, Star, ThumbsUp, ChevronRight, Sparkles, Briefcase, MessageSquare, GraduationCap, Calendar, ArrowRight } from 'lucide-react';

const hotTags = [
  'Java开发', 'Python开发', '前端开发', '产品经理', 'UI设计',
  '新媒体运营', '电商运营', 'HRBP', '会计', '销售',
  '教师', '护士', '工程师', '管培生', '行政', '数据分析师', '测试工程师'
];

const careerPlanningAdvantages = [
  {
    icon: <Calendar className="w-7 h-7" />,
    title: '分年级定制',
    description: '大一到大四，不同阶段不同规划',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    icon: <Target className="w-7 h-7" />,
    title: '6维精准匹配',
    description: '人格、专业、能力、兴趣、价值观、风险承受力',
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    icon: <Check className="w-7 h-7" />,
    title: '可落地行动项',
    description: '每个建议都带可点击的执行按钮',
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    icon: <TrendingUp className="w-7 h-7" />,
    title: '动态更新',
    description: '每月自动复盘，规划随你成长',
    gradient: 'from-emerald-500 to-teal-600',
  }
];

const features = [
  {
    icon: <GraduationCap className="w-9 h-9" />,
    title: 'AI职业规划',
    description: '30秒生成专属大学四年职业规划，精准匹配专业、年级和兴趣',
    badge: '永久免费',
    badgeClass: 'bg-violet-50 text-violet-600 ring-1 ring-violet-200',
    buttonText: '立即免费生成',
    buttonLink: '/career-planning',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    icon: <Briefcase className="w-9 h-9" />,
    title: '全行业岗位百科',
    description: '覆盖互联网/金融/制造/教育/医疗等15+主流行业，匹配最适合你的岗位',
    badge: '无限次免费',
    badgeClass: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200',
    buttonText: '免费查询岗位',
    buttonLink: '/jobs',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: <MessageSquare className="w-9 h-9" />,
    title: 'AI模拟面试',
    description: '基于真实招聘要求，AI模拟真实面试场景，精准测算应聘成功率',
    badge: '免费3次',
    badgeClass: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
    buttonText: '免费体验3次',
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
    title: '100%真实校招数据',
    description: '所有JD均来自国家官方招聘平台，每周自动更新，拒绝虚假岗位'
  },
  {
    number: '2',
    icon: <Target className="w-5 h-5" />,
    gradient: 'from-violet-500 to-purple-600',
    title: 'AI个性化规划',
    description: '基于你的专业、年级和意向城市，生成专属大学四年成长路径'
  },
  {
    number: '3',
    icon: <Gift className="w-5 h-5" />,
    gradient: 'from-blue-500 to-cyan-500',
    title: '基础功能永久免费',
    description: '职业规划、岗位查询、求职干货全部免费，无任何次数限制'
  },
  {
    number: '4',
    icon: <Users className="w-5 h-5" />,
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
    if (ref.current) observer.observe(ref.current);
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
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

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
      <section className="relative pt-20 sm:pt-24 md:pt-32 pb-12 sm:pb-16 md:pb-20 bg-gradient-to-b from-blue-50/80 via-white to-white overflow-hidden">
        {/* 装饰圆 */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-100/30 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />

        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 ${mounted ? 'anim-up' : 'opacity-0'}`}>
          <div className="anim-up-d1">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-sm text-blue-600 mb-8">
              <Sparkles className="w-4 h-4" />
              全行业全岗位 AI 模拟甄选与职业能力发展平台
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-[1.2] tracking-tight anim-up-d2">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 bg-clip-text text-transparent">3分钟，用AI找到你的职业方向</span>
          </h1>
          <p className="text-xl md:text-2xl text-[#64748B] max-w-3xl mx-auto mb-6 anim-up-d2">
            基于<span className="text-[#1E293B] font-semibold">2万+真实岗位数据</span>，AI智能匹配你的职业发展路径
          </p>
          <p className="text-base text-[#94A3B8] mb-8 anim-up-d3">
            已有 <span className="text-[#1E293B] font-semibold">10,000+</span> 用户正在使用 · 覆盖 <span className="text-[#1E293B] font-semibold">28</span> 个行业 · <span className="text-[#1E293B] font-semibold">20,000+</span> 真实岗位
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 anim-up-d3">
            <Link href="/assessment">
              <button className="glow-btn bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 text-white text-xl px-12 py-5 rounded-2xl font-bold transition-all duration-300 shadow-xl">
                免费开始职业测评
              </button>
            </Link>
            <Link href="/jobs">
              <button className="px-10 py-4 rounded-xl font-semibold text-lg border-2 border-[#E2E8F0] text-[#1E293B] hover:border-blue-300 hover:bg-blue-50 transition-all duration-300">
                浏览岗位百科
              </button>
            </Link>
          </div>
          <p className="text-sm text-[#94A3B8] anim-up-d4">
            ✨ 无需注册，免费体验
          </p>
        </div>
      </section>

      {/* ================================================
           CORE FEATURES — 3 白色卡片
      ================================================ */}
      <section className="section-padding-sm bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-6 flex flex-col gap-5 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 group"
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
      <section className="section-padding-sm bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#1E293B] flex items-center gap-2">
              <span className="text-orange-500">🔥</span> 热门岗位一键查
            </h2>
            <button
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
              onClick={() => setShowMoreTags(!showMoreTags)}
            >
              {showMoreTags ? '收起' : '更多'}
              <ChevronRight className={`w-4 h-4 transition-transform ${showMoreTags ? 'rotate-90' : ''}`} />
            </button>
          </div>
          <div className={`flex flex-wrap gap-3 transition-all duration-300 ${showMoreTags ? '' : 'max-h-16 overflow-hidden'}`}>
            {hotTags.map((tag, i) => (
              <button
                key={i}
                onClick={() => handleTagClick(tag)}
                className="px-5 py-2.5 bg-white border border-[#E2E8F0] rounded-full text-[#1E293B] font-medium hover:bg-blue-600 hover:text-white hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/15 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
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
      <section className="section-padding-sm bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-[#1E293B] mb-3 flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              免费体验AI岗位查询
            </h2>
            <p className="text-[#64748B] leading-relaxed max-w-2xl mx-auto">
              你好！我是「职途星——职搭子」，大学生专属的全行业岗位JD库助手~所有信息均来自真实招聘JD，拒绝空泛鸡汤！
            </p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 md:p-12 shadow-sm">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* AI 图标 */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <span className="text-white text-2xl font-bold">AI</span>
                </div>
              </div>
              {/* 示例对话 */}
              <div className="flex-1 space-y-4 w-full">
                <p className="text-[#1E293B] mb-4">✨ 我能帮你做什么：</p>
                <div className="space-y-3">
                  {sampleQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSampleClick(q.text)}
                      className="w-full text-left px-5 py-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-300 group flex items-center gap-3"
                    >
                      <span className="text-xl">{q.icon}</span>
                      <span className="text-[#1E293B] group-hover:text-blue-600 transition-colors">{q.text}</span>
                      <ArrowRight className="w-4 h-4 ml-auto text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
                <Link href="/assistant" className="inline-block mt-4">
                  <button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 text-white shadow-md shadow-blue-500/20 px-6 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    立即体验
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================
           WHY CHOOSE US — 优势卡片
      ================================================ */}
      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E293B] mb-14 text-center">
            为什么<AnimatedNumber target={15680} />+大学生选择职途星？
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyChooseUs.map((item, i) => (
              <div
                key={i}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-6 text-center shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-500 group"
              >
                <div className="relative mb-5 inline-block">
                  <div className="w-14 h-14 bg-[#F8FAFC] rounded-full flex items-center justify-center mx-auto border border-[#E2E8F0]">
                    <div className={`w-10 h-10 bg-gradient-to-br ${item.gradient} rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}>
                      {item.icon}
                    </div>
                  </div>
                  <span className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                    {item.number}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#1E293B] mb-2">{item.title}</h3>
                <p className="text-[#64748B] text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================
           CAREER PLANNING ADVANTAGES
      ================================================ */}
      <section className="section-padding-sm bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E293B] mb-14 text-center flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-violet-500" />
            职业规划核心优势
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {careerPlanningAdvantages.map((item, i) => (
              <div
                key={i}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-6 flex items-start gap-4 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-500 group"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-bold text-[#1E293B] mb-1">{item.title}</h3>
                  <p className="text-[#64748B] text-sm leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================
           USER REVIEWS
      ================================================ */}
      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E293B] mb-14 text-center flex items-center justify-center gap-2">
            💬 用户真实评价
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {userReviews.map((review, i) => (
              <div
                key={i}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-500 group"
              >
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className={`w-4 h-4 ${j < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />
                  ))}
                </div>
                <p className="text-[#1E293B] mb-5 leading-relaxed">「{review.content}」</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-medium">{review.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-[#1E293B] text-sm">{review.name}</p>
                      <p className="text-xs text-[#64748B]">{review.school}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLike(i)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm transition-all ${
                      likedReviews.includes(i)
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-500'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${likedReviews.includes(i) ? 'fill-current' : ''}`} />
                    <span>{review.likes + (likedReviews.includes(i) ? 1 : 0)}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================
           REFERRAL BANNER
      ================================================ */}
      <section className="py-10 sm:py-12 md:py-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between text-center md:text-left">
            <div className="mb-6 md:mb-0">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">🎉 邀请好友得免费会员！</h2>
              <p className="text-white/80 leading-relaxed">邀请1人得7天会员+3次AI次数，邀请3人得30天会员，上不封顶！</p>
            </div>
            <Link href="/profile/invite">
              <button className="bg-white text-indigo-600 hover:bg-slate-50 text-lg px-8 py-4 rounded-xl shadow-lg font-semibold transition-all duration-300 hover:scale-105">
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
