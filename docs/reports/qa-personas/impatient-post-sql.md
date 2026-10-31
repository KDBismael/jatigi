# QA post SQL — novice impatient

Date : 31 octobre 2026. Navigateur : vrai Google Chrome visible, contexte isolé, 1280 × 900. Serveur production http://localhost:3011. Aucun code applicatif modifié.

## Résultat

Parcours terminé : inscription, produit, livreur, première commande, ouverture du bon A4 et téléchargement PDF réussis. Aucun blocage applicatif constaté. Aucun paiement, e-mail, impression physique, suppression ou modification de données clients existantes.

## Étapes réellement exécutées

1. Accueil : survol du texte principal puis premier « Essayer gratuitement » → /auth/signup.
2. Création de « QA post SQL impatient », identité et téléphone fictifs, adresse example.com unique. Accès à /onboarding sans confirmation email.
3. Produit « Savon QA impatient » : stock 10, fournisseur 5 000 FCFA, transport 1 000, emballage 0, vente 1 500. Enregistré.
4. Livreur « Livreur QA impatient », téléphone fictif : enregistré.
5. Commande « Client QA impatient » : WhatsApp, vendeur QA Impatient, livreur QA, adresse fictive, 2 unités, frais livraison 1 000, aucun dépôt. Assistant affiche « Votre boutique est prête ! ».
6. Commandes affiche une commande reçue, total 4 000 FCFA. Détail /orders/fb70d2de-8aab-4a42-9c34-9717037eff23 : coût unitaire 600, coût total 1 200, bénéfice 1 800, montant livreur hors frais 3 000.
7. « Imprimer » ouvre /orders/fb70d2de-8aab-4a42-9c34-9717037eff23/print. Bon A4 : sous-total 3 000, livraison 1 000, total/reste 4 000.
8. Lien « Télécharger PDF » : événement navigateur download reçu, fichier warko-commande-FB70D2DE-a4.pdf enregistré, download.failure() null. Aucune impression physique.

## Confusion observée

Après enregistrement du produit, pendant quelques secondes : étape 1 conservée, message « Votre produit est enregistré. Reprenez la configuration sans recommencer cet enregistrement. » et bouton « Reprendre la configuration ». Puis passage automatique à l’étape 2. C’est perturbant pour une personne pressée, sans constituer un échec d’enregistrement. Signalé au parent qui prépare une correction. Celle-ci n’a pas été retestée dans ce passage.

## HTTP et limites

Aucune réponse /api/ de statut >=400 observée par le listener sur les pages parcourues. Les statuts 2xx individuels n’ont pas été archivés : la persistance est confirmée par l’assistant, la liste puis le détail chargé et le PDF téléchargé. Aucun test de statut livré/reversement dans ce scénario.

Le harness a rencontré des erreurs de sélecteurs (deux boutons homonymes à l’inscription, lien tableau de bord/PDF pris pour bouton, champ mot de passe de connexion sans name) ; elles ont été corrigées et ne sont pas des défauts de l’application. Reconnexion au même compte pour terminer le PDF, sans créer de doublon.

## Preuves

Dossier artifacts/launch-qa/post-sql/impatient/ : 01-signup-result.png, 02-onboarding.png, 03-product-result.png (transition confuse), 04-driver-result.png, 05-order-before-submit.png, 06-order-result.png (première réussite complète), 07-print-page.png et warko-commande-FB70D2DE-a4.pdf.

Identifiants conservés uniquement dans /private/tmp/warko-qa-postsql-impatient.json, mode 0600. Chrome propre fermé.


## Retest du build final corrigé — 31 octobre 2026

Nouveau contexte Chrome visible et nouveau compte distinct, boutique « QA post SQL impatient final ». Parcours accueil → premier CTA → inscription → produit → livreur → commande réellement rejoué. Produit : 10 unités, achat 5 000, transport 1 000, emballage 0, prix 1 500. Commande : 2 unités + livraison 1 000, client et livreur QA distincts, aucun dépôt.

Résultat : les trois enregistrements aboutissent à « Votre boutique est prête ! ». Après clic d’enregistrement produit, capture à environ 200 ms : « Enregistrement... », formulaire conservé ; l’observation suivante affiche directement l’étape 2. Aucun bouton « Reprendre la configuration » observé dans ces états. Observation ponctuelle réelle, sans prétendre avoir échantillonné chaque image de la transition.

Depuis l’écran prêt, navigation par liens vers Tableau de bord puis Abonnement, sans reload ni goto. Un marqueur posé sur window avant navigation vaut encore « impatient-final » sur /subscription, confirmant la conservation du document. Consommation affichée immédiatement : Commandes 1 / 100, Livreurs actifs 1 / 1, Utilisateurs 1 / 1. Aucun paiement effectué. Aucune réponse API >=400 observée.

Preuves finales : artifacts/launch-qa/post-sql-final/impatient/01-product-progress.png, 02-shop-ready.png, 03-subscription-spa.png, product-progress.json, final-observations.json. Identifiants distincts uniquement dans /private/tmp/warko-qa-postsql-impatient-final.json (0600). Chrome propre fermé. Aucun nouveau blocage ; aucun code applicatif modifié et aucun commit.
