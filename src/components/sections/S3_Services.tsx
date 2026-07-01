'use client';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Mini-demo: App métier — barres de données qui se remplissent
function DemoApp() {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const bars = barsRef.current.filter(Boolean);
    gsap.set(bars, { scaleX: 0, transformOrigin: 'left center' });
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]; if (entry?.isIntersecting) {
        gsap.to(bars, { scaleX: 1, duration: 0.8, stagger: 0.15, ease: 'power2.out', delay: 0.3 });
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    if (barsRef.current[0]?.parentElement) observer.observe(barsRef.current[0].parentElement);
    return () => observer.disconnect();
  }, []);

  const data = [
    { label: 'Commandes', width: '85%', color: '#00cfff' },
    { label: 'Livraisons', width: '62%', color: '#0066ff' },
    { label: 'Facturation', width: '91%', color: '#00cfff' },
    { label: 'Stock', width: '44%', color: '#0066ff' },
  ];

  return (
    <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-red-400" />
        <div className="w-2 h-2 rounded-full bg-yellow-400" />
        <div className="w-2 h-2 rounded-full bg-green-400" />
        <span className="text-white/30 text-xs font-mono ml-1">dashboard.app</span>
      </div>
      {data.map((row, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-xs text-white/40 font-mono">
            <span>{row.label}</span><span>{row.width}</span>
          </div>
          <div className="h-1.5 rounded-full w-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              ref={(el) => { barsRef.current[i] = el; }}
              className="h-full rounded-full"
              style={{ width: row.width, background: row.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Mini-demo: Automatisation — étapes d'un workflow
function DemoWorkflow() {
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);
  const linesRef = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const steps = stepsRef.current.filter(Boolean);
    const lines = linesRef.current.filter(Boolean);
    gsap.set(steps, { opacity: 0, scale: 0.5 });
    gsap.set(lines, { scaleX: 0, transformOrigin: 'left center' });
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]; if (entry?.isIntersecting) {
        const tl = gsap.timeline({ delay: 0.3 });
        steps.forEach((s, i) => {
          tl.to(s, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.5)' });
          if (lines[i]) tl.to(lines[i], { scaleX: 1, duration: 0.3, ease: 'power2.out' }, '-=0.1');
        });
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    if (stepsRef.current[0]) observer.observe(stepsRef.current[0]);
    return () => observer.disconnect();
  }, []);

  const steps = ['Reçu', 'Traité', 'Validé', 'Envoyé'];
  return (
    <div className="p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)' }}>
      <div className="text-xs text-white/30 font-mono mb-4">workflow automatisé</div>
      <div className="flex items-center justify-between">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center">
            <div ref={(el) => { stepsRef.current[i] = el; }} className="flex flex-col items-center gap-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, #00cfff33, #0066ff33)', border: '1px solid #00cfff44', color: '#00cfff' }}
              >
                {i + 1}
              </div>
              <span className="text-white/40 text-xs">{step}</span>
            </div>
            {i < steps.length - 1 && (
              <div ref={(el) => { linesRef.current[i] = el; }} className="w-6 h-px mx-1 mb-4" style={{ background: '#00cfff66' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Mini-demo: Site internet — browser mockup animé
function DemoBrowser() {
  const linesRef = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const lines = linesRef.current.filter(Boolean);
    gsap.set(lines, { scaleX: 0, transformOrigin: 'left center' });
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]; if (entry?.isIntersecting) {
        gsap.to(lines, { scaleX: 1, duration: 0.5, stagger: 0.08, ease: 'power2.out', delay: 0.3 });
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    if (linesRef.current[0]) observer.observe(linesRef.current[0]);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-red-400" />
        <div className="w-2 h-2 rounded-full bg-yellow-400" />
        <div className="w-2 h-2 rounded-full bg-green-400" />
        <div className="flex-1 h-4 rounded-full ml-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full w-3/5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>
      </div>
      {/* Hero block */}
      <div className="h-10 rounded-lg mb-2" style={{ background: 'linear-gradient(135deg, #0066ff22, #00cfff11)' }}>
        <div ref={(el) => { linesRef.current[0] = el; }} className="h-2 w-2/3 rounded mx-auto mt-2" style={{ background: '#00cfff44' }} />
      </div>
      {/* Content lines */}
      {[0.8, 0.6, 0.9, 0.5].map((w, i) => (
        <div
          key={i}
          ref={(el) => { linesRef.current[i + 1] = el; }}
          className="h-1.5 rounded mb-1.5"
          style={{ width: `${w * 100}%`, background: 'rgba(255,255,255,0.12)' }}
        />
      ))}
    </div>
  );
}

const SERVICES = [
  {
    label: 'Application métier',
    title: 'Vos process, numérisés.',
    desc: 'On construit l\'outil qui colle à votre façon de travailler — pas l\'inverse.',
    demo: <DemoApp />,
    gradient: 'from-cyan/10 to-blue/5',
    border: 'border-cyan/20 hover:border-cyan/50',
    glow: 'rgba(0,207,255,0.12)',
  },
  {
    label: 'Automatisation',
    title: 'Moins de tâches, plus de valeur.',
    desc: 'Les actions répétitives disparaissent. Vos équipes se concentrent sur ce qui compte.',
    demo: <DemoWorkflow />,
    gradient: 'from-blue/10 to-cyan/5',
    border: 'border-blue/20 hover:border-blue/50',
    glow: 'rgba(0,102,255,0.12)',
  },
  {
    label: 'Site internet',
    title: 'Votre vitrine, sans compromis.',
    desc: 'Sites rapides, beaux et optimisés — conçus pour convertir, pas juste pour exister.',
    demo: <DemoBrowser />,
    gradient: 'from-cyan/10 to-blue/5',
    border: 'border-cyan/20 hover:border-cyan/50',
    glow: 'rgba(0,207,255,0.12)',
  },
];

export default function S3_Services(): JSX.Element {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title fade in
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: titleRef.current, start: 'top 80%' },
        }
      );

      // Cards Z-axis entrance
      cardsRef.current.filter(Boolean).forEach((card, i) => {
        gsap.fromTo(
          card,
          { opacity: 0, scale: 0.75, z: -120, rotateX: 8 },
          {
            opacity: 1, scale: 1, z: 0, rotateX: 0,
            duration: 0.9,
            delay: i * 0.15,
            ease: 'power3.out',
            scrollTrigger: { trigger: card, start: 'top 85%' },
          }
        );
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="services"
      className="relative py-32 px-6 overflow-hidden"
      aria-labelledby="services-title"
      style={{ perspective: '1000px' }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,102,255,0.12) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="max-w-6xl mx-auto">
        {/* Title */}
        <div ref={titleRef} className="text-center mb-20 opacity-0">
          <span className="text-xs font-mono tracking-widest text-cyan uppercase">Nos services</span>
          <h2
            id="services-title"
            className="mt-4 font-display font-bold text-4xl md:text-6xl text-white"
          >
            Ce que nous <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg,#00cfff,#0066ff)' }}>créons</span>
          </h2>
          <p className="mt-4 text-white/50 text-lg max-w-xl mx-auto">
            Des outils pensés pour votre métier, développés avec l&apos;IA agentique.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6" style={{ transformStyle: 'preserve-3d' }}>
          {SERVICES.map((svc, i) => (
            <div
              key={i}
              ref={(el) => { cardsRef.current[i] = el; }}
              className={`group relative p-6 rounded-2xl border ${svc.border} transition-all duration-500 cursor-default opacity-0`}
              style={{
                background: `linear-gradient(135deg, rgba(10,18,69,0.8), rgba(10,18,69,0.4))`,
                backdropFilter: 'blur(12px)',
                boxShadow: `0 0 0 transparent`,
              }}
              onMouseEnter={(e) => {
                gsap.to(e.currentTarget, { boxShadow: `0 0 40px ${svc.glow}`, duration: 0.3 });
              }}
              onMouseLeave={(e) => {
                gsap.to(e.currentTarget, { boxShadow: '0 0 0 transparent', duration: 0.3 });
              }}
            >
              {/* Label */}
              <span className="text-xs font-mono tracking-widest text-cyan/70 uppercase">{svc.label}</span>

              {/* Title */}
              <h3 className="mt-2 font-display font-bold text-xl text-white leading-tight">{svc.title}</h3>

              {/* Desc */}
              <p className="mt-2 text-sm text-white/50 leading-relaxed mb-5">{svc.desc}</p>

              {/* Mini demo */}
              {svc.demo}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
