# Interface de l’app Warko : plan d’implémentation

> **For agentic workers:** utiliser superpowers:executing-plans, avec TDD simple. **La demande du propriétaire impose une pause après chaque étape : attendre sa validation avant de commencer la suivante.** Ne pas appliquer l’exécution continue habituelle du skill.

**Goal:** Harmoniser l’application mobile et desktop, ses barres partagées et trois écrans métier, puis refaire Abonnement en premium or.

**Architecture:** Réutiliser les APIs, les hooks de données et les composants UI existants. Extraire les icônes, les définitions de navigation et les blocs de présentation, sans modifier les calculs financiers ni les autorisations côté serveur. Une seule lecture partagée de l’abonnement alimente page, bannières et badges.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, TypeScript, Zustand existant, Vitest et Testing Library. Aucune nouvelle bibliothèque de composants ou d’animation.

**Spec:** `docs/design/app/APP_AUDIT.md`, `abonnement-design.dc.html`, `AppTopBar.dc.html`, `AppBottomNav.dc.html`, `App-Plus.dc.html`, `App-Dashboard.dc.html`, `App-Livraisons.dc.html`, `App-Commande.dc.html`. Ces fichiers sont des références visuelles, pas du code à importer.

## Contraintes et décisions proposées

- Plan uniquement tant qu’il n’est pas validé. Aucun changement applicatif pendant la préparation.
- Ordre : A → C/barres → C/dashboard → C/livraisons → C/commande → B/abonnement. **Six points de vérification**, un à la fin de chaque étape.
- **A4 confirmé par le propriétaire** : Découverte reste à 100 commandes/mois, alerte à 95. Ne modifier ni ce quota ni les compteurs ni les migrations de quota dans ces étapes. Afficher les limites renvoyées par le catalogue et l’API.
- Conserver les changements de landing déjà présents dans le workspace. Pas de refonte de la landing dans cette tâche. Le seul ajustement nécessaire est mécanique : remplacer ses imports de `money()` lors de la consolidation du formatage.
- Supprimer les glyphes décoratifs et emoji dans les textes applicatifs affichés, pas dans les commentaires, variables CSS ou identifiants techniques. Inclure les métadonnées et les messages d’authentification concernés.
- SVG au trait `strokeWidth=1.8`, sans dépendance Heroicons à installer ; noms typés, SVG décoratifs `aria-hidden`, boutons icône avec nom accessible.
- Cibles tactiles des boutons au moins 44 px, y compris les variantes compactes. Avatar visuel 40 px dans une cible interactive d’au moins 44 px.
- Les maquettes utilisent des données d’exemple : conserver les données réelles de la boutique. Ne pas copier noms, dates, soldes ni compteurs de démonstration dans l’application.
- Aucun changement Moneriz, SQL, FIFO, remises, calcul des reversements ou droits API. Le client ne devient jamais l’autorité sur l’offre active ou le solde dû.
- Les thèmes utilisent le `ThemeProvider` et `data-warko-theme` existants. Pas de deuxième système de thème.
- Les tokens or nécessaires au badge sont déclarés lors de l’étape 2 ; l’habillage de la page attend l’étape 6. Cela évite des couleurs dupliquées en dur entre badge et page.
- Or limité à `/subscription` et au badge d’offre du lien Abonnement. Les autres écrans et états actifs restent indigo.
- Découverte reste neutre, **avec l’exception explicitement demandée du CTA or « Passer à Pro »**. Le test de non-utilisation d’or pour Découverte portera sur son habillage et ses barres, sans contredire cette exception.
- Renouvellement = nouveau paiement confirmé à l’échéance. Les nouveaux textes ne doivent pas promettre de prélèvement automatique.
- Pas de commit, push ou déploiement sans demande explicite.

## Étape 1 : partie A, corrections transversales

### Créer

- `components/ui/icon.tsx` : icônes partagées, reprenant les tracés existants de la sidebar et les contrôles requis ; ajouter `credit-card` pour distinguer Abonnement de Dépenses.
- `components/layout/brand.tsx` : rendu du logo existant `app/icon.svg`, avec nom et taille accessibles. Réutilisation dans les barres et l’administration.
- `lib/billing/plan-presentation.ts` : libellés complets et avantages dérivés de `PLANS`, réutilisables par les cartes d’abonnement.

### Modifier et déplacer

- `components/ui/button.tsx` : minimum 44 px, focus et états désactivés conservés.
- `components/layout/sidebar.tsx`, `components/admin/admin-shell.tsx` : déplacer leurs tracés SVG vers `Icon`, remplacer les glyphes de déconnexion, afficher le logo ; garder la navigation actuelle jusqu’à l’étape 2.
- `components/billing/plan-cards.tsx`, `subscription-view.tsx` : libellés complets, avantages communs sortis des cartes ; remplacer `money()` par `formatAmount` / `formatCurrency`. Dès A, utiliser les vrais `Card`/`Button` pour la présentation existante ; l’habillage premium attend l’étape 6.
- Supprimer `lib/billing/money.ts` et la réexportation de `money`. Remplacer les imports concernés dans les composants de landing, sans changer leur structure ou leur design. Préserver le format français et les tests malgré les espaces insécables.
- Nettoyer les textes ciblés dans `app/(app)/dashboard/page.tsx`, `orders/[id]/page.tsx`, `products/[id]/page.tsx`, `pilotage/[id]/page.tsx`, `reports/page.tsx`.
- Nettoyer `app/layout.tsx`, `app/admin/layout.tsx`, les pages `app/admin/`, `app/auth/forgot-password/page.tsx`, `app/auth/reset-password/page.tsx` et `components/auth/auth-form.tsx` si le texte affiché est concerné.
- Adapter `components/dashboard/period-selector.tsx`, `components/onboarding/{checklist,wizard}.tsx`, `components/deliveries/daily-delivery-balance.tsx`, `components/orders/{order-form,printer-picker}.tsx`, `components/products/product-table.tsx`.
- Étendre le nettoyage aux autres occurrences affichées trouvées par l’audit ; ne pas remplacer aveuglément tous les caractères d’un fichier.

### Vérification et pause

- [ ] Tests RED→GREEN pour Button 44 px, noms accessibles des icônes/boutons, libellés complets des plans et formatage des montants.
- [ ] Audit des textes affichés dans `app/` et `components/` via grep et lecture syntaxique TypeScript/JSX excluant les commentaires ; correction de « Tous statuts confondus ».
- [ ] Lint, TypeScript et tests ciblés ; contrôle clair/sombre des composants partagés.
- [ ] **S’arrêter pour validation de l’étape 1.**

## Étape 2 : partie C, barres partagées et page Plus

### Créer

- `lib/navigation.ts` : définitions des entrées, groupes, filtrage par rôle et calcul du lien actif.
- `components/layout/app-top-bar.tsx`, `app-bottom-nav.tsx` : extraire le mobile de `sidebar.tsx`, logo + boutique, avatar, zones sûres et indicateur actif.
- `app/(app)/more/page.tsx`, `components/layout/more-menu.tsx` : vraie page Plus, groupes Pilotage/Boutique/Aide, thème et déconnexion.
- `components/layout/theme-switcher.tsx` : trois boutons Système/Clair/Sombre, branchés sur le provider existant.
- `components/billing/subscription-provider.tsx` : état d’abonnement partagé, sans requête identique répétée par la sidebar, la page et les bannières.
- `components/billing/plan-nav-badge.tsx` : badge du plan payé, sans badge or Découverte.

### Modifier et déplacer

- `components/layout/sidebar.tsx` : garder la composition desktop ; consommer les icônes et définitions communes, déléguer les deux barres mobiles.
- `app/(app)/layout.tsx` : monter les composants partagés et adapter les espaces haut/bas pour éviter les recouvrements.
- `app/globals.css` : déclarer les tokens or nécessaires au badge ; aucune recoloration des écrans métier à cette étape.
- `hooks/use-subscription.ts` : partager sa lecture et ses mutations via le provider, conserver checkout/action/reconcile ; réinitialiser l’état au changement de session/boutique.
- Navigation admin mobile : Tableau, Commandes, Livraisons, Produits, Plus. Les pages secondaires rendent Plus actif.
- Responsable livraisons : Commandes, Livraisons, Plus ; uniquement ses commandes autorisées et les entrées Aide/Mon compte/thème/déconnexion. Aucun lien catalogue, pilotage, équipe ou abonnement.
- Employé : Commandes, Plus, puis Mon compte/Support/thème/déconnexion. Ne pas afficher cinq cases vides pour remplir la barre.
- Tant que le rôle est inconnu, afficher un chargement ; ne pas montrer temporairement toutes les entrées admin.
- La route `/more` reste accessible aux membres authentifiés et filtre son contenu. Les protections serveur des destinations restent intactes ; aucune ouverture de route admin au manager.

### Vérification et pause

- [ ] Tests de navigation pour admin, employé, responsable et chargement ; entrée active sur routes imbriquées, absence de débordement et noms accessibles.
- [ ] Tests du thème, de la déconnexion et du chargement unique de l’abonnement.
- [ ] Vérifier topbar, bottombar et Plus à 390/1280 px, clair/sombre, dont un nom de boutique long.
- [ ] **S’arrêter pour validation de l’étape 2.**

## Étape 3 : partie C, Tableau de bord

### Fichiers

- Modifier `app/(app)/dashboard/page.tsx`, `components/onboarding/checklist.tsx`, `components/dashboard/period-selector.tsx`.
- Créer `components/dashboard/dashboard-kpis.tsx`, `order-status-summary.tsx`, `monthly-performance.tsx`.

### Réorganisation

- Checklist : progression réelle, pastilles SVG et CTA vers la prochaine étape existante.
- En-tête avec export en bouton icône accessible 44 px sur mobile ; conserver le fichier Excel et les mêmes données exportées.
- Périodes en chips défilantes ; quatre KPI cohérents avec la période choisie : CA, bénéfice net, panier moyen, total commandes.
- Panier moyen sur la même base de commandes livrées que le calcul existant, avec garde zéro ; ne pas substituer le panier mensuel à une période de sept jours.
- Fusionner les trois cartes de statut en une liste ; conserver les états de chargement, erreur et absence de données.
- Garder l’objectif mensuel et déplacer les informations mensuelles/performance vendeurs/lives dans un bloc inférieur dédié, sans perdre ces fonctions ni mélanger leurs périodes avec les KPI sélectionnés.

### Vérification et pause

- [ ] Tests des périodes, des valeurs réelles, du panier vide, de l’onboarding incomplet et de l’export.
- [ ] Vérification 390/1280 px, clair/sombre, état vide et données présentes.
- [ ] **S’arrêter pour validation de l’étape 3.**

## Étape 4 : partie C, Livraisons

### Fichiers

- Modifier `app/(app)/deliveries/page.tsx`, `components/deliveries/daily-delivery-balance.tsx`.
- Créer `components/deliveries/delivery-day-card.tsx`, `delivery-day-totals.tsx`, `settlement-form.tsx`.

### Réorganisation

- Aujourd’hui/Hier/date sur une ligne, champs à 44 px ; compteurs et total en tête.
- En-tête entier de carte dépliable, chevron SVG, solde visible fermé. Pas de bouton imbriqué dans le bouton d’expansion.
- Bouton de reversement par livreur, branché sur le formulaire et le contrôleur existants : déplacer la présentation, pas les validations financières.
- Conserver suivi global, archivage, historique et export. Différencier montant attendu sur la tournée, frais retenus, versements à la date et solde global actuel.
- Ne pas préremplir un montant supérieur au solde global autorisé ni recalculer ce solde depuis la seule tournée affichée.

### Vérification et pause

- [ ] Tests d’expansion au clic/clavier, dates, ouverture du bon formulaire, archivés, export et refus d’un dépassement de solde.
- [ ] Vérifier 390/1280 px, clair/sombre, plusieurs livreurs et aucune tournée.
- [ ] **S’arrêter pour validation de l’étape 4.**

## Étape 5 : partie C, Détail commande

### Fichiers

- Modifier `app/(app)/orders/[id]/page.tsx`.
- Créer `components/orders/order-detail-header.tsx`, `order-status-actions.tsx`, `order-delivery-card.tsx`.

### Réorganisation

- Retour « Commandes » avec SVG, titre et badge, actions Imprimer/Modifier sur leur propre ligne.
- Quatre actions principales de la maquette : Livrée, Reportée, Annulée, Retournée ; filtrées selon les droits et règles existants.
- Conserver les autres transitions nécessaires, notamment la mise en livraison, dans une action contextuelle/secondaire. Ne pas supprimer une fonction métier en remplaçant le sélecteur de statut.
- Carte livraison, lien téléphonique, vendeur/session et valeurs vides explicites.
- Date de tournée absente : note ambre avec « Renseigner » qui ouvre le champ existant. Respecter les verrouillages applicables.
- Conserver remises, dépôts, impression et masquage des coûts ; ne pas exposer les actions admin au responsable livraisons.

### Vérification et pause

- [ ] Tests admin/employé/responsable, transitions, impression, date manquante et champs verrouillés.
- [ ] Vérifier 390/1280 px, clair/sombre, titres longs et plusieurs articles.
- [ ] **S’arrêter pour validation de l’étape 5.**

## Étape 6 : partie B, Abonnement premium or

### Fichiers

- Modifier `app/(app)/subscription/page.tsx`, `components/billing/{subscription-view,plan-cards}.tsx`, `app/globals.css`.
- Créer `components/billing/subscription-member-card.tsx`, `subscription-usage.tsx`, `subscription-alerts.tsx`, `subscription-management.tsx`, `subscription-payments.tsx`, `subscription-action-button.tsx`, `subscription.module.css`.

### Réorganisation

- Tokens or via `@theme`, adaptation sombre du bloc crème, contours et textes AA. Aucun ajout de couleur or aux autres écrans métier.
- Carte membre avec les données réelles ; version Découverte neutre et CTA d’upgrade demandé.
- Alertes grâce, arrêt prévu, retour de paiement ; conserver les handlers existants et ne jamais activer une offre depuis l’URL.
- Barres d’usage : limites issues des données actuelles, seuil commandes `limite - 5`, « Illimité » si `null`.
- Cartes de plans séparées, bandeau « Votre plan actuel », prix à droite du nom, avantages en deux colonnes, toggle 44 px, prix barrés depuis `launchCompareAt`.
- Plan actuel payé : Renouveler. Supérieurs : Passer à. Quand l’offre actuelle est Découverte, garder les cartes comparatives neutres/indigo ; seul le CTA principal d’upgrade Pro est or, conformément à l’exception demandée. Inférieurs : note à l’échéance, aucun bouton de paiement.
- Gestion et historique avec les composants UI ; liens PDF authentifiés et vérification des paiements existants conservés.
- Non-propriétaire : pas d’alerte/action de facturation, de gestion ni d’historique ; message explicite. Les compteurs et informations non sensibles restent lisibles.
- Micro-interactions CSS en transform/opacité, désactivées avec reduced motion.

### Hooks et tests

- [ ] Inventorier les hooks du brief et du HTML : inclure aussi `subscription-usage`, `subscription-cancel-notice`, `subscription-receipt-latest` présents dans la maquette.
- [ ] Tests Vitest : habillage Découverte neutre (exception du CTA or), or payé, seuil `limite - 5`, illimité, plan inférieur sans bouton, renouvellement du plan actuel et absence totale d’action pour le non-propriétaire.
- [ ] Tests des états grâce/arrêt/expiration, mensuel/annuel, dates réelles, reçu absent/présent, paiement en attente et erreur de chargement.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.
- [ ] Grep final et contrôle syntaxique des textes visibles dans `app/` et `components/` ; aucun glyphe interdit ni emoji affiché.
- [ ] **S’arrêter pour validation finale, sans commit ni déploiement.**

## Fichiers de tests prévus

Dans `lib/__tests__/` :

- Étape 1 : `app-ui-primitives.test.tsx`, `app-ui-copy.test.ts`, `plan-presentation.test.ts` ; adapter les tests de formatage/billing existants.
- Étape 2 : `app-navigation.test.tsx`, `more-menu.test.tsx`, `subscription-provider.test.tsx` ; adapter `subscription-hook.test.tsx` et conserver les tests de rôles/proxy.
- Étape 3 : `dashboard-ui.test.tsx`, tests existants d’onboarding et de périodes.
- Étape 4 : `delivery-day-ui.test.tsx`, `settlement-form.test.tsx` ; compléter `daily-delivery-balance-ui.test.tsx` et conserver les tests SQL/API de reversement.
- Étape 5 : `order-detail-ui.test.tsx` et tests existants de périmètre responsable/statuts.
- Étape 6 : `subscription-premium.test.tsx`, `subscription-usage.test.tsx`, `subscription-payments.test.tsx` ; adapter `billing-ui.test.tsx` sans affaiblir les tests Moneriz.

Les tests métier déjà présents restent la protection contre les régressions : ils ne sont pas remplacés par des snapshots visuels.

## Liste de recette à fournir au propriétaire

À chaque point de vérification, donner les URL et les états réellement disponibles. À la fin, vérifier à **390 px et 1280 px**, en **clair et sombre** :

1. `/dashboard` : chargé, vide, onboarding partiel, période personnalisée.
2. `/orders`, `/products` : barres partagées, cibles tactiles et navigation Plus active sur une route secondaire.
3. `/more` : admin, employé et responsable ; thème, déconnexion, nom de boutique long.
4. `/deliveries` : bilan du jour, date différente, livreur fermé/ouvert, reversement, suivi global et historique.
5. `/orders/[id]` : en livraison, date absente, plusieurs produits, remise/dépôt, droits du responsable.
6. `/subscription` : Découverte, Pro, Business, grâce, arrêt prévu, mensuel/annuel, non-propriétaire, historique et retour de paiement.
7. Auth/reset, produits/détail, rapports, pilotage et administration : vérification ciblée des textes/icônes nettoyés dans la partie A.

Les scénarios payants et financiers seront recettés avec données de test ou préproduction, sans paiement réel ni envoi de communication. Si aucune session authentifiée de recette n’est disponible, les tests de composants couvriront les états avec fixtures explicites ; distinguer cette preuve d’une recette authentifiée de bout en bout.

## Décision complémentaire du propriétaire

Découverte reste à 100 commandes/mois, alerte à 95. Les sessions live sont incluses dans toutes les offres : les retirer des avantages différenciants de chaque carte et les présenter avec les fonctionnalités communes. L’accès réel au live est ouvert à Découverte par la migration `20261029170009_live_sessions_all_plans.sql` ; les droits de rôle, la boutique, l’état actif du live et les quotas de commandes restent contrôlés. Cette correction ciblée est autorisée. Le propriétaire a ensuite validé le démarrage de l’étape 1 ; chaque étape suivante reste soumise à sa vérification.

## Suivi : étape 1

Corrections transversales réalisées : icônes SVG partagées, marque avec logo, boutons de 44 px, textes nettoyés, libellés de plans centralisés et composants Card/Button dans la facturation. Le formatage des montants utilise lib/utils ; les composants d’impression gardent leur formateur documentaire existant sans alias money.

Vérification visuelle partielle sur un rendu isolé des composants Abonnement et navigation avec données fictives, à 390 et 1280 px en clair et sombre, sans débordement horizontal. La session du navigateur local est déconnectée ; les pages authentifiées restent à vérifier par le propriétaire. Aucun paiement réel ni changement de données. Arrêt avant l’étape 2 pour revue du propriétaire.

## Suivi : étape 2

Barres mobiles extraites en AppTopBar et AppBottomNav, destinations partagées dans lib/navigation, page /more et sélecteur de thème créés. L’avatar mène directement à Mon compte ; les anciennes actions du menu flottant sont regroupées dans Plus. La barre comporte cinq entrées pour l’admin, trois pour le responsable livraisons et deux pour l’employé. Aucune destination admin n’est affichée pendant le chargement du rôle. Les protections serveur des destinations restent inchangées.

Le contrôleur du hook d’abonnement est déplacé dans SubscriptionProvider, monté une seule fois dans le layout. Les lectures simultanées sont dédupliquées ; une mutation attend toute ancienne lecture puis recharge un état frais. Le verrou des mutations est partagé et les réponses d’un ancien compte ou d’une ancienne boutique sont ignorées. Le badge payant utilise les trois tokens or nécessaires ; les écrans métier conservent leur couleur indigo.

Validation : 435 tests / 88 fichiers, ESLint, TypeScript et compilation réussis. Les tests couvrent aussi StrictMode, les changements de boutique, le verrou de paiement, le thème et les accès serveur à Plus. Contrôles visuels sur rendus isolés avec données fictives et CSS compilé : trois rôles, 390 et 1280 px, clair et sombre, nom de boutique long ; aucun débordement ni cible sous 44 px. La recette connectée reste à faire par le propriétaire. Arrêt avant l’étape 3 pour sa revue ; aucun commit.

## Exécution finale du 30 octobre

Le propriétaire a révoqué les pauses entre étapes et demandé de terminer tout le chantier, puis d’ajouter le brief d’authentification. Étapes 3 à 6 et authentification terminées, avec tests avant corrections, revues croisées et contrôles visuels. Les nouvelles règles de création de mot de passe sont partagées par formulaire/API/équipe/reset ; la connexion historique reste compatible. La configuration Auth distante reste non vérifiable et n’a pas été modifiée.

La dernière instruction retire aussi les mentions « Exemple illustratif » et « données d’exemple » de l’interface ; elle prévaut sur les anciens textes des maquettes. Un contrôle de régression empêche leur réapparition.

Résultat final : 491 tests dans 101 fichiers, ESLint, TypeScript, compilation et diff-check réussis. Détail et recette : docs/reports/2026-10-30-refonte-interface.md. Aucun commit ni déploiement.
