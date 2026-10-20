# Warko

Warko est une application de gestion commerciale en français destinée aux vendeurs sociaux. Elle centralise produits, lots de stock, commandes, livreurs, reversements et analyses, avec isolation stricte entre boutiques.

## Fonctionnalités

- Commandes multicanales avec statuts et instantané des prix/coûts
- Stock par lots et consommation FIFO transactionnelle
- Gestion des livreurs, colis en circulation, taux de réussite et reversements
- Analyse du chiffre d’affaires et de la rentabilité par période
- Comptes administrateur/employé avec masquage des données de coût
- Export clients par produit, canal, période et statut en Excel ou CSV
- Remises par ligne avec motif obligatoire, auteur et date
- Bons de commande A4, tickets 58/80 mm et PDF avec logo de boutique
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
NEXT_PUBLIC_SUPPORT_WHATSAPP=
```

La clé `SUPABASE_SERVICE_ROLE_KEY` est strictement serveur et ne doit jamais être exposée avec un préfixe `NEXT_PUBLIC_`.
Le numéro WhatsApp doit être fourni au format international, par exemple `2250700000000`, sans être inscrit dans Git.

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

### Export clients

Les administrateurs peuvent ouvrir **Exporter les clients** dans **Commandes** ou depuis une fiche produit (y compris archivée). L’export possède ses propres filtres : commandes livrées et tout l’historique par défaut. Les dates sélectionnent la date de commande.

Après **Préparer la liste**, les compteurs indiquent les clients exportables, les commandes sans téléphone exploitable et les doublons regroupés. Une ligne correspond à un téléphone normalisé. Les numéros mobiles ivoiriens locaux sont préfixés par `225` ; pour les autres pays, les numéros doivent contenir leur indicatif international.

Les filtres produit et canal peuvent être combinés (par exemple : acheteurs d’un parfum via Facebook). Les fichiers Excel et CSV contiennent le nom, le téléphone, les produits et les canaux des commandes sélectionnées, avec une ligne par téléphone. Excel contient aussi le nombre de commandes et les dates de première/dernière commande. Le CSV utilise les colonnes `name`, `phone`, `products`, `channels`. L’import et la création des audiences se font ensuite dans l’outil publicitaire.

### Remises et documents

À la création d’une commande ou dans **Remises par produit** sur son détail, les administrateurs et employés peuvent appliquer une remise en FCFA ou en pourcentage. Le montant fixe est déduit du total de la ligne, et non de chaque unité. Un motif est obligatoire pour toute remise positive. Le serveur calcule le montant, enregistre l’auteur et la date, refuse les remises excessives et verrouille leur modification après livraison ou annulation, même si le statut de livraison est ensuite corrigé.

Les prix et coûts historiques restent conservés. Le total net de ligne alimente les rapports, bénéfices et reversements. Les frais de livraison ne sont pas remisés. Une remise ne peut pas rendre le montant total inférieur au dépôt déjà payé.

Dans **Mon compte**, un administrateur peut importer, remplacer ou retirer le logo de sa boutique : PNG ou JPEG, 2 Mo maximum. Les images sont vérifiées puis normalisées en PNG. Les logos sont publics, les écritures passent uniquement par l’API administrateur. Chaque boutique utilise son propre dossier de stockage.

Sur le détail d’une commande, **Imprimer** ouvre le choix **A4**, **Ticket 58 mm** ou **Ticket 80 mm**, puis **Imprimer** ou **Télécharger PDF**. Les documents affichent le logo actuel de la boutique, les produits, remises, motifs et montants à payer, sans les coûts d’achat. Les tickets sont en noir et blanc et leur hauteur PDF s’adapte au contenu ; les longues commandes A4 sont paginées.

L’impression utilise les imprimantes disponibles dans le système. Sur mobile, le PDF peut être enregistré et ouvert dans une application compatible avec l’imprimante. La connexion directe Bluetooth/USB à toutes les imprimantes n’est pas intégrée.

### Mise en service des remises et du logo

Appliquer **avant le déploiement applicatif** la migration `supabase/migrations/20261020181247_order_discounts_and_branding.sql`, qui ajoute les champs, fonctions transactionnelles, contrôles de dépôt et le bucket `organization-logos`. Utiliser le SQL Editor Supabase avec le contenu complet du fichier, ou le workflow de migration de l’environnement. Aucune conversion des anciennes commandes en remises n’est effectuée.

Les dépendances `pdf-lib`, `@pdf-lib/fontkit` et `sharp` sont requises côté serveur. La police Noto Sans et sa licence sont incluses dans `assets/fonts/` et dans la trace de déploiement du générateur PDF. Les tests PostgreSQL utilisent PGlite localement et ne se connectent pas à la base de production.

### Organisation du code

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
