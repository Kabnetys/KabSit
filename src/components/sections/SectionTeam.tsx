'use client';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import FadeIn from '@/components/ui/FadeIn';

const MEMBER_IMAGES = ['anthony', 'kyllian'] as const;
const MEMBER_SKILLS: string[][] = [
  ['Réseau N1/N2', 'Infrastructure SI', 'Cybersécurité', 'C#', 'SQL'],
  ['Laravel', 'C# / POO', 'SQL', 'Power BI', 'Git'],
];

export default function SectionTeam(): JSX.Element {
  const t = useTranslations('team');

  return (
    <section id="team" className="relative py-32 px-6" aria-labelledby="team-title">
      <div className="max-w-5xl mx-auto">
        <FadeIn className="text-center mb-20">
          <span className="text-xs font-mono tracking-widest text-cyan uppercase">{t('label')}</span>
          <h2
            id="team-title"
            className="mt-4 font-display font-bold text-4xl md:text-5xl text-white"
          >
            {t('title')}
          </h2>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-8">
          {([0, 1] as const).map((i) => (
            <FadeIn key={i} delay={i * 0.15}>
            <article
              className="group p-8 rounded-2xl border border-white/10 hover:border-blue/40 transition-all duration-500"
              style={{ backgroundColor: 'rgba(10,18,69,0.5)', backdropFilter: 'blur(12px)' }}
            >
              <div className="flex items-start gap-6 mb-6">
                <div className="relative w-20 h-20 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-blue/40 group-hover:ring-cyan/60 transition-all duration-300">
                  <Image
                    src={`/images/${MEMBER_IMAGES[i]}.jpg`}
                    alt={t(`members.${i}.name`)}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-white">
                    {t(`members.${i}.name`)}
                  </h3>
                  <p className="text-cyan text-sm mt-1">{t(`members.${i}.role`)}</p>
                </div>
              </div>

              <blockquote className="text-white/60 text-sm italic leading-relaxed mb-6 border-l-2 border-blue/40 pl-4">
                &ldquo;{t(`members.${i}.quote`)}&rdquo;
              </blockquote>

              <div className="flex flex-wrap gap-2">
                {MEMBER_SKILLS[i]?.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs px-3 py-1 rounded-full border border-white/10 text-white/50 font-mono"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </article>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
