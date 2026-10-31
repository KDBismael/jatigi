# QA après SQL — novice sceptique

Test réel le 31 octobre 2026 sur http://localhost:3011, Google Chrome visible, viewport mobile 390 × 844. Nouveau compte QA et nouvelle boutique « QA post SQL sceptique ». Identifiants conservés uniquement dans `/private/tmp/warko-qa-postsql-sceptique.json` (0600). Aucun paiement, facture, email envoyé, modification SQL ou donnée cliente.

## Parcours vérifiés

1. **Confiance avant inscription : OK.** Depuis les liens du pied de page, lecture de Conditions, Confidentialité et Contact. Offres, gratuité, confirmation de paiement, données et support sont expliqués. Captures `01-*`.
2. **Choix payant avant compte : OK.** Annuel → Pro : 48 000 FCFA/an. Le lien porte `plan=pro&cycle=yearly`. Inscription affiche le choix et précise aucun paiement à cette étape. Aller Connexion puis revenir Créer ma boutique conserve le choix et le montant. Captures `02`, `03`.
3. **Inscription et premier usage : OK.** Compte unique créé, accès onboarding sans erreur HTTP. Produit réel « QA savon sceptique », stock 10, achat 10 000, transport 1 000, emballage 500, vente unitaire 2 000. Livreur « QA Livreur sceptique ». Commande réelle « QA Client sceptique », 1 unité, livraison 1 000, vendeur et livreur sélectionnés. Captures `04`, `05`, `06`.
4. **Fin onboarding : OK avec confusion transitoire.** Après création de commande, affichage temporaire « Votre commande est enregistrée. Reprenez la configuration sans recommencer cet enregistrement. » puis, sans nouvelle saisie, « Votre boutique est prête ! Votre produit, votre livreur et votre commande sont enregistrés. ». Le message final ouvre le tableau de bord. Capture `07`.
5. **Abonnement sans payer : OK pour accès et gratuité, défaut de fraîcheur.** Navigation mobile Plus → Abonnement fonctionne. Le premier affichage conserve Pro annuel 48 000 et précise qu'aucun paiement n'a été effectué ; plan réel Découverte gratuit, historique vide. Aucun bouton de paiement déclenché. Capture `08`.

## Défauts observés

- **Consommation obsolète après onboarding (reproduit).** Première visite SPA d'Abonnement : 0/100 commandes et 0/1 livreurs actifs malgré la commande et le livreur créés. Rechargement de la même page : 1/100 et 1/1. Capture `09` après reload. Ce défaut peut faire croire que les créations n'ont pas été prises en compte.
- **Intention commerciale ponctuelle.** Le premier affichage Abonnement rappelle le choix annuel Pro, puis rechargement supprime ce rappel et remet les tarifs sur Mensuel. L'intention est transmise jusqu'au premier affichage, mais ne persiste pas après rechargement. À confirmer selon comportement attendu.

## Limites

Paiement et activation payante non testés, volontairement arrêtés avant création de facture ou transaction. Aucune erreur HTTP >=400 pendant le parcours applicatif. Les temps d'attente causés par des sélecteurs d'automatisation (bouton/link) ne sont pas des défauts applicatifs. Chrome propre à ce test fermé.

Captures : `artifacts/launch-qa/post-sql/sceptique/`.

## Reprise finale sur build corrigé

Test réel le 31 octobre 2026 sur le build final `localhost:3011`, Chrome visible mobile 390 × 844, compte QA précédent réutilisé. Connexion depuis `/auth/login?plan=pro&cycle=yearly`, navigation mobile Plus → Abonnement.

- Rappel Pro **48 000 FCFA/an**, « Aucun paiement effectué », plan réel **Découverte gratuit**, historique vide.
- Dès l'arrivée : consommation correcte **1/100 commandes, 1/1 livreur, 1/1 utilisateur**.
- **Deux rechargements complets** de la page, en attendant explicitement le chargement de `subscription-selected-intent` : rappel Pro annuel présent à chaque fois et bouton Annuel `aria-pressed="true"`. Consommation toujours correcte. L'observation précédente d'intention annuelle perdue n'est donc **pas reproduite** sur la reprise finale ; elle ne constitue pas un défaut final confirmé. La première observation avait été relevée après une attente temporelle fixe, sans attendre le rappel chargé.
- Dans un contexte sans session, les trois liens du pied de page Conditions, Confidentialité et Contact ouvrent leurs pages publiques sans redirection d'authentification.
- Aucun paiement, facture ou email déclenché ; aucune erreur HTTP >=400 sur le parcours authentifié. Chrome propre au test fermé.

Captures finales : `artifacts/launch-qa/post-sql-final/sceptique/01-subscription.jpg`, `02-reload.jpg`, `03-reload.jpg`, `04-conditions.jpg`, `04-confidentialite.jpg`, `04-contact.jpg`.
