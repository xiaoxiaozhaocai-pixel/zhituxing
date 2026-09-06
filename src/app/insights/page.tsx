import type { Metadata } from 'next';
import Link from 'next/link';
import { ALL_INDUSTRY_RADAR } from '@/lib/career-paths/engine/interview_radar';
import { listSubtextGlossary } from '@/lib/career-paths/engine/subtext_dictionary';
import { ALL_COGNITIVE_KNOWLEDGE } from '@/lib/career-paths/engine/cognitive_knowledge';
import { JOBS } from '@/lib/career-paths/engine/capability_dictionary';
import { JUDGMENT_CAUSAL_LAYER } from '@/lib/career-paths/engine/judgment_layer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: '求职判断力内容库 — 行业雷达 / 潜台词词条 / 认知库 / 能力词典 / 判断力因果层',
  description:
    '职途星求职判断力内容库免费开放：覆盖全行业的面试行业雷达、JD/简历/面试/职场潜台词词条翻译、专业认知库、岗位能力词典与判断力因果层（专业≠岗位的学术实证依据）。来自真实招聘洞察，求职先想清楚再投简历。',
  keywords: [
    '求职判断力',
    '面试行业雷达',
    'JD潜台词',
    '简历潜台词',
    '职场黑话',
    '岗位能力词典',
    '求职认知库',
    '判断力因果层',
    '专业不对口',
    '可迁移能力',
    '大学生求职',
    '职途星',
  ],
  openGraph: {
    title: '求职判断力内容库 — 行业雷达 / 潜台词词条 / 认知库 / 能力词典 / 判断力因果层',
    description:
      '职途星面向求职者免费开放的判断力内容库：行业面试雷达、潜台词词条、专业认知库、岗位能力词典与判断力因果层（专业≠岗位的学术实证依据）。',
    type: 'website',
  },
};

const categoryLabels: Record<string, string> = {
  jd: 'JD 潜台词',
  interview: '面试潜台词',
  resume: '简历潜台词',
  workplace: '职场黑话',
};

const riskMeta: Record<string, { label: string; cls: string }> = {
  high: { label: '高规避', cls: 'bg-red-50 text-red-600 border-red-200' },
  medium: { label: '要留意', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  low: { label: '基本无坑', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
};

const confidenceMeta: Record<string, { label: string; cls: string }> = {
  HIGH: { label: '高置信', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  MEDIUM: { label: '中置信', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  LOW: { label: '低置信', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
};

// P2-1：内容→行动导流。内容库每块底部加「去试试」，把「看完（知道）」转成「去用（行动）」，让内容库成为主线入口。
function SectionCTA({ href, action, desc }: { href: string; action: string; desc: string }) {
  return (
    <div className="mt-10 flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#165DFF]/15 bg-[#165DFF]/5 px-6 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
      <div className="max-w-md">
        <p className="text-sm font-medium text-[#1E293B]">{action}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[#64748B]">{desc}</p>
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#165DFF] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#165DFF]/90"
      >
        去试试 <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

export default function InsightsPage() {
  const glossary = listSubtextGlossary();
  const groupedGlossary = (['jd', 'interview', 'resume', 'workplace'] as const).map((cat) => ({
    cat,
    label: categoryLabels[cat],
    items: glossary.filter((g) => g.category === cat),
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '职途星求职判断力内容库',
    description:
      '职途星面向求职者免费开放的判断力内容库：面试行业雷达、潜台词词条、专业认知库、岗位能力词典。',
    numberOfItems: ALL_INDUSTRY_RADAR.length + glossary.length + ALL_COGNITIVE_KNOWLEDGE.length + JOBS.length,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: `面试行业雷达（${ALL_INDUSTRY_RADAR.length}个行业）`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: `潜台词词条库（${glossary.length}条）`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `专业认知库（${ALL_COGNITIVE_KNOWLEDGE.length}个专业）`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: `岗位能力词典（${JOBS.length}个岗位）`,
      },
      {
        '@type': 'ListItem',
        position: 5,
        name: `判断力因果层（${JUDGMENT_CAUSAL_LAYER.length}条）`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafd] via-white to-[#f0f5ff]/40">
      {/* 结构化数据（SEO） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* 顶部 Hero */}
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="absolute -top-20 right-0 h-72 w-72 rounded-full bg-[#165DFF]/10 blur-3xl" />
        <div className="absolute top-10 -left-10 h-56 w-56 rounded-full bg-[#3D7FFF]/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <Badge className="mb-4 border-[#165DFF]/20 bg-[#165DFF]/5 text-[#165DFF]">
            免费开放 · 判断力内容库
          </Badge>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-[#1E293B] sm:text-5xl">
            求职判断力<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#165DFF] to-[#3D7FFF]">内容库</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#64748B]">
            把「面试会问什么」「JD 在说什么黑话」「你学的专业能做什么」「这个岗位要什么能力」
            一次讲清。来自真实招聘洞察，求职先想清楚，再投简历。
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4 text-sm text-[#64748B]">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#165DFF]" />{ALL_INDUSTRY_RADAR.length} 个行业雷达</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#3D7FFF]" />{glossary.length} 条潜台词词条</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#FF7D00]" />{ALL_COGNITIVE_KNOWLEDGE.length} 个专业认知</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#10B981]" />{JOBS.length} 个岗位能力</span>
          </div>
        </div>
      </section>

      {/* 能力边界互链 CTA */}
      <div className="border-b border-[#E2E8F0] bg-white/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-4 sm:flex-row">
          <p className="text-sm text-[#475569]">
            想看职途星内容底座全景（行业/词条/认知/能力/判断依据真实规模）？
            <span className="font-medium text-[#1E293B]">来这里一页看清。</span>
          </p>
          <Link
            href="/capability"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#165DFF]/25 bg-white px-4 py-2 text-sm font-semibold text-[#165DFF] shadow-sm transition hover:bg-[#165DFF]/5"
          >
            查看内容能力边界 <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      {/* 锚点导航 */}
      <nav className="sticky top-14 z-20 border-y border-[#E2E8F0] bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2 px-6 py-3 text-sm">
          <a href="#industries" className="rounded-full px-4 py-1.5 text-[#165DFF] hover:bg-[#165DFF]/5">行业雷达</a>
          <a href="#glossary" className="rounded-full px-4 py-1.5 text-[#475569] hover:bg-[#165DFF]/5">潜台词词条</a>
          <a href="#cognitive" className="rounded-full px-4 py-1.5 text-[#475569] hover:bg-[#165DFF]/5">专业认知库</a>
          <a href="#judgment" className="rounded-full px-4 py-1.5 text-[#475569] hover:bg-[#165DFF]/5">判断力因果层</a>
          <a href="#capability" className="rounded-full px-4 py-1.5 text-[#475569] hover:bg-[#165DFF]/5">岗位能力词典</a>
        </div>
      </nav>

      {/* 行业雷达 */}
      <section id="industries" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#1E293B] sm:text-3xl">面试行业雷达</h2>
          <p className="mt-2 text-[#64748B]">提前知道这个行业面试会问什么，怎么准备、有哪些雷区。</p>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {ALL_INDUSTRY_RADAR.map((ind) => (
            <Card key={ind.key} className="border-[#E2E8F0] shadow-sm transition hover:shadow-md">
              <CardContent className="p-5">
                <h3 className="text-lg font-semibold text-[#1E293B]">{ind.label}</h3>
                <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-[#64748B]">{ind.blurb}</p>
                {ind.focus && ind.focus.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {ind.focus.map((f, i) => (
                      <div key={i} className="rounded-lg bg-[#F8FAFC] p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#1E293B]">{f.module}</span>
                          <span className="text-xs font-semibold text-[#165DFF]">{f.weight}%</span>
                        </div>
                        {f.questions && f.questions.length > 0 && (
                          <ul className="mt-1.5 space-y-1 text-xs text-[#64748B]">
                            {f.questions.map((q, j) => (
                              <li key={j}>· {q}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {ind.redFlags && ind.redFlags.length > 0 && (
                  <div className="mt-4">
                    <span className="text-xs font-semibold text-red-600">雷区</span>
                    <ul className="mt-1 space-y-0.5 text-xs text-[#64748B]">
                      {ind.redFlags.map((r, i) => <li key={i}>· {r}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        <SectionCTA
          href="/career-planning"
          action="对照你的专业，看看能去哪些行业面试"
          desc="用行业雷达生成你的专属求职方向与面试准备清单，把「这个行业会问什么」变成你的行动准备。"
        />
      </section>

      {/* 潜台词词条库 */}
      <section id="glossary" className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#1E293B] sm:text-3xl">潜台词词条库</h2>
            <p className="mt-2 text-[#64748B]">把 JD、简历、面试问题里的黑话，翻译成「人话」。</p>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {groupedGlossary.map((group) => (
              <div key={group.cat} className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6">
                <h3 className="mb-4 text-lg font-semibold text-[#1E293B]">{group.label}（{group.items.length} 条）</h3>
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {group.items.map((g) => {
                    const risk = riskMeta[g.risk] || riskMeta.low;
                    return (
                      <div key={g.phrase} className="rounded-lg bg-white p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-[#1E293B]">{g.phrase}</span>
                          <Badge className={`shrink-0 border ${risk.cls}`}>{risk.label}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-[#64748B]">{g.meaning}</p>
                        <p className="mt-1.5 text-xs leading-relaxed text-[#165DFF]">建议：{g.advice}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <SectionCTA
          href="/assistant?bot=interview"
          action="把你的 JD / 面试问题发给小职翻译"
          desc="把潜台词词条库接入你的真实面试，实时拆解 HR 话里的真实意图，提前避开坑。"
        />
      </section>

      {/* 专业认知库 */}
      <section id="cognitive" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#1E293B] sm:text-3xl">专业认知库</h2>
          <p className="mt-2 text-[#64748B]">你学的这个专业，到底能去哪些方向，中间需要什么能力。</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ALL_COGNITIVE_KNOWLEDGE.map((cog) => (
            <Card key={`${cog.subCategory}-${cog.label}`} className="border-[#E2E8F0] shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-[#165DFF]/5 px-2 py-0.5 text-xs font-medium text-[#165DFF]">{cog.category}</span>
                  <h3 className="text-base font-semibold text-[#1E293B]">{cog.label}</h3>
                </div>
                <div className="mt-3">
                  <span className="text-xs font-semibold text-[#475569]">核心课程</span>
                  <p className="mt-1 text-xs leading-relaxed text-[#64748B]">{cog.coreCourses.join(' / ')}</p>
                </div>
                <div className="mt-3">
                  <span className="text-xs font-semibold text-[#475569]">培养能力</span>
                  <p className="mt-1 text-xs leading-relaxed text-[#64748B]">{cog.derivedSkills.join(' / ')}</p>
                </div>
                {cog.jobDirections && cog.jobDirections.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs font-semibold text-[#475569]">去向岗位</span>
                    <ul className="mt-1 space-y-1 text-xs text-[#64748B]">
                      {cog.jobDirections.slice(0, 3).map((jd, i) => (
                        <li key={i}>· {jd.job}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        <SectionCTA
          href="/career-planning"
          action="让你学的专业能去哪些岗位，一键生成方向"
          desc="专业认知库 + 职业规划报告，把「这个专业能做什么」变成你的明确求职方向。"
        />
      </section>

      {/* 判断力因果层 */}
      <section id="judgment" className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#1E293B] sm:text-3xl">判断力因果层</h2>
            <p className="mt-2 text-[#64748B]">
              为什么「专业≠岗位」？求职判断的科学依据——每条讲清前提、推理到结论的因果链，来源可背调。
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {JUDGMENT_CAUSAL_LAYER.map((item) => (
              <Card key={item.id} className="border-[#E2E8F0] shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-[#165DFF]/5 px-2 py-0.5 text-xs font-medium text-[#165DFF]">
                      {item.id}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${confidenceMeta[item.confidence]?.cls ?? ''}`}>
                      {confidenceMeta[item.confidence]?.label ?? item.confidence}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-[#1E293B]">{item.title}</h3>
                  <div className="mt-3 space-y-2 text-xs leading-relaxed">
                    <div>
                      <span className="font-semibold text-[#475569]">前提：</span>
                      <span className="text-[#64748B]">{item.premise}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#475569]">推理：</span>
                      <span className="text-[#64748B]">{item.inference}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#475569]">结论：</span>
                      <span className="text-[#64748B]">{item.conclusion}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-[#94A3B8]">来源：{item.source}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <SectionCTA
          href="/career-planning"
          action="用判断力因果层佐证你的职业选择"
          desc="生成职业规划报告，用「前提→推理→结论」讲清你的专业与岗位适配，选择更踏实。"
        />
      </section>

      {/* 岗位能力词典 */}
      <section id="capability" className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#1E293B] sm:text-3xl">岗位能力词典</h2>
            <p className="mt-2 text-[#64748B]">每个岗位真正看重什么能力，从行业知识到经验信号拆给你看。</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {JOBS.map((job) => (
              <Card key={job.id} className="border-[#E2E8F0] shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#1E293B]">{job.name}</h3>
                    <Badge className="border-[#165DFF]/20 bg-[#165DFF]/5 text-[#165DFF]">{job.category}</Badge>
                  </div>
                  {job.layers && job.layers.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {job.layers.map((layer) => (
                        <div key={layer.layer} className="rounded-lg bg-[#F8FAFC] p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-[#1E293B]">{layer.label}</span>
                            <span className="text-xs font-semibold text-[#FF7D00]">{layer.weight}%</span>
                          </div>
                          <ul className="mt-1.5 space-y-1 text-xs text-[#64748B]">
                            {layer.items.map((item, i) => <li key={i}>· {item}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                  {job.recommendCompanies && job.recommendCompanies.length > 0 && (
                    <div className="mt-4">
                      <span className="text-xs font-semibold text-[#475569]">代表企业</span>
                      <p className="mt-1 text-xs text-[#64748B]">{job.recommendCompanies.join(' / ')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <SectionCTA
          href="/learning-path"
          action="看看目标岗位要什么能力，生成学习路径"
          desc="岗位能力词典 + 技能差距分析，生成你的专属学习路线，缺哪补哪。"
        />
      </section>

      {/* 底部 CTA */}
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <Card className="border-[#165DFF]/20 bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] text-white shadow-lg">
          <CardContent className="p-10">
            <h2 className="text-2xl font-bold sm:text-3xl">想让小职帮你拆解具体内容？</h2>
            <p className="mt-3 text-white/85">
              把你的 JD、简历、面试问题发给小职，它会把对应的潜台词和行业重点讲给你听。
            </p>
            <Link
              href="/career-planning"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#165DFF] shadow transition hover:bg-white/90"
            >
              去求职判断力工具 →
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
