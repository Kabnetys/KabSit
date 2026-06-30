'use client';

import { useState, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function SectionContact(): JSX.Element {
  const t = useTranslations('contact');
  const locale = useLocale();
  const [status, setStatus] = useState<Status>('idle');
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setStatus('loading');
    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.get('name'), email: data.get('email'), company: data.get('company'), message: data.get('message'), locale }),
      });
      if (res.ok) { setStatus('success'); formRef.current?.reset(); }
      else setStatus('error');
    } catch { setStatus('error'); }
  };

  const inputClass = 'w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:border-blue transition-colors duration-200 text-sm';

  return (
    <section id="contact" className="relative py-32 px-6" aria-labelledby="contact-title">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-mono tracking-widest text-cyan uppercase">{t('label')}</span>
          <h2 id="contact-title" className="mt-4 font-display font-bold text-4xl md:text-5xl text-white">{t('title')}</h2>
        </div>
        {status === 'success' ? (
          <div role="alert" className="text-center py-12 text-cyan font-display text-xl">{t('success')}</div>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact-name" className="sr-only">{t('fields.name')}</label>
                <input id="contact-name" name="name" type="text" required placeholder={t('fields.name')} className={inputClass} maxLength={100} autoComplete="name" />
              </div>
              <div>
                <label htmlFor="contact-email" className="sr-only">{t('fields.email')}</label>
                <input id="contact-email" name="email" type="email" required placeholder={t('fields.email')} className={inputClass} maxLength={200} autoComplete="email" />
              </div>
            </div>
            <div>
              <label htmlFor="contact-company" className="sr-only">{t('fields.company')}</label>
              <input id="contact-company" name="company" type="text" placeholder={t('fields.company')} className={inputClass} maxLength={100} autoComplete="organization" />
            </div>
            <div>
              <label htmlFor="contact-message" className="sr-only">{t('fields.message')}</label>
              <textarea id="contact-message" name="message" required rows={5} placeholder={t('fields.message')} className={`${inputClass} resize-none`} maxLength={2000} />
            </div>
            {status === 'error' && (
              <p role="alert" className="text-red-400 text-sm">Une erreur est survenue. Réessayez ou écrivez à <a href="mailto:contact@kabnetys.fr" className="underline">contact@kabnetys.fr</a></p>
            )}
            <button type="submit" disabled={status === 'loading'} className="w-full py-4 rounded-lg font-display font-semibold text-white bg-blue hover:bg-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-[0_0_24px_rgba(0,102,255,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan">
              {status === 'loading' ? '…' : t('fields.submit')}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
