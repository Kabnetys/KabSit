'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { JourneyScene } from './JourneyScene';

export default function WebGLBackground(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    gsap.registerPlugin(ScrollTrigger);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lightweight = window.matchMedia('(max-width: 768px)').matches;

    const scene = new JourneyScene(canvas, { reducedMotion, lightweight });
    scene.setSize(window.innerWidth, window.innerHeight);

    if (!reducedMotion) {
      scene.start();
    }

    const trigger = ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => scene.setProgress(self.progress),
    });

    const handleResize = (): void => {
      scene.setSize(window.innerWidth, window.innerHeight);
      ScrollTrigger.refresh();
    };
    const handleMouse = (e: MouseEvent): void => scene.onMouseMove(e.clientX, e.clientY);

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouse);

    return () => {
      trigger.kill();
      scene.dispose();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
