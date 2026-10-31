# QA lancement — persona littéral francophone — avant corrections

Date : 30 octobre 2026. Version locale de production : http://localhost:3011. Chrome visible lancé indépendamment, contexte neuf 1280 × 900. Persona : novice non anglophone qui suit les mots français de l’interface, sans comprendre spontanément les sigles métier ou anglais.

## Résultat

Inscription réussie et boutique créée. Premier produit non disponible après enregistrement ; première commande impossible faute de produit sélectionnable. Aucun paiement, message, accès direct API ou contournement administrateur. Aucun code applicatif lu ou modifié pendant le parcours.

## Parcours observé

1. `/` : clic sur le premier « Essayer gratuitement ». Compréhension de la promesse principale et du bouton. Capture `artifacts/launch-qa/before/litteral/01-accueil.jpg`.
2. `/auth/signup` : saisie du nom Boutique QA littéral, nom complet QA lancement littéral, téléphone de test et identifiants jetables. Les indications de mot de passe et la confirmation sont en français et permettent de continuer. Capture du formulaire vide `02-inscription-vide.jpg`.
3. `/onboarding` après « Créer ma boutique » : inscription réussie, nom de boutique et nom utilisateur présents. Trois étapes « Ajouter un produit », « Ajouter un livreur », « Créer une commande ». Mais l’écran affiche simultanément « Impossible de charger la configuration » et « Chargement de la configuration... ». Capture `03-apres-creation.jpg`.
4. Clic « Réessayer », attente de cinq secondes : même état, aucune étape exploitable. Capture `04-configuration-reessayer.jpg`.
5. Menu « Produits » → `/products` → « + Ajouter un produit » → `/products/new`. Formulaire atteint par les liens visibles. Captures `05-produits.jpg` et `06-formulaire-produit.jpg`.
6. Saisie : Savon QA littéral, quantité reçue 10, fournisseur 10 000 FCFA, transport 1 000 FCFA, emballage 500 FCFA, prix unitaire 2 000 FCFA. Affichage : coût unitaire 1 150 FCFA, marge 850 FCFA, bénéfice estimé 8 500 FCFA. Capture `07-cout-emballage-ambigu.jpg`.
7. Clic « Enregistrer le produit » : reste sur `/products/new`, message `Error: {"error":"Error: Produit créé mais introuvable"}`. Capture `08-produit-enregistre.jpg`.
8. Retour menu « Produits » : toujours zéro produit actif ou archivé et « Aucun produit. Ajoutez votre premier produit. ». Capture `09-produit-apres-erreur.jpg`.
9. Menu « Commandes » → `/orders` → « + Nouvelle commande » → `/orders/new`. La liste « Produit » n’a que « Sélectionner un produit », sans article disponible. « Livreur assigné » n’a que « Aucun livreur pour le moment ». La commande du savon ne peut pas être saisie. Captures `10-commandes.jpg`, `11-nouvelle-commande.jpg`, `12-produit-absent-commande.jpg`.

Tous les noms de captures ci-dessus sont relatifs à `artifacts/launch-qa/before/litteral/`.

## Constats à corriger

- **Bloquant — assistant inutilisable** : `/onboarding`, erreur de configuration persistante après le bouton de nouvelle tentative. Les messages « Impossible » et « Chargement » se contredisent ; aucune instruction de reprise compréhensible. Reproduit après inscription puis un clic Réessayer. Preuves 03 et 04.
- **Bloquant — produit non accessible après création** : `/products/new`, l’enregistrement échoue visuellement et le catalogue reste vide. Empêche de terminer la première commande. Preuves 08, 09 et 12.
- **Compréhension — erreur technique anglaise et JSON** : `Error: {"error":...}` ne dit pas en français simple si l’enregistrement a réussi, s’il faut réessayer ou si cela risque de créer un doublon. Même incident que le précédent ; constat de rédaction distinct. Preuve 08.
- **Compréhension — emballage total ou unitaire** : `/products/new`, « Coût d’emballage (FCFA) » ne précise pas son périmètre. Les autres montants sont également peu explicites sur leur total, mais « Montant payé au fournisseur » est plus concret. Pour un novice, 500 FCFA peut vouloir dire chaque savon ou les dix. L’écran calcule ici un total réparti sur dix. Préférer « Coût total d’emballage pour cette quantité » ou une aide locale. Preuve 07.
- **Secondaire — sigles et anglais** : l’accueil emploie « CA » et le pied de page « COD » sans définition locale ; le menu dit « Objectifs & lives » et la commande « Session live (optionnel) ». Ce vocabulaire ne bloque pas cette tentative car il peut être ignoré, mais il ne se lit pas littéralement par un francophone novice. Preuves 01, 11.

## Retest attendu

Reprendre le compte de test et vérifier : assistant chargé → produit créé et visible → livreur ajouté si requis → commande créée avec le produit. Vérifier que les erreurs et champs de coûts donnent une action ou une portée claire en français. Identifiants conservés uniquement dans `/private/tmp/warko-qa-litteral.json`, session privée dans `/private/tmp/warko-qa-litteral-auth.json` ; aucune valeur secrète incluse dans le rapport.
