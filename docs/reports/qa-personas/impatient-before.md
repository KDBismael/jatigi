# Warko launch QA — L’impatient — before fixes

Tested 2026-10-30, ending 21:45 UTC, against production build at http://localhost:3011. Fresh isolated real Chrome, desktop 1280×900, no mocked APIs. Approximate active journey duration: 5 minutes, excluding browser harness setup. Persona scans labels and clicks the first prominent action.

## Outcome

Signup succeeded and the real shop “QA lancement impatient” opened. Persona abandoned at onboarding because the first screen showed an error and no usable first action. No verified first product or first order. One product submission was attempted only for diagnosis after the persona abandonment point; its UI result was an error. No repeated product submission, to avoid duplicates.

## Journey and findings

1. Open `/`; click header **Essayer**. Arrive at `/auth/signup`.
2. Fill boutique, full name, phone, reserved example.com email, strong matching passwords; submit **Créer ma boutique**. After pending state, arrive at `/onboarding`. Signup actually succeeds; credentials are kept outside the repo.
3. **IMP-01 — P0, onboarding blocked.** `/onboarding` displays “Impossible de charger la configuration”, “Chargement de la configuration...” and **Réessayer** simultaneously, below the three promised actions. First persona abandonment point. Expected: enter the first product. Actual: no product fields; an error plus apparent loading state. Clicking **Réessayer** repeats the same state (2/2 onboarding loads, one account/session). `/api/onboarding` responds HTTP 500 `{"error":"Impossible de charger la progression"}`. Screenshot: `artifacts/launch-qa/before/impatient/02-onboarding-blocked.jpg`. Earlier screenshot `01-signup-pending.jpg` also captures this onboarding error despite its filename.
4. Diagnostic continuation only: click sidebar **Produits**. `/products` displays “0 actif(s) · 0 archivé(s)” and “Aucun produit. Ajoutez votre premier produit.” However `/api/products` returned HTTP 500 with `Could not find a relationship between 'products' and 'product_variants' in the schema cache`. **IMP-02 — P1, failed catalogue load presented as a healthy empty catalogue.** Observed once, with repeated products API failures in this session. Expected: distinguish an unavailable catalogue from zero inventory. This empty state encourages creating a product while the catalogue is unavailable.
5. Click **+ Ajouter un produit**; `/products/new` opens. Enter “Sac QA impatient”, stock 10, supplier total 10000 FCFA, unit sale price 2000 FCFA. Submit **Enregistrer le produit** once. **IMP-03 — P0, first product cannot be verified.** Remain on form with literal `Error: {"error":"Error: Produit créé mais introuvable"}`. POST `/api/products` HTTP 500 reports that error. The wording implies a possible write but no successful retrieval; creation/persistence is NOT asserted. Screenshot: `artifacts/launch-qa/before/impatient/03-product-created-unfindable.jpg`. Reproduction: 1/1 submission; deliberately not repeated to avoid duplicate records. No order attempted because there is no verified selectable product and root requested finalization.

## Other observed failures and limits

The app also requested `/api/billing`, receiving HTTP 503 `{"error":"Impossible de traiter l’abonnement. Réessayez.","code":"BILLING_UNAVAILABLE"}`. No payment flow or external messaging was used. Database causes are not inferred from UI beyond returned response text. Onboarding, first order, delivery and reversement success remain unverified.

Two initial shared Playwright MCP launches failed before opening a page due to an existing browser profile lock. These are harness issues, excluded from product findings. Testing then used an independent Chrome process and fresh context, closed at completion.

QA harness: `scripts/qa-personas/impatient.mjs` (interactive real browser, owned process/context). Account credentials and saved authenticated state remain in private temporary files; report intentionally excludes secrets. The account/shop was retained for retest. No source edits, commits, push or deployment performed.
