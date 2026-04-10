# Goalkeeper Academy

Site vitrine + plateforme membres pour Goalkeeper Academy (Chablais Valais, Suisse).
Stack : Next.js 14 (App Router) · TypeScript · Tailwind CSS · next-intl · Supabase · MDX.

## 🚀 Getting started (local dev)

```bash
pnpm install
cp .env.example .env.local      # puis remplir les valeurs Supabase
pnpm dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

> ⚠️ Ne jamais lancer `pnpm build` pendant que `pnpm dev` tourne — cela corrompt
> les vendor-chunks de `.next/`. Pour valider la compilation TS, utiliser
> `pnpm exec tsc --noEmit`.

## 📁 Structure clé

```
src/
├── app/[locale]/          # routes localisées (FR/EN)
│   ├── (public)           # pages vitrine
│   ├── mon-compte/        # espace membre (Phase 6)
│   ├── stages/[slug]/     # détail stage + checkout (Phase 7, démo visuelle)
│   └── admin/             # back-office (Phase 8)
├── components/            # blocks, forms, ui (shadcn)
├── lib/                   # supabase, auth, account, admin, reservation
├── i18n/                  # routing + locales fr/en
└── types/database.ts      # types DB hand-maintained (mirror SQL)
content/blog/{fr,en}/      # articles MDX
supabase/migrations/       # schémas + RLS
```

## 🔐 Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Project Settings → API → copier :
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable key** (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. SQL Editor → coller et exécuter dans l'ordre :
   - `supabase/migrations/0001_profiles.sql`
   - `supabase/migrations/0002_phase6_tables.sql`
4. Authentication → URL Configuration → ajouter dans **Redirect URLs** :
   - `http://localhost:3000/auth/callback`
   - `https://goalkeeperacademy.ch/auth/callback`
5. Pour passer un compte en admin, lancer dans le SQL Editor :
   ```sql
   update public.profiles set role = 'admin' where email = 'votre@email.ch';
   ```

## 🌐 Déploiement Vercel

1. **Push** le repo GitHub.
2. Sur [vercel.com/new](https://vercel.com/new) → importer le projet → framework
   `Next.js` détecté automatiquement.
3. **Environment Variables** (Production + Preview) :

   | Clé                              | Valeur                                              |
   | -------------------------------- | --------------------------------------------------- |
   | `NEXT_PUBLIC_SITE_URL`           | `https://goalkeeperacademy.ch`                      |
   | `NEXT_PUBLIC_SUPABASE_URL`       | `https://xxx.supabase.co`                           |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | `sb_publishable_xxx`                                |

4. **Domaines** :
   - Ajouter `goalkeeperacademy.ch` (apex) + `www.goalkeeperacademy.ch`
   - Ajouter `gardien-de-but.ch` → Vercel l'aliase automatiquement avec une
     redirection 308 vers le domaine principal (configurable dans
     Settings → Domains de l'autre projet ou via `redirect to` dans la fiche
     domaine).
5. **Preview deployments** : automatiques sur chaque PR.

## 🛡️ Sécurité

Tous les headers HTTP sont définis dans `next.config.mjs` :

- `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`
- `Referrer-Policy`, `Permissions-Policy`
- `Content-Security-Policy` autorisant Supabase (`*.supabase.co`),
  Unsplash/Pexels/Cloudinary pour les images, et OpenStreetMap pour la carte
  contact

Le RLS Supabase est activé sur **toutes** les tables (`profiles`, `children`,
`invoices`, etc.). Les politiques sont définies dans les migrations SQL.

## 🌍 i18n

- Locales : `fr` (défaut), `en`
- Préfixe URL toujours présent : `/fr/...`, `/en/...`
- Fichiers de traduction : `src/i18n/locales/{fr,en}.json`
- Pathnames localisés : voir `src/i18n/routing.ts`

## 📦 Stack

- **Next.js 14.2** App Router · React 18.3
- **TypeScript** strict + `noUncheckedIndexedAccess`
- **Tailwind CSS v3** + design tokens (navy, orange)
- **next-intl v4** pour i18n + routing
- **Supabase** (`@supabase/supabase-js` + `@supabase/ssr`)
- **MDX** via `next-mdx-remote/rsc` pour le blog
- **shadcn/ui** (legacy CLI) + `lucide-react`
- **react-hook-form** + `zod` pour les formulaires
- **react-dom** `useFormState` + `useFormStatus` (React 18)

## 🚧 Phases

| Phase | Sujet                              | Statut |
| ----- | ---------------------------------- | ------ |
| 1     | Setup Next.js + Tailwind + i18n    | ✅     |
| 2     | Layout, header, footer, accueil    | ✅     |
| 3     | Pages vitrine + SEO + sitemap      | ✅     |
| 4     | Blog MDX + RSS                     | ✅     |
| 5     | Auth Supabase magic-link           | ✅     |
| 6     | Espace membre (profil, gardiens)   | ✅     |
| 7     | Réservation stages (visuel démo)   | ✅     |
| 8     | Espace admin                       | ✅     |
| 9     | Déploiement + headers + .env       | ✅     |
| 10    | Tests E2E Playwright + polish      | ⏳     |
