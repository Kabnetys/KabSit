export function generateStaticParams() {
  return [{ locale: 'fr' }, { locale: 'en' }, { locale: 'es' }];
}

// Sections temporairement retirées — fond 3D seul pour validation visuelle
export default function HomePage(): JSX.Element {
  return (
    <div style={{ height: '600vh' }} />
  );
}
