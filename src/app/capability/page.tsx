import type { Metadata } from 'next';
import Link from 'next/link';
import { ALL_INDUSTRY_RADAR } from '@/lib/career-paths/engine/interview_radar';
import { listSubtextGlossary } from '@/lib/career-paths/engine/subtext_dictionary';
import { ALL_COGNITIVE_KNOWLEDGE } from '@/lib/career-paths/engine/cognitive_knowledge';
import { JOBS } from '@/lib/career-paths/engine/capability_dictionary';
import { JUDGMENT_CAUSAL_LAYER } from '@/lib/career-paths/engine/judgment_layer';
import { SCHOOLS } from '@/lib/seo/schools';
import { SITE_URL, SITE_NAME } from '@/lib/config';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, MessageSquare, GraduationCap, Wrench, Compass, Building2 } from 'lucide-react';

const glossary = listSubtextGlossary();
const totalItems =
  ALL_INDUSTRY_RADAR.length + glossary.length + ALL_COGNITIVE_KNOWLEDGE.length + JOBS.length + JUDGMENT_CAUSAL_LAYER.length;

export const metadata: Metadata = {
  title: `职途星内容能力边界 — ${ALL_INDUSTRY_RADAR.length}个行业雷达 / ${glossary.length}条词条 / ${ALL_COGNITIVE_KNOWLEDGE.length}个认知库 / ${JOBS.length}个能力词典`,
  description: `职途星求职内容底座全景：${ALL_INDUSTRY_RADAR.length}个行业面试雷达、${glossary.length}条JD/面试/简历/职场潜台词词条、${ALL_COGNITIVE_KNOWLEDGE.length}个专业认知方向、${JOBS.length}个岗位能力词典、${JUDGMENT_CAUSAL_LAYER.length}条判断力因果层、${SCHOOLS.length}所高校专区。全部来自真实招聘洞察，求职先想清楚再投简历。`,
  keywords: [
    '求职内容库',
    '面试行业雷达',
    'JD潜台词',
    '岗位能力词典',
    '专业认知库',
    '判断力因果层',
    '求职准备',
    '大学生求职',
    '职途星',
  ],
  openGraph: {
    title: `职途星内容能力边界 — ${ALL_INDUSTRY_RADAR.length}个行业雷达 / ${glossary.length}条词条 / ${ALL_COGNITIVE_KNOWLEDGE.length}个认知库 / ${JOBS.length}个能力词典`,
    description:
      '职途星求职内容底座全景：行业雷达、潜台词词条、专业认知、岗位能力词典与判断力因果层的真实规模一览。',
    type: 'website',
    locale: 'zh_CN',
    siteName: SITE_NAME,
    url: `${SITE_URL}/capability`,
  },
  alternates: {
    canonical: `${SITE_URL}/capability`,
  },
};

const subtextCategoryLabels: Record<string, string> = {
  jd: 'JD 潜台词',
  interview: '面试潜台词',
  resume: '简历潜台词',
  workplace: '职场黑话',
};

function SectionCard({
  icon,
  title,
  desc,
  stat,
  href,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  stat: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-[#E2E8F0] shadow-sm transition hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] text-white shadow-md shadow-[#165DFF]/20">
              {icon}
            </div>
            <h2 className="text-lg font-bold text-[#1E293B]">{title}</h2>
          </div>
          <span className="shrink-0 rounded-full bg-[#165DFF]/8 px-3 py-1 text-xs font-semibold text-[#165DFF]">
            {stat}
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[#64748B]">{desc}</p>
        <div className="mt-4">{children}</div>
        <Link
          href={href}
          className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#165DFF] transition hover:gap-2"
        >
          去浏览全部内容 <span aria-hidden>→</span>
        </Link>
      </CardContent>
    </Card>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1 text-xs text-[#475569]">
      {children}
    </span>
  );
}

export default function CapabilityPage() {
  const groupedGlossary = (['jd', 'interview', 'resume', 'workplace'] as const).map((cat) => ({
    cat,
    label: subtextCategoryLabels[cat],
    count: glossary.filter((g) => g.category === cat).length,
  }));
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: '职途星内容能力边界',
        description: '职途星求职内容底座全景：行业雷达、词条库、认知库、能力词典、判断力因果层与高校专区。',
        url: `${SITE_URL}/capability`,
      },
      {
        '@type': 'ItemList',
        name: '职途星求职内容底座',
        description:
          '职途星面向求职者积累的真实内容底座：面试行业雷达、潜台词词条、专业认知、岗位能力词典与判断力因果层。',
        numberOfItems: totalItems,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: `面试行业雷达（${ALL_INDUSTRY_RADAR.length}个行业）` },
          { '@type': 'ListItem', position: 2, name: `潜台词词条库（${glossary.length}条）` },
          { '@type': 'ListItem', position: 3, name: `专业认知库（${ALL_COGNITIVE_KNOWLEDGE.length}个方向）` },
          { '@type': 'ListItem', position: 4, name: `岗位能力词典（${JOBS.length}个岗位）` },
          { '@type': 'ListItem', position: 5, name: `判断力因果层（${JUDGMENT_CAUSAL_LAYER.length}条）` },
          { '@type': 'ListItem', position: 6, name: `高校就业专区（${SCHOOLS.length}所高校）` },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafd] via-white to-[#f0f5ff]/40">
      {/* 结构化数据（SEO） */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="absolute -top-20 right-0 h-72 w-72 rounded-full bg-[#165DFF]/10 blur-3xl" />
        <div className="absolute top-10 -left-10 h-56 w-56 rounded-full bg-[#3D7FFF]/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <Badge className="mb-4 border-[#165DFF]/20 bg-[#165DFF]/5 text-[#165DFF]">
            内容能力边界 · 全部真实积累
          </Badge>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-[#1E293B] sm:text-5xl">
            职途星能帮你什么，<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#165DFF] to-[#3D7FFF]">边界一目了然</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#64748B]">
            行业会问什么、JD 的黑话、你学的专业能做什么、岗位要什么能力——
            下面的每一块内容都来自真实招聘洞察，求职先想清楚，再投简历。
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-[#64748B]">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#165DFF]" />{ALL_INDUSTRY_RADAR.length} 个行业雷达</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#3D7FFF]" />{glossary.length} 条潜台词词条</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#FF7D00]" />{ALL_COGNITIVE_KNOWLEDGE.length} 个专业认知</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#10B981]" />{JOBS.length} 个岗位能力</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#722ED1]" />{JUDGMENT_CAUSAL_LAYER.length} 条判断依据</span>
          </div>
        </div>
      </section>

      {/* 内容底座网格 */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 行业雷达 */}
          <SectionCard
            icon={<Target className="h-5 w-5" />}
            title="面试行业雷达"
            desc="每个行业面试会问什么、怎么准备、有哪些雷区，提前知道再进场。"
            stat={`${ALL_INDUSTRY_RADAR.length} 个行业`}
            href="/insights#industries"
          >
            <div className="flex flex-wrap gap-1.5">
              {ALL_INDUSTRY_RADAR.map((ind) => (
                <Chip key={ind.key}>{ind.label}</Chip>
              ))}
            </div>
          </SectionCard>

          {/* 潜台词词条库 */}
          <SectionCard
            icon={<MessageSquare className="h-5 w-5" />}
            title="潜台词词条库"
            desc="把 JD、简历、面试问题里的黑话翻译成「人话」，按场景分类收录。"
            stat={`${glossary.length} 条`}
            href="/insights#glossary"
          >
            <div className="grid grid-cols-2 gap-2">
              {groupedGlossary.map((g) => (
                <div key={g.cat} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
                  <div className="text-xs text-[#94A3B8]">{g.label}</div>
                  <div className="mt-0.5 text-sm font-semibold text-[#1E293B]">{g.count} 条</div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* 专业认知库 */}
          <SectionCard
            icon={<GraduationCap className="h-5 w-5" />}
            title="专业认知库"
            desc="你学的这个专业，到底能去哪些方向、中间需要什么能力，逐个方向讲清。"
            stat={`${ALL_COGNITIVE_KNOWLEDGE.length} 个方向`}
            href="/insights#cognitive"
          >
            <div className="flex flex-wrap gap-1.5">
              {ALL_COGNITIVE_KNOWLEDGE.map((cog) => (
                <Chip key={`${cog.subCategory}-${cog.label}`}>{cog.label}</Chip>
              ))}
            </div>
          </SectionCard>

          {/* 岗位能力词典 */}
          <SectionCard
            icon={<Wrench className="h-5 w-5" />}
            title="岗位能力词典"
            desc="每个岗位真正看重什么能力，从行业知识到经验信号拆给你看。"
            stat={`${JOBS.length} 个岗位`}
            href="/insights#capability"
          >
            <div className="flex flex-wrap gap-1.5">
              {JOBS.map((job) => (
                <Chip key={job.id}>{job.name}</Chip>
              ))}
            </div>
          </SectionCard>

          {/* 判断力因果层 */}
          <SectionCard
            icon={<Compass className="h-5 w-5" />}
            title="判断力因果层"
            desc="为什么「专业≠岗位」？每条讲清前提、推理到结论的因果链，来源可查。"
            stat={`${JUDGMENT_CAUSAL_LAYER.length} 条`}
            href="/insights#judgment"
          >
            <ul className="space-y-2">
              {JUDGMENT_CAUSAL_LAYER.map((item) => (
                <li key={item.id} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#475569]">
                  <span className="mr-2 rounded bg-[#165DFF]/5 px-1.5 py-0.5 text-xs font-medium text-[#165DFF]">{item.id}</span>
                  {item.title}
                </li>
              ))}
            </ul>
          </SectionCard>

          {/* 高校就业专区 */}
          <SectionCard
            icon={<Building2 className="h-5 w-5" />}
            title="高校就业专区"
            desc="从你的学校出发：概况、能投的岗位与求职策略。数据持续积累，先看已完整收录的高校。"
            stat={`${SCHOOLS.length} 所高校`}
            href="/university"
          >
            <ul className="space-y-2">
              {SCHOOLS.map((school) => (
                <li key={school.slug} className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
                  <Link href={`/university/${school.slug}`} className="text-sm font-medium text-[#1E293B] transition hover:text-[#165DFF]">
                    {school.name}
                  </Link>
                  <Badge
                    className={
                      school.isComplete
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                        : 'border-[#E2E8F0] bg-[#F1F5F9] text-[#94A3B8]'
                    }
                  >
                    {school.isComplete ? '已完整收录' : '持续积累中'}
                  </Badge>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        {/* 底部互链 */}
        <div className="mt-12 flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#165DFF]/15 bg-[#165DFF]/5 px-6 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-sm font-medium text-[#1E293B]">上面的内容都在这里逐条开放浏览</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[#64748B]">
              判断力内容库已免费开放：行业雷达、潜台词词条、专业认知、能力词典、判断力因果层，全部可直接阅读。
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-center gap-3">
            <Link
              href="/insights"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#165DFF] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#165DFF]/90"
            >
              去判断力内容库 <span aria-hidden>→</span>
            </Link>
            <Link
              href="/tools"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#165DFF]/30 bg-white px-5 py-2.5 text-sm font-semibold text-[#165DFF] transition hover:bg-[#165DFF]/5"
            >
              查看全部工具
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
