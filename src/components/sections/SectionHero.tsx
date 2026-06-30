import { useTranslations } from 'next-intl';
import Button from '@/components/ui/Button';

export default function SectionHero(): JSX.Element {
  const t = useTranslations('hero');

  return (
    <section id="hero" className="relative flex flex-col items-center justify-center text-center min-h-[100dvh] px-6" aria-label="Introduction KabNetys">
      <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan/30 text-cyan text-xs font-mono tracking-widest uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" aria-hidden="true" />
        KabNetys · Développement sur mesure
      </div>

      <h1 className="font-display font-bold text-5xl md:text-7xl lg:text-8xl leading-[1.05] tracking-tight max-w-4xl">
        {t('headline').split('\n').map((line, i) => (
          <span key={i} className={i === 1 ? 'block text-blue' : 'block text-white'}>{line}</span>
        ))}
      </h1>

      <p className="mt-6 text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed">{t('subline')}</p>

      <div className="mt-10 flex flex-wrap gap-4 justify-center">
        <Button href="#contact" variant="primary">{t('cta_primary')}</Button>
        <Button href="#services" variant="outline">{t('cta_secondary')}</Button>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" aria-hidden="true">
        <span className="w-px h-12 bg-gradient-to-b from-cyan/50 to-transparent animate-pulse" />
        <span className="text-xs text-white/30 font-mono tracking-widest">SCROLL</span>
      </div>
    </section>
  );
}
