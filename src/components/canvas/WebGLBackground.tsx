'use client';

import { useEffect, useRef } from 'react';
import { CircuitScene } from './CircuitScene';

export default function WebGLBackground(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new CircuitScene(canvas);
    scene.setSize(window.innerWidth, window.innerHeight);

    if (!prefersReduced) {
      scene.start();
    }

    const handleResize = (): void => scene.setSize(window.innerWidth, window.innerHeight);
    const handleMouse = (e: MouseEvent): void => scene.onMouseMove(e.clientX, e.clientY);

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouse);

    return () => {
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
