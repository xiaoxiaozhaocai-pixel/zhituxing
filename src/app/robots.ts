import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zhituxing.zeabur.app';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // 不暴露 admin 路径，只禁止 api 和内部路径
        disallow: ['/api/', '/_next/', '/auth/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
