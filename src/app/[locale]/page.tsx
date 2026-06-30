import SectionHero from '@/components/sections/SectionHero';
import SectionServices from '@/components/sections/SectionServices';
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
      <SectionServices />
      <SectionMethod />
      <SectionAppMockup />
      <SectionTeam />
      <SectionContact />
    </>
  );
}
