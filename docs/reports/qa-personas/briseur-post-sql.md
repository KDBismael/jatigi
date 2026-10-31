# QA Briseur — après SQL

31 octobre 2026, Chrome réel visible, production locale http://localhost:3011, viewport 1280 × 900. Compte et boutique QA jetables dédiés. Parcours via interface uniquement ; données propres à cette boutique. Identifiants conservés hors dépôt dans /private/tmp/warko-qa-postsql-briseur.json (0600). Session conservée au même endroit avec suffixe -state.json (0600).

## Résultats réellement vérifiés

- Accueil → essai → inscription. Email invalide, téléphone alphabétique, mot de passe court et confirmation différente : soumission désactivée, aucun POST. Double clic valide puis Entrée : un seul POST /api/auth/signup, 201, connexion réussie et assistant ouvert.
- Produit : quantité -2, coût -500 et prix -1 bloqués sans POST. Valeurs valides (stock 5, coût total 5000, prix 2500) et double clic : un seul POST produit 201.
- Retour navigateur après produit : tableau de bord montre 1/3 étapes terminées. Reprendre ramène à l’étape livreur, sans second produit.
- Livreur : nom QA et téléphone `abc` acceptés, POST /api/delivery-drivers 201. Le texte `abc` persiste et apparaît dans la liste des commandes. Anomalie signalée au responsable ; correction en cours par un autre agent.
- Commande : quantité 6 pour stock 5 rejetée par serveur (POST 400, « Stock insuffisant pour ce produit. »), aucun enregistrement.
- Remise de 100 FCFA sans motif : erreur locale « Le motif de la remise est obligatoire », aucun POST supplémentaire.
- Même commande quantité 1, motif renseigné et double clic : un seul POST commande réussi (201). Assistant terminé. Liste : exactement 1 commande, total 2400 FCFA. Catalogue : un produit, stock 4 unités, coût 1000 et marge 1500.

## Limites

Validation du téléphone livreur à retester après reconstruction. Annulation/restauration du stock non testée : aucune commande historique effacée. Paiements, emails externes, impression physique et SQL non exécutés. La mise à jour des quotas et l’aperçu A4 sont vérifiés par les autres personas. La borne négative produit bénéficie de la validation native du navigateur ; les calculs intermédiaires affichent néanmoins des bénéfices sans sens avant correction des saisies négatives.

## Preuves

Captures dans artifacts/launch-qa/post-sql/briseur/ ; journal des POST dans post-requests.json. Les captures 07-overstock et 07-overstock-rejected illustrent respectivement la requête en cours puis son rejet ; 08-required-discount-reason contient le refus local ; 09-order-created, 10-single-order et 11-stock-four documentent la réussite et le stock.


## Retest final corrigé — 31 octobre 2026, 13:01–13:03 UTC

Début en Chrome visible pour la vérification de la page Livraisons et l’archivage du livreur QA. Dès la nouvelle instruction utilisateur, cette instance propre a été fermée ; toutes les vérifications suivantes ont été effectuées en Chrome headless (`headless: true`), en réutilisant uniquement la session QA. Aucun Chrome utilisateur fermé. Les deux instances QA sont fermées à la fin.

- Offre Découverte : Livraisons ouvre le suivi global par défaut ; la commande en circulation demeure comptée.
- Ancien livreur QA au téléphone `abc` archivé depuis l’UI. Onglet Archivés : ancien livreur, 1 colis en cours et action Restaurer présents. Commandes : commande QA conservée (1 commande, 2400 FCFA, ancien livreur toujours affiché). Aucun effacement.
- Abonnement après archivage : livreurs actifs 0 / 1, commandes 1 / 100.
- Nouveau livreur : `abc` affiche « Saisissez un numéro de téléphone valide. », zéro POST après soumission UI.
- Vérification API authentifiée sur notre boutique uniquement : POST avec nom QA et phone `abc` retourne 400 et le même message français ; aucune création.
- Téléphone local valide `0700000096`, double clic Ajouter : exactement un POST 201 ; un livreur actif et un archivé.
- Navigation vers Abonnement sans rechargement : livreurs actifs 1 / 1, commandes toujours 1 / 100. Quota actualisé malgré la visite précédente de la même page.

La validation du téléphone livreur et la fraîcheur du quota sont donc vérifiées corrigées. Téléphone optionnel vide non retesté pour éviter une création supplémentaire ; téléphone valide effectivement accepté. Preuves : artifacts/launch-qa/post-sql-final/briseur/ (02-archived-history, 03-order-retained, 04-quota-zero, 05-invalid-driver, 06-valid-driver, 07-quota-one-no-reload et post-requests.json). Le POST400 du journal correspond au test API explicite ; l’essai UI invalide n’a émis aucune requête.
