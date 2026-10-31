# Warko : compte rendu du 30 octobre 2026

La refonte demandée est implémentée dans le code local. Les étapes restantes ont été exécutées sans pause, conformément à la dernière instruction. Aucun commit, push, déploiement, paiement réel ou changement de configuration Supabase distant n’a été effectué.

**Tableau de bord.** Les quatre indicateurs suivent la période sélectionnée : chiffre d’affaires livré, bénéfice net, panier moyen sur les commandes livrées et nombre de commandes. Le panier reste à zéro sans livraison. Les statuts sont regroupés ; les périodes et l’export restent accessibles sur mobile. Les objectifs et performances mensuelles sont conservés dans un bloc distinct. La checklist utilise la progression réelle et conduit vers la prochaine action.

**Livraisons.** Les cartes s’ouvrent depuis tout leur en-tête. Le bilan conserve les quatre statuts, les dates, les commandes, l’export et les livreurs archivés. Un reversement peut être ouvert depuis le bilan quotidien. Son formulaire utilise le solde global actuel autorisé et une date de paiement explicite ; il ne préremplit pas l’attendu de la tournée. Les dépassements sont refusés, et le bilan est actualisé après enregistrement. Le suivi global, l’archivage, la restauration et l’historique sont conservés.

**Détail de commande.** Le retour Commandes, le titre, le statut et les actions Imprimer/Modifier sont séparés. Quatre actions principales sont proposées, avec les autres transitions autorisées dans une liste. Une date de tournée absente peut ouvrir et focaliser le champ existant pour les rôles autorisés. Les verrouillages des dates existantes et les droits du responsable livraisons sont conservés. Les prix de vente, remises et totaux nets sont lisibles par les employés ; coûts et bénéfices restent réservés aux administrateurs. Les erreurs de chargement et d’enregistrement hors ligne sont affichées.

**Abonnement.** La page utilise les cartes premium, les prix barrés, les bandes du plan actuel, les barres de consommation et les états grâce, arrêt prévu, expiration et Découverte. L’or reste réservé à l’abonnement et à son badge de navigation, avec l’exception du bouton principal de passage à Pro sur Découverte. Les plans inférieurs ne déclenchent pas de paiement immédiat. Les actions de facturation et l’historique restent réservés au propriétaire. Les reçus authentifiés et la vérification explicite du retour Moneriz sont conservés. Les renouvellements restent des paiements confirmés à chaque échéance.

Découverte reste à **100 commandes par mois**, avec avertissement à **95**. Les sessions live sont incluses dans toutes les offres et figurent dans les fonctionnalités communes.

**Connexion et inscription.** Le formulaire est clair, avec bandeau sombre sur mobile et deux colonnes dès 900 px. La confirmation du mot de passe, la jauge et les règles réagissent à la saisie. Les deux boutons œil de 44 px pilotent la visibilité des deux champs ensemble. Le schéma Zod est partagé entre formulaire et API ; la confirmation n’est pas envoyée au serveur. L’offre choisie est conservée lors du changement de route. Les 22 hooks de test demandés sont présents.

Les nouveaux mots de passe de création de boutique, de création d’un compte d’équipe et de réinitialisation demandent **8 caractères, une lettre et un chiffre**. La connexion n’impose pas cette nouvelle validation aux anciens mots de passe. Le préfixe téléphonique +225 est visuel : la saisie est conservée telle quelle, sans nouvelle normalisation E.164.

Les mentions « Exemple illustratif » et « données d’exemple » ont été retirées des textes affichés concernés, y compris l’aperçu produit de la landing. Les aides utiles dans les champs restent présentes.

**Validation finale.**

- `npm run lint` : réussi, sans avertissement ESLint.
- `npx tsc --noEmit` : réussi.
- `npm test -- --maxWorkers=2` : **491 tests réussis dans 101 fichiers**.
- `npm run build` : réussi.
- `git diff --check` : réussi.
- Contrôle syntaxique des chaînes affichées dans `app/` et `components/` : aucun des glyphes interdits, emoji ou mentions d’exemple ciblées. Les tirets présents uniquement dans des commentaires peuvent rester.
- Revues croisées sur les calculs, permissions, actions financières et validation des mots de passe ; les problèmes importants relevés ont été corrigés avec tests de régression.

**Contrôle visuel réalisé.** Les pages publiques réelles de connexion et d’inscription ont été contrôlées à 390, 899, 900 et 1280 px. Le message de connexion a été vérifié avec une réponse interceptée, sans authentification réelle. Les écrans privés ont été vérifiés sur des rendus isolés des composants avec données fictives et styles compilés : tableau de bord, livraison, commande, Pro, Business, Découverte, grâce, arrêt prévu et non-propriétaire. Cela représente 36 combinaisons à 390/1280 px, clair/sombre. Aucun débordement de page ni contrôle mesuré sous 44 px. Le défilement horizontal des périodes est volontaire et reste contenu dans sa zone.

**Point externe restant.** La configuration réelle de Supabase Auth n’a pas pu être lue : aucun CLI installé, fichier de configuration local ou accès Management utilisable dans cet environnement. La règle de 8 caractères est donc appliquée dans le code de Warko, mais son équivalent dans le projet Supabase reste à confirmer. Si le projet impose déjà une règle plus forte, elle peut encore refuser certains nouveaux mots de passe validés par l’application. La documentation officielle décrit la configuration des exigences et le maintien de la connexion des comptes existants : [Supabase, Password security](https://supabase.com/docs/guides/auth/password-security).

**Recette conseillée demain**, à 390 et 1280 px, en clair et sombre :

| Écran | Vérifier |
| --- | --- |
| `/dashboard` | Changer de période, indicateurs, checklist, export, bloc mensuel |
| `/more` et navigation | Admin, employé, responsable ; thème, boutique longue, liens autorisés |
| `/deliveries` | Aujourd’hui/hier/date, cartes, solde global, reversement, archivés et historique |
| `/orders/[id]` | Nom long, téléphone, statut, date absente, commande livrée, remise et dépôt, impression |
| `/subscription` | Découverte/Pro/Business, grâce, arrêt, mensuel/annuel, reçu et propriétaire/non-propriétaire |
| `/auth/login` | Connexion existante, œil et erreur de connexion |
| `/auth/signup?plan=pro` | Offre, règles, confirmation, yeux et création en environnement de test |
| `/auth/reset-password` et équipe | Nouvelle politique du mot de passe |

La recette connectée avec vos données et votre imprimante reste à effectuer ; les rendus isolés ne remplacent pas cette vérification de bout en bout.
