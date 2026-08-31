import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GraduationCap, MapPin, Calendar, Building2, BookOpen, ArrowRight, Sparkles, Briefcase, TrendingUp, Users } from 'lucide-react';
import { SCHOOLS, getSchoolBySlug, getRelatedSchools, type SchoolProfile } from '@/lib/seo/schools';
import { getSchoolRelatedJobs, aggregateJobDistribution } from '@/lib/seo/careers';
import { SITE_URL } from '@/lib/config';

/* ============================================================
 * 静态参数 — 预生成所有学校 slug
 * ============================================================ */
export function generateStaticParams() {
  return SCHOOLS.map((s) => ({ slug: s.slug }));
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
  const school = getSchoolBySlug(slug);
  if (!school) {
  return {
      title: '学校专区 | 职途星',
      description: '职途星学校就业专区 — 了解你的学校能投哪些岗位、薪资地域分布，用AI规划求职路线。',
    };
  }

  const title = `${school.name}就业专区 — 能投哪些岗位 | 职途星`;
  const description = school.isComplete
    ? `懂桂电学生的AI朋友·${school.name}求职专区：了解${school.shortName}概况、本专业能投哪些岗位、薪资地域分布，用AI规划求职路线。`
    : `${school.name}求职专区 — ${school.shortName}概况与可投岗位。更多详情持续完善中，数据待积累。`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      locale: 'zh_CN',
      type: 'website',
      siteName: '职途星',
      url: `${SITE_URL}/university/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `${SITE_URL}/university/${slug}`,
    },
  };
}

/* ============================================================
 * 子组件
 * ============================================================ */

function BreadcrumbNav({ school }: { school: SchoolProfile }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-slate-500 mb-6">
      <Link href="/" className="hover:text-[#165DFF] transition">首页</Link>
      <span className="text-slate-300">/</span>
      <Link href="/university" className="hover:text-[#165DFF] transition">学校专区</Link>
      <span className="text-slate-300">/</span>
      <span className="text-slate-700 font-medium">{school.shortName}</span>
    </nav>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#165DFF]/10 flex items-center justify-center text-[#165DFF]">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-slate-400 mb-0.5">{label}</div>
        <div className="text-sm text-slate-700 font-medium">{value || '数据待积累'}</div>
      </div>
    </div>
  );
}

function DistributionBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600 w-20 flex-shrink-0 truncate">{label}</span>
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

function JobCard({ job }: { job: { id: string; company?: string; city?: string; salaryRange?: string; education?: string; experience?: string; freshGraduateFriendly?: boolean } }) {
  return (
    <Link
      href="/jobs"
      className="block p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-800 truncate">{job.company || '企业信息待积累'}</span>
        {job.freshGraduateFriendly && (
          <span className="text-xs px-2 py-0.5 bg-[#165DFF]/10 text-[#165DFF] rounded-full font-medium flex-shrink-0">应届友好</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
        {job.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.city}</span>}
        {job.salaryRange && <span className="text-[#FF7D00] font-medium">{job.salaryRange}</span>}
        {job.education && <span>{job.education}</span>}
        {job.experience && <span>{job.experience}</span>}
      </div>
    </Link>
  );
}

function SchoolCard({ school }: { school: SchoolProfile }) {
  return (
    <Link
      href={`/university/${school.slug}`}
      className="block p-5 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-[#165DFF]/10 flex items-center justify-center text-[#165DFF] group-hover:bg-[#165DFF] group-hover:text-white transition-colors">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <div className="text-base font-bold text-slate-900">{school.name}</div>
          <div className="text-xs text-slate-400">{school.shortName} · {school.type}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {school.tags.map((t) => (
          <span key={t} className="text-xs px-2 py-0.5 bg-slate-50 text-slate-500 rounded border border-gray-100">{t}</span>
        ))}
      </div>
      {!school.isComplete && (
        <div className="mt-3 text-xs text-slate-400 italic">数据待积累</div>
      )}
    </Link>
  );
}

function PlaceholderCard({ message }: { message: string }) {
  return (
    <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
        <BookOpen className="w-6 h-6" />
      </div>
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

/* ============================================================
 * JSON-LD
 * ============================================================ */
function SchoolJsonLd({ school }: { school: SchoolProfile }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollegeOrUniversity',
    name: school.name,
    alternateName: school.shortName,
    ...(school.enName ? { alternateName: school.enName } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: school.city,
      addressRegion: school.province,
      addressCountry: 'CN',
    },
    ...(school.motto ? { slogan: school.motto } : {}),
    ...(school.foundedYear ? { foundingDate: school.foundedYear } : {}),
    ...(school.governing ? { description: school.governing } : {}),
    url: `${SITE_URL}/university/${school.slug}`,
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: '学校专区', item: `${SITE_URL}/university` },
      { '@type': 'ListItem', position: 3, name: school.name, item: `${SITE_URL}/university/${school.slug}` },
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
export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const school = getSchoolBySlug(slug);
  if (!school) notFound();

  const relatedSchools = getRelatedSchools(slug, 4);

  // 获取学校关联的真实岗位
  const relatedJobs = await getSchoolRelatedJobs(school.city, school.majorKeywords, 12);
  const { cityDistribution, industryDistribution } = aggregateJobDistribution(relatedJobs);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f5ff]/40 via-white to-[#f8fafd]">
      <SchoolJsonLd school={school} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#165DFF] to-[#3D7FFF]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-200 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm mb-4">
              <GraduationCap className="w-4 h-4" />
              <span>学校专区</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{school.name}</h1>
            {school.highlights.length > 0 && (
              <p className="mt-3 text-lg text-blue-50/90">
                {school.highlights.join(' · ')}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {school.tags.map((t) => (
                <span key={t} className="text-sm px-3 py-1 bg-white/15 rounded-full text-blue-50">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav school={school} />

        {/* 学校概况卡 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#165DFF]" />
            学校概况
          </h2>
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
            {school.isComplete ? (
              <>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">{school.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                  <InfoRow icon={<Building2 className="w-4 h-4" />} label="全称" value={school.name} />
                  <InfoRow icon={<GraduationCap className="w-4 h-4" />} label="简称" value={school.shortName} />
                  {school.enName && <InfoRow icon={<BookOpen className="w-4 h-4" />} label="英文名" value={school.enName} />}
                  <InfoRow icon={<MapPin className="w-4 h-4" />} label="所在城市" value={`${school.city}，${school.province}`} />
                  {school.governing && <InfoRow icon={<Building2 className="w-4 h-4" />} label="主管部门" value={school.governing} />}
                  {school.foundedYear && <InfoRow icon={<Calendar className="w-4 h-4" />} label="创办年份" value={school.foundedYear} />}
                  {school.motto && <InfoRow icon={<Sparkles className="w-4 h-4" />} label="校训" value={school.motto} />}
                  {school.spirit && <InfoRow icon={<Sparkles className="w-4 h-4" />} label="学校精神" value={school.spirit} />}
                </div>
                {school.strongMajors.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-50">
                    <div className="text-xs text-slate-400 mb-2">强势学科</div>
                    <div className="flex flex-wrap gap-2">
                      {school.strongMajors.map((m) => (
                        <span key={m} className="text-sm px-3 py-1 bg-[#165DFF]/8 text-[#165DFF] rounded-lg font-medium">{m}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-4 text-xs text-slate-400 italic">{school.sourceNote}</div>
              </>
            ) : (
              <PlaceholderCard message={`${school.name}的详细概况数据待积累，详情请以学校官网为准。`} />
            )}
          </div>
        </section>

        {/* 该校可投岗位区 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#165DFF]" />
            该校可投岗位
          </h2>
          {relatedJobs.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {relatedJobs.slice(0, 8).map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
              <div className="mt-4 text-center">
                <Link
                  href="/jobs"
                  className="inline-flex items-center gap-1.5 text-sm text-[#165DFF] hover:text-[#3D7FFF] font-medium transition"
                >
                  查看全部岗位 <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
              <PlaceholderCard message="该校岗位数据待积累 — 我们正在持续采集真实岗位，敬请期待。" />
            </div>
          )}
        </section>

        {/* 地域/行业分布 */}
        {relatedJobs.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#165DFF]" />
              地域与行业分布
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">城市分布</h3>
                {cityDistribution.length > 0 ? (
                  <div className="space-y-2.5">
                    {cityDistribution.slice(0, 6).map((d) => (
                      <DistributionBar key={d.label} label={d.label} count={d.count} max={cityDistribution[0].count} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">城市分布数据待积累</p>
                )}
              </div>
              <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">行业分布</h3>
                {industryDistribution.length > 0 ? (
                  <div className="space-y-2.5">
                    {industryDistribution.slice(0, 6).map((d) => (
                      <DistributionBar key={d.label} label={d.label} count={d.count} max={industryDistribution[0].count} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">行业分布数据待积累</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 相关学校 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#165DFF]" />
            相关学校
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedSchools.map((s) => (
              <SchoolCard key={s.slug} school={s} />
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mb-10">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] rounded-2xl p-8 text-center">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <Sparkles className="w-10 h-10 text-blue-100 mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-white mb-2">找小职聊聊你的求职路线</h2>
              <p className="text-blue-50/80 mb-6 max-w-md mx-auto text-sm">
                不确定能投什么岗位？让小职帮你分析专业匹配度、规划求职方向。
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
      </div>
    </div>
  );
}
