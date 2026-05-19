import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/config'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_URL
  const routes = [
    '',
    '/career-planning',
    '/assistant',
    '/assessment',
    '/match',
    '/skill-portrait',
    '/skills-graph',
    '/auth',
    '/profile',
    '/jobs',
    '/guide',
    '/faq',
    '/learning-path',
    '/membership',
    '/resources',
    '/contact',
  ]
  return routes.map((route) => ({
    url: baseUrl + route,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }))
}
