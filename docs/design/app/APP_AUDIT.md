# Audit UI de l'app Warko + page Abonnement premium

> Pour Claude Code. Deux parties : (A) corrections d'incohérences dans toute l'app, (B) refonte de la page
> `/subscription` en version « premium or ». Maquette : `docs/design/app/abonnement-design.dc.html`
> (format de design, à réimplémenter en React/Tailwind, ne pas copier tel quel). Respecter `CLAUDE.md`.

## A. Incohérences à corriger dans l'app

### A1. Tirets cadratins visibles (aucun « — », « -- » ou « __ » dans l'interface)
| Fichier | Actuel | Remplacer par |
|---|---|---|
| `app/(app)/dashboard/page.tsx` | `Évolution des ventes — {periodLabel}` | `Évolution des ventes · {periodLabel}` |
| `app/(app)/dashboard/page.tsx` | objectif vide affiché `'—'` | ne rien afficher (le texte « Aucun objectif défini » suffit) |
| `app/(app)/orders/[id]/page.tsx` | fallbacks `'—'` (vendeur, live) | `Non renseigné` / `Aucun` |
| `app/(app)/orders/[id]/page.tsx` | `Non renseignée — à compléter…` | `Non renseignée. À compléter pour le bilan quotidien.` |
| `app/(app)/reports/page.tsx` | `{start} — {end}` (2 endroits), `'—'` | `du {start} au {end}`, `Sans nom` |
| `components/onboarding/wizard.tsx` | `Étape {step} / 3 — {label}` | `Étape {step} sur 3 · {label}` |
| `components/layout/sidebar.tsx` | `'—'` (nom, rôle) | squelette de chargement, comme dans la sidebar desktop |
| `components/products/product-table.tsx` | marge `'—'` (mode offres) | `Selon l’offre` |
| `app/layout.tsx`, `app/admin/layout.tsx` | `Warko — …` | `Warko · Gestion commerciale`, `Warko · Administration` |
| `app/admin/*` | `'—'`, `— paiements de test` | `Non renseigné`, `(paiements de test)` |
Les commentaires de code avec « — » peuvent rester, seuls les textes affichés comptent.

### A2. Pseudo-icônes en caractères et emoji
Remplacer par un seul jeu d'icônes SVG au trait, **même style que la sidebar** (Heroicons outline, `strokeWidth 1.8`),
via un petit composant `components/ui/icon.tsx` (`chevron-left`, `chevron-right`, `chevron-down`, `check`, `x`, `logout`).
- `← Retour`, bouton `←` seul (produits, commandes) → `chevron-left` + texte « Retour » (jamais une flèche seule sans `aria-label`).
- `Définir l’objectif →`, `Ouvrir mon tableau de bord →`, `Suivant →`, `← Précédent`, `← Sessions` → texte seul, ou chevron SVG.
- `Déconnexion →` (sidebar, admin-shell) → icône `logout` ou texte seul.
- `period-selector.tsx` : `{from} → {to}` → `du {from} au {to}`.
- `checklist.tsx` : caractères `✓` / `○` → pastille ronde (remplie + `check` SVG si fait, cercle vide sinon).
- `daily-delivery-balance.tsx` : `▴` / `▾` → `chevron-down` qui pivote (`rotate-180`, `transition-transform`).
- `reset-password/page.tsx` : emoji `✅` → pastille verte + `check` SVG.
- `order-form.tsx`, `printer-picker.tsx` : `✕` → `x` SVG avec `aria-label`.

### A3. Texte
- `dashboard/page.tsx` : « Toutes statuts confondus » → « Tous statuts confondus ».
- Feature list de `plan-cards.tsx` : phrases construites par morceaux (« Nombre illimité de livreur(s) »)
  → libellés complets par plan (voir maquette : « Livreurs illimités », « 5 livreurs », « 1 livreur »).
  La ligne « Catalogue, stock et dépenses inclus » n'apparaît que sur Découverte alors que c'est vrai pour tous
  → la sortir des cartes : « Catalogue, stock et dépenses inclus dans tous les plans ».

### A4. Incohérence métier à trancher (ne pas corriger sans validation d'Ismael)
- `lib/billing/plans.ts` : `discovery.ordersPerMonth: 100`, alors que le PRD, la landing, la bannière et la FAQ
  disent **30 commandes/mois**. Demander lequel est juste avant de toucher.

### A5. Navigation
- La sidebar utilise l'icône `receipt` pour **Dépenses et Abonnement** → donner à Abonnement une icône distincte
  (carte bancaire ou médaille, Heroicons outline).
- Barre du bas mobile : 10 entrées qui défilent horizontalement, une partie est invisible.
  → 4 entrées principales + « Plus » (feuille avec le reste : Analyses, Dépenses, Objectifs & lives, Bilans,
  Équipe, Abonnement, Support, Mon compte). Pour le responsable livraisons, garder seulement ses entrées.
- Marque : sidebar « WARKO » en petites capitales indigo, barre mobile « Warko » en gras indigo, aucune des deux
  n'utilise le logo `app/icon.svg`. Utiliser le logo (24 px) + « Warko » aux deux endroits.

### A6. Composants
- `plan-cards.tsx` et `subscription-view.tsx` utilisent des styles de la landing sombre
  (`border-gray-500/30`, `bg-indigo-500/10`, boutons `underline`) au lieu de `Card` et `Button` de `components/ui`.
- `Button` taille `md` = environ 36 px de haut : sous la cible tactile de 44 px pour une app mobile-first.
  Ajouter `min-h-11` aux tailles `md` et `lg` (ou au moins sur mobile).
- Deux helpers de montant : `money()` (plan-cards) et `formatAmount` / `formatCurrency` (`lib/utils`).
  Garder ceux de `lib/utils` et supprimer `money()`.

## B. Page Abonnement premium (`/subscription`)

**Principe : l'or est réservé à cette page** (et au badge du lien « Abonnement » dans la navigation quand le plan
est payant). Le reste de l'app reste indigo. Le plan Découverte garde un style neutre, avec un seul bouton or
« Passer à Pro » pour donner envie.

### Tokens or (à ajouter dans `globals.css` via `@theme`)
| Token | Valeur | Usage |
|---|---|---|
| `--color-gold-ink` | `#17140D` | fond de la carte membre, texte sur bouton or |
| `--color-gold-edge` | `#4A3D1A` / `#5A4A1E` | bordures sur fond sombre |
| `--color-gold` | `#C9A227` | boutons, badge « Plan actuel », barres d'usage |
| `--color-gold-hover` | `#B8921F` | survol bouton |
| `--color-gold-soft` | `#F1DC97` | texte or clair sur fond sombre |
| `--color-gold-muted` | `#A8996F` / `#BFA35A` | libellés sur fond sombre |
| `--color-gold-cream` | `#FBF7EA` / bordure `#EADBA8` | bloc « Inclus dans votre plan » |
| `--color-gold-text` | `#7A5C0F` / `#4A3A0E` | liens et textes or sur fond clair (contraste AA) |
Nom du plan en dégradé « feuille d'or » : `linear-gradient(120deg,#F7E7B4,#E2C063 35%,#B88A1E 60%,#F1DC97)` en
`background-clip: text`. Vérifier le mode sombre (`data-warko-theme="dark"`) : la carte membre est déjà sombre,
le bloc crème passe en `#241E10` avec texte `#F1DC97`.

### Structure (de haut en bas)
1. Titre « Abonnement et paiements » + sous-titre.
2. Alerte selon l'état : `grace` (fond ambre, bouton or « Payer 5 000 FCFA »), `cancelAtPeriodEnd`
   (bouton contour or « Conserver Pro »), retour de paiement `?invoice=` (garder le bloc existant, restylé).
3. **Carte membre** (plan payant) : fond `gold-ink`, « WARKO » en petites capitales, nom du plan en feuille d'or,
   badge d'état (Actif / Délai de grâce / Arrêt prévu), boutique, facturation, prochain renouvellement (ou date de
   fin), montant ; boutons « Passer à Business » (si Pro) et « Dernier reçu PDF ».
   Version Découverte : carte blanche neutre, texte d'incitation, bouton or « Passer à Pro · 5 000 FCFA/mois ».
4. **Consommation du mois** : une barre par limite (`usage` / `limits`), or si payant, indigo si gratuit, ambre à
   partir de la limite − 5 pour les commandes (règle US5), « Illimité » quand la limite est `null`.
5. **Inclus dans votre plan** (payant seulement) : liste avec coches or, tirée de `PLANS`.
6. **Changer de plan** : toggle Mensuel / Annuel · −20 %, 3 cartes. Carte du plan actuel : bordure or 2 px +
   badge « Plan actuel » ; bouton « Renouveler » sombre. Plans supérieurs : bouton or « Passer à … ».
   Plans inférieurs : pas de bouton, note « Disponible à l’échéance » (renvoie à la section 7). Prix barrés
   via `PLANS[x].launchCompareAt`, économie annuelle = `monthly * 12 - yearly`.
7. **Gérer mon abonnement** (payant + `canManageBilling`) : deux blocs avec vrais `Button` secondaires
   (« Arrêter le renouvellement », « Passer à … à l’échéance ») au lieu des liens soulignés actuels.
8. **Historique des paiements** : tableau sur desktop, lignes empilées sur mobile ; badge d'état coloré
   (Payé vert, En attente ambre, Bloqué / Expiré gris, Annulé / remboursé rouge) ; « Reçu PDF » ou « Vérifier ».
Non-propriétaire : masquer 2, 7, 8 et les boutons ; afficher « Seul le propriétaire peut gérer l’abonnement ».

### Micro-interactions
Reflet doré qui balaie la carte membre au survol, carte qui se soulève, barres d'usage qui se remplissent au
chargement, badge « Plan actuel » qui pulse doucement, boutons qui se soulèvent et s'enfoncent.
Tout coupé sous `prefers-reduced-motion`.

### Hooks de test
`subscription-page`, `subscription-current-plan`, `subscription-usage-{orders|drivers|users}`,
`subscription-benefits`, `subscription-plans`, `subscription-plan-{discovery|pro|business}`,
`subscription-choose-{plan}`, `subscription-cycle-{monthly|yearly}`, `subscription-manage`, `subscription-cancel`,
`subscription-resume`, `subscription-downgrade`, `subscription-payments`, `subscription-payment-row`,
`subscription-receipt`, `subscription-reconcile`, `subscription-grace-alert`, `subscription-grace-pay`,
`subscription-upgrade-{pro|business}`.

### Tests (Vitest)
- La couleur or n'est utilisée que si `plan !== 'discovery'` (snapshot de classes ou test de rendu).
- Barre d'usage : ambre à `limit - 5` commandes, « Illimité » si `null`.
- Plans inférieurs sans bouton, plan actuel avec « Renouveler ».
- Non-propriétaire : aucune action de facturation rendue.

## Critères d'acceptation
`npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` passent. Aucun « — », « → », « ← », « ✓ », « ✕ »,
emoji dans les textes affichés (`grep` sur `app/` et `components/` hors commentaires). Rendu vérifié à 390 et
1280 px, en thème clair et sombre.

## C. Écrans mobiles de référence (maquettes dans ce dossier)
| Maquette | Page | Ce qui change |
|---|---|---|
| `AppTopBar.dc.html` | barre du haut mobile (`sidebar.tsx`) | logo + « Warko » + nom de la boutique, avatar 40 px |
| `AppBottomNav.dc.html` | barre du bas mobile | 4 entrées + « Plus », icônes actuelles de la sidebar, indicateur actif en haut |
| `App-Plus.dc.html` | nouvelle page `/more` (ou feuille) | entrées groupées (Pilotage, Boutique, Aide), icône carte bancaire pour Abonnement + badge or du plan, choix du thème, Déconnexion |
| `App-Dashboard.dc.html` | `/dashboard` | checklist avec pastilles (plus de ✓ / ○) + barre de progression + CTA ; export en bouton icône 44 px ; périodes en chips défilantes ; 4 KPI de même style ; les 3 cartes de statut fusionnées en une liste ; « Tous statuts confondus » ; titre du graphique avec « · » |
| `App-Livraisons.dc.html` | `/deliveries` | Aujourd’hui / Hier / date sur une ligne en 44 px ; total en tête avec 4 compteurs ; chaque livreur = carte dont l’en-tête entier ouvre le détail (chevron SVG qui pivote, plus de ▾ ▴) ; reste dû visible fermé ; bouton « Enregistrer un reversement » par livreur |
| `App-Commande.dc.html` | `/orders/[id]` | « ‹ Commandes » au lieu d’un « ← » seul ; titre + badge, puis Imprimer / Modifier sur leur propre ligne (fini les 4 éléments serrés) ; changement de statut en 4 boutons ; « Non renseigné » / « Aucune » au lieu de « — » ; date de tournée manquante = note ambre avec lien « Renseigner » |
| `abonnement-design.dc.html` | `/subscription` | cartes de plan nettement séparées : fond blanc, bandeau « Votre plan actuel » (noir et or si payant, indigo si gratuit), prix aligné à droite du nom, avantages en 2 colonnes avec coches or, note en pointillés pour les plans inférieurs, sélecteur Mensuel / Annuel pleine largeur en 44 px |

## Décisions produit confirmées après cet audit

- Découverte reste à **100 commandes/mois**, avec avertissement à **95**. Le point A4 a été tranché par le propriétaire ; ne pas revenir à 30.
- Les **sessions live sont incluses dans toutes les offres**, y compris Découverte. Les retirer des différences entre les cartes et les mentionner dans la ligne des fonctionnalités communes. La migration `20261029170009_live_sessions_all_plans.sql` retire uniquement les restrictions liées au plan ; les contrôles de rôle, boutique, session active et quota de commandes restent en place.
