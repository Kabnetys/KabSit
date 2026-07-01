export function generateStaticParams() {
  return [{ locale: 'fr' }, { locale: 'en' }, { locale: 'es' }];
}

export default function HomePage(): JSX.Element {
  return (
    <main>
      {/* 600vh pour que le scroll déclenche les 7 chapitres d'orbite caméra */}
      <div style={{ height: '600vh' }} aria-hidden="true" />
    </main>
  );
}
