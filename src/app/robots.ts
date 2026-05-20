import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'https://t498zk3cs9.coze.site';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // 不暴露 admin 路径，只禁止 api 和内部路径
        disallow: ['/api/', '/_next/', '/auth/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
