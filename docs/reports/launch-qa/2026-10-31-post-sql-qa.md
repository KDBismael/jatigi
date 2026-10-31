# Warko : recette après application du SQL

31 octobre 2026. Ce rapport actualise le [constat avant migration](2026-10-31-launch-qa.md). Tests effectués sur une compilation de production locale, `http://localhost:3011`, connectée au véritable backend Supabase configuré. Ils ne certifient pas que le code a déjà été déployé sur warko.app.

## Résultat

**Les cinq profils ont désormais réussi leur première commande**, avec création réelle d’un produit et d’un livreur. Les erreurs bloquantes de schéma observées avant SQL ne se reproduisent plus dans ces parcours. Les 17 sondes de schéma passent. La configuration des services externes reste distincte de la migration.

| Profil novice | Parcours réel réussi | Preuves |
| --- | --- | --- |
| Impatient | Premier bouton, inscription, produit, livreur, commande, aperçu et téléchargement PDF A4 | [Rapport](../qa-personas/impatient-post-sql.md) |
| Sceptique | Tarifs, conditions, confidentialité, contact, choix annuel, inscription, produit, livreur, commande, abonnement sans paiement | [Rapport](../qa-personas/sceptique-post-sql.md) |
| Mobile | Écran 375 px, réseau 3G ralenti, inscription et onboarding complet, saisie, recherche téléphone, détail et trois aperçus | [Rapport](../qa-personas/mobile-post-sql.md) |
| Lecture littérale | Instructions françaises, remise avec motif, dépôt, modification de remise, livraison, verrouillage, reversement et archivage avec historique | [Rapport](../qa-personas/litteral-post-sql.md) |
| Briseur | Données invalides, double clic et Entrée, retour en cours de parcours, reprise, stock insuffisant, motif obligatoire, une seule commande persistée | [Rapport](../qa-personas/briseur-post-sql.md) |

Chaque profil utilise sa propre boutique QA. Les erreurs de sélecteurs des outils d’automatisation sont distinguées des défauts applicatifs. Aucun paiement externe, email, suppression d’historique ou impression physique n’a été effectué.

## Reprises sur la compilation corrigée

| Profil | Vérification finale | Résultat |
| --- | --- | --- |
| Impatient | Nouvelle boutique, parcours complet, progression et quotas sans rechargement | Réussi : commande créée, 1/100 commandes et 1/1 livreurs |
| Sceptique | Connexion avec choix annuel, abonnement, deux rechargements, liens publics | Réussi : 48 000 FCFA/an conservés, compte gratuit, quotas corrects |
| Mobile | Aperçus à 375 px puis 1280 px, tickets, média print, recherche téléphone | Réussi : A4 entier à 375 px, tickets inchangés, dimensions papier conservées |
| Lecture littérale | Suivi inclus par défaut, archive et historique, recherche, remise verrouillée, exports | Réussi : CSV/XLSX propres à la boutique QA, montants et téléphone texte vérifiés |
| Briseur | Archivage, téléphone invalide en UI/API, création valide par double clic, quota sans reload | Réussi : zéro POST UI invalide, API 400, une seule création valide, quota 1/1 |

**82 captures supplémentaires** : 54 au passage après SQL, 28 à la reprise finale. Preuves sous `artifacts/launch-qa/post-sql/` et `artifacts/launch-qa/post-sql-final/`, exclues de Git. Exemple : [aperçu A4 mobile corrigé](../../../artifacts/launch-qa/post-sql-final/mobile/02-preview-a4.png). Les comptes et données de test restent conservés.

## Défauts regroupés et corrections

Fréquence fondée sur les observations rapportées, sans supposer qu’un utilisateur a rencontré un problème non signalé.

| Profils | Défaut observé | Correction |
| --- | --- | --- |
| 3/5 | « Reprendre la configuration » apparaissait brièvement pendant une sauvegarde normale | État « Enregistrement de la progression… » pendant la requête ; reprise proposée seulement une fois la requête terminée en échec. Protection contre les doublons conservée. |
| 1/5 | Compteurs d’abonnement anciens après création de commande/livreur, corrects uniquement après rechargement | Invalidation partagée après écritures réussies sur commandes, livreurs et équipe. Si une lecture est déjà en cours, nouvelle lecture après celle-ci pour éviter de conserver un résultat ancien. |
| 1/5 | Aperçu A4 coupé à 375 px | Ajustement de l’aperçu à la largeur disponible à l’écran ; hauteur ajustée avec la largeur. Dimensions papier et règles d’impression conservées ; formats thermiques inchangés. |
| 1/5 | Téléphone de livreur `abc` accepté | Validateur partagé, téléphone facultatif vide accepté, numéros de 8 à 15 chiffres acceptés avec ponctuation. Refus avant POST dans onboarding et Livraisons ; API renvoie 400 avec une erreur française lisible. Pas de réécriture automatique des téléphones historiques. |
| 1/5 | Découverte ouvrait Livraisons sur un bilan payant alors que le suivi global était inclus | Ouverture par défaut du suivi global pour Découverte. Bilan quotidien toujours disponible avec son contrôle de forfait ; offres payantes gardent le bilan quotidien par défaut. |

Une disparition du choix annuel après rechargement a été signalée pendant le premier passage sceptique. Elle n’a pas été reproduite par deux rechargements contrôlés avec une intention valide liée au compte. Le source ne supprime pas cette intention à sa lecture. La reprise sceptique finale par connexion via le choix annuel confirme aussi le rappel et les 48 000 FCFA/an après deux rechargements. Aucun correctif commercial supplémentaire n’a été ajouté pour ce cas non reproduit ; le test attend bien la restauration asynchrone du rappel.

Le contrôle de préparation avait lui aussi un défaut : il cherchait `billing_payments.id`, alors que la clé est composée de `mode,payment_id`. Son test de régression a été observé en échec puis corrigé. Ce faux signal de colonne absente n’est pas imputé à la migration exécutée.

## Vérifications métier complémentaires

- Cas de remise : 3 × 5 000 FCFA, remise de ligne 1 000, produits nets 14 000, livraison 1 000, total 15 000, dépôt 2 000, reste client 13 000.
- Remise ensuite modifiée à 1 500 : produits nets 13 500, total 14 500, reste client 12 500 ; dû livreur à la boutique 11 500, frais de livraison exclus. Après livraison, modification des remises verrouillée.
- Reversement interne QA de 11 500 : solde zéro. Après archivage du livreur, commande, colis livré et reversement restent consultables dans son historique. Stock produit 10 → 7.
- Exports clients filtrés : un client livré, aucun confirmé dans la boutique QA ; exports colis : un livré, aucun non livré. CSV téléchargé et XLSX vérifié avec onglets Livrés/Non livrés, téléphone stocké comme texte et montants 14 500 / remise 1 500 / dépôt 2 000 / reste 12 500. Aucun import dans un compte Google effectué.
- Surstock demandé : requête refusée avec erreur française. Double soumission valide : une seule commande, stock 5 → 4.
- [16 contrôles HTTP authentifiés](isolation-post-sql.json) réussis : listes propres à deux boutiques QA, commandes et trois PDF de l’autre boutique refusés, trois PDF propres générés avec signature PDF valide.
- [27 contrôles HTTP anonymes](security-boundaries-post-sql.json) réussis : refus des routes protégées et accès aux trois pages publiques.

Ces contrôles de boutiques administratrices ne certifient pas tous les rôles, toutes les routes ni toutes les situations de concurrence.

## Validation technique

Tests de régression observés en échec puis au vert pour les nouveaux correctifs. Vérification finale : **542 tests, 116 fichiers**, ESLint, TypeScript, compilation de production et contrôle des ressources PDF réussis. `git diff --check` propre. Des avertissements de dépréciation/expérimentation Node apparaissent sans faire échouer les vérifications.

Les reprises ciblées des cinq profils utilisent la compilation corrigée. Les rapports individuels indiquent exactement ce qui a été rejoué ; un contrôle ciblé n’est pas présenté comme une nouvelle validation complète de tous les écrans.

## Ce qui reste avant un lancement payant

Le [diagnostic après SQL](readiness-post-sql.json) ne signale plus de structure manquante parmi ses 17 sondes, mais il échoue encore sur la configuration de production de l’environnement audité : origine HTTPS, mode Moneriz et cohérence avec le mode de la base, configuration email, cron et secrets de notification. L’absence locale de ces valeurs ne prouve pas leur absence chez l’hébergeur.

Paiement Moneriz, webhook, activation payante, annulation/échéance réelle, envoi Resend et déclenchement cron ne sont pas validés en conditions réelles. Leur recette reste nécessaire après configuration, d’abord en mode test. L’identité légale, la politique Auth distante et les imprimantes physiques restent également à vérifier. Aucun réglage externe n’a été inventé pour faire passer le contrôle.

Dépenses, objectifs, sessions live, création de membres et parcours de tous les rôles n’ont pas été rejoués intégralement en navigateur dans cette reprise. Les tests locaux existants ne sont pas présentés comme leur validation réelle de bout en bout.

La [matrice PRD historique](prd-matrix.md) est annotée : présence du code, parcours effectivement recettés et fonctions encore non vérifiées restent des notions distinctes. Invitation d’équipe par email non implémentée : création d’identifiants par l’administrateur à la place. WhatsApp/SMS différés selon la décision utilisateur.

Aucun commit, push, déploiement de code ou nouveau SQL distant appliqué pendant cette reprise. Comptes et enregistrements QA conservés isolément pour audit ; ne pas les confondre avec les données de clients réels.

## Mode navigateur

Les premiers passages ont utilisé Chrome visible, conformément à la préférence précédente. À la nouvelle demande utilisateur, les navigateurs QA encore actifs sont fermés puis les vérifications restantes sont exécutées en arrière-plan (`headless:true`). Les scripts de parcours du dépôt utilisent désormais ce mode par défaut. Les captures restent disponibles, sans fenêtre de navigation affichée.
