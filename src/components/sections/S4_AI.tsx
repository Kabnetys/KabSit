'use client';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const STATS = [
  { value: 60, suffix: '%', prefix: '-', label: 'Délais de livraison', color: '#00cfff' },
  { value: 40, suffix: '%', prefix: '-', label: 'Budget vs agence classique', color: '#0066ff' },
  { value: 3, suffix: 'x', prefix: '', label: 'Vitesse d\'itération', color: '#00cfff' },
];

const TERMINAL_LINES = [
  { text: '> Analyse du workflow métier...', delay: 0 },
  { text: '✓ Identification de 7 points d\'optimisation', delay: 0.6 },
  { text: '> Génération des composants UI...', delay: 1.2 },
  { text: '✓ 14 composants créés en 2.3s', delay: 1.9 },
  { text: '> Tests automatisés en cours...', delay: 2.5 },
  { text: '✓ 47/47 tests passés', delay: 3.1 },
  { text: '> Optimisation des performances...', delay: 3.7 },
  { text: '✓ Score Lighthouse : 98/100', delay: 4.3 },
  { text: '> Déploiement...', delay: 4.9 },
  { text: '✓ Application en ligne · 5.2s total', delay: 5.5 },
];

// Animated counter
function Counter({ value, prefix, suffix, color, active }: {
  value: number; prefix: string; suffix: string; color: string; active: boolean;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const duration = 1800;
    const raf = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [active, value]);

  return (
    <span style={{ color }} className="font-display font-bold text-5xl md:text-6xl tabular-nums">
      {prefix}{display}{suffix}
    </span>
  );
}

// Neural network canvas
function NeuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    // Generate nodes
    const nodes = Array.from({ length: 28 }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      pulse: Math.random(),
      pulseSpeed: 0.008 + Math.random() * 0.012,
      active: false,
      activationTime: 0,
    }));

    let frame = 0;
    let animId: number;

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, W(), H());

      // Random activation cascade
      if (frame % 40 === 0) {
        const idx = Math.floor(Math.random() * nodes.length);
        const srcNode = nodes[idx];
        if (!srcNode) return;
        srcNode.active = true;
        srcNode.activationTime = frame;
        // Propagate to nearby nodes
        nodes.forEach((n, i) => {
          if (i === idx) return;
          const dx = n.x - srcNode.x;
          const dy = n.y - srcNode.y;
          if (Math.sqrt(dx * dx + dy * dy) < 120) {
            setTimeout(() => { n.active = true; n.activationTime = frame; }, Math.random() * 400);
          }
        });
      }

      // Move nodes
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > W()) n.vx *= -1;
        if (n.y < 0 || n.y > H()) n.vy *= -1;
        n.pulse += n.pulseSpeed;
        // Deactivate after a while
        if (n.active && frame - n.activationTime > 80) n.active = false;
      });

      // Draw connections
      nodes.forEach((a, i) => {
        nodes.slice(i + 1).forEach((b) => {
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 130) return;
          const alpha = (1 - dist / 130) * 0.18;
          const isActive = a.active || b.active;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = isActive
            ? `rgba(0,207,255,${alpha * 3})`
            : `rgba(0,102,255,${alpha})`;
          ctx.lineWidth = isActive ? 1 : 0.5;
          ctx.stroke();
        });
      });

      // Draw nodes
      nodes.forEach((n) => {
        const pulse = (Math.sin(n.pulse) + 1) / 2;
        const r = n.active ? 4 + pulse * 3 : 2 + pulse;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = n.active ? `rgba(0,207,255,${0.6 + pulse * 0.4})` : `rgba(0,102,255,${0.2 + pulse * 0.2})`;
        ctx.fill();
        if (n.active) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 4, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0,207,255,${0.15 + pulse * 0.1})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.6 }}
      aria-hidden="true"
    />
  );
}

// Terminal component
function Terminal({ active }: { active: boolean }) {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);

  useEffect(() => {
    if (!active) return;
    setVisibleLines([]);
    const timers = TERMINAL_LINES.map((line, i) =>
      setTimeout(() => setVisibleLines((prev) => [...prev, i]), line.delay * 1000)
    );
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <div
      className="relative rounded-xl overflow-hidden font-mono text-xs"
      style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(0,207,255,0.2)' }}
    >
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <span className="ml-2 text-white/30 text-xs">kabnetys-agent · v2.1</span>
      </div>
      {/* Lines */}
      <div className="p-4 space-y-1.5 min-h-[200px]">
        {TERMINAL_LINES.map((line, i) => (
          <div
            key={i}
            className="transition-all duration-300"
            style={{
              opacity: visibleLines.includes(i) ? 1 : 0,
              transform: visibleLines.includes(i) ? 'translateY(0)' : 'translateY(6px)',
              color: line.text.startsWith('✓') ? '#00cfff' : 'rgba(255,255,255,0.5)',
            }}
          >
            {line.text}
          </div>
        ))}
        {/* Blinking cursor */}
        <span
          className="inline-block w-2 h-3 ml-0.5"
          style={{
            background: '#00cfff',
            animation: 'blink 1s step-end infinite',
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export default function S4_AI(): JSX.Element {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const [statsActive, setStatsActive] = useState(false);
  const [terminalActive, setTerminalActive] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title — words appear one by one
      const words = titleRef.current?.querySelectorAll('.word');
      if (words) {
        gsap.set(words, { opacity: 0, y: 20 });
        gsap.to(words, {
          opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out',
          scrollTrigger: { trigger: titleRef.current, start: 'top 75%', onEnter: () => setStatsActive(true) },
        });
      }

      // Stats block
      gsap.fromTo(statsRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: statsRef.current, start: 'top 80%' },
        }
      );

      // Terminal
      gsap.fromTo(terminalRef.current,
        { opacity: 0, x: 40 },
        {
          opacity: 1, x: 0, duration: 0.9, ease: 'power3.out',
          scrollTrigger: {
            trigger: terminalRef.current, start: 'top 80%',
            onEnter: () => setTerminalActive(true),
          },
        }
      );

      // Subtitle
      gsap.fromTo(subtitleRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: subtitleRef.current, start: 'top 85%' },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const titleWords = ['Développé', 'avec', "l'IA.", 'Livré', 'plus', 'vite.', 'Accessible', 'pour', 'tous.'];

  return (
    <section
      ref={sectionRef}
      id="ia-agentique"
      className="relative py-32 px-6 overflow-hidden"
      aria-labelledby="ai-title"
    >
      {/* Neural network background */}
      <div className="absolute inset-0" aria-hidden="true">
        <NeuralCanvas />
        {/* Dark overlay so content is readable */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 100% 100% at 50% 50%, rgba(2,6,23,0.55) 0%, rgba(2,6,23,0.85) 100%)' }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">

        {/* Label */}
        <div className="text-center mb-6">
          <span className="text-xs font-mono tracking-widest text-cyan uppercase px-3 py-1 rounded-full border border-cyan/20 bg-cyan/5">
            Notre différence
          </span>
        </div>

        {/* Title */}
        <div ref={titleRef} id="ai-title" className="text-center mb-16">
          <h2 className="font-display font-bold text-4xl md:text-6xl lg:text-7xl leading-tight text-white">
            {titleWords.map((word, i) => (
              <span key={i} className="word inline-block mr-[0.25em] opacity-0">
                {['avec', "l'IA."].includes(word)
                  ? <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg,#00cfff,#0066ff)' }}>{word}</span>
                  : word}
              </span>
            ))}
          </h2>
        </div>

        {/* Main content — stats + terminal */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Stats */}
          <div ref={statsRef} className="space-y-8 opacity-0">
            {STATS.map((stat, i) => (
              <div key={i} className="flex items-center gap-6">
                <div className="flex-shrink-0 w-32 text-right">
                  <Counter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} color={stat.color} active={statsActive} />
                </div>
                <div>
                  <div className="w-full h-px mb-2" style={{ background: `linear-gradient(90deg, ${stat.color}44, transparent)` }} />
                  <p className="text-white/50 text-sm">{stat.label}</p>
                </div>
              </div>
            ))}

            {/* Subtitle */}
            <p ref={subtitleRef} className="text-white/40 text-sm leading-relaxed pt-4 border-t border-white/5 opacity-0">
              L&apos;IA agentique nous permet de coder plus vite, sans sacrifier la qualité.
              Vous bénéficiez d&apos;outils professionnels au prix de l&apos;artisanat.
            </p>
          </div>

          {/* Terminal */}
          <div ref={terminalRef} className="opacity-0">
            <Terminal active={terminalActive} />
          </div>
        </div>
      </div>

      {/* Blink keyframe */}
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </section>
  );
}
