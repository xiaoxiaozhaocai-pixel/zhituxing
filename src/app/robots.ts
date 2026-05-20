import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'https://t498zk3cs9.coze.site';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/admin/', '/auth/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
