'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import LanguageSwitcher from './LanguageSwitcher';

export default function NavBar(): JSX.Element {
  const t = useTranslations('nav');
  const locale = useLocale();
  const prefix = locale === 'fr' ? '' : `/${locale}`;
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const links = [
    { key: 'services' as const, href: `${prefix}/#services` },
    { key: 'method' as const, href: `${prefix}/#method` },
    { key: 'team' as const, href: `${prefix}/#team` },
    { key: 'contact' as const, href: `${prefix}/#contact` },
  ];

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 flex items-center justify-between px-6 md:px-8 h-[72px] transition-all duration-300"
        style={{
          zIndex: 50,
          backdropFilter: 'blur(12px)',
          backgroundColor: scrolled ? 'rgba(5,11,46,0.92)' : 'rgba(5,11,46,0.75)',
          borderBottom: '1px solid rgba(0,102,255,0.2)',
        }}
      >
        <Link href={`${prefix}/`} aria-label="KabNetys — Accueil" onClick={closeMenu}>
          <Image src="/images/logo.png" alt="KabNetys" width={160} height={44} priority />
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Navigation principale" className="hidden md:block">
          <ul className="flex gap-8 list-none">
            {links.map(({ key, href }) => (
              <li key={key}>
                <Link
                  href={href}
                  className="text-sm font-medium text-white/70 hover:text-white transition-colors duration-150"
                >
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          {/* Hamburger */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-[6px] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan rounded"
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span
              className="block w-6 h-px bg-white transition-all duration-300 origin-center"
              style={{ transform: menuOpen ? 'translateY(7px) rotate(45deg)' : 'none' }}
            />
            <span
              className="block w-6 h-px bg-white transition-all duration-300"
              style={{ opacity: menuOpen ? 0 : 1, transform: menuOpen ? 'scaleX(0)' : 'none' }}
            />
            <span
              className="block w-6 h-px bg-white transition-all duration-300 origin-center"
              style={{ transform: menuOpen ? 'translateY(-7px) rotate(-45deg)' : 'none' }}
            />
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-label="Menu de navigation"
        aria-modal="true"
        className="md:hidden fixed inset-0 flex flex-col transition-all duration-300"
        style={{
          zIndex: 49,
          backdropFilter: 'blur(16px)',
          backgroundColor: 'rgba(5,11,46,0.97)',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'auto' : 'none',
          transform: menuOpen ? 'translateY(0)' : 'translateY(-8px)',
        }}
      >
        <nav
          aria-label="Navigation mobile"
          className="flex flex-col justify-center items-center flex-1 gap-8 pt-[72px]"
        >
          {links.map(({ key, href }) => (
            <Link
              key={key}
              href={href}
              onClick={closeMenu}
              className="font-display font-bold text-3xl text-white/80 hover:text-cyan transition-colors duration-200"
            >
              {t(key)}
            </Link>
          ))}
        </nav>
        <div className="pb-12 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </>
  );
}
