'use client';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';

export default function Footer(): JSX.Element {
  const t = useTranslations('footer');
  return (
    <footer
      className="relative border-t"
      style={{ borderColor: 'rgba(61,124,255,0.2)', backgroundColor: 'rgba(4,8,28,0.97)', zIndex: 10, padding: '48px 32px 32px' }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
        <div>
          <Image src="/images/logo.png" alt="KabNetys" width={140} height={40} />
          <p className="mt-4 text-sm text-white/50 max-w-xs">{t('tagline')}</p>
        </div>
        <div className="text-sm text-white/40 space-y-2">
          <p>{t('location')}</p>
          <Link href="mailto:contact@kabnetys.fr" className="block hover:text-cyan transition-colors">contact@kabnetys.fr</Link>
        </div>
      </div>
      <p className="mt-8 text-center text-xs text-white/30">{t('legal')}</p>
    </footer>
  );
}
