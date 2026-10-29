# Bilan quotidien des livreurs et recherche téléphone

Scope approuvé : bilan de la journée où les colis sont confiés au livreur, pas de la date de création ; responsable livraisons avec commandes/bilans/versements sans droits administrateur ; recherche nom ou téléphone.

- [x] Tests puis implémentation du rôle `manager`, gestion dans Équipe, accès `/deliveries` et API financières/versements. Création/archivage de livreur et autres fonctions admin restent réservés aux administrateurs.
- [x] Tests puis recherche téléphone normalisée (local, +225, 00225, espaces), conservant le nom. Pagination de la lecture des commandes pour couvrir tout l’historique.
- [x] Migration : `profiles.role` autorise manager ; statut postponed ; `orders.delivery_date` explicite ; instantané `order_delivery_assignments` par commande/livreur/journée, statut et montant net hors livraison/dépôts. Aucune date historique inventée.
- [x] Triggers transactionnels : conserver les journées précédentes reportées lors d’un changement de tournée ; mettre à jour seulement la tournée courante quand statut/montant change ; ne pas recréditer le stock pour un report. Valider toute affectation datée via le garde d’activité existant et empêcher le déplacement d’une tournée déjà livrée/annulée, sauf renseignement initial d’une date historique manquante.
- [x] Étendre le RPC de création avec date optionnelle (compatibilité SQL à dix arguments), le formulaire et l’édition. Reprendre un report en affectant une nouvelle journée. Date affichée et modifiable explicitement, date du jour par défaut pour une nouvelle affectation.
- [x] API `/api/delivery-balance?date=YYYY-MM-DD` réservée admin/manager, boutique issue de la session ; pagination, données de vente uniquement. Regrouper les statuts et sommer les montants livrés. Distinguer ce total du solde global.
- [x] Onglet Bilan du jour dans Livraisons, aujourd’hui/hier/date précise, détail par livreur, liens vers les commandes, indicateur des anciennes affectations non datées. Conserver suivi global et versements.
- [x] Vérifier tests SQL réels PGlite, permissions inter-boutiques, historique après report/réaffectation, frais/dépôts/remises, absence de coût d’achat, UI mobile, ESLint, TypeScript, build et trace native. Aucun commit/push/déploiement sans demande.

Validation finale : 261 tests dans 49 fichiers passent ; ESLint, TypeScript, compilation production et vérification des dépendances natives passent. Contrôle visuel local à 390 et 1280 px ; dates indépendantes vérifiées dans le navigateur. Revue indépendante effectuée ; limite financière de pagination repérée puis corrigée avec sept tests de non-régression. Migration non appliquée à distance ; aucun commit ni push.
