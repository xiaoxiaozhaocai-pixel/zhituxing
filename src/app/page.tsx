'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Target, TrendingUp, Gift, Users, Zap } from 'lucide-react';

const hotTags = [
  'Java开发', 'Python开发', '前端开发', '产品经理', 'UI设计',
  '新媒体运营', '电商运营', 'HRBP', '会计', '销售',
  '教师', '护士', '工程师', '管培生', '行政'
];

const features = [
  {
    icon: <Check className="w-10 h-10 text-[#165DFF]" />,
    title: '多维度匹配性格/能力/兴趣',
    description: '覆盖互联网/金融/制造/教育/医疗等15+主流行业，匹配最适合你的岗位',
    buttonText: '立即匹配',
    buttonLink: '/assistant'
  },
  {
    icon: <Target className="w-10 h-10 text-[#165DFF]" />,
    title: '定制大学分阶段成长路径',
    description: '根据目标岗位，定制大一到大四分阶段成长计划，不走弯路',
    buttonText: '查看示例',
    buttonLink: '#'
  },
  {
    icon: <TrendingUp className="w-10 h-10 text-[#165DFF]" />,
    title: 'AI模拟面试+成功率测算',
    description: '基于真实招聘要求，精准测算岗位应聘成功率，AI模拟真实面试场景',
    buttonText: '免费体验',
    buttonLink: '/assistant'
  }
];

const whyChooseUs = [
  {
    icon: <Check className="w-6 h-6 text-[#165DFF]" />,
    title: '100%真实招聘数据',
    description: '所有信息均来自BOSS直聘、智联招聘等平台的真实JD，每周更新'
  },
  {
    icon: <Zap className="w-6 h-6 text-[#165DFF]" />,
    title: 'AI个性化规划',
    description: '基于你的专业、兴趣和能力，生成专属的职业成长路径'
  },
  {
    icon: <Gift className="w-6 h-6 text-[#165DFF]" />,
    title: '学生友好定价',
    description: '基础功能永久免费，会员低至9.9元/月，比线下咨询便宜99%'
  },
  {
    icon: <Users className="w-6 h-6 text-[#165DFF]" />,
    title: '邀请好友免费领会员',
    description: '邀请好友注册，双方都能获得免费会员和AI次数'
  }
];

const userReviews = [
  {
    name: '张三',
    school: '某985大学',
    content: '计算机专业大三，生成的职业规划报告非常详细，帮我明确了前端开发的学习路径，免费次数完全够用！'
  },
  {
    name: '李四',
    school: '某211大学',
    content: '之前不知道自己适合什么岗位，用职途星测了一下，推荐的HR岗位真的很适合我，已经拿到offer了！'
  },
  {
    name: '王五',
    school: '某普通本科',
    content: '9.9元的月卡太值了，无限次用AI模拟面试，面试的时候一点都不慌！'
  }
];

export default function HomePage() {
  const router = useRouter();
  
  const handleTagClick = (tag: string) => {
    // 这里可以跳转到AI助手页面并自动填充查询
    router.push(`/assistant?query=${encodeURIComponent(tag)}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Banner Section */}
      <section className="bg-gradient-to-br from-[#165DFF]/5 to-[#165DFF]/10 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
            AI驱动的职业规划 助你找到理想工作
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            基于500万+<span className="font-semibold text-[#165DFF]">全行业真实职业数据</span>智能分析，
            多维度匹配你的性格、能力和兴趣，为你推荐最适合的职业方向，并提供个性化学习路径
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link href="/assistant">
              <Button className="bg-[#165DFF] hover:bg-[#165DFF]/90 text-white text-lg px-8 py-6 h-auto rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                立即免费使用
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-500">
            已有10000+大学生使用职途星找到心仪工作 | 每月免费5次AI服务
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
                className="border-2 border-gray-100 hover:border-[#165DFF]/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-2"
              >
                <CardHeader>
                  <div className="mb-4">{feature.icon}</div>
                  <CardTitle className="text-xl font-bold text-gray-900">{feature.title}</CardTitle>
                  <CardDescription className="text-gray-600 mt-2">{feature.description}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Link href={feature.buttonLink}>
                    <Button className="bg-[#165DFF] hover:bg-[#165DFF]/90 text-white w-full">
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
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            🔥 热门岗位一键查
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {hotTags.map((tag, index) => (
              <button
                key={index}
                onClick={() => handleTagClick(tag)}
                className="px-5 py-2.5 bg-white border border-gray-200 rounded-full text-gray-700 font-medium hover:bg-[#165DFF] hover:text-white hover:border-[#165DFF] transition-all duration-300 hover:shadow-md"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* AI Assistant Section */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              🤖 免费体验AI岗位查询
            </h2>
            <p className="text-gray-600">
              输入任意行业任意岗位名称，一键获取100%真实招聘JD信息
            </p>
          </div>
          <div className="border-2 border-[#165DFF]/20 rounded-2xl overflow-hidden bg-gray-50">
            <div className="h-[500px] flex items-center justify-center bg-gradient-to-br from-[#165DFF]/5 to-white">
              <div className="text-center">
                <div className="w-20 h-20 bg-[#165DFF] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-3xl font-bold">AI</span>
                </div>
                <p className="text-gray-600 mb-4">职途星全行业岗位百科智能体</p>
                <Link href="/assistant">
                  <Button className="bg-[#165DFF] hover:bg-[#165DFF]/90 text-white">
                    立即体验
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-12 text-center">
            为什么10000+大学生选择职途星？
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {whyChooseUs.map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-[#165DFF]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Reviews Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-12 text-center">
            💬 用户真实评价
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {userReviews.map((review, index) => (
              <Card key={index} className="border-2 border-gray-100 hover:border-[#165DFF]/20 transition-all duration-300">
                <CardContent className="pt-6">
                  <p className="text-gray-700 mb-4">「{review.content}」</p>
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-[#165DFF] rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-medium">{review.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{review.name}</p>
                      <p className="text-sm text-gray-500">{review.school}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Referral Banner */}
      <section className="py-12 bg-gradient-to-r from-[#165DFF] to-[#165DFF]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between text-center md:text-left">
            <div className="mb-6 md:mb-0">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                🎉 邀请好友得免费会员！
              </h2>
              <p className="text-white/90">
                邀请1人得7天会员+3次AI次数，邀请3人得30天会员，上不封顶！
              </p>
            </div>
            <Link href="/profile/invite">
              <Button className="bg-white text-[#165DFF] hover:bg-gray-100 text-lg px-8 py-6 h-auto rounded-xl">
                立即邀请
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
