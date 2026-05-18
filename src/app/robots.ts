import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/_next/', '/static/'],
    },
    sitemap: 'https://432b6b32-abdf-4fba-9528-738980f50a36.dev.coze.site/sitemap.xml',
  };
}
