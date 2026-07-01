'use client';
import { useTranslations } from 'next-intl';
import FadeIn from '@/components/ui/FadeIn';

export default function SectionPain(): JSX.Element {
  const t = useTranslations('pain');
  const items = t.raw('items') as { id: string; text: string }[];

  return (
    <section id="pain" className="relative py-32 px-6" aria-labelledby="pain-title">
      <div className="max-w-3xl mx-auto text-center">
        <span className="text-xs font-mono tracking-widest text-red-300 uppercase">{t('label')}</span>
        <h2 id="pain-title" className="mt-4 font-display font-bold text-4xl md:text-5xl text-white">
          {t('title')}
        </h2>

        <ul className="mt-16 space-y-8">
          {items.map((item, i) => (
            <FadeIn key={item.id} delay={i * 0.15}>
              <li className="text-xl md:text-2xl text-white/70 font-display">{item.text}</li>
            </FadeIn>
          ))}
        </ul>
      </div>
    </section>
  );
}
