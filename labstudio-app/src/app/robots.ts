import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/favicon.ico'],
        disallow: ['/members', '/onboarding', '/api/'],
      },
    ],
    host: siteUrl || undefined,
    sitemap: siteUrl ? `${siteUrl}/sitemap.xml` : undefined,
  };
}
