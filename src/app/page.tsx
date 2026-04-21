'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Target, TrendingUp, Gift, Users, Zap, Star, ThumbsUp, ChevronRight, Sparkles, Briefcase, MessageSquare } from 'lucide-react';

const hotTags = [
  'Java开发', 'Python开发', '前端开发', '产品经理', 'UI设计',
  '新媒体运营', '电商运营', 'HRBP', '会计', '销售',
  '教师', '护士', '工程师', '管培生', '行政', '数据分析师', '测试工程师'
];

const features = [
  {
    icon: <Check className="w-10 h-10" />,
    title: '多维度匹配性格/能力/兴趣',
    description: '覆盖互联网/金融/制造/教育/医疗等15+主流行业，匹配最适合你的岗位',
    buttonText: '立即匹配',
    buttonLink: '/assistant',
    gradient: 'from-blue-500 to-blue-600'
  },
  {
    icon: <Target className="w-10 h-10" />,
    title: '定制大学分阶段成长路径',
    description: '根据目标岗位，定制大一到大四分阶段成长计划，不走弯路',
    buttonText: '查看示例',
    buttonLink: '/assistant',
    gradient: 'from-purple-500 to-purple-600'
  },
  {
    icon: <TrendingUp className="w-10 h-10" />,
    title: 'AI模拟面试+成功率测算',
    description: '基于真实招聘要求，精准测算岗位应聘成功率，AI模拟真实面试场景',
    buttonText: '免费体验',
    buttonLink: '/assistant',
    gradient: 'from-green-500 to-green-600'
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
    gradient: 'from-blue-500 to-blue-600',
    title: '100%真实招聘数据',
    description: '所有信息均来自BOSS直聘、智联招聘等平台的真实JD，每周更新'
  },
  {
    number: '2',
    icon: <Zap className="w-6 h-6" />,
    gradient: 'from-purple-500 to-purple-600',
    title: 'AI个性化规划',
    description: '基于你的专业、兴趣和能力，生成专属的职业成长路径'
  },
  {
    number: '3',
    icon: <Gift className="w-6 h-6" />,
    gradient: 'from-green-500 to-green-600',
    title: '学生友好定价',
    description: '基础功能永久免费，会员低至9.9元/月，比线下咨询便宜99%'
  },
  {
    number: '4',
    icon: <Users className="w-6 h-6" />,
    gradient: 'from-orange-500 to-orange-600',
    title: '邀请好友免费领会员',
    description: '邀请好友注册，双方都能获得免费会员和AI次数'
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
    content: '9.9元的月卡太值了，无限次用AI模拟面试，面试的时候一点都不慌！',
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

export default function HomePage() {
  const router = useRouter();
  const tagsRef = useRef<HTMLDivElement>(null);
  const [showMoreTags, setShowMoreTags] = useState(false);
  const [likedReviews, setLikedReviews] = useState<number[]>([]);

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
    <div className="min-h-screen bg-white">
      {/* Banner Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-100 py-16 md:py-24 relative overflow-hidden">
        {/* 装饰背景 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            AI驱动的职业规划 <span className="text-[#165DFF]">助你找到理想工作</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            基于500万+<span className="font-semibold text-[#165DFF]">全行业真实职业数据</span>智能分析，
            多维度匹配你的性格、能力和兴趣，为你推荐最适合的职业方向，并提供个性化学习路径
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <Link href="/assistant">
              <Button className="bg-gradient-to-r from-[#165DFF] to-[#4080FF] hover:from-[#165DFF]/90 hover:to-[#4080FF]/90 text-white text-lg px-10 py-7 h-auto rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-1">
                立即免费使用
              </Button>
            </Link>
          </div>
          
          <p className="text-sm text-gray-500 mb-2 flex items-center justify-center gap-2">
            <span className="inline-flex items-center">
              <AnimatedNumber target={15680} />+ 大学生已找到心仪工作
            </span>
            <span className="text-gray-300">|</span>
            <span>每月免费5次AI服务</span>
          </p>
          <p className="text-sm text-green-600 font-medium">
            无需注册，立即体验
          </p>
        </div>
      </section>

      {/* Core Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border-2 border-gray-100 hover:border-blue-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 group"
              >
                <CardHeader className="pb-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 text-white shadow-lg group-hover:shadow-xl transition-shadow`}>
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900">{feature.title}</CardTitle>
                  <CardDescription className="text-gray-600 mt-2">{feature.description}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Link href={feature.buttonLink} className="w-full">
                    <Button className={`w-full bg-gradient-to-r ${feature.gradient} hover:opacity-90 text-white`}>
                      {feature.buttonText}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Hot Tags Section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-orange-500">🔥</span> 热门岗位一键查
            </h2>
            <button 
              className="text-sm text-[#165DFF] hover:text-[#165DFF]/80 flex items-center gap-1"
              onClick={() => setShowMoreTags(!showMoreTags)}
            >
              {showMoreTags ? '收起' : '更多'}
              <ChevronRight className={`w-4 h-4 transition-transform ${showMoreTags ? 'rotate-90' : ''}`} />
            </button>
          </div>
          <div 
            ref={tagsRef}
            className="relative"
          >
            {/* 滚动指示箭头 */}
            {hotTags.length > 8 && (
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none flex items-center justify-end pr-2">
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            )}
            
            <div className={`flex flex-wrap gap-3 transition-all duration-300 ${showMoreTags ? '' : 'max-h-16 overflow-hidden'}`}>
              {hotTags.map((tag, index) => (
                <button
                  key={index}
                  onClick={() => handleTagClick(tag)}
                  className="px-5 py-2.5 bg-white border-2 border-gray-200 rounded-full text-gray-700 font-medium hover:bg-[#165DFF] hover:text-white hover:border-[#165DFF] transition-all duration-300 hover:shadow-md active:scale-95"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AI Assistant Section */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3 flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-[#165DFF]" />
              免费体验AI岗位查询
            </h2>
            <p className="text-gray-600">
              👋 你好！我是「职途星——职搭子」，大学生专属的全行业岗位JD库助手~所有信息均来自真实招聘JD，拒绝空泛鸡汤！
            </p>
          </div>
          
          <div className="border-2 border-[#165DFF]/20 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50 to-white">
            <div className="p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* AI 图标 */}
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#165DFF] to-[#4080FF] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <span className="text-white text-2xl font-bold">AI</span>
                  </div>
                </div>
                
                {/* 示例对话气泡 */}
                <div className="flex-1 space-y-4">
                  <p className="text-gray-600 mb-4">✨ 我能帮你做什么：</p>
                  <div className="space-y-3">
                    {sampleQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSampleClick(q.text)}
                        className="w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-[#165DFF] hover:shadow-md transition-all duration-300 group flex items-center gap-3"
                      >
                        <span className="text-xl">{q.icon}</span>
                        <span className="text-gray-700 group-hover:text-[#165DFF] transition-colors">{q.text}</span>
                      </button>
                    ))}
                  </div>
                  
                  <Link href="/assistant" className="inline-block mt-4">
                    <Button className="bg-gradient-to-r from-[#165DFF] to-[#4080FF] hover:opacity-90 text-white shadow-lg shadow-blue-500/30">
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

      {/* Why Choose Us Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-12 text-center">
            为什么<AnimatedNumber target={15680} />+大学生选择职途星？
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {whyChooseUs.map((item, index) => (
              <div key={index} className="text-center group">
                <div className="relative mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto">
                    <div className={`w-10 h-10 bg-gradient-to-br ${item.gradient} rounded-full flex items-center justify-center text-white`}>
                      {item.icon}
                    </div>
                  </div>
                  <span className="absolute -top-1 -right-1 w-6 h-6 bg-[#165DFF] rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {item.number}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Reviews Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-12 text-center flex items-center justify-center gap-2">
            <span>💬</span> 用户真实评价
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {userReviews.map((review, index) => (
              <Card 
                key={index} 
                className="border-2 border-gray-100 hover:border-blue-200 transition-all duration-300 hover:shadow-lg"
              >
                <CardContent className="pt-6">
                  {/* 评分 */}
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                      />
                    ))}
                  </div>
                  
                  <p className="text-gray-700 mb-4 leading-relaxed">「{review.content}」</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#165DFF] to-[#4080FF] rounded-full flex items-center justify-center mr-3 border-2 border-blue-200">
                        <span className="text-white font-medium">{review.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{review.name}</p>
                        <p className="text-xs text-gray-500">{review.school}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleLike(index)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all ${
                        likedReviews.includes(index)
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
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

      {/* Referral Banner */}
      <section className="py-12 bg-gradient-to-r from-[#165DFF] to-[#4080FF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between text-center md:text-left">
            <div className="mb-6 md:mb-0">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-2">
                🎉 邀请好友得免费会员！
              </h2>
              <p className="text-white/90">
                邀请1人得7天会员+3次AI次数，邀请3人得30天会员，上不封顶！
              </p>
            </div>
            <Link href="/profile/invite">
              <Button className="bg-white text-[#165DFF] hover:bg-gray-100 text-lg px-8 py-6 h-auto rounded-xl shadow-lg">
                立即邀请
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
