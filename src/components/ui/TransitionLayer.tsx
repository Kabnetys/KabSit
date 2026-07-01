'use client';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function TransitionLayer() {
  const blackRef = useRef<HTMLDivElement>(null);    // T1 & T6 — fade to black
  const blueRef = useRef<HTMLDivElement>(null);     // T2 — blue electric flash
  const whiteRef = useRef<HTMLDivElement>(null);    // T3 — white flash
  const t4TextRef = useRef<HTMLDivElement>(null);   // T4 — "Mais derrière l'IA…"
  const t5PointRef = useRef<HTMLDivElement>(null);  // T5 — converging point
  const canvasRef = useRef<HTMLCanvasElement>(null); // T2 — pixel burst

  // Pixel burst canvas for T2
  const runPixelBurst = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.opacity = '1';

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const particles: { x: number; y: number; vx: number; vy: number; alpha: number; size: number; color: string }[] = [];

    for (let i = 0; i < 180; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        size: 2 + Math.random() * 4,
        color: Math.random() > 0.5 ? '#00cfff' : '#ffffff',
      });
    }

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.alpha -= 0.018;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      frame++;
      if (frame < 80) requestAnimationFrame(animate);
      else canvas.style.opacity = '0';
    };
    animate();
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      // ─── T1 : Hero → Pain ─────────────────────────────────────────
      // Fade to black as hero exits, reveal pain section
      ScrollTrigger.create({
        trigger: '#hero',
        start: 'bottom 60%',
        end: 'bottom top',
        scrub: 0.6,
        onUpdate: (self) => {
          gsap.set(blackRef.current, { opacity: self.progress * 0.85 });
        },
        onLeave: () => {
          gsap.to(blackRef.current, { opacity: 0, duration: 0.6, delay: 0.1 });
        },
      });

      // ─── T2 : Pain → Services ──────────────────────────────────────
      // Pixel burst + blue flash when leaving pain section
      ScrollTrigger.create({
        trigger: '#pain-section',
        start: 'bottom 20%',
        onEnter: () => {
          runPixelBurst();
          gsap.fromTo(blueRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 0.3, yoyo: true, repeat: 1, ease: 'power2.inOut' }
          );
        },
      });

      // ─── T3 : Services → AI ────────────────────────────────────────
      // White flash between services and AI
      ScrollTrigger.create({
        trigger: '#services',
        start: 'bottom 30%',
        onEnter: () => {
          gsap.fromTo(whiteRef.current,
            { opacity: 0 },
            { opacity: 0.7, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.inOut' }
          );
        },
      });

      // ─── T4 : AI → Team ────────────────────────────────────────────
      // "Mais derrière l'IA, il y a nous." text reveal
      ScrollTrigger.create({
        trigger: '#ia-agentique',
        start: 'bottom 40%',
        onEnter: () => {
          gsap.set(t4TextRef.current, { opacity: 1 });
          gsap.fromTo(t4TextRef.current,
            { opacity: 0, scale: 0.95 },
            {
              opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out',
              onComplete: () => {
                gsap.to(t4TextRef.current, { opacity: 0, duration: 0.5, delay: 0.8 });
              },
            }
          );
        },
        onLeaveBack: () => {
          gsap.set(t4TextRef.current, { opacity: 0 });
        },
      });

      // ─── T5 : Team → Method ────────────────────────────────────────
      // Converging point of light
      ScrollTrigger.create({
        trigger: '#team',
        start: 'bottom 40%',
        onEnter: () => {
          gsap.set(t5PointRef.current, { scale: 0, opacity: 1 });
          gsap.to(t5PointRef.current, {
            scale: 80, opacity: 0, duration: 1.2, ease: 'power2.in',
          });
        },
        onLeaveBack: () => {
          gsap.set(t5PointRef.current, { opacity: 0 });
        },
      });

      // ─── T6 : Method → Contact ─────────────────────────────────────
      // Dark wave covers screen, then reveals contact
      ScrollTrigger.create({
        trigger: '#methode',
        start: 'bottom 30%',
        onEnter: () => {
          gsap.fromTo(blackRef.current,
            { opacity: 0 },
            {
              opacity: 0.9, duration: 0.5, ease: 'power2.in',
              onComplete: () => {
                gsap.to(blackRef.current, { opacity: 0, duration: 0.7, delay: 0.2 });
              },
            }
          );
        },
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <>
      {/* Black overlay — T1, T6 */}
      <div
        ref={blackRef}
        style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none', opacity: 0, background: '#000' }}
        aria-hidden="true"
      />

      {/* Blue flash — T2 */}
      <div
        ref={blueRef}
        style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none', opacity: 0, background: 'linear-gradient(135deg,#0a1245,#0033ff)' }}
        aria-hidden="true"
      />

      {/* White flash — T3 */}
      <div
        ref={whiteRef}
        style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none', opacity: 0, background: '#ffffff' }}
        aria-hidden="true"
      />

      {/* T4 — "Mais derrière l'IA, il y a nous." */}
      <div
        ref={t4TextRef}
        style={{
          position: 'fixed', inset: 0, zIndex: 61, pointerEvents: 'none', opacity: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(2,6,23,0.85)',
        }}
        aria-hidden="true"
      >
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(1.5rem, 4vw, 3.5rem)', color: '#ffffff', textAlign: 'center', maxWidth: '700px', padding: '0 2rem' }}>
          Mais derrière l&apos;IA,{' '}
          <span style={{ background: 'linear-gradient(90deg,#00cfff,#0066ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            il y a nous.
          </span>
        </p>
      </div>

      {/* T5 — converging point of light */}
      <div
        ref={t5PointRef}
        style={{
          position: 'fixed', top: '50%', left: '50%', zIndex: 60, pointerEvents: 'none',
          width: '12px', height: '12px', marginTop: '-6px', marginLeft: '-6px',
          borderRadius: '50%', opacity: 0,
          background: 'radial-gradient(circle, #00cfff, #0066ff)',
          boxShadow: '0 0 30px #00cfff',
        }}
        aria-hidden="true"
      />

      {/* T2 pixel burst canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, zIndex: 59, pointerEvents: 'none', opacity: 0 }}
        aria-hidden="true"
      />
    </>
  );
}
