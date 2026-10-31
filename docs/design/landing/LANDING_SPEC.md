# Landing page Warko : brief d'implémentation

> Pour Claude Code. Source de vérité visuelle : `docs/design/landing/landing-design.dc.html`
> (export du canvas de design). C'est un format de maquette (`<x-dc>`, `{{holes}}`, `<sc-for>`, `<sc-if>`,
> classe `Component extends DCLogic`) : **ne pas le copier tel quel**. Le lire comme une spec et le
> réimplémenter proprement en Next.js 16 / React 19 / Tailwind 4, en respectant `CLAUDE.md`.

## Objectif
Remplacer `app/(landing)/page.tsx` par la nouvelle landing (PRD N1, US1). Mobile-first : la majorité des
visiteurs sont sur Android entrée de gamme en 4G. Tout le texte reste en français.

## Structure (dans cet ordre)
| # | Section | id | data-testid |
|---|---------|----|-------------|
| 0 | Header sticky (logo, liens, Se connecter, Essayer) | : | `landing-nav` |
| 1 | Hero + démo téléphone interactive | `hero` | `section-hero` |
| 2 | Problème (3 cartes) | `probleme` | `section-problem` |
| 3 | Solution (5 lignes « Vous dites → Warko ») | `solution` | `section-solution` |
| 4 | Comment ça marche (4 étapes) | `comment-ca-marche` | `section-how-it-works` |
| 5 | Le produit : showcase à onglets | `produit` | `section-product-showcase` |
| 6 | Fonctionnalités | `fonctionnalites` | `section-features` |
| 7 | Témoignage de Mondesire Abesse | `temoignage` | `section-testimonial` |
| 8 | Tarifs + toggle mensuel/annuel | `tarifs` | `section-pricing` |
| 9 | FAQ accordéon | `faq` | `section-faq` |
| 10 | CTA final | `cta-final` | `section-final-cta` |
| 11 | Footer | : | `landing-footer` |
| 12 | Barre CTA collante (mobile uniquement, `< md`) | : | `sticky-mobile-cta` |

## Découpage suggéré
`components/landing/` (le dossier existe, vide) :
- `landing-nav.tsx`, `hero.tsx`, `hero-demo.tsx` (client), `problem-section.tsx`, `solution-section.tsx`,
  `how-it-works.tsx`, `product-showcase.tsx` (client), `features-section.tsx`, `testimonial.tsx`,
  `pricing-section.tsx` (client), `faq-section.tsx` (client), `final-cta.tsx`, `landing-footer.tsx`,
  `sticky-mobile-cta.tsx`.
- Garder `page.tsx` en Server Component ; seuls les composants interactifs sont `'use client'`.
- Primitives : réutiliser `components/ui/` (Button, Badge, Card…) quand ça colle ; sinon même style « thin wrapper ».
  Pas de librairie de composants ni d'animation (pas de framer-motion) : CSS uniquement.

## Données : ne rien coder en dur qui existe déjà
- **Prix** : lire `PLANS` depuis `lib/billing/plans.ts` (+ `money()` de `components/billing/plan-cards.tsx`).
  L'économie annuelle = `monthly * 12 - yearly` (déjà la logique de `PlanCards`).
- **Prix barrés « prix de lancement »** (7 000 / 15 000 mensuel, 60 000 / 120 000 annuel dans le PRD) :
  vérifier s'ils existent dans `PLANS`. Sinon, ajouter un champ optionnel (ex. `launchCompareAt`) plutôt que
  de les écrire dans le JSX. Pro est mis en avant (« Recommandé »), en premier sur mobile.
- **Statuts de commande** (showcase + features) : `STATUS_LABELS` de `lib/constants.ts` ; couleurs alignées sur
  `STATUS_COLORS`.
- **Canaux** : `CHANNEL_LABELS`.
- Les données du showcase (clients, livreurs, montants) sont des **exemples statiques** dans un fichier
  `components/landing/showcase-data.ts`. Elles doivent rester cohérentes (Koffi : encaissé 96 000 − frais 8 000
  − reversé 60 000 = reste dû 28 000, etc. : voir la maquette). Mention « noms et montants d'exemple » visible.

## Interactions (état local React)
1. **Démo hero** : bouton « Enregistrer le reversement de Koffi » → reste dû 42 500 → 14 500,
   reversé 152 500 → 180 500, Koffi passe « Soldé », toast `role="status"`. « Revoir la démo » réinitialise.
2. **Showcase** : 3 onglets (`role="tablist"`) Tableau de bord / Commandes / Livraisons.
   Rotation auto toutes les 6 s avec barre de progression, **stoppée définitivement au premier clic** ;
   désactivée si `prefers-reduced-motion`. Onglet Commandes : chips de filtre par statut. Onglet Livraisons :
   chaque livreur dépliable (`aria-expanded`) pour voir « Commandes de la tournée ».
   Les écrans reproduisent `app/(app)/dashboard/page.tsx` et `components/deliveries/daily-delivery-balance.tsx`
   (mêmes libellés). Sidebar visible ≥ lg, bottom nav en dessous.
3. **Tarifs** : toggle Mensuel/Annuel avec pastille qui glisse ; prix qui fondent à chaque changement.
4. **FAQ** : accordéon, une question ouverte à la fois, la 1re ouverte par défaut. Réponses = maquette (issues du PRD).

## Micro-interactions (CSS, dans `globals.css` ou un module dédié)
Reprendre les keyframes de la maquette (`w-up`, `w-fade`, `w-float`, `w-pop`, `w-ping`, `w-grow`, `w-fill`,
`w-bump`, `w-progress`, `w-glow`, `w-nudge`) et les comportements :
- entrée en cascade du hero ; téléphone qui flotte ; point vert qui pulse ;
- boutons : `hover` lift −2 px + ombre, `active` scale .97, flèche qui glisse ;
- cartes : lift −4 px + ombre + bordure indigo ;
- liens nav : soulignement qui se déploie ;
- révélation au scroll via `animation-timeline: view()` sous `@supports` (pas de JS / IntersectionObserver
  obligatoire) ;
- **`@media (prefers-reduced-motion: reduce)` coupe tout.**
Garder les animations sur `transform`/`opacity` uniquement (perf mobile entrée de gamme).

## Design tokens
- Fond sombre `#0E1020`, surface sombre `#171A33`, bordure sombre `#2A2D4F`/`#34386A`
- Fond clair `#F6F6FA`, blanc, bordure `#E4E4EE`, texte `#12142A`, texte secondaire `#545873`
- Primaire indigo `#4F46E5` (hover `#4338CA`), indigo clair sur fond sombre `#A5B4FC`
- Accent montant dû `#FBBF24` (sur sombre) / `#B45309` (sur clair) ; soldé `#166534`
- Titres : **Bricolage Grotesque** 700/800 via `next/font/google` ; corps : Inter (déjà en place).
- Breakpoints : la maquette utilise des container queries à 720 px et 1040 px → en Tailwind, `md:` et `lg:`.
- Cibles tactiles ≥ 44 px, contrastes AA.

## Hooks de test et d'analytics (obligatoires)
- Conserver **tous** les `data-testid` de la maquette (grep `data-testid=` dans le fichier design).
  Principaux : `cta-hero-signup`, `cta-hero-product`, `nav-login`, `nav-signup`, `hero-demo-settle`,
  `hero-demo-reset`, `hero-demo-toast`, `showcase-tab-{dashboard|orders|deliveries}`,
  `showcase-filter-{statut}`, `showcase-driver-{id}`, `pricing-toggle-monthly|annual`,
  `pricing-plan-{decouverte|pro|business}`, `pricing-cta-{plan}`, `pricing-price-{pro|business}`,
  `faq-toggle-{n}`, `faq-answer-{n}`, `cta-final-signup`, `cta-sticky-signup`.
- Conserver `data-track` / `data-track-location` / `data-track-value` sur les CTA et contrôles
  (ex. `data-track="cta_signup" data-track-location="hero"`). Ajouter un petit helper
  `lib/analytics.ts` (`track(event, props)`) branché par délégation sur `[data-track]` : no-op tant qu'aucun
  outil analytics n'est choisi. But : mesurer la conversion landing → inscription (cible PRD > 8 %).
- Liens : `/auth/signup` (CTA), `/auth/signup?plan=pro|business|decouverte` (cartes tarifs), `/auth/login`.
  Vérifier que la page d'inscription lit `?plan=`.

## Tests à écrire (Vitest)
- `lib/__tests__/` : cohérence des données du showcase (reste dû = encaissé − frais − reversé ; total = somme).
- Tests composants (si Testing Library est dispo, sinon l'ajouter) : toggle tarifs change `pricing-price-pro`
  (5 000 ↔ 48 000) ; FAQ n'ouvre qu'une réponse ; démo hero passe à 14 500 puis se réinitialise ;
  clic sur un onglet stoppe la rotation.

## Critères d'acceptation
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` passent.
- Rendu correct à 360, 390, 768, 1280 px ; pas de scroll horizontal.
- Lighthouse mobile : pas de régression notable (images, polices `display: swap`).
- Les routes `(app)` et le middleware ne sont pas modifiés.

## Règles de cohérence validées après relecture

Ces décisions priment sur les anciennes valeurs encore présentes dans le HTML de référence.

- Découverte inclut **100 commandes/mois**, avec avertissement à **95**. Ne pas reprendre les anciennes mentions 30/25 de la maquette.
- Conserver le témoignage réel fourni pour **Mondesire Abesse**. Ne pas remettre le placeholder de citation, d’activité ou de ville.
- Aucun tiret cadratin, double tiret ou double underscore dans le texte visible. Utiliser un point médian, deux-points ou une phrase. Cela ne vise pas la syntaxe des variables CSS, commentaires ou attributs techniques.
- Supprimer les icônes décoratives des cartes, les puces fléchées de la solution et le pictogramme de citation. Conserver les icônes fonctionnelles : logo, états d’inclusion des tarifs, chevrons de FAQ/tournée et flèches des deux CTA principaux (hero et final).
- Les cartes Problème et Fonctionnalités commencent par des extraits d’interface cohérents, pas des carrés d’icônes. Les réponses de la solution commencent par « Avec Warko ».
- Cartes à 20 px, boutons à 12 px, chips rondes et titres de cartes à 18 px. La coque du téléphone et le logo gardent leur forme propre.
- Le hero dit « Reste dû », l’onglet dit « Livraisons », le badge Pro dit « Recommandé » et les CTA des trois offres disent « Essayer gratuitement ».
- Les trois offres ont six lignes chacune. Les fonctionnalités communes sont regroupées sous les offres : « Tableau de bord, catalogue, stock et dépenses inclus dans tous les plans. »
- Le hook hero secondaire est `cta-hero-product`, pas `cta-hero-how`.
- Awa S. est non assignée. Pour chaque tournée partiellement affichée, calculer le nombre d’autres commandes depuis les compteurs, sans coder ce nombre en dur.
- La notification du hero reste à l’intérieur du téléphone sur mobile.
- Le titre du graphique de démonstration utilise « Évolution des ventes · Cette semaine ». Cette révision reste limitée à la landing ; le dashboard authentifié n’est pas modifié.
