import Link from 'next/link';

interface ButtonProps {
  href: string;
  variant?: 'primary' | 'outline';
  children: React.ReactNode;
}

export default function Button({ href, variant = 'primary', children }: ButtonProps): JSX.Element {
  const base = 'inline-flex items-center gap-2 px-6 py-3 rounded-lg font-display font-semibold text-sm transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan';
  const styles: Record<string, string> = {
    primary: 'bg-blue text-white hover:bg-blue/90 hover:shadow-[0_0_24px_rgba(0,102,255,0.5)]',
    outline: 'border border-white/30 text-white hover:border-cyan hover:text-cyan',
  };
  return (
    <Link href={href} className={`${base} ${styles[variant] ?? ''}`}>
      {children}
    </Link>
  );
}
