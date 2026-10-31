# Le sceptique — avant corrections

Test réel le 30 octobre 2026, http://localhost:3011, Chrome headless installé, contexte neuf 1280 × 900. Aucun mock, accès API direct, lecture de code UI, paiement ni message envoyé. Les premiers appels MCP ont échoué avant navigation à cause d'un profil navigateur occupé ; la session réelle a ensuite utilisé un Chrome isolé. Boutique créée : **QA lancement sceptique**. Identifiants conservés uniquement dans `/private/tmp/warko-qa-sceptique.json`.

## Parcours et preuves

1. `/` : lecture de l'offre et des limites, tarifs mensuels puis annuels et FAQ. Découverte : gratuit sans durée, 1 livreur, 100 commandes/mois, 1 utilisateur. FAQ : avertissement à 95, création bloquée à 100, anciennes commandes accessibles et modifiables, reprise le 1er du mois suivant. Pro : 5 000 FCFA/mois lancement (7 000 barré), 5 livreurs, commandes illimitées, 3 utilisateurs ; annuel 48 000 FCFA/an, soit 4 000/mois et économie de 12 000. Business : 10 000/mois lancement (15 000 barré), 96 000/an. Pas de carte requise pour démarrer.
2. FAQ renouvellement : rappel 3 jours avant échéance, 3 jours de grâce et rappel quotidien après échec, puis retour Découverte avec conservation des données. FAQ annulation : depuis Abonnement, à tout moment. Aucun montant de frais additionnels de paiement ni traitement fiscal affiché dans les sections lues : je ne peux pas confirmer ces points.
3. Recherche de Conditions, Confidentialité et contact avant inscription : aucun lien correspondant dans l'en-tête, le pied de page, ni le formulaire d'inscription. Le support est mentionné dans les cartes, sans adresse ni lien public trouvé.
4. Clic sur l'offre **Pro après sélection Annuel**, pour plusieurs livreurs : `/auth/signup?plan=pro`. Texte : « Offre choisie : Pro · Paiement après la création ». Ni période annuelle ni prix récapitulé. Inscription réelle soumise ; arrivée authentifiée sur `/onboarding`, boutique et nom QA visibles. Ceci prouve la création du compte, pas l'activation payante Pro.
5. `/onboarding` : trois étapes annoncées mais erreur « Impossible de charger la configuration », puis « Chargement de la configuration... » et Réessayer. Réessayer reproduit le même état. Connexion ultérieure réelle réussie vers `/dashboard`, puis nouvelle visite de `/onboarding` reproduit l'erreur.
6. Menu Produits → `/products` : catalogue vide et bouton Ajouter un produit. Ce bouton ouvre réellement le formulaire Nouveau produit (nom, mode de vente, quantité, achat, transport, emballage, prix). Aucune soumission produit effectuée : arrêt de cette branche demandé par le coordinateur après confirmation d'une écriture partielle par une autre persona, pour préserver les données de test. Menu Abonnement → `/subscription` : erreur empêchant de vérifier le plan, son prix ou l'annulation.
7. Menu Support → `/support` : `support@warko.app` disponible ; texte « WhatsApp n’est pas encore configuré. Utilisez l’email ci-dessous. » Aucun contact effectué.

## Problèmes reproductibles

| Priorité | Observation et reproduction | Preuve |
| --- | --- | --- |
| Bloquant | Créer un compte puis ouvrir `/onboarding` : configuration impossible, Réessayer ne débloque aucune étape. | `artifacts/launch-qa/before/sceptique/04-signup-result.jpg` |
| Élevée | Ouvrir Abonnement après inscription : « Impossible de traiter l’abonnement. Réessayez. » Le sceptique ne peut vérifier l'offre ni atteindre l'annulation annoncée. | `artifacts/launch-qa/before/sceptique/06-billing.jpg` |
| Élevée confiance | Avant inscription, impossible de trouver Conditions/Confidentialité/contact depuis les liens visibles de l'accueil et de l'inscription. Observation limitée à ces surfaces, aucune supposition sur des routes cachées. | `02-footer-no-legal-contact.jpg`, `03-signup-no-period-legal.jpg` dans le même dossier |
| Moyenne | Sélectionner Annuel puis Pro : le formulaire ne rappelle ni annuel ni 48 000 FCFA. URL transmet seulement `plan=pro`. La conservation du choix de période n'est pas prouvée. | `01-annual-pricing.jpg`, `03-signup-no-period-legal.jpg` |
| Moyenne confiance | Pro annonce support WhatsApp (48 h), mais Support affiche WhatsApp non configuré ; email disponible. | `07-support.jpg` |

## Réseau observé (sans données sensibles)

- `GET /api/onboarding` → 500, répété après reconnexion et Réessayer.
- `/api/products` → 500 pendant l'arrivée et les visites catalogue. Le catalogue affiche malgré cela un état vide ; aucune déduction sur les données existantes.
- `/api/billing` → 503 ; écran Abonnement en erreur.

Ces réponses proviennent des actions navigateur normales, sans requêtes directes ni contournement. Aucun produit ou commande persisté n'a encore été confirmé ; le parcours onboarding est bloqué. Les erreurs de sélecteur du script QA lors de la reconnexion ont été corrigées : elles ne sont pas comptées comme défauts produit.
