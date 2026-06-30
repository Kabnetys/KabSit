'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

const LOCALES = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
] as const;

export default function LanguageSwitcher(): JSX.Element {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (next: string): void => {
    const stripped = pathname.replace(/^\/(fr|en|es)/, '') || '/';
    router.push(next === 'fr' ? stripped : `/${next}${stripped}`);
  };

  return (
    <div className="flex gap-2" role="navigation" aria-label="Langue / Language">
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => switchLocale(code)}
          className={`text-xs font-mono px-2 py-1 rounded border transition-colors duration-150 ${
            locale === code
              ? 'border-cyan text-cyan'
              : 'border-white/20 text-white/50 hover:border-white/50 hover:text-white/80'
          }`}
          aria-current={locale === code ? 'true' : undefined}
          aria-label={`Switch to ${label}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
