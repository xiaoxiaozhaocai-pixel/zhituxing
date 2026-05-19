import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth', '/profile/'],
      },
    ],
    sitemap: 'https://t498zk3cs9.coze.site/sitemap.xml',
  };
}
