# KabNetys — Site Web

Next.js 14 · Three.js WebGL · FR/EN/ES · TypeScript strict · Tailwind CSS

## Stack
- **Framework**: Next.js 14.2 App Router
- **Language**: TypeScript 5 (strict)
- **3D/WebGL**: Three.js r148 — circuit-board background + interactive app mockup
- **i18n**: next-intl 3.x (Français / English / Español)
- **Styles**: Tailwind CSS 3.4 + CSS custom properties
- **Animations**: Framer Motion 11
- **Testing**: Vitest + Playwright
- **Deploy**: Vercel

## Setup
```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint       # ESLint
npm test           # Vitest unit tests
```

## Images à remplacer
Déposer les fichiers réels dans `public/images/` :
- `logo.png` — Logo KabNetys (fond transparent, ~400×110px)
- `anthony.jpg` — Photo Anthony Bonjour (carré, min 400×400px)
- `kyllian.jpg` — Photo Kyllian Bletrix (carré, min 400×400px)

## Sections
1. **Hero** — Headline animé + 2 CTAs + indicateur scroll
2. **Services** — 3 cartes avec icônes SVG et effet glow
3. **Méthode** — Timeline 4 étapes
4. **App Mockup** — Maquette 3D interactive (Three.js)
5. **Équipe** — 2 cartes fondateurs avec photos
6. **Contact** — Formulaire validé côté serveur

## Déploiement Vercel
1. Connecter le repo sur vercel.com
2. Framework: Next.js — pas de config supplémentaire requise
3. Variable d'env à ajouter plus tard: `RESEND_API_KEY` (pour l'envoi réel des emails)
