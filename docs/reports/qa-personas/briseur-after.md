# Briseur — retest Chrome visible après corrections

30 octobre 2026, production locale corrigée `http://localhost:3011`, nouveau Chrome réel `headless:false`, nouveau contexte 1280 × 900. Parcours effectué uniquement par interface, backend réel. Aucun changement produit, SQL, mock ou contournement. Chrome propre à la session fermé à la fin.

| Point | Résultat observé | Statut |
| --- | --- | --- |
| Téléphone `bananes`, autres champs valides, mots de passe forts identiques, Entrée | « Saisissez un numéro de téléphone valide. », reste sur inscription, **0 POST** | Corrigé |
| Téléphone remplacé par `0700000000`, double clic inscription puis Entrée | **1 POST /api/auth/signup → 201**, connexion 200, boutique créée, arrivée onboarding | Protection doublon conservée |
| Onboarding puis un clic Réessayer | `GET /api/onboarding → 500`. Message « Votre boutique est créée. La configuration est temporairement indisponible. », boutons Réessayer et Contacter le support, faux chargement disparu | Présentation corrigée ; infrastructure bloquante |
| Menu Produits | `GET /api/products → 503`. « Impossible de charger les produits. Réessayez. » et bouton Réessayer. L’ancien message « Aucun produit » a disparu ; les onglets gardent Actifs (0), Archivés (0) | Erreur explicite corrigée ; catalogue indisponible |
| Ajouter produit → nom QA briseur produit après, quantité 2, achat 1000, transport 0, emballage 0, vente 1000 → enregistrer une seule fois | **1 POST /api/products → 503**. « Impossible de créer le produit. Le catalogue est momentanément indisponible. Réessayez plus tard. » Valeurs conservées, aucun JSON brut, aucun succès ambigu | Présentation corrigée ; création bloquée |

Le test UI confirme le refus 503 et le message clair ; il ne prouve pas à lui seul l’absence physique d’une ligne partielle en base. Aucun second POST produit n’a été tenté. La première commande reste impossible à valider faute de produit accessible.

Preuves sous `artifacts/launch-qa/after/briseur` : `02-invalid-phone.jpg`, `03-double-submit.jpg`, `04-onboarding-error.jpg`, `05-onboarding-retry.jpg`, `06-products-error.jpg`, `07-product-failure.jpg`, `post-requests.json`, `summary.json`. La capture 03 contient le chargement transitoire normal immédiatement après connexion ; les captures 04/05 montrent l’erreur finale sans chargement.

Une nouvelle boutique QA après correction a été créée. Identifiants et état de connexion conservés séparément des données avant correction : `/private/tmp/warko-qa-briseur-after.json`, `/private/tmp/warko-qa-briseur-after-state.json` (permissions 0600). Aucun paiement, email ou commande. Aucun commit.
