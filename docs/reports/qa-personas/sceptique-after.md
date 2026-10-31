# Le sceptique — après corrections

Retest réel le 30 octobre 2026 sur le build corrigé déjà lancé à `http://localhost:3011`, Chrome installé **avec fenêtre**, contexte neuf 1280 × 900. Aucun rebuild, changement applicatif, mock, accès API direct, paiement ou message. Un seul nouveau compte jetable créé : boutique **QA lancement sceptique après**. Identifiants uniquement dans `/private/tmp/warko-qa-sceptique-after.json` ; ancien fichier conservé. Une seconde exécution s’est connectée à ce même nouveau compte pour attendre les réponses serveur et compléter les preuves. Tous mes navigateurs ont été fermés.

## Résultat

**Corrections de confiance vérifiées ; parcours produit et abonnement toujours bloqués.** Ce retest ne constitue pas un feu vert de lancement ou de paiement.

| Référence au rapport avant | Après corrections | Preuve |
| --- | --- | --- |
| B1 : onboarding bloquant | **Résiduel.** Inscription réussie et boutique authentifiée visible dans `/onboarding`. Le chargement initial est transitoire ; après réponse serveur, il disparaît. Message désormais explicite : « Votre boutique est créée. La configuration est temporairement indisponible. » Réessayer et Contacter le support disponibles. Réessayer reproduit l’erreur, aucune étape produit/commande accessible dans l’assistant. | `04-onboarding-blocker.jpg` |
| B2 : Abonnement indisponible | **Résiduel.** `/subscription` affiche encore « Impossible de traiter l’abonnement. Réessayez. Actualiser ». Aucun montant de checkout, activation Pro, annulation réelle ou restauration du cycle dans les cartes d’abonnement vérifiable. Aucun paiement tenté. | `05-billing-blocker.jpg` |
| B3 : liens Conditions/Confidentialité/contact absents | **Corrigé sur les surfaces testées.** Chaque lien cliqué depuis le pied de page public puis depuis l’inscription mène sans authentification à `/conditions`, `/confidentialite`, `/contact`. Chaque page affiche un titre et `support@warko.app`. Cela vérifie l’accessibilité des pages, pas une validation juridique. | `01-conditions.jpg`, `01-confidentialite.jpg`, `01-contact.jpg`, `02-signup-annual-intent.jpg` |
| B4 : intention annuelle perdue à l’inscription | **Corrigé jusqu’à la connexion.** Annuel affiche Pro **48 000 FCFA/an**. CTA `/auth/signup?plan=pro&cycle=yearly` ; inscription récapitule **Pro · 48 000 FCFA / an**, et précise l’absence de paiement à cette étape. L’onglet Connexion conserve `/auth/login?plan=pro&cycle=yearly`, le même montant et la même période ; retour inscription conserve le choix. **Vérification de bout en bout bloquée par B2.** | `02-signup-annual-intent.jpg`, `03-login-annual-intent.jpg` |
| B5 : WhatsApp non configuré exposé dans Support | **Présentation corrigée.** `/support` propose seulement `support@warko.app` ; le commentaire technique WhatsApp n’est plus affiché. Aucune disponibilité WhatsApp ni délai effectif de réponse prouvé. | `06-support.jpg` |

## Erreurs réseau réellement observées

Réponses enregistrées passivement pendant les actions navigateur, URLs sans paramètres ni identifiants :

- `/api/onboarding` → **500**, répété après connexion, visite onboarding et Réessayer.
- `/api/products` → **503**.
- `/api/billing` → **503**.

L’inscription a réellement abouti à `/onboarding`. Aucun produit ni commande n’a été soumis dans ce retest. Le message d’erreur amélioré empêche le faux chargement permanent, mais ne rétablit pas la configuration manquante.

## Limite externe restante

L’identité juridique vérifiée de l’exploitant reste non fournie et non vérifiée. Les nouvelles pages informatives ne suffisent pas à lever ce point avant production. Aucune entité, adresse, immatriculation ou juridiction n’a été inventée pour ce retest.

Preuves : `artifacts/launch-qa/after/sceptique/` (8 JPEG, qualité 60). Script reproductible : `scripts/qa-personas/sceptique-after.mjs --follow` pour reprendre le compte après sans créer de compte supplémentaire. Les lectures trop précoces de navigation et un sélecteur ambigu dans la première exécution du script QA ont été corrigés ; seules les URLs stabilisées et les réponses serveur finales figurent comme conclusions ici.
