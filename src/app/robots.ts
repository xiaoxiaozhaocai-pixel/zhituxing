import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zhituxing.tech';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/memory', '/api/memory/query'],
        disallow: ['/api/', '/_next/', '/auth/', '/admin/', '/test-e2e/', '/test-ssr/'],
      },
      {
        userAgent: 'Baiduspider',
        allow: ['/', '/api/memory', '/api/memory/query'],
        disallow: ['/api/', '/_next/', '/auth/', '/admin/', '/test-e2e/', '/test-ssr/', '/profile/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
