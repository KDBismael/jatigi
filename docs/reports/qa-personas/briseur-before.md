# Briseur — Chrome visible, avant corrections

Test réel le 30 octobre 2026, production locale `http://localhost:3011`, Chrome installé, `headless:false`, viewport 1280 × 900. Aucun code produit lu avant le parcours. Une boutique jetable « QA lancement briseur » créée, identifiants/session dans `/private/tmp/warko-qa-briseur.json` et `/private/tmp/warko-qa-briseur-state.json`.

## Blocages constatés

1. **Bloquant : onboarding inaccessible après inscription réussie.** Accueil → « Essayer gratuitement » → formulaire valide → double clic « Créer ma boutique », puis Entrée. Un seul `POST /api/auth/signup` → **201**, connexion → **200**, arrivée `/onboarding`. L’écran affiche « Impossible de charger la configuration » en gardant « Chargement de la configuration... ». Un clic « Réessayer » produit `GET /api/onboarding` → **500** et le même écran. Preuves : `artifacts/launch-qa/before/briseur/07-onboarding.jpg`, `08-onboarding-retry.jpg`.

2. **Majeur : erreur catalogue présentée comme un catalogue vide.** Cliquer « Produits » : `GET /api/products` → **500**, écran « 0 actif(s) · 0 archivé(s) », « Aucun produit. Ajoutez votre premier produit. », aucune erreur visible. Preuve : `09-products.jpg` dans le même dossier.

3. **Bloquant : création produit ambiguë, message technique.** « + Ajouter un produit » → nom « QA briseur produit », quantité 2, achat total 1000, transport 0, emballage 0, vente 1000 → un clic « Enregistrer le produit ». Un seul `POST /api/products` → **500**. Formulaire conservé, erreur exacte `Error: {"error":"Error: Produit créé mais introuvable"}`. Aucun second clic, aucun succès affirmé. Commande non tentée car produit indisponible. Preuve : `11-product-submit-failure.jpg`. Risque de doublon si l’utilisateur répète ce bouton après cette erreur ambiguë.

4. **Validation téléphone absente côté interface.** Nouveau contexte isolé sans connexion, formulaire complet avec téléphone `bananes`, nom `!!!`, boutique `<b>QA briseur</b>`, email valide, mots de passe forts identiques. Après blur : téléphone conservé, `checkValidity() === true`, message navigateur vide, bouton `aria-disabled="false"`. Aucun envoi avec ces données ; acceptation serveur non établie. Preuve : `12-malformed-phone-accepted.jpg`.

## Comportements corrects et limites

- Email `junk@@` : « Email invalide ». Confirmation différente : « Les deux mots de passe ne correspondent pas. ». **0 POST**. Preuves `03-junk-submit.jpg`, `04-mismatch.jpg`. Le clic sur ce formulaire invalide a été forcé pour inspection, pas une preuve d’accès normal au bouton.
- HTML ressemblant à une balise resté littéral dans les champs, aucune exécution observée ; pas de conclusion de sécurité générale.
- Retour navigateur vers accueil puis avant vers inscription : formulaire réinitialisé, sans erreur persistante (`05-back-forward.jpg`).
- Double clic + Entrée valides : **exactement 1 inscription**, aucune duplication réseau (`06-valid-double-submit.jpg`, `post-requests.json`).
- Total : 1 boutique réussie, 1 produit ambigu. Aucun paiement, email, commande, mock, appel direct API ou répétition après erreur.
- Seuls les contextes et le Chrome propres à cette session ont été fermés.

## Rejeu

`scripts/qa-personas/briseur.mjs` est un harnais interactif visible : une instruction JS UI par ligne sur stdin, variables `page`, `context`, `shot`, `inspect`, `requests`. `QA_PHASE=after QA_REUSE=1 node scripts/qa-personas/briseur.mjs` réutilise la session jetable, sans créer de compte. Captures sous `artifacts/launch-qa/after/briseur`. Ne pas répéter une création ambiguë sans examen du correctif.

Exemple de reprise : `await page.getByRole('link',{name:'Produits',exact:true}).click(); await page.waitForTimeout(1500); await shot('products-retest'); await inspect();`.
