'use client';

import { useTranslations } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import Button from '@/components/ui/Button';

export default function SectionHero(): JSX.Element {
  const t = useTranslations('hero');
  const prefersReduced = useReducedMotion();

  const ease = [0.22, 1, 0.36, 1] as const;
  const dur = prefersReduced ? 0 : 0.8;

  return (
    <section
      id="hero"
      className="relative flex flex-col items-center justify-center text-center min-h-[100dvh] px-6"
      aria-label="Introduction KabNetys"
    >
      {/* Label chip */}
      <motion.div
        className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan/30 text-cyan text-xs font-mono tracking-widest uppercase"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: dur, delay: 0.2, ease }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" aria-hidden="true" />
        KabNetys · Développement sur mesure
      </motion.div>

      {/* Headline */}
      <motion.h1
        className="font-display font-bold text-5xl md:text-7xl lg:text-8xl leading-[1.05] tracking-tight max-w-4xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: dur, delay: 0.35, ease }}
      >
        {t('headline')
          .split('\n')
          .map((line, i) => (
            <span
              key={i}
              className={i === 1 ? 'block text-blue' : 'block text-white'}
            >
              {line}
            </span>
          ))}
      </motion.h1>

      {/* Subline */}
      <motion.p
        className="mt-6 text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: dur, delay: 0.5, ease }}
      >
        {t('subline')}
      </motion.p>

      {/* CTAs */}
      <motion.div
        className="mt-10 flex flex-wrap gap-4 justify-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: dur, delay: 0.65, ease }}
      >
        <Button href="#contact" variant="primary">
          {t('cta_primary')}
        </Button>
        <Button href="#services" variant="outline">
          {t('cta_secondary')}
        </Button>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: dur, delay: 1.1, ease }}
      >
        <span className="w-px h-12 bg-gradient-to-b from-cyan/50 to-transparent animate-pulse" />
        <span className="text-xs text-white/30 font-mono tracking-widest">SCROLL</span>
      </motion.div>
    </section>
  );
}
