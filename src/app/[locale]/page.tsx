import SectionHero from '@/components/sections/S1_Hero';
import S2_Pain from '@/components/sections/S2_Pain';
import S3_Services from '@/components/sections/S3_Services';
import S4_AI from '@/components/sections/S4_AI';
import SectionMethod from '@/components/sections/SectionMethod';
import SectionAppMockup from '@/components/sections/SectionAppMockup';
import SectionTeam from '@/components/sections/SectionTeam';
import SectionContact from '@/components/sections/SectionContact';

export function generateStaticParams() {
  return [{ locale: 'fr' }, { locale: 'en' }, { locale: 'es' }];
}

export default function HomePage(): JSX.Element {
  return (
    <>
      <SectionHero />
      <S2_Pain />
      <S3_Services />
      <S4_AI />
      <SectionMethod />
      <SectionAppMockup />
      <SectionTeam />
      <SectionContact />
    </>
  );
}
