'use client';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import Button from '@/components/ui/Button';

const ROTATING_WORDS = ['Artisan', 'PME', 'Startup', 'Commerce', 'Association'];

export default function S1_Hero(): JSX.Element {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);

  const [wordIndex, setWordIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  // Entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(chipRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7 }, 0.3)
        .fromTo(titleRef.current, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.9 }, 0.5)
        .fromTo(subRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8 }, 0.75)
        .fromTo(ctaRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7 }, 0.95)
        .fromTo(scrollRef.current, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 1.3);
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  // Rotating words
  useEffect(() => {
    const interval = setInterval(() => {
      setIsExiting(true);
      setTimeout(() => {
        setWordIndex((i) => (i + 1) % ROTATING_WORDS.length);
        setIsExiting(false);
      }, 350);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // Mouse parallax on circuit background
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 18;
      const y = (e.clientY / innerHeight - 0.5) * 18;
      gsap.to('#webgl-canvas', { x, y, duration: 1.2, ease: 'power2.out' });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative flex flex-col items-center justify-center text-center min-h-[100dvh] px-6 overflow-hidden"
      aria-label="Introduction KabNetys"
    >
      {/* Vignette gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 40%, rgba(2,6,23,0.7) 100%)' }}
        aria-hidden="true"
      />

      {/* Chip */}
      <div
        ref={chipRef}
        className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan/30 text-cyan text-xs font-mono tracking-widest uppercase opacity-0"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" aria-hidden="true" />
        KabNetys · Développement sur mesure
      </div>

      {/* Headline */}
      <h1
        ref={titleRef}
        className="font-display font-bold text-5xl md:text-7xl lg:text-8xl leading-[1.08] tracking-tight max-w-5xl opacity-0"
      >
        {/* Rotating word line */}
        <span className="block text-white mb-2">
          Pour chaque{' '}
          <span
            ref={wordRef}
            className="inline-block text-cyan transition-all duration-350"
            style={{
              opacity: isExiting ? 0 : 1,
              transform: isExiting ? 'translateY(-12px)' : 'translateY(0px)',
              transition: 'opacity 0.35s ease, transform 0.35s ease',
            }}
          >
            {ROTATING_WORDS[wordIndex]}
          </span>
        </span>
        {/* Static second line */}
        <span className="block text-white">
          un outil{' '}
          <span className="relative inline-block">
            <span className="relative z-10 text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(90deg, #00cfff, #0066ff)' }}>
              sur mesure.
            </span>
            <span
              className="absolute -bottom-1 left-0 w-full h-px"
              style={{ background: 'linear-gradient(90deg, #00cfff, #0066ff)' }}
              aria-hidden="true"
            />
          </span>
        </span>
      </h1>

      {/* Subline */}
      <p
        ref={subRef}
        className="mt-6 text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed opacity-0"
      >
        On crée les <span className="text-white/90">applications et sites internet</span> qui simplifient
        votre activité — développés avec l&apos;IA agentique pour des délais et des coûts adaptés à votre réalité.
      </p>

      {/* CTAs */}
      <div
        ref={ctaRef}
        className="mt-10 flex flex-wrap gap-4 justify-center opacity-0"
      >
        <Button href="#contact" variant="primary">Démarrer un projet</Button>
        <Button href="#services" variant="outline">Voir nos services</Button>
      </div>

      {/* Scroll indicator */}
      <div
        ref={scrollRef}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-0"
        aria-hidden="true"
      >
        <span className="w-px h-12 bg-gradient-to-b from-cyan/50 to-transparent animate-pulse" />
        <span className="text-xs text-white/30 font-mono tracking-widest">SCROLL</span>
      </div>
    </section>
  );
}
