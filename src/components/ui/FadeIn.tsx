'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export default function FadeIn({ children, delay = 0, className, direction = 'up' }: FadeInProps): JSX.Element {
  const prefersReduced = useReducedMotion();

  const offset = 32;
  const initial = prefersReduced
    ? { opacity: 0 }
    : {
        opacity: 0,
        y: direction === 'up' ? offset : direction === 'down' ? -offset : 0,
        x: direction === 'left' ? offset : direction === 'right' ? -offset : 0,
      };

  return (
    <motion.div
      className={className}
      initial={initial}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
