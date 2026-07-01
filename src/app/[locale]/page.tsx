import SectionHero from '@/components/sections/SectionHero';
import SectionPain from '@/components/sections/SectionPain';
import SectionServices from '@/components/sections/SectionServices';
import SectionAI from '@/components/sections/SectionAI';
import SectionTeam from '@/components/sections/SectionTeam';
import SectionContact from '@/components/sections/SectionContact';

export function generateStaticParams() {
  return [{ locale: 'fr' }, { locale: 'en' }, { locale: 'es' }];
}

export default function HomePage(): JSX.Element {
  return (
    <>
      <SectionHero />
      <SectionPain />
      <SectionServices />
      <SectionAI />
      <SectionTeam />
      <SectionContact />
    </>
  );
}
