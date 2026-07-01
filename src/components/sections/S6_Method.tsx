'use client';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    num: '01',
    title: 'Comprendre',
    desc: 'On part de votre métier, pas d\'un cahier des charges. Une heure ensemble suffit à tout changer.',
    icon: '◎',
  },
  {
    num: '02',
    title: 'Prototyper',
    desc: 'Une première version fonctionnelle en 2 semaines. Pas de tunnel, pas de surprise.',
    icon: '⬡',
  },
  {
    num: '03',
    title: 'Itérer',
    desc: 'Vous testez, on ajuste. Chaque retour fait avancer le produit dans la bonne direction.',
    icon: '↻',
  },
  {
    num: '04',
    title: 'Livrer',
    desc: 'Votre outil, entre vos mains. On reste disponibles pour faire évoluer avec vous.',
    icon: '✦',
  },
];

export default function S6_Method(): JSX.Element {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const lineTrackRef = useRef<HTMLDivElement>(null);
  const lineFillRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);
  const numsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const dotsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {

      // Title
      gsap.fromTo(titleRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: titleRef.current, start: 'top 80%' },
        }
      );

      // Line fill — scrub from 0% to 100% as section scrolls
      gsap.fromTo(lineFillRef.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 60%',
            end: 'bottom 60%',
            scrub: 0.8,
          },
        }
      );

      // Steps slide in from right + dots activate
      stepsRef.current.filter(Boolean).forEach((step, i) => {
        const dot = dotsRef.current[i];
        const num = numsRef.current[i];

        gsap.fromTo(step,
          { opacity: 0, x: 50 },
          {
            opacity: 1, x: 0, duration: 0.7, ease: 'power3.out',
            scrollTrigger: { trigger: step, start: 'top 78%' },
          }
        );

        // Dot pulse when step enters
        if (dot) {
          gsap.fromTo(dot,
            { scale: 0, backgroundColor: 'rgba(0,102,255,0.3)' },
            {
              scale: 1, backgroundColor: '#00cfff',
              duration: 0.5, ease: 'back.out(2)',
              scrollTrigger: { trigger: step, start: 'top 78%' },
            }
          );
        }

        // Number count up
        if (num) {
          gsap.fromTo(num,
            { opacity: 0, y: 20 },
            {
              opacity: 1, y: 0, duration: 0.5, delay: 0.15, ease: 'power2.out',
              scrollTrigger: { trigger: step, start: 'top 78%' },
            }
          );
        }
      });

    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="methode"
      className="relative py-32 px-6 overflow-hidden"
      aria-labelledby="method-title"
    >
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(0,207,255,0.05) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="max-w-4xl mx-auto">

        {/* Title */}
        <div ref={titleRef} className="text-center mb-20 opacity-0">
          <span className="text-xs font-mono tracking-widest text-cyan uppercase">Comment on travaille</span>
          <h2 id="method-title" className="mt-4 font-display font-bold text-4xl md:text-6xl text-white">
            Simple.{' '}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg,#00cfff,#0066ff)' }}>
              Efficace.
            </span>
          </h2>
        </div>

        {/* Timeline */}
        <div className="relative flex">

          {/* Vertical line track */}
          <div className="relative flex-shrink-0 w-12 flex justify-center" aria-hidden="true">
            {/* Background track */}
            <div
              ref={lineTrackRef}
              className="absolute top-2 bottom-2 w-px"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            />
            {/* Animated fill */}
            <div
              ref={lineFillRef}
              className="absolute top-2 w-px origin-top"
              style={{
                height: 'calc(100% - 1rem)',
                background: 'linear-gradient(to bottom, #00cfff, #0066ff)',
                boxShadow: '0 0 8px rgba(0,207,255,0.6)',
                transform: 'scaleY(0)',
              }}
            />
          </div>

          {/* Steps */}
          <div className="flex-1 space-y-16 pl-4">
            {STEPS.map((step, i) => (
              <div
                key={i}
                ref={(el) => { stepsRef.current[i] = el; }}
                className="relative flex items-start gap-6 opacity-0"
              >
                {/* Dot on the line */}
                <div
                  ref={(el) => { dotsRef.current[i] = el; }}
                  className="absolute -left-[52px] top-1 w-4 h-4 rounded-full border-2 border-cyan flex-shrink-0"
                  style={{
                    backgroundColor: 'rgba(0,102,255,0.3)',
                    borderColor: '#00cfff',
                    boxShadow: '0 0 12px rgba(0,207,255,0.4)',
                  }}
                  aria-hidden="true"
                />

                <div className="flex-1">
                  {/* Number */}
                  <span
                    ref={(el) => { numsRef.current[i] = el; }}
                    className="block font-display font-bold text-6xl md:text-7xl leading-none opacity-0 select-none"
                    style={{ color: 'rgba(255,255,255,0.06)' }}
                    aria-hidden="true"
                  >
                    {step.num}
                  </span>

                  {/* Icon + title */}
                  <div className="flex items-center gap-3 -mt-6 mb-3">
                    <span className="text-cyan text-xl" aria-hidden="true">{step.icon}</span>
                    <h3 className="font-display font-bold text-2xl text-white">{step.title}</h3>
                  </div>

                  {/* Description */}
                  <p className="text-white/50 leading-relaxed max-w-lg">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
