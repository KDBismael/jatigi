# Abonnement : corrections responsive

Les seuils à 768 px se basaient sur la fenêtre plutôt que sur la colonne disponible après la sidebar de 256 px et les marges. À 768 px, trois cartes se partageaient seulement 384 px : texte des avantages superposé, dates coupées et tableau hors du panneau. Reproduction également à 1024 px.

Corrections :
- conteneur nommé sur la page ; deux colonnes de synthèse et de gestion à partir de 680 px disponibles, trois plans à partir de 840 px ;
- une colonne d'avantages par carte, avec icônes non rétrécies ;
- champs du plan actuel disposés selon l'espace réel, avec minimum de 160 px par colonne ;
- historique en fiches sous 720 px disponibles ; tableau à largeur fixe au-delà ; libellé Reçu ou Vérification adapté à l'action sur petit écran.

Vérification Chrome headless sur les composants réels rendus en HTML, avec leur CSS et une enveloppe reproduisant les dimensions de la sidebar et des marges de l'application. Données de test : plan Pro actif, facture Business en attente et reçu Pro payé. Ce contrôle de mise en page n'est pas une transaction de paiement ni une session utilisateur réelle.

Avant : débordement du tableau à 768 px, 18 textes d'avantages hors de leur cellule à 768 px et 10 à 1024 px. Après : zéro débordement mesuré à 375, 768, 1024 et 1280 px en clair et sombre (8 cas). Captures avant/après dans artifacts/launch-qa/subscription-responsive/ (artefacts locaux ignorés par Git). Inspection visuelle effectuée sur tablette sombre et bureau clair.

Suite Vitest : 637 tests / 145 fichiers réussis. ESLint, TypeScript et npm run build réussis. La première compilation locale a été arrêtée car bloquée dans la sandbox ; relance autorisée terminée avec succès.

Preview : https://jatigi-nep8n25yq-kdbismaels-projects.vercel.app

Premier déploiement Preview échoué sur la résolution d’une police Google de la landing (Turbopack), relance sans cache réussie (CLI exit 0). Production inchangée ; aucun commit.
