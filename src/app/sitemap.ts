import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://432b6b32-abdf-4fba-9528-738980f50a36.dev.coze.site'
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
