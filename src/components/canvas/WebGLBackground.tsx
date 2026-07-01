'use client';

import { useEffect, useRef } from 'react';
import { ValleyScene } from './ValleyScene';

export default function WebGLBackground(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new ValleyScene(canvas);
    scene.setSize(window.innerWidth, window.innerHeight);

    if (!prefersReduced) scene.start();

    const handleResize = (): void => scene.setSize(window.innerWidth, window.innerHeight);
    const handleMouse  = (e: MouseEvent): void => scene.onMouseMove(e.clientX, e.clientY);
    const handleScroll = (): void => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      scene.setScroll(maxScroll > 0 ? window.scrollY / maxScroll : 0);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouse);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      scene.dispose();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="webgl-canvas"
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
