# Nouvelle landing Warko — plan d’implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Attendre la validation du propriétaire avant toute implémentation.

**Goal:** Remplacer la landing par une implémentation fidèle de la maquette, responsive et interactive, avec Découverte à 100 commandes/mois.

**Architecture:** Page Server Component composée de sections dans `components/landing/`. Îlots client limités à la démo, au showcase, aux tarifs, à la FAQ et à la délégation analytics. Données d’exemple typées, montants numériques et calculs partagés entre démo et showcase.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, CSS Modules, Vitest et Testing Library déjà installée. Aucune bibliothèque UI/animation supplémentaire.

**Spec:** `docs/design/landing/LANDING_SPEC.md`, puis `docs/design/landing/landing-design.dc.html`, source visuelle. La demande ultérieure du propriétaire remplace 30 par **100 commandes/mois**.

## Contraintes

- Mobile-first, texte français, tous les `data-testid`, `data-track`, `data-track-location`, `data-track-value` conservés, y compris les variantes issues des boucles de la maquette.
- Ne pas copier le runtime `<x-dc>`, les `{{holes}}`, `DCLogic` ou `support.js` dans le produit.
- Respecter l’ordre des sections et les identifiants d’ancrage du brief.
- Garder `app/(landing)/page.tsx` côté serveur ; aucun changement des routes `(app)` ou de `proxy.ts`.
- Aucune migration existante réécrite. Le changement de quota 100 est une nouvelle migration additive remplaçant la fonction de contrôle existante.
- Pas de commit, push ou déploiement dans cette tâche sans demande explicite.
- La validation demandée porte sur ce plan complet ; l’exécution se fera ensuite section par section, avec des points d’avancement.

## Constats et décisions proposées

1. `PLANS` contient les prix courants mais aucun prix de comparaison. Ajouter des métadonnées optionnelles `launchCompareAt: { monthly, yearly }` : Pro 7 000 / 60 000, Business 15 000 / 120 000. Découverte reste à 0. Les montants réellement facturés restent inchangés.
2. `PLANS.discovery.ordersPerMonth` vaut actuellement 30 et la base applique également 30. Les deux passent à 100. Garder une alerte cinq commandes avant le plafond, donc dès 95, sauf préférence différente du propriétaire.
3. Le brief dit qu’Inter est déjà en place, mais le dépôt ne définit qu’une famille CSS de repli. Charger Inter et Bricolage Grotesque via `next/font/google`, `display: swap`, uniquement dans le layout public de la landing.
4. La page `/auth/signup` existe mais ignore `?plan=`. Lire et valider `decouverte|pro|business`, mapper `decouverte` vers l’identifiant interne `discovery`, et afficher l’offre choisie dans le formulaire. Cette intention ne donne aucun droit payant et ne déclenche aucun paiement.
5. Le témoignage fourni est un placeholder. Le conserver explicitement comme tel pour respecter la maquette ; ne pas inventer de citation, de nom ou de résultat client.
6. Les détails de tournée de la maquette ne montrent qu’un extrait des commandes alors que les compteurs portent sur toute la tournée. Conserver les exemples visibles et signaler l’extrait, sans faire passer deux commandes pour une tournée complète de huit. Dériver tous les totaux financiers des données numériques.
7. Les effets `w-glow` et le soulignement de navigation animent des propriétés coûteuses dans la maquette. Reproduire leur aspect avec pseudo-éléments animés en opacité/transform ; couper animations, transitions et rotation automatique avec `prefers-reduced-motion`.

## Fichiers

### Assemblage et styles

- Modifier `app/(landing)/page.tsx` : composition ordonnée des sections.
- Modifier `app/(landing)/layout.tsx` : polices publiques locales au groupe et métadonnées utiles.
- Créer `components/landing/landing.module.css` : tokens, animations, révélation progressive sous `@supports`, focus, reduced motion, décalage des ancres et espace pour le CTA mobile.
- Créer `components/landing/landing-icons.tsx` : petits SVG partagés, décoratifs avec `aria-hidden`.

### Sections

- `landing-nav.tsx` : header sticky, liens d’ancrage, connexion et inscription.
- `hero.tsx` et `hero-demo.tsx` (client) : accroche, CTA, téléphone et démonstration du reversement.
- `problem-section.tsx`, `solution-section.tsx`, `how-it-works.tsx` : trois problèmes, cinq correspondances, quatre étapes.
- `product-showcase.tsx` (client), `showcase-dashboard.tsx`, `showcase-orders.tsx`, `showcase-deliveries.tsx` : onglets, cadre produit, écrans et interactions internes.
- `showcase-data.ts` : exemples typés, montants numériques, constantes et agrégations de démonstration.
- `features-section.tsx`, `testimonial.tsx` : fonctionnalités et placeholder explicite.
- `pricing-section.tsx` (client) : bascule et cartes tarifaires propres à la maquette ; réutiliser `PLANS` et `money()`, sans modifier l’interface d’abonnement existante.
- `faq-section.tsx` (client) : huit questions, première ouverte au chargement, une seule réponse ouverte à la fois.
- `final-cta.tsx`, `landing-footer.tsx`, `sticky-mobile-cta.tsx` : fin de page et barre mobile sous `md`.
- `landing-tracking.tsx` (client) et `lib/analytics.ts` : un listener délégué, `track(event, props)` sans fournisseur actif et sans données personnelles.

### Tarifs, quota et inscription

- Modifier `lib/billing/plans.ts` : plafond 100 et prix barrés optionnels.
- Modifier `lib/billing/access.ts`, `components/billing/billing-usage-banner.tsx` : messages cohérents, plafond lu depuis le catalogue, alerte à 95.
- Ajouter `supabase/migrations/20261029170008_discovery_100_orders.sql` : quota transactionnel de 100 ; conserver les plafonds utilisateurs/livreurs, le verrou d’organisation, les compteurs et les autres plans.
- Modifier `app/auth/signup/page.tsx` et `components/auth/auth-form.tsx` : prise en compte sûre de `?plan=` avec les conventions Next.js 16.
- Actualiser `docs/saas-setup.md` et le bundle SQL manuel afin qu’une installation neuve et une base ayant déjà reçu les neuf migrations aient une procédure claire. Ne pas modifier le brief ni le HTML de référence ; documenter la décision du propriétaire dans le plan.

### Tests ciblés (dans `lib/__tests__/`)

- `landing-data.test.ts` : cohérence des exemples et agrégations.
- `landing-sections.test.tsx` : structure, textes, ancres et inventaire des hooks.
- `landing-hero-demo.test.tsx` : reversement simulé et reset.
- `landing-showcase.test.tsx` : onglets, timers, reduced motion, filtres et livreurs.
- `landing-pricing-faq.test.tsx` : prix, cycle, ordre des offres et accordéon.
- `landing-tracking.test.tsx` : délégation et no-op analytics.
- Compléter `signup-page.test.tsx`, `billing-database.test.ts`, `billing-ui.test.tsx` et les tests existants dépendants du plafond 30.

## Ordre d’exécution après validation

### 1. Catalogue et quota — tests puis implémentation

- [x] Tester les prix courants inchangés, prix barrés, économies annuelles, plafond et alerte Découverte.
- [x] Observer les échecs attendus, puis ajouter les métadonnées de prix et la nouvelle migration.
- [x] Tester en SQL la 100e commande acceptée, la 101e refusée, la réservation annulée après échec et la conservation des commandes existantes.
- [x] Mettre à jour les tests dépendant de l’ancien plafond, sans changer l’historique Pro de 30 jours.

### 2. Structure visuelle, header et hero

- [x] Tester les hooks et liens, l’ordre initial et les valeurs de la démo.
- [x] Créer polices, styles et composants du header/hero ; les utiliser dans la page serveur.
- [x] Tester 42 500 → 14 500, 152 500 → 180 500, Koffi soldé, toast `role="status"` et réinitialisation sans effet réel sur les comptes.
- [x] Comparer le rendu à la maquette sur mobile avant la section suivante.

### 3. Problème, solution et quatre étapes

- [x] Vérifier les hooks, textes et cinq correspondances puis implémenter les sections.
- [x] Reprendre palette, espacements, typographie, icônes et grilles responsive de la maquette.

### 4. Showcase produit

- [x] Tester les invariants : Koffi 96 000 − 8 000 − 60 000 = 28 000 ; total encaissé 214 000 ; frais 19 000 ; attendu 195 000 ; reversé 152 500 ; reste 42 500.
- [x] Construire les trois écrans avec `STATUS_LABELS`, `STATUS_COLORS` et `CHANNEL_LABELS`.
- [x] Tester rotation à 6 secondes, arrêt définitif au premier choix manuel, absence de rotation en reduced motion et nettoyage du timer.
- [x] Tester filtrage des commandes, ouverture des livreurs et navigation clavier des onglets (`aria-selected`, `aria-controls`, panneaux associés).
- [x] Afficher sidebar à partir de `lg`, navigation basse en dessous, et mention visible « noms et montants d’exemple ».

### 5. Fonctionnalités et témoignage

- [x] Construire les six cartes et les blocs rôles/mobile avec les huit hooks `feature-*`.
- [x] Reproduire le placeholder de témoignage, clairement signalé, et conserver ses deux hooks.

### 6. Tarifs, FAQ, CTA et footer

- [x] Tester puis implémenter les prix mensuels/annuels depuis `PLANS`, les prix barrés, les économies, la bascule glissante et le fondu.
- [x] Afficher Pro en premier sur mobile et au centre du tableau desktop, avec les hooks `decouverte` conservés malgré l’identifiant interne `discovery`.
- [x] Tester la FAQ (première ouverte, exclusivité, fermeture, ARIA) puis la construire avec les réponses fournies et le nouveau plafond 100.
- [x] Ajouter les CTA, footer et barre mobile sans masquer le contenu ni les contrôles.
- [x] Tester le paramètre d’offre à l’inscription (valide/invalide/absent), sans modifier les droits ni lancer de paiement.

### 7. Tracking, revue et validation finale

- [x] Inventorier et vérifier tous les hooks de la maquette, en développant les clés dynamiques des onglets, filtres, livreurs et FAQ.
- [x] Tester un seul appel analytics par clic, y compris sur l’icône d’un CTA, et l’absence d’effets réseau sans fournisseur.
- [x] Actualiser les tests de l’ancienne landing qui contredisent la nouvelle maquette.
- [x] Contrôler visuellement 360, 390, 768 et 1280 px, absence de défilement horizontal, contraste, focus, cibles tactiles ≥ 44 px et reduced motion.
- [x] Vérifier les performances mobile en build de production ; mesurer Lighthouse si l’outil est disponible, sans annoncer un score non mesuré.
- [x] Exécuter `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.

## Points de vigilance de la revue

- Un visiteur avec reduced motion doit lire tous les contenus sans animation ni rotation automatique.
- Un clic manuel doit garder le même onglet même après plusieurs périodes de six secondes.
- Les prix barrés sont une présentation commerciale, jamais un montant de facturation.
- Un paramètre `plan` modifié dans l’URL ne peut pas activer une offre.
- Une base ayant déjà appliqué les neuf migrations précédentes reçoit uniquement la nouvelle migration de quota ; ne pas lui faire rejouer le bundle complet.

## Validation du 29 octobre 2026

- `npm run lint`, `npx tsc --noEmit`, `npm test` et `npm run build` : succès. Suite complète : 397 tests, 81 fichiers.
- Tous les hooks de la maquette vérifiés sur les états interactifs ; navigation clavier et reduced motion testées.
- Contrôles responsive à 360, 390, 768 et 1280 px : largeur du document égale à la largeur disponible, aucun défilement horizontal de la page. Les onglets gardent leur défilement interne comme dans la maquette.
- Recette navigateur en production : reversement/reset, filtre de commandes, prix annuel, Pro en premier sur mobile et arrivée sur `/auth/signup?plan=pro` avec offre affichée.
- Lighthouse 12.8.2, profil mobile par défaut, compilation de production locale : performance **97/100**, accessibilité **100/100**, FCP 1,1 s, LCP 2,4 s, TBT 70 ms, CLS 0. Ce relevé local n’est pas une mesure de l’hébergement public ni une comparaison avec une ancienne version.
- Revue indépendante : arrêt de l’autoplay au focus clavier ajouté après test de régression RED→GREEN. Aucun autre point important relevé dans le périmètre revu.
- Les liens publics ne préchargent pas les formulaires authentifiés/inscription ; polices auto-hébergées via Next Font.
- Bundle SQL complet et mise à jour isolée du quota exécutés dans PGlite : succès, sans accès distant.
- Aucun changement des routes `(app)` ou de `proxy.ts`. Aucun commit, push ou déploiement.
- Témoignage placeholder conservé explicitement ; analytics sans fournisseur actif, donc aucun envoi.

### Mise en service du plafond

Si les neuf migrations SaaS ont déjà été exécutées, appliquer uniquement `docs/deployment/2026-10-29-discovery-100-orders.sql`. Sinon, le bundle complet inclut désormais les dix migrations. Le code de présentation ne suffit pas à changer le quota d’une base distante ; la nouvelle migration reste à appliquer sur cette base.
