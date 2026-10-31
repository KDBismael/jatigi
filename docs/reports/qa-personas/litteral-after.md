# QA lancement — persona littéral francophone — après corrections

30 octobre 2026, version compilée corrigée http://localhost:3011. Même persona novice francophone, Chrome personnel visible, contexte neuf 1280 × 900, nouveau compte. Aucun code applicatif modifié, aucun paiement, e-mail envoyé, mock ou contournement API.

## Résultat

Inscription réussie. Les corrections de rédaction et d’état d’erreur sont vérifiées dans le navigateur. Le service reste indisponible : aucun produit ni première commande n’a pu être créé. Ce retest ne valide donc pas le parcours fonctionnel complet.

Les constats du rapport avant n’avaient pas d’identifiant explicite : les ID LIT-01 à LIT-05 ci-dessous reprennent exactement leur ordre.

| ID / constat avant | Statut après | Observation réelle |
| --- | --- | --- |
| LIT-01 — assistant inutilisable / messages contradictoires | Rédaction corrigée ; blocage fonctionnel persistant | `/onboarding` affiche « Impossible de charger la configuration », puis « Votre boutique est créée. La configuration est temporairement indisponible. », « Réessayer » et « Contacter le support ». Le faux « Chargement de la configuration... » a disparu. Une tentative Réessayer revient à cette erreur. |
| LIT-02 — produit non accessible après création | Erreur récupérable clarifiée ; création toujours bloquée | `/products` signale « Impossible de charger les produits. Réessayez. » avec bouton Réessayer. Le faux état « Aucun produit » a disparu ; les onglets affichent encore Actifs (0), Archivés (0). Nouvelle tentative sans récupération. Un seul enregistrement depuis `/products/new` donne « Impossible de créer le produit. Le catalogue est momentanément indisponible. Réessayez plus tard. ». Aucune réussite annoncée ; commande toujours impossible sans produit. |
| LIT-03 — erreur anglaise / JSON | Corrigé | Le message de création est une phrase française simple. Aucun `Error:`, JSON ou « Produit créé mais introuvable » visible. Les valeurs du formulaire restent présentes. |
| LIT-04 — coût emballage total ou unitaire | Corrigé | Libellé « Total emballage (FCFA) », opposé à « Prix de vente unitaire (FCFA) » : la portée du coût est claire. |
| LIT-05 — CA / COD / live sans explication | Persistant, secondaire | Le pied de page d’accueil conserve « COD ». « Objectifs & lives » dans le menu et « Session live (optionnel) » dans le formulaire commande restent visibles. Pas de blocage causé par ces termes pendant ce parcours. |

## Étapes et preuves

Toutes les captures sont dans `artifacts/launch-qa/after/litteral/`.

1. `/` → premier « Essayer gratuitement » : `01-accueil.jpg`.
2. `/auth/signup` → création de Boutique QA littéral après avec données jetables et mot de passe valide. Arrivée `/onboarding`, utilisateur et boutique présents : `02-onboarding.jpg`.
3. Clic « Réessayer » de l’assistant : erreur temporaire toujours affichée avec lien support et sans faux chargement : `03-onboarding-reessayer.jpg`.
4. Menu « Produits » → `/products` : état d’erreur français et bouton de récupération : `04-catalogue-erreur.jpg`. Après « Réessayer » : `05-catalogue-reessayer.jpg`.
5. « + Ajouter un produit » → `/products/new` : libellé total emballage visible : `06-produit-champs.jpg`.
6. Savon QA littéral après ; quantité 10 ; fournisseur 10 000 FCFA ; transport 1 000 FCFA ; total emballage 500 FCFA ; prix unitaire 2 000 FCFA. Coût calculé 1 150 FCFA, marge 850 FCFA, bénéfice estimé 8 500 FCFA : `07-emballage-total.jpg`.
7. Un clic « Enregistrer le produit » : erreur française claire, reste sur le formulaire : `08-produit-indisponible.jpg`.
8. Menu « Commandes » → « + Nouvelle commande » → `/orders/new` : liste produit contenant uniquement « Sélectionner un produit », aucun savon disponible. Pas de commande enregistrée : `09-commande-bloquee.jpg`.

Les codes HTTP et l’état de schéma n’ont pas été diagnostiqués par ce parcours UI : seul le comportement visible ci-dessus est confirmé. La cause technique reste à traiter séparément avant de déclarer le lancement fonctionnel.

Chrome personnel fermé après les preuves. Identifiants privés : `/private/tmp/warko-qa-litteral-after.json`. Session privée : `/private/tmp/warko-qa-litteral-after-auth.json`. Ces deux fichiers sont en mode 0600 ; aucune valeur secrète recopiée ici.
