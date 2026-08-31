import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Briefcase, MapPin, TrendingUp, GraduationCap, Clock, Sparkles,
  ArrowRight, CheckCircle2, Wrench, Heart, DollarSign, Building2,
} from 'lucide-react';
import { getCareerDetail, getCareerList, type CareerDetail } from '@/lib/seo/careers';
import { SITE_URL } from '@/lib/config';

/* ============================================================
 * 静态参数 — 预生成高频岗位 slug（构建时从 Supabase 聚合）
 * 若构建阶段无环境变量，返回空数组 → 走 ISR 动态生成
 * ============================================================ */
export async function generateStaticParams() {
  const careers = await getCareerList(50);
  return careers.map((c) => ({ slug: c.slug }));
}

/* ============================================================
 * SEO Metadata
 * ============================================================ */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getCareerDetail(slug);

  if (!detail) {
    return {
      title: '岗位百科 | 职途星',
      description: '职途星岗位百科 — 真实 JD 聚合的岗位定义、技能要求、薪资区间、城市分布。',
    };
  }

  const title = `${detail.jobTitle}岗位百科 — 职责/技能/薪资 | 职途星`;
  const description = `${detail.jobTitle}岗位百科：基于 ${detail.totalCount} 条真实招聘 JD 聚合统计，涵盖岗位职责、技能要求、薪资区间、城市分布、学历经验要求。`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      locale: 'zh_CN',
      type: 'article',
      siteName: '职途星',
      url: `${SITE_URL}/career/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `${SITE_URL}/career/${slug}`,
    },
  };
}

/* ============================================================
 * 子组件
 * ============================================================ */

function BreadcrumbNav({ jobTitle }: { jobTitle: string }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-slate-500 mb-6">
      <Link href="/" className="hover:text-[#165DFF] transition">首页</Link>
      <span className="text-slate-300">/</span>
      <Link href="/jobs" className="hover:text-[#165DFF] transition">岗位百科</Link>
      <span className="text-slate-300">/</span>
      <span className="text-slate-700 font-medium truncate">{jobTitle}</span>
    </nav>
  );
}

function DistributionBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600 w-24 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden relative">
        <div
          className="h-full bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] rounded-full transition-all"
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 w-8 text-right flex-shrink-0">{count}</span>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 text-center">
      <div className={`w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div className="text-lg font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}

function PlaceholderCard({ message }: { message: string }) {
  return (
    <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
        <TrendingUp className="w-5 h-5" />
      </div>
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

/* ============================================================
 * JSON-LD
 * ============================================================ */
function CareerJsonLd({ detail }: { detail: CareerDetail }) {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: detail.jobTitle,
    description: detail.responsibilities.slice(0, 3).join('；') || `${detail.jobTitle}岗位百科`,
    datePosted: new Date().toISOString(),
    ...(detail.salarySummary
      ? {
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: 'CNY',
            minValue: detail.salarySummary.min,
            maxValue: detail.salarySummary.max,
          },
        }
      : {}),
    ...(detail.cityDistribution.length > 0
      ? { jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: detail.cityDistribution[0].label } } }
      : {}),
    url: `${SITE_URL}/career/${detail.slug}`,
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: '岗位百科', item: `${SITE_URL}/jobs` },
      { '@type': 'ListItem', position: 3, name: detail.jobTitle, item: `${SITE_URL}/career/${detail.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
    </>
  );
}

/* ============================================================
 * 页面主体
 * ============================================================ */
export default async function CareerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getCareerDetail(slug);
  if (!detail) notFound();

  const fmtMoney = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(0).replace(/\.0$/, '')}K` : `${n}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f5ff]/40 via-white to-[#f8fafd]">
      <CareerJsonLd detail={detail} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#165DFF] to-[#3D7FFF]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-200 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm mb-4">
              <Briefcase className="w-4 h-4" />
              <span>岗位百科</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{detail.jobTitle}</h1>
            <p className="mt-3 text-lg text-blue-50/90">
              基于 {detail.totalCount} 条真实招聘 JD 聚合分析
            </p>
            {detail.coreDutyModules.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {detail.coreDutyModules.slice(0, 5).map((m) => (
                  <span key={m} className="text-sm px-3 py-1 bg-white/15 rounded-full text-blue-50">{m}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav jobTitle={detail.jobTitle} />

        {/* 概览统计卡片 */}
        <section className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="真实 JD 数"
              value={`${detail.totalCount}`}
              icon={<Briefcase className="w-5 h-5" />}
              color="bg-[#165DFF]/10 text-[#165DFF]"
            />
            <StatCard
              label="薪资区间"
              value={detail.salarySummary ? `${fmtMoney(detail.salarySummary.min)}-${fmtMoney(detail.salarySummary.max)}` : '待积累'}
              icon={<DollarSign className="w-5 h-5" />}
              color="bg-[#FF7D00]/10 text-[#FF7D00]"
            />
            <StatCard
              label="覆盖城市"
              value={`${detail.cityDistribution.length}`}
              icon={<MapPin className="w-5 h-5" />}
              color="bg-green-500/10 text-green-600"
            />
            <StatCard
              label="应届友好"
              value={detail.freshGraduateStats.total > 0 ? `${Math.round((detail.freshGraduateStats.friendly / detail.freshGraduateStats.total) * 100)}%` : '待积累'}
              icon={<GraduationCap className="w-5 h-5" />}
              color="bg-purple-500/10 text-purple-600"
            />
          </div>
        </section>

        {/* 岗位定义/职责 */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#165DFF]" />
            岗位职责
          </h2>
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
            {detail.responsibilities.length > 0 ? (
              <ul className="space-y-2.5">
                {detail.responsibilities.map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
                    <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-[#165DFF]" />
                    {r}
                  </li>
                ))}
              </ul>
            ) : (
              <PlaceholderCard message="岗位职责数据待积累 — 正在持续采集真实 JD。" />
            )}
          </div>
        </section>

        {/* 技能要求 */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-[#165DFF]" />
            技能要求
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-[#165DFF]" />
                硬技能（出现频次）
              </h3>
              {detail.hardSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {detail.hardSkills.map((s) => (
                    <span key={s.name} className="text-sm px-2.5 py-1 bg-[#165DFF]/8 text-[#165DFF] rounded-lg font-medium">
                      {s.name}
                      <span className="ml-1 text-xs text-[#165DFF]/60">{s.count}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">硬技能数据待积累</p>
              )}
            </div>
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-[#FF7D00]" />
                软技能（出现频次）
              </h3>
              {detail.softSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {detail.softSkills.map((s) => (
                    <span key={s.name} className="text-sm px-2.5 py-1 bg-[#FF7D00]/8 text-[#FF7D00] rounded-lg font-medium">
                      {s.name}
                      <span className="ml-1 text-xs text-[#FF7D00]/60">{s.count}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">软技能数据待积累</p>
              )}
            </div>
          </div>
        </section>

        {/* 薪资区间 */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#165DFF]" />
            薪资区间（真实统计）
          </h2>
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
            {detail.salaryStats.length > 0 ? (
              <>
                {detail.salarySummary && (
                  <div className="mb-4 flex items-center gap-4">
                    <div className="text-2xl font-bold text-[#FF7D00]">
                      {fmtMoney(detail.salarySummary.min)}–{fmtMoney(detail.salarySummary.max)}
                    </div>
                    <div className="text-sm text-slate-400">
                      均值约 {fmtMoney(detail.salarySummary.avg)}
                    </div>
                  </div>
                )}
                <div className="space-y-2.5">
                  {detail.salaryStats.map((s) => (
                    <DistributionBar
                      key={s.range}
                      label={s.range}
                      count={s.count}
                      max={detail.salaryStats[0].count}
                    />
                  ))}
                </div>
              </>
            ) : (
              <PlaceholderCard message="薪资数据待积累 — 正在持续采集真实 JD。" />
            )}
          </div>
        </section>

        {/* 城市与行业分布 */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#165DFF]" />
            城市与行业分布
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">城市分布</h3>
              {detail.cityDistribution.length > 0 ? (
                <div className="space-y-2.5">
                  {detail.cityDistribution.slice(0, 8).map((d) => (
                    <DistributionBar key={d.label} label={d.label} count={d.count} max={detail.cityDistribution[0].count} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">城市分布数据待积累</p>
              )}
            </div>
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">行业分布</h3>
              {detail.industryDistribution.length > 0 ? (
                <div className="space-y-2.5">
                  {detail.industryDistribution.slice(0, 8).map((d) => (
                    <DistributionBar key={d.label} label={d.label} count={d.count} max={detail.industryDistribution[0].count} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">行业分布数据待积累</p>
              )}
            </div>
          </div>
        </section>

        {/* 学历与经验要求 */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#165DFF]" />
            学历与经验要求
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-[#165DFF]" />
                学历要求
              </h3>
              {detail.educationDistribution.length > 0 ? (
                <div className="space-y-2.5">
                  {detail.educationDistribution.slice(0, 6).map((d) => (
                    <DistributionBar key={d.label} label={d.label} count={d.count} max={detail.educationDistribution[0].count} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">学历要求数据待积累</p>
              )}
            </div>
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#165DFF]" />
                经验要求
              </h3>
              {detail.experienceDistribution.length > 0 ? (
                <div className="space-y-2.5">
                  {detail.experienceDistribution.slice(0, 6).map((d) => (
                    <DistributionBar key={d.label} label={d.label} count={d.count} max={detail.experienceDistribution[0].count} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">经验要求数据待积累</p>
              )}
            </div>
          </div>
        </section>

        {/* 应届友好度 */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#165DFF]" />
            应届友好度
          </h2>
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
            {detail.freshGraduateStats.total > 0 ? (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-[#165DFF]">{detail.freshGraduateStats.friendly}</div>
                  <div className="text-xs text-slate-400 mt-1">应届友好</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-400">{detail.freshGraduateStats.notFriendly}</div>
                  <div className="text-xs text-slate-400 mt-1">未标注</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-700">{detail.freshGraduateStats.total}</div>
                  <div className="text-xs text-slate-400 mt-1">总数</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center">应届友好度数据待积累</p>
            )}
            {detail.graduateFriendlyLevels.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-50">
                <div className="text-xs text-slate-400 mb-2">友好度分级</div>
                <div className="space-y-2">
                  {detail.graduateFriendlyLevels.slice(0, 5).map((d) => (
                    <DistributionBar key={d.label} label={d.label} count={d.count} max={detail.graduateFriendlyLevels[0].count} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 相关岗位 */}
        {detail.relatedCareers.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#165DFF]" />
              相关岗位
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {detail.relatedCareers.map((c) => (
                <Link
                  key={c.slug}
                  href={`/career/${c.slug}`}
                  className="block p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="text-sm font-semibold text-slate-800 truncate">{c.jobTitle}</div>
                  <div className="text-xs text-slate-400 mt-1">{c.count} 条真实 JD</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="mb-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] rounded-2xl p-8 text-center">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <Sparkles className="w-10 h-10 text-blue-100 mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-white mb-2">用 AI 规划你的{detail.jobTitle}求职路线</h2>
              <p className="text-blue-50/80 mb-6 max-w-md mx-auto text-sm">
                不确定自己能不能投{detail.jobTitle}？让小职帮你分析技能匹配度、查漏补缺。
              </p>
              <Link
                href="/assistant"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#165DFF] rounded-xl font-semibold hover:bg-blue-50 transition shadow-lg"
              >
                找小职聊聊 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* 数据来源说明 */}
        <div className="text-xs text-slate-400 italic mb-4">{detail.sourceNote}</div>
      </div>
    </div>
  );
}
