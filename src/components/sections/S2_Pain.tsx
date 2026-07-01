'use client';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const PHRASES = [
  'Excel pour gérer vos commandes.',
  'WhatsApp pour coordonner vos équipes.',
  'Un dossier partagé pour vos devis.',
  'Ça fonctionne… mais ça vous coûte du temps chaque jour.',
];

export default function S2_Pain(): JSX.Element {
  const sectionRef = useRef<HTMLDivElement>(null);
  const phrasesRef = useRef<(HTMLParagraphElement | null)[]>([]);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const phrases = phrasesRef.current.filter(Boolean);
      // Hide all phrases initially
      gsap.set(phrases, { opacity: 0, y: 40 });
      gsap.set(overlayRef.current, { opacity: 0 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=250%',
          scrub: false,
          pin: true,
          anticipatePin: 1,
          onEnter: () => tl.play(),
          onLeaveBack: () => {
            tl.pause(0);
            gsap.set(phrasesRef.current.filter(Boolean), { opacity: 0, y: 40 });
          },
        },
      });

      PHRASES.forEach((_, i) => {
        const el = phrasesRef.current[i];
        if (!el) return;
        const isLast = i === PHRASES.length - 1;

        tl.to(el, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' })
          .to(el, {
            x: isLast ? 0 : 3,
            duration: 0.07,
            repeat: isLast ? 0 : 5,
            yoyo: true,
            ease: 'none',
          })
          .to({}, { duration: isLast ? 1.2 : 0.7 });

        if (i < PHRASES.length - 1) {
          tl.to(el, { opacity: 0, y: -30, duration: 0.35, ease: 'power2.in' });
        }
      });

      const lastEl = phrasesRef.current[PHRASES.length - 1];
      tl.to(lastEl ?? {}, { opacity: 0, y: -60, duration: 0.5, ease: 'power2.in' }, '+=0.3').to(overlayRef.current, {
        opacity: 1,
        duration: 0.4,
        ease: 'power2.inOut',
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={sectionRef} className="relative w-full h-screen overflow-hidden flex items-center justify-center">
      {/* Alert background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(180,30,30,0.12) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Phrases */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {PHRASES.map((phrase, i) => (
          <p
            key={i}
            ref={(el) => { phrasesRef.current[i] = el; }}
            className={`absolute left-1/2 -translate-x-1/2 w-full font-display font-bold leading-tight ${
              i === PHRASES.length - 1
                ? 'text-3xl md:text-5xl text-white/90'
                : 'text-2xl md:text-4xl text-white/70'
            }`}
            style={{ top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            {i === PHRASES.length - 1 ? (
              <>
                <span className="text-white/50">Ça fonctionne… </span>
                <span className="text-white">mais ça vous coûte du temps chaque jour.</span>
              </>
            ) : (
              <>
                <span className="inline-block px-3 py-1 rounded mr-2 text-sm font-mono text-red-400/80 border border-red-400/20 bg-red-400/5 align-middle">
                  ✗
                </span>
                {phrase}
              </>
            )}
          </p>
        ))}
      </div>

      {/* Blue flash overlay for transition out */}
      <div
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none z-20"
        style={{ background: 'linear-gradient(135deg, #0a1245 0%, #0066ff22 100%)', opacity: 0 }}
        aria-hidden="true"
      />
    </div>
  );
}
