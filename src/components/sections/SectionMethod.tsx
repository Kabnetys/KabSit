'use client';
import { useTranslations } from 'next-intl';

export default function SectionMethod(): JSX.Element {
  const t = useTranslations('method');

  return (
    <section id="method" className="relative py-32 px-6" aria-labelledby="method-title">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <span className="text-xs font-mono tracking-widest text-cyan uppercase">{t('label')}</span>
          <h2 id="method-title" className="mt-4 font-display font-bold text-4xl md:text-5xl text-white">{t('title')}</h2>
        </div>
        <div className="relative">
          <div className="absolute left-[31px] top-8 bottom-8 w-px hidden md:block" style={{ background: 'linear-gradient(to bottom, #0066FF, #00CCFF, transparent)' }} aria-hidden="true" />
          <div className="flex flex-col gap-12">
            {([0, 1, 2, 3] as const).map((i) => (
              <div key={i} className="flex gap-8 items-start group">
                <div className="flex-shrink-0 w-16 h-16 rounded-full border-2 border-blue flex items-center justify-center font-mono font-bold text-blue text-lg transition-all duration-300 group-hover:border-cyan group-hover:text-cyan group-hover:shadow-[0_0_20px_rgba(0,204,255,0.3)]" style={{ backgroundColor: '#050B2E' }} aria-hidden="true">
                  {t(`steps.${i}.n`)}
                </div>
                <div className="pt-3">
                  <h3 className="font-display font-semibold text-xl text-white mb-2">{t(`steps.${i}.title`)}</h3>
                  <p className="text-white/60 leading-relaxed max-w-xl">{t(`steps.${i}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
