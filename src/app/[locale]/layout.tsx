import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import dynamicImport from 'next/dynamic';
import Script from 'next/script';
import NavBar from '@/components/ui/NavBar';
import Footer from '@/components/layout/Footer';
import '@/app/globals.css';

const WebGLBackground = dynamicImport(() => import('@/components/canvas/WebGLBackground'), { ssr: false });

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display-loaded' });
const inter = Inter({ subsets: ['latin'], variable: '--font-body-loaded' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono-loaded' });

const JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'KabNetys',
  url: 'https://kabnetys.fr',
  logo: 'https://kabnetys.fr/images/logo.png',
  email: 'contact@kabnetys.fr',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'École-Valentin',
    addressRegion: 'Bourgogne-Franche-Comté',
    addressCountry: 'FR',
  },
});

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: { default: 'KabNetys', template: '%s | KabNetys' },
    description: t('description'),
    metadataBase: new URL('https://kabnetys.fr'),
    alternates: {
      canonical: `/${locale}`,
      languages: { fr: '/fr', en: '/en', es: '/es' },
    },
    openGraph: {
      type: 'website',
      locale,
      siteName: 'KabNetys',
      images: [{ url: '/images/logo.png', width: 400, height: 110, alt: 'KabNetys' }],
    },
    robots: { index: true, follow: true },
    icons: { icon: '/favicon.ico' },
  };
}

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return [{ locale: 'fr' }, { locale: 'en' }, { locale: 'es' }];
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const messages = await getMessages();
  return (
    <html
      lang={locale}
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <Script
          id="org-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON_LD }}
          strategy="afterInteractive"
        />
        <NextIntlClientProvider messages={messages}>
          <WebGLBackground />
          <NavBar />
          <main id="main-content" className="relative" style={{ zIndex: 1 }}>
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
