import Link from 'next/link';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import LanguageSwitcher from './LanguageSwitcher';

export default function NavBar(): JSX.Element {
  const t = useTranslations('nav');
  const locale = useLocale();
  const prefix = locale === 'fr' ? '' : `/${locale}`;

  const links = [
    { key: 'services' as const, href: `${prefix}/#services` },
    { key: 'method' as const, href: `${prefix}/#method` },
    { key: 'team' as const, href: `${prefix}/#team` },
    { key: 'contact' as const, href: `${prefix}/#contact` },
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 flex items-center justify-between px-8 h-[72px]"
      style={{ zIndex: 50, backdropFilter: 'blur(12px)', backgroundColor: 'rgba(5,11,46,0.75)', borderBottom: '1px solid rgba(0,102,255,0.2)' }}
    >
      <Link href={`${prefix}/`} aria-label="KabNetys — Accueil">
        <Image src="/images/logo.png" alt="KabNetys" width={160} height={44} priority />
      </Link>
      <nav aria-label="Navigation principale">
        <ul className="hidden md:flex gap-8 list-none">
          {links.map(({ key, href }) => (
            <li key={key}>
              <Link href={href} className="text-sm font-medium text-white/70 hover:text-white transition-colors duration-150">
                {t(key)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <LanguageSwitcher />
    </header>
  );
}
