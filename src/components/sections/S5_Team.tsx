'use client';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';

gsap.registerPlugin(ScrollTrigger);

const MEMBERS = [
  {
    name: 'Anthony Bonjour',
    role: 'Co-fondateur · Infrastructure & Cybersécurité',
    image: '/images/anthony.jpg',
    quote: 'On construit des outils qui durent, pas des prototypes qu\'on abandonne.',
    skills: ['Réseau N1/N2', 'Cybersécurité', 'C#', 'SQL', 'Infrastructure SI'],
    side: 'left',
  },
  {
    name: 'Kyllian Bletrix',
    role: 'Co-fondateur · Développement & Data',
    image: '/images/kyllian.jpg',
    quote: 'L\'IA nous donne de la vitesse. L\'expérience nous donne la justesse.',
    skills: ['Laravel', 'C# / POO', 'SQL', 'Power BI', 'Git'],
    side: 'right',
  },
];

export default function S5_Team(): JSX.Element {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const photosRef = useRef<(HTMLDivElement | null)[]>([]);
  const infosRef = useRef<(HTMLDivElement | null)[]>([]);
  const skillsRef = useRef<(HTMLSpanElement | null)[][]>([[], []]);

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

      MEMBERS.forEach((member, i) => {
        const card = cardsRef.current[i];
        const photo = photosRef.current[i];
        const info = infosRef.current[i];
        const skills = skillsRef.current[i]?.filter(Boolean) ?? [];
        if (!card || !photo || !info) return;

        const fromX = member.side === 'left' ? -60 : 60;

        // Card entrance
        gsap.fromTo(card,
          { opacity: 0, x: fromX },
          {
            opacity: 1, x: 0, duration: 0.9, ease: 'power3.out',
            scrollTrigger: { trigger: card, start: 'top 80%' },
          }
        );

        // Photo: grayscale → color
        gsap.fromTo(photo,
          { filter: 'grayscale(100%) brightness(0.7)', scale: 1.05 },
          {
            filter: 'grayscale(0%) brightness(1)', scale: 1,
            duration: 1.2, ease: 'power2.out',
            scrollTrigger: { trigger: card, start: 'top 75%' },
          }
        );

        // Info slides up from behind photo
        gsap.fromTo(info,
          { opacity: 0, y: 24 },
          {
            opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', delay: 0.2,
            scrollTrigger: { trigger: card, start: 'top 75%' },
          }
        );

        // Skills fall one by one
        gsap.fromTo(skills,
          { opacity: 0, y: -16 },
          {
            opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'back.out(1.5)', delay: 0.4,
            scrollTrigger: { trigger: card, start: 'top 70%' },
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="team"
      className="relative py-32 px-6 overflow-hidden"
      aria-labelledby="team-title"
    >
      {/* Subtle background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(0,102,255,0.06) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="max-w-5xl mx-auto">

        {/* Title */}
        <div ref={titleRef} className="text-center mb-20 opacity-0">
          <span className="text-xs font-mono tracking-widest text-cyan uppercase">L&apos;équipe</span>
          <h2 id="team-title" className="mt-4 font-display font-bold text-4xl md:text-6xl text-white">
            Les humains <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg,#00cfff,#0066ff)' }}>derrière le code</span>
          </h2>
        </div>

        {/* Members */}
        <div className="grid md:grid-cols-2 gap-10">
          {MEMBERS.map((member, i) => (
            <div
              key={i}
              ref={(el) => { cardsRef.current[i] = el; }}
              className="group relative rounded-2xl overflow-hidden border border-white/8 hover:border-cyan/30 transition-colors duration-500 opacity-0"
              style={{ background: 'rgba(10,18,69,0.45)', backdropFilter: 'blur(12px)' }}
            >
              {/* Photo */}
              <div
                ref={(el) => { photosRef.current[i] = el; }}
                className="relative w-full aspect-[4/3] overflow-hidden"
              >
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                {/* Gradient over photo bottom */}
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(10,18,69,0.95) 0%, rgba(10,18,69,0.3) 40%, transparent 70%)' }}
                  aria-hidden="true"
                />
              </div>

              {/* Info overlaid on photo bottom + card body */}
              <div
                ref={(el) => { infosRef.current[i] = el; }}
                className="p-6 opacity-0"
              >
                <h3 className="font-display font-bold text-xl text-white">{member.name}</h3>
                <p className="text-cyan text-sm mt-1 font-mono">{member.role}</p>

                {/* Quote */}
                <blockquote className="mt-4 text-white/50 text-sm italic leading-relaxed border-l-2 border-cyan/30 pl-4">
                  &ldquo;{member.quote}&rdquo;
                </blockquote>

                {/* Skills */}
                <div className="flex flex-wrap gap-2 mt-5">
                  {member.skills.map((skill, j) => (
                    <span
                      key={j}
                      ref={(el) => {
                        if (!skillsRef.current[i]) skillsRef.current[i] = [];
                        skillsRef.current[i]![j] = el;
                      }}
                      className="text-xs px-3 py-1 rounded-full border border-white/10 text-white/50 font-mono opacity-0 hover:border-cyan/30 hover:text-white/70 transition-colors duration-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
