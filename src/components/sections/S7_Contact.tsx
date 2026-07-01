'use client';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const CONTACT_INFO = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
    label: 'Email',
    value: 'contact@kabnetys.fr',
    href: 'mailto:contact@kabnetys.fr',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    label: 'Localisation',
    value: 'École-Valentin, Bourgogne-Franche-Comté',
    href: null,
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
      </svg>
    ),
    label: 'LinkedIn',
    value: 'KabNetys',
    href: 'https://linkedin.com/company/kabnetys',
  },
];

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function S7_Contact(): JSX.Element {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const fieldsRef = useRef<(HTMLDivElement | null)[]>([]);
  const btnRef = useRef<HTMLButtonElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(titleRef.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: titleRef.current, start: 'top 80%' },
        }
      );

      gsap.fromTo(infoRef.current,
        { opacity: 0, x: -40 },
        {
          opacity: 1, x: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: infoRef.current, start: 'top 80%' },
        }
      );

      fieldsRef.current.filter(Boolean).forEach((field, i) => {
        gsap.fromTo(field,
          { opacity: 0, y: 30 },
          {
            opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: i * 0.12,
            scrollTrigger: { trigger: field, start: 'top 88%' },
          }
        );
      });

      gsap.fromTo(btnRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: 0.4,
          scrollTrigger: { trigger: btnRef.current, start: 'top 92%' },
        }
      );

      // Pulse on button
      gsap.to(btnRef.current, {
        boxShadow: '0 0 24px rgba(0,207,255,0.5)',
        duration: 1.4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus('success');
        setForm({ name: '', email: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
    setTimeout(() => setStatus('idle'), 5000);
  };

  const inputClass = 'w-full bg-transparent text-white placeholder-white/25 py-3 border-b border-white/15 focus:border-cyan/60 focus:outline-none transition-colors duration-300 text-base';

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="relative py-32 px-6 overflow-hidden min-h-screen flex items-center"
      aria-labelledby="contact-title"
    >
      {/* Particle-like dots background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-px h-px rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: i % 3 === 0 ? '#00cfff' : '#0066ff',
              opacity: 0.15 + Math.random() * 0.2,
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              animation: `pulse ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
        <div style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 100%, rgba(0,102,255,0.1) 0%, transparent 70%)' }} className="absolute inset-0" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto w-full">

        {/* Title */}
        <div ref={titleRef} className="text-center mb-16 opacity-0">
          <span className="text-xs font-mono tracking-widest text-cyan uppercase">Contact</span>
          <h2 id="contact-title" className="mt-4 font-display font-bold text-4xl md:text-6xl lg:text-7xl text-white">
            Votre projet{' '}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg,#00cfff,#0066ff)' }}>
              commence ici.
            </span>
          </h2>
          <p className="mt-4 text-white/40 text-lg">Une idée suffit. On s&apos;occupe du reste.</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-16 items-start">

          {/* Contact info */}
          <div ref={infoRef} className="lg:col-span-2 space-y-8 opacity-0">
            {CONTACT_INFO.map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-cyan"
                  style={{ background: 'rgba(0,207,255,0.08)', border: '1px solid rgba(0,207,255,0.15)' }}>
                  {item.icon}
                </div>
                <div>
                  <p className="text-white/30 text-xs font-mono uppercase tracking-widest mb-1">{item.label}</p>
                  {item.href ? (
                    <a href={item.href} className="text-white/70 hover:text-cyan transition-colors duration-300 text-sm">
                      {item.value}
                    </a>
                  ) : (
                    <p className="text-white/70 text-sm">{item.value}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Availability badge */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
              <span className="text-white/40 text-sm">Disponibles pour de nouveaux projets</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-8">
            {[
              { key: 'name', label: 'Votre nom', type: 'text', placeholder: 'Jean Dupont', idx: 0 },
              { key: 'email', label: 'Votre email', type: 'email', placeholder: 'jean@exemple.fr', idx: 1 },
            ].map(({ key, label, type, placeholder, idx }) => (
              <div
                key={key}
                ref={(el) => { fieldsRef.current[idx] = el; }}
                className="opacity-0"
              >
                <label className="block text-white/30 text-xs font-mono uppercase tracking-widest mb-2">
                  {label}
                </label>
                <input
                  type={type}
                  required
                  placeholder={placeholder}
                  value={form[key as 'name' | 'email']}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className={inputClass}
                />
              </div>
            ))}

            <div
              ref={(el) => { fieldsRef.current[2] = el; }}
              className="opacity-0"
            >
              <label className="block text-white/30 text-xs font-mono uppercase tracking-widest mb-2">
                Votre message
              </label>
              <textarea
                required
                rows={4}
                placeholder="Décrivez votre projet en quelques lignes…"
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* Submit */}
            <div>
              <button
                ref={btnRef}
                type="submit"
                disabled={status === 'loading' || status === 'success'}
                className="relative px-8 py-4 rounded-xl font-display font-semibold text-sm tracking-wide transition-all duration-300 disabled:cursor-not-allowed opacity-0"
                style={{
                  background: status === 'success'
                    ? 'linear-gradient(135deg, #00cfff, #0066ff)'
                    : 'linear-gradient(135deg, rgba(0,207,255,0.15), rgba(0,102,255,0.15))',
                  border: '1px solid rgba(0,207,255,0.4)',
                  color: status === 'success' ? '#000' : '#fff',
                }}
              >
                {status === 'idle' && 'Envoyer le message →'}
                {status === 'loading' && (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-cyan/40 border-t-cyan rounded-full animate-spin" />
                    Envoi en cours…
                  </span>
                )}
                {status === 'success' && '✓ Message envoyé !'}
                {status === 'error' && 'Erreur — réessayez'}
              </button>

              {status === 'error' && (
                <p className="mt-3 text-red-400/70 text-sm">
                  Une erreur s&apos;est produite. Écrivez-nous directement à contact@kabnetys.fr
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
