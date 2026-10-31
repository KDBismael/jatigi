# Vérification après SQL — profil littéral

Date : 31 octobre 2026. Application : http://localhost:3011. Chrome réel, fenêtre visible, profil navigateur neuf, écran 1280 × 900. Boutique exclusivement de test « QA post SQL littéral ». Aucun autre client consulté, aucun SQL, paiement, impression, envoi ou commit effectué. Identifiants privés conservés dans `/private/tmp/warko-qa-postsql-litteral.json` (0600).

## Parcours effectué

Depuis l’accueil, clic sur « Essayer gratuitement », création de la boutique puis trois étapes guidées. Produit « Savon littéral QA » : 10 unités reçues, fournisseur 20 000 FCFA, prix de vente 5 000 FCFA. Le coût unitaire 2 000, marge 3 000 et bénéfice estimé 30 000 sont affichés correctement. Création du livreur réussie.

Commande : 3 unités, remise de ligne 1 000, motif « promotion », livraison 1 000, dépôt Wave 2 000. Le formulaire affiche colis 14 000, total 15 000, reste à collecter 13 000. Enregistrement réussi et écran « Votre boutique est prête ! ». La commande est retrouvée depuis Commandes, y compris par recherche du téléphone 0700000046.

La fiche conserve la remise et le dépôt : total 15 000, coût 6 000, bénéfice 8 000, à reverser par le livreur 12 000 hors livraison. Modification de la remise à 1 500 avec motif « promotion corrigée » réussie : colis 13 500, total 14 500, bénéfice 7 500, à reverser 11 500. Passage à « Livrée » réussi. Le bouton de remise disparaît et « Remises verrouillées après livraison ou annulation. » apparaît. Le bouton général Modifier ouvre encore les informations client/livreur/livraison/dépôt ; aucune modification supplémentaire enregistrée.

Catalogue : stock restant 7 unités. Livraisons > Suivi global et versements : 1 colis livré, encaissé 12 500 dont livraison 1 000, déjà reversé 0, à reverser 11 500. Ces montants concordent avec le dépôt gardé par la boutique et la remise modifiée. Aucun versement saisi.

## Confusion constatée

La page Livraisons du plan Découverte ouvre par défaut « Bilan du jour », bloqué par « Cette fonctionnalité est disponible avec les offres Pro et Business. ». Le novice peut croire que tout le suivi est payant alors que l’onglet voisin « Suivi global et versements » donne bien accès au solde gratuit. Préférer cet onglet par défaut pour Découverte, ou ajouter une explication avec lien vers le solde accessible. Ce point ne bloque pas la création ni la livraison de la commande.

Les libellés français et le motif obligatoire de remise ont permis de réaliser le parcours sans connaissance technique. Aucun nouveau blocage fonctionnel observé sur ce périmètre. Les bugs déjà connus par le coordinateur (sauvegarde/reprise, compteur abonnement, largeur aperçu A4) ne sont pas déclarés comme nouveaux et n’ont pas fait partie de cette vérification.

## Preuves

Captures dans `artifacts/launch-qa/post-sql/litteral/` : `01-produit.png`, `02-commande-calcul.png`, `03-recherche-telephone.png`, `04-remise-modifiee.png`, `05-livree-verrouillee.png`, `06-stock-sept.png`, `07-solde-livreur.png`. Texte du solde : `solde-visible.txt`.

## Complément demandé : reversement et archivage

Reconnexion dans une nouvelle fenêtre Chrome au même compte QA. Depuis le suivi global, enregistrement d’un reversement interne de 11 500 FCFA : confirmation « Versement de 11 500 FCFA enregistré. », déjà reversé 11 500 et solde 0. Aucun paiement externe effectué. Archivage du livreur réussi ; l’onglet Archivés (1) conserve ses totaux (1 livré, encaissé 12 500, déjà reversé 11 500, solde 0). Son bouton Historique des reversements affiche le 31/10/2026, l’auteur Test Littéral et 11 500 FCFA. Retour à Commandes puis ouverture de la commande : elle reste consultable et le nom du livreur est conservé. Captures supplémentaires : `08-archive-historique.png`, `09-commande-apres-archive.png`. Les deux fenêtres Chrome QA ont été fermées à la fin.

## Reprise ciblée — version finale corrigée

Nouvelle connexion au même compte sur la version finale du port 3011. Vérification initiale en Chrome visible ; à réception de la nouvelle consigne utilisateur, fermeture de cette seule fenêtre QA et poursuite des exports dans Chrome sans fenêtre (`headless:true`), avec état de session privé réutilisé. Aucun Chrome utilisateur fermé. Le navigateur QA en arrière-plan est également fermé à la fin.

Résultats : Livraisons ouvre désormais directement le suivi global inclus pour Découverte, sans premier écran payant. L’onglet Archivés conserve le livreur, 1 commande livrée, 11 500 reversés, solde 0 ; l’historique du reversement demeure consultable. La recherche 0700000046 retrouve la commande livrée et sa fiche affiche toujours le verrouillage explicite des remises.

Exports réalisés depuis l’interface, uniquement sur cette boutique QA : export clients par défaut = 1 client livré ; CSV téléchargé avec nom, téléphone international 2250700000046, produit et TikTok. Filtre clients Confirmée = 0 client et message clair. Export colis Livrés = 1 livré, 0 non livré. Fichier `.xlsx` téléchargé ; vérification du conteneur XML : onglets « Livrés » et « Non livrés », première feuille avec exactement la commande QA (téléphone stocké comme texte, total 14 500, remise 1 500, dépôt 2 000, reste à payer 12 500), seconde feuille avec les seuls en-têtes. Filtre Non livrés = 0/0 et message « Aucun colis pour ces filtres. ». Aucune importation vers Google Sheets effectuée : compatibilité de structure XLSX vérifiée localement, import Google non testé.

Preuves finales : `artifacts/launch-qa/post-sql-final/litteral/`, captures 01 à 06, `clients-livres.csv`, `colis-livres.xlsx`. Aucun nouveau problème observé lors de cette reprise.
