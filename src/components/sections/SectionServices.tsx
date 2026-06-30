import { useTranslations } from 'next-intl';
import FadeIn from '@/components/ui/FadeIn';

const CpuIcon = (): JSX.Element => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <line x1="9" y1="4" x2="9" y2="2" /><line x1="15" y1="4" x2="15" y2="2" />
    <line x1="9" y1="22" x2="9" y2="20" /><line x1="15" y1="22" x2="15" y2="20" />
    <line x1="4" y1="9" x2="2" y2="9" /><line x1="4" y1="15" x2="2" y2="15" />
    <line x1="22" y1="9" x2="20" y2="9" /><line x1="22" y1="15" x2="20" y2="15" />
    <rect x="9" y="9" width="6" height="6" />
  </svg>
);

const GlobeIcon = (): JSX.Element => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const ZapIcon = (): JSX.Element => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const ICONS = [CpuIcon, GlobeIcon, ZapIcon];

export default function SectionServices(): JSX.Element {
  const t = useTranslations('services');

  return (
    <section id="services" className="relative py-32 px-6" aria-labelledby="services-title">
      <div className="max-w-6xl mx-auto">
        <FadeIn className="text-center mb-20">
          <span className="text-xs font-mono tracking-widest text-cyan uppercase">{t('label')}</span>
          <h2
            id="services-title"
            className="mt-4 font-display font-bold text-4xl md:text-5xl text-white"
          >
            {t('title')}
          </h2>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-6">
          {([0, 1, 2] as const).map((i) => {
            const Icon = ICONS[i] ?? CpuIcon;
            return (
              <FadeIn key={i} delay={i * 0.12}>
              <article
                className="group relative p-8 rounded-2xl border border-white/10 hover:border-blue/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,102,255,0.15)]"
                style={{ backgroundColor: 'rgba(10,18,69,0.6)', backdropFilter: 'blur(12px)' }}
              >
                <div className="text-cyan mb-6 transition-transform duration-300 group-hover:scale-110">
                  <Icon />
                </div>
                <h3 className="font-display font-semibold text-xl text-white mb-3">
                  {t(`items.${i}.title`)}
                </h3>
                <p className="text-sm text-white/60 leading-relaxed">{t(`items.${i}.desc`)}</p>
                {/* Corner accent */}
                <div
                  className="absolute top-0 right-0 w-16 h-16 rounded-2xl overflow-hidden pointer-events-none"
                  aria-hidden="true"
                >
                  <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-cyan/40 to-transparent" />
                  <div className="absolute top-0 right-0 h-px w-full bg-gradient-to-l from-cyan/40 to-transparent" />
                </div>
              </article>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
