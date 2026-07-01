'use client';

import { useEffect, useRef } from 'react';

function triangle(x: number, center: number, halfWidth: number): number {
  const d = Math.abs(x - center);
  return Math.max(0, 1 - d / halfWidth);
}

export default function ChapterTransitions(): JSX.Element {
  const blackRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const warmRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const update = (): void => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? window.scrollY / scrollable : 0;

      if (blackRef.current) blackRef.current.style.opacity = String(triangle(progress, 0.15, 0.06) * 0.7);

      const flash = Math.max(triangle(progress, 0.35, 0.03), triangle(progress, 0.55, 0.03));
      if (flashRef.current) flashRef.current.style.opacity = String(flash * 0.85);

      const warmRise = Math.min(Math.max((progress - 0.55) / 0.2, 0), 1);
      const warmFall = 1 - Math.min(Math.max((progress - 0.82) / 0.08, 0), 1);
      if (warmRef.current) warmRef.current.style.opacity = String(warmRise * warmFall * 0.35);

      if (waveRef.current) waveRef.current.style.opacity = String(triangle(progress, 0.85, 0.04) * 0.75);

      frameRef.current = requestAnimationFrame(update);
    };
    frameRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <>
      <div
        ref={blackRef}
        className="fixed inset-0 pointer-events-none transition-opacity duration-100"
        style={{ zIndex: 5, backgroundColor: '#000000', opacity: 0 }}
        aria-hidden="true"
      />
      <div
        ref={flashRef}
        className="fixed inset-0 pointer-events-none transition-opacity duration-100"
        style={{ zIndex: 5, backgroundColor: '#f5f8ff', opacity: 0 }}
        aria-hidden="true"
      />
      <div
        ref={warmRef}
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          opacity: 0,
          background: 'radial-gradient(ellipse at 50% 60%, rgba(255,179,71,0.5) 0%, rgba(255,179,71,0) 70%)',
        }}
        aria-hidden="true"
      />
      <div
        ref={waveRef}
        className="fixed inset-0 pointer-events-none transition-opacity duration-100"
        style={{ zIndex: 5, backgroundColor: '#020204', opacity: 0 }}
        aria-hidden="true"
      />
    </>
  );
}
