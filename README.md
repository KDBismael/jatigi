# Jatigi

Jatigi est une application de gestion commerciale en français destinée aux vendeurs sociaux. Elle centralise produits, lots de stock, commandes, livreurs, reversements et analyses, avec isolation stricte entre boutiques.

## Fonctionnalités

- Commandes multicanales avec statuts et instantané des prix/coûts
- Stock par lots et consommation FIFO transactionnelle
- Gestion des livreurs, colis en circulation, taux de réussite et reversements
- Analyse du chiffre d’affaires et de la rentabilité par période
- Comptes administrateur/employé avec masquage des données de coût
- Multi-tenant sécurisé par organisation et RLS Supabase

## Stack

- Next.js 16 App Router, React 19 et TypeScript
- Supabase Auth/Postgres/RLS
- Tailwind CSS 4
- Zustand 5
- React Hook Form et Zod 4
- Vitest

## Installation

```bash
npm install
cp .env.local.example .env.local
```

Renseigner ensuite :

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

La clé `SUPABASE_SERVICE_ROLE_KEY` est strictement serveur et ne doit jamais être exposée avec un préfixe `NEXT_PUBLIC_`.

Appliquer les migrations de `supabase/migrations/` dans leur ordre numérique, puis lancer :

```bash
npm run dev
```

## Vérifications

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## Architecture

```text
app/          pages et Route Handlers
components/   interface et primitives UI
hooks/        chargement et mutations côté client
services/     accès Supabase côté serveur
stores/       état client Zustand
lib/          schémas, calculs purs et constantes
supabase/     migrations, RLS et fonctions transactionnelles
```

Les routes API authentifient toujours l’utilisateur. Les services utilisant la clé de service doivent en plus filtrer explicitement par `organization_id`. Les coûts de stock ne sont jamais modifiés directement sur un produit : ils proviennent des lots d’approvisionnement.
