# Warko — Description du produit et inventaire des fonctionnalités

État du code vérifié le 29 octobre 2026. Marque : **Warko**. Nom historique du dépôt : **jatigi**. Site : **warko.app**.

Ce document décrit les fonctionnalités implémentées dans le dépôt. Il ne certifie pas que chaque migration et chaque version du code sont déjà déployées en production. Le nouveau bilan quotidien et le rôle responsable livraisons nécessitent notamment la migration `20261029144335_daily_delivery_balance.sql`.

## Description courte à réutiliser

**Warko est une application de gestion commerciale en français pour les commerçants qui vendent sur les réseaux sociaux et en boutique. Elle réunit commandes, stock, livreurs, reversements, dépenses et indicateurs de rentabilité pour suivre l’activité sans multiplier les cahiers et les fichiers Excel.**

Phrase de présentation : **« Vos commandes, votre stock et l’argent de vos livreurs, au même endroit. »**

## Description développée

Warko accompagne les commerçants qui reçoivent des commandes sur WhatsApp, Facebook, Instagram, TikTok ou directement en magasin. Chaque commande peut être rattachée à un vendeur, à un canal d’acquisition et à une session de vente en live. Le commerçant suit ses produits et ses lots de stock, applique des offres ou des remises, enregistre les acomptes et confie les colis à ses livreurs.

Le suivi des livraisons distingue l’argent encaissé, les frais de livraison conservés par le livreur, les montants à remettre à la boutique et les versements déjà reçus. Un responsable peut faire le point sur une journée de tournée, retrouver les commandes d’un client par son numéro de téléphone et imprimer un bon de commande ou un ticket avec le logo de la boutique.

Les tableaux de bord relient les ventes livrées, les coûts des produits et les dépenses pour présenter un bénéfice estimé et comparer les performances par produit, canal, vendeur et session live. Plusieurs entreprises peuvent utiliser la même plateforme avec des données séparées et des droits adaptés à chaque membre de leur équipe.

## Public cible envisagé

Ce positionnement est une hypothèse commerciale à valider auprès des clients, pas une mesure de traction.

- Commerçants vendant des produits physiques sur les réseaux sociaux et via WhatsApp.
- Boutiques combinant vente en ligne et vente en magasin.
- Équipes de vente en live qui veulent relier leurs sessions aux commandes et aux résultats.
- Commerçants utilisant des livreurs avec encaissement à la livraison et reversement à la boutique.
- Gérants francophones ayant besoin d’un suivi en FCFA, avec employés et responsable livraisons.

Exemples de catégories compatibles avec les fonctions actuelles : parfums, habillement, cosmétiques et accessoires. Le produit n’est pas spécialisé dans une seule de ces catégories.

## Problèmes pris en charge

| Situation du commerçant | Ce que Warko apporte |
|---|---|
| Commandes éparpillées dans des conversations et des cahiers | Un registre central avec clients, produits, statuts et recherches |
| Incertitude sur le stock et le coût des produits vendus | Des lots de stock, une allocation FIFO et des coûts historiques |
| Addition manuelle des montants des livreurs le soir | Un bilan par livreur et par journée de tournée |
| Confusion entre frais de livraison et argent dû à la boutique | Des calculs séparant ces montants et les acomptes |
| Ancien livreur à retirer sans perdre son historique | Archivage/restauration avec maintien des commandes et versements |
| Remises mal documentées | Motif obligatoire, auteur et date conservés |
| Chiffre d’affaires connu mais rentabilité mal comprise | Suivi des coûts, dépenses et bénéfice estimé |
| Besoin de préparer des listes clients pour le marketing | Export par produit, canal, période et statut |
| Tous les employés voient les données sensibles | Trois rôles de boutique avec restrictions côté serveur |

## Fonctionnalités implémentées

### 1. Comptes, boutiques et accès

- Authentification par email et mot de passe ; création de compte et de boutique côté application.
- Connexion, déconnexion, récupération et réinitialisation de mot de passe.
- Modification de l’email et du mot de passe depuis Mon compte.
- Création et gestion des comptes de l’équipe par un administrateur.
- Rôles **Administrateur**, **Employé** et **Responsable livraisons** (`manager`).
- Données séparées par organisation, avec contrôles d’accès serveur et politiques RLS Supabase.
- Les coûts d’achat et de revient sont masqués pour les utilisateurs non administrateurs.
- Interface web responsive pour ordinateur et mobile ; thèmes clair, sombre et système.

| Profil | Accès métier principal |
|---|---|
| Administrateur de boutique | Commandes, catalogue et coûts, stock, livreurs, versements, analyses, dépenses, objectifs, bilans et équipe |
| Employé | Commandes et impression, données de vente nécessaires au travail, sans les coûts ni les pages d’administration |
| Responsable livraisons | Commandes, bilans et suivi des livreurs, montants financiers des livraisons et enregistrement des versements ; pas de gestion des comptes, du stock ou des coûts |
| Administrateur plateforme | Espace distinct pour consulter les indicateurs, organisations et utilisateurs de la plateforme |

La création, l’archivage et la restauration des livreurs restent réservés à l’administrateur de boutique.

### 2. Commandes et clients

- Création de commandes à plusieurs lignes de produits.
- Nom et téléphone du client, date de commande et lieu de livraison.
- Canal d’acquisition : TikTok, Facebook, Instagram, WhatsApp, boutique ou autre.
- Attribution à un vendeur et, si nécessaire, à une session live.
- Vente à l’unité, par offre/lot commercial, ou les deux selon le produit.
- Statuts : reçue, confirmée, en livraison, livrée, annulée et reportée.
- Enregistrement d’un dépôt de réservation et du moyen de paiement déclaré : Wave, Orange Money, MTN MoMo, Moov Money ou espèces.
- Calcul du montant total, du dépôt et du reste à payer.
- Modification des informations de la commande, avec contrôles sur les opérations verrouillées.
- Recherche par nom **ou téléphone**, y compris formats locaux ivoiriens, `+225`, `00225`, séparateurs et numéros partiels.
- Filtres par statut, période et livreur.
- Lecture paginée de l’historique complet plutôt qu’une limitation silencieuse aux premières lignes de l’API.

Les canaux et moyens de paiement sont des informations enregistrées dans Warko. Ils ne constituent pas des connexions automatiques aux réseaux sociaux ou des intégrations d’encaissement Mobile Money.

### 3. Produits, offres et stock

- Catalogue de produits et prix de vente.
- Archivage/restauration des produits en conservant leur historique.
- Offres commerciales avec nom, nombre d’unités et prix de l’offre.
- Modes de tarification : unité, offres ou les deux.
- Entrées de stock par lots, avec quantités reçues/disponibles et date de réception.
- Coûts d’achat, d’importation et d’emballage.
- Répartition des frais d’importation selon l’unité, le carton, le lot ou le conteneur.
- Prix de vente et coûts conservés sur les lignes historiques.
- Consommation de stock FIFO : les premiers lots entrés sont utilisés en premier.
- Création et allocation du stock en transaction ; refus en cas de stock insuffisant.
- Restitution des allocations lors d’une annulation, une seule fois.
- Un simple report de livraison ne restitue pas le stock.

### 4. Remises documentées

- Remise par ligne en montant FCFA ou en pourcentage.
- Montant appliqué au total de la ligne, pour les unités comme pour les offres.
- Motif obligatoire pour une remise positive.
- Conservation du type, de la valeur, du montant calculé, de l’auteur et de la date.
- Plafond au montant de la ligne et à 100 % pour le pourcentage.
- Calculs monétaires arrondis à deux décimales.
- Modification et suppression avant verrouillage ; protection après livraison ou annulation.
- Refus d’une remise qui ferait passer le total sous le dépôt déjà payé.
- Réutilisation du montant net dans les totaux, rapports et calculs de bénéfice.

### 5. Livreurs et reversements

- Création de livreurs avec nom et téléphone.
- Affectation des commandes à un livreur.
- Quantités de colis suivies par livreur et taux de réussite.
- Suivi de l’argent collecté, des frais de livraison, du montant déjà reversé et du solde restant dû.
- Les frais de livraison restent au livreur : ils sont exclus du montant dû à la boutique.
- Les dépôts déjà encaissés par la boutique sont déduits du montant que le livreur doit remettre.
- Enregistrement des versements, avec date et note.
- Contrôle du montant du versement par rapport au solde calculé.
- Archivage/restauration d’un livreur sans supprimer son historique financier.
- Maintien de la possibilité d’enregistrer un dernier versement après archivage.
- Chargement de toutes les pages d’ordres et de versements pour les calculs financiers.

### 6. Bilan quotidien des livreurs

- Onglet **Livraisons → Bilan du jour**.
- Choix aujourd’hui, hier ou date précise, à l’heure d’Abidjan.
- Référence : **jour où les colis sont confiés au livreur**, indépendamment de la création des commandes.
- Nombre de colis livrés, en cours, annulés et reportés par livreur.
- Montant attendu pour les seuls colis livrés, après remises et acomptes, hors livraison.
- Détail en cliquant sur le nom du livreur : commandes, clients, téléphones, produits, statuts et montants.
- Historique conservé lorsqu’un colis est reporté au lendemain ou confié à un autre livreur.
- Les anciennes tournées des livreurs archivés restent consultables.
- Indication des affectations anciennes encore sans date de tournée ; aucune date historique inventée.
- Distinction entre montant attendu sur une tournée et solde global après versements.

### 7. Documents, logo et impression

- Bons de commande en **A4**, tickets **58 mm** et **80 mm**.
- Documents avec boutique, logo, référence, date, vendeur, client, produits, quantités, prix, remises et motifs, livraison, total, dépôt et reste à payer.
- Coûts d’achat exclus des documents clients.
- Import, remplacement et retrait du logo de boutique par un administrateur ; PNG/JPEG jusqu’à 2 Mo.
- Impression navigateur/système et téléchargement d’un PDF authentifié.
- Action **Enregistrer et imprimer**, qui enregistre avant d’ouvrir le sélecteur d’imprimante.
- Réimpression sans recréer la commande ; préférences propres au compte, à la boutique et à l’appareil.
- Système/AirPrint, Android via **RawBT**, ordinateur via **QZ Tray**.
- Rendu graphique des tickets Android pour conserver accents et logo.

Les helpers doivent être installés/configurés et les modèles physiques testés. Ce n’est pas une promesse de Bluetooth natif universel depuis tous les navigateurs. Le PDF reste une action distincte.

### 8. Exports clients et colis

- Export clients Excel ou CSV par produit, canal, statut et période.
- Noms, téléphones normalisés, produits et canaux ; regroupement des clients par téléphone.
- Dans Excel, nombre de commandes et dates de première/dernière commande.
- Compteurs des doublons et commandes sans téléphone exploitable.
- Export des colis livrés et non livrés, avec une ligne par commande et coordonnées, produits, livreur, statut et montants.
- Fichier Excel avec deux onglets, « Livrés » et « Non livrés », ou CSV.
- Fichiers compatibles avec un import dans Google Sheets.
- Export Excel du tableau de bord et des bilans.

Les fichiers clients peuvent servir à préparer des audiences dans des outils publicitaires. Warko ne crée pas lui-même les audiences Meta, ne synchronise pas Google Sheets et n’achète pas de publicité.

### 9. Tableaux de bord et analyses

- Chiffre d’affaires des ventes livrées, coûts des produits, dépenses et bénéfice estimé.
- Nombre de commandes, livraisons, annulations et panier moyen.
- Sélection de périodes et comparaison de l’activité dans le temps.
- Performance et classement des produits.
- Répartition des commandes et revenus par canal.
- Classement des vendeurs, chiffre d’affaires, panier moyen et progression vers leurs objectifs.
- Performance des sessions live et des créneaux matin/après-midi/soir.

Les indicateurs sont du reporting de gestion. La présence de dépenses et de bénéfice estimé ne signifie pas qu’un logiciel complet de comptabilité ou de paie est implémenté.

### 10. Équipe commerciale, salaires et évaluations

- Comptes utilisateurs et personnes commerciales sans compte.
- Personnes internes et intervenants externes.
- Coordonnées, statut actif, date d’embauche et date de fin.
- Salaire de base et mode de saisie manuel ou génération automatique des dépenses de salaire.
- Évaluations avec note, commentaire et date.
- Association des salaires aux dépenses et des vendeurs aux commandes.
- Suivi du nombre de commandes et du chiffre d’affaires par personne.

### 11. Dépenses, objectifs, lives et bilans

- Dépenses : salaires, loyer, stock, emballage, internet, électricité et autres.
- Montant, date, catégorie, libellé, personne concernée et lien de justificatif facultatif.
- Création, modification et suppression des dépenses.
- Récurrences mensuelles et total du mois par catégorie.
- Objectifs mensuels globaux et par vendeur.
- Création de sessions live avec nom, date, créneau et objectif de vente.
- Rattachement des commandes aux sessions pour en mesurer les résultats.
- Bilans **journaliers, hebdomadaires, mensuels, trimestriels et annuels**.
- Navigation entre périodes, historique d’instantanés, clôture/régénération selon les opérations prévues et export Excel.

### 12. Administration de la plateforme et support

- Espace super-administrateur séparé des boutiques.
- Vue des organisations et de leurs propriétaires.
- Vue des utilisateurs avec coordonnées, rôle et organisation.
- Indicateurs transversaux : organisations, utilisateurs, commandes, revenus, bénéfice brut calculé et reversements des livreurs.
- Répartition des commandes par statut et évolution du chiffre d’affaires.
- Page support avec email et lien WhatsApp configurable.
- Page de présentation publique du produit.

## Ce qui existe déjà pour un SaaS

Le socle comprend la séparation des entreprises, les comptes, les rôles, les contrôles d’accès, les données persistantes, les exports, les documents avec logo et un espace d’administration de plateforme. Le cœur métier est implémenté avec Next.js/React/TypeScript, Supabase Auth/Postgres/Storage, et des tests automatisés.

Les derniers changements ont été vérifiés avec **261 tests**, ESLint, TypeScript, compilation de production et contrôle des dépendances nécessaires aux documents. Ces vérifications ne remplacent pas un audit de sécurité externe, une mesure de disponibilité ou une validation de chaque imprimante physique.

## Ce qui n’est pas encore implémenté comme couche commerciale SaaS

- Catalogue d’offres et abonnements mensuels/annuels.
- Encaissement des abonnements par carte ou Mobile Money.
- Essais gratuits et expiration d’essai.
- Limites par offre : utilisateurs, commandes, stockage, boutiques ou intégrations.
- Activation des fonctionnalités premium selon l’offre souscrite.
- Facturation SaaS, renouvellements, impayés, suspension et réactivation liées au paiement.
- Portail client pour changer d’offre, payer ou résilier.
- Suivi commercial de la plateforme : MRR, ARR, conversion d’essai et churn.

## Fonctionnalités à ne pas annoncer comme construites

- Prise de commandes automatique depuis WhatsApp, Instagram, Facebook ou TikTok.
- Assistant IA connecté au catalogue, conversations clients ou workflows n8n : il existe un document de réflexion, pas une fonctionnalité livrée.
- Synchronisation des audiences publicitaires ou des fichiers Google Sheets.
- Encaissement intégré Wave/Orange Money ou rapprochement automatique des paiements.
- Application Android/iOS native, fonctionnement hors connexion ou Bluetooth universel.
- Géolocalisation des livreurs, optimisation d’itinéraire ou lien de suivi public pour le client.
- Gestion multi-agences ou multi-boutiques consolidée pour un même client.
- Portail client/e-commerce public, panier d’achat et paiement en ligne.
- Suite complète de comptabilité, paie ou facturation fiscale certifiée.

## Informations utiles pour préparer les offres et la tarification

Les modules ci-dessus constituent l’inventaire de valeur disponible, pas des offres déjà configurées. La frontière entre gratuit et premium reste à décider : une fonctionnalité construite ne possède pas actuellement de verrou d’abonnement.

Pour préparer les offres, les dimensions observables du produit sont le volume de commandes, le nombre de membres de l’équipe, le nombre de livreurs, la profondeur du reporting, les exports marketing, l’impression et l’accompagnement. Les besoins d’automatisation, d’intégrations et de gestion multi-boutiques décrits plus haut sont des pistes futures, pas des capacités commercialisables immédiatement.

Les prix, limites, coûts de service, objectifs de marge et hypothèses de conversion ne sont pas définis par le code. Ils devront être établis à partir des clients visés, de leurs usages et des coûts réels de la plateforme.
