import type { MetadataRoute } from 'next';

const BASE = 'https://kabnetys.fr';
const LOCALES = ['fr', 'en', 'es'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return LOCALES.map((locale) => ({
    url: locale === 'fr' ? BASE : `${BASE}/${locale}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'monthly' as const,
    priority: locale === 'fr' ? 1.0 : 0.8,
  }));
}
