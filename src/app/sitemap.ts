import { MetadataRoute } from 'next';
import { SCHOOLS } from '@/lib/seo/schools';
import { getCareerList } from '@/lib/seo/careers';

/**
 * 动态 Sitemap — 静态页 + 学校详情页 + 岗位详情页
 * 替代原纯静态 sitemap，让搜索引擎能发现 SEO 落地页。
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zhituxing.tech';
  const now = new Date();

  // 静态页面
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily' as const, priority: 1 },
    { url: `${baseUrl}/match`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/growth`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/jobs`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/assistant`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/learning-path`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/skills-graph`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/skill-portrait`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/guide`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/resources`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${baseUrl}/insights`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/search`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.5 },
    { url: `${baseUrl}/university`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/referrals`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.5 },
    { url: `${baseUrl}/resume-optimize`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/resume-builder`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.5 },
    { url: `${baseUrl}/membership`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/faq`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${baseUrl}/feedback`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${baseUrl}/data-source`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.3 },
  ];

  // 学校详情页 URL — 从 SCHOOLS 配置批量生成
  const schoolPages: MetadataRoute.Sitemap = SCHOOLS.map((s) => ({
    url: `${baseUrl}/university/${s.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: s.isComplete ? 0.8 : 0.5,
  }));

  // 岗位详情页 URL — 从 Supabase 真实 JD 聚合的高频岗位 slug 生成
  // 构建阶段若环境变量缺失，返回空数组（不影响构建）
  const careerList = await getCareerList(100);
  const careerPages: MetadataRoute.Sitemap = careerList.map((c) => ({
    url: `${baseUrl}/career/${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: c.count >= 10 ? 0.7 : 0.5,
  }));

  return [...staticPages, ...schoolPages, ...careerPages];
}
