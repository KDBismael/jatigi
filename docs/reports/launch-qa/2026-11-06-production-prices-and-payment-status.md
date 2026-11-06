# Prix configurables et tentatives de paiement échouées

La documentation Moneriz fournie précise qu'une tentative échouée peut être réessayée dans la même session. Le retour cancelUrl ne constitue pas une annulation financière. Les factures conservaient donc légitimement leur état technique pending, mais l'interface omettait le statut failed déjà disponible ; le rapprochement n'enregistrait pas non plus les événements failed/expired.

Correction : rapprochement des échecs via la même procédure de vérification que les webhooks, affichage Échoué si une facture en attente a une dernière tentative failed, action Réessayer le paiement. Une facture paid ou reversed ne devient pas échouée à cause d'une tentative tardive. Le retry vérifie la session : lien ouvert réutilisé ; session expirée confirmée libérée puis nouvelle demande préparée. Pas de clôture artificielle d'une session encore payable.

Prix permanents : quatre variables publiques de catalogue, indépendantes, pour Pro et Business mensuels/annuels. Un prix non défini utilise le tarif normal. Le serveur prépare des factures immuables à partir de ces prix, avec isolation mode/boutique, index unique des demandes en attente et sauvegarde/confirmation Moneriz existantes. Le navigateur ne transmet aucun montant. Le parcours SQL historique reste utilisé sans configuration personnalisée. Les prix de test restent interdits en live. Factures, périodes payées et reçus existants conservés. Prix barrés masqués et économies annuelles calculées depuis les nouveaux tarifs.

Fichiers utilisateur : `.env.production.example`, `docs/deployment/moneriz-production.md`, `docs/deployment/2026-11-06-enable-live-billing.sql`. Le dernier fichier est une bascule manuelle du mode de facturation, pas une migration de schéma ni un changement appliqué par cette intervention.

Validation : tests de prix et rapprochement observés en échec avant implémentation ; régressions de reprise open/expired et UI failed également observées en échec puis réussies. Suite finale 656 tests dans 151 fichiers ; lint et TypeScript réussis ; npm run build réussi après isolation du cache Turbopack qui provoquait une erreur intermittente de police Google. Aucun paiement réel initié ni confirmé, aucune clé secrète modifiée et aucune bascule live exécutée.

Déploiement Production demandé par l'utilisateur : https://jatigi-4e3a28z8v-kdbismaels-projects.vercel.app (warko.app).

Contrôle HTTP Production : accueil 200, prix normaux Pro 5 000 / Business 10 000 FCFA constatés ; checkout anonyme refusé 401. Le message client de reprise ne qualifie plus de pending un paiement déjà confirmé.
