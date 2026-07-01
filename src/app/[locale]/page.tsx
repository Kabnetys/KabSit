import SectionHero from '@/components/sections/S1_Hero';
import S2_Pain from '@/components/sections/S2_Pain';
import S3_Services from '@/components/sections/S3_Services';
import S4_AI from '@/components/sections/S4_AI';
import S5_Team from '@/components/sections/S5_Team';
import S6_Method from '@/components/sections/S6_Method';
import S7_Contact from '@/components/sections/S7_Contact';
import TransitionLayer from '@/components/ui/TransitionLayer';

export function generateStaticParams() {
  return [{ locale: 'fr' }, { locale: 'en' }, { locale: 'es' }];
}

export default function HomePage(): JSX.Element {
  return (
    <>
      <TransitionLayer />
      <SectionHero />
      <S2_Pain />
      <S3_Services />
      <S4_AI />
      <S5_Team />
      <S6_Method />
      <S7_Contact />
    </>
  );
}
