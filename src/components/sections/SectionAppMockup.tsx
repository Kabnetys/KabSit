'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { AppMockupScene } from '@/components/canvas/AppMockupScene';

export default function SectionAppMockup(): JSX.Element {
  const t = useTranslations('mockup');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new AppMockupScene(canvas);
    scene.setSize(canvas.clientWidth, canvas.clientHeight);
    if (!prefersReduced) scene.start();
    const handleMouse = (e: MouseEvent): void => {
      const rect = canvas.getBoundingClientRect();
      scene.onMouseMove(e.clientX, e.clientY, rect);
    };
    canvas.addEventListener('mousemove', handleMouse);
    return () => {
      scene.dispose();
      canvas.removeEventListener('mousemove', handleMouse);
    };
  }, []);

  const features = t.raw('features') as string[];

  return (
    <section id="mockup" className="relative py-32 px-6 overflow-hidden" aria-labelledby="mockup-title">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div>
          <span className="text-xs font-mono tracking-widest text-cyan uppercase">{t('label')}</span>
          <h2 id="mockup-title" className="mt-4 font-display font-bold text-4xl md:text-5xl text-white leading-tight">
            {t('title').split('\n').map((line, i) => (
              <span key={i} className={i === 1 ? 'block text-blue' : 'block'}>{line}</span>
            ))}
          </h2>
          <p className="mt-6 text-white/60 leading-relaxed">{t('desc')}</p>
          <ul className="mt-8 space-y-3 text-sm text-white/50">
            {features.map((feat) => (
              <li key={feat} className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan flex-shrink-0" aria-hidden="true" />
                {feat}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative rounded-2xl overflow-hidden" style={{ boxShadow: '0 0 60px rgba(0,102,255,0.2)' }}>
          <canvas ref={canvasRef} className="w-full aspect-video" aria-label={t('label')} />
        </div>
      </div>
    </section>
  );
}
