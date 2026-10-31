# Mobile novice launch QA — before fixes

Tested latest compiled app at http://localhost:3011 on 2026-10-30. Fresh real Chrome context, 375 × 812 CSS px, mobile/touch enabled. CDP network throttling: latency 400 ms, download 64,000 bytes/sec (500 Ki bits/sec), upload 32,000 bytes/sec (250 Ki bits/sec), offline false. This is a slow-3G approximation; CPU was not throttled. Chrome emulation cannot establish real iOS keyboard or auto-zoom behavior.

**Outcome: signup succeeds; first product and first order cannot be completed.** No mocks, bypasses, payments, emails, or duplicate product submission. Disposable credentials stored only at `/private/tmp/warko-qa-mobile.json` (0600). The exclusive mobile QA process was stopped after testing (Playwright handles SIGINT cleanup). No app implementation read or changed.

## Journey and evidence

1. Open homepage. DOMContentLoaded in 1,803 ms, under the stated throttle. Clear value proposition and free signup CTA. Document width 375 px, no horizontal overflow. Header login and signup targets 44 px tall. [Homepage](../../../artifacts/launch-qa/before/mobile/01-home.jpg).
2. Tap first “Essayer gratuitement”. Reaches `/auth/signup`. Form asks boutique, full name, telephone, email, password and confirmation. Filled shop/name “QA lancement mobile”, disposable example.com email, strong generated password. Signup fields 16 px, tabs and password toggles 44 px, submit 50 px. No overflow. [Signup](../../../artifacts/launch-qa/before/mobile/02-signup.jpg).
3. Submit signup once. After 3,525 ms route is `/onboarding`, still shows “Chargement de la navigation / Chargement...”. Later inspection shows the shell and onboarding failure. This sampling establishes loading still present at 3.5 s, not the exact final load time. [Loading](../../../artifacts/launch-qa/before/mobile/03-signup-result.jpg).
4. Onboarding displays “Impossible de charger la configuration” together with “Chargement de la configuration...” and “Réessayer”. Tap retry once; same state remains. Actual browser requests: GET `/api/products` 500, GET `/api/onboarding` 500, GET `/api/billing` 503; retry GET `/api/onboarding` 500. No auth/request credentials recorded. [Initial failure](../../../artifacts/launch-qa/before/mobile/04-onboarding.jpg), [retry failure](../../../artifacts/launch-qa/before/mobile/05-onboarding-retry.jpg).
5. Use visible Produits bottom nav. `/products` presents “0 actif(s) · 0 archivé(s)” and “Aucun produit. Ajoutez votre premier produit.” even though its product request failed 500. This makes a failed load look like a valid empty boutique. [False empty catalogue](../../../artifacts/launch-qa/before/mobile/06-products.jpg).
6. Tap “+ Ajouter un produit”. Fill product “Produit QA mobile”, quantity 10, purchase 10000, transport 1000, packaging 500, sale price 2500. UI calculates cost 1150, margin 1350, total estimated profit 13500 FCFA. Tap save once. POST `/api/products` returns 500. Remain `/products/new`, entered values preserved, error exposes raw technical JSON: `Error: {"error":"Error: Produit créé mais introuvable"}`. It suggests a write may have happened but cannot establish that. Did not retry to avoid duplicate stock/product. [Form](../../../artifacts/launch-qa/before/mobile/07-product-form.jpg), [submit](../../../artifacts/launch-qa/before/mobile/08-product-submit.jpg), [error at top](../../../artifacts/launch-qa/before/mobile/10-product-error-top.jpg).
7. Open Commandes then “+ Nouvelle commande”. `/orders/new` opens, but product selector contains only “Sélectionner un produit”; no usable product. First order blocked upstream, not submitted. Date input is native `type=date`, prefilled `2026-10-30`, 138.5 px wide; click tested without value change. [Orders](../../../artifacts/launch-qa/before/mobile/11-orders.jpg), [order form](../../../artifacts/launch-qa/before/mobile/12-order-form.jpg), [date interaction](../../../artifacts/launch-qa/before/mobile/13-native-date.jpg), [bottom actions](../../../artifacts/launch-qa/before/mobile/14-order-bottom.jpg).

## Issues for launch

- **P0: new-shop onboarding backend failure.** Repro: fresh signup → onboarding → retry. Configuration and product APIs fail, blocks the promised first actions.
- **P0: product creation cannot be confirmed.** Repro: Products → Add → fill valid stock/prices → save. 500, raw “Produit créé mais introuvable”. No navigable product and order selector empty.
- **P1: failed catalogue reads render a success-looking empty state.** A novice thinks no products exist rather than seeing a recoverable service error.
- **P1: contradictory onboarding error/loading text.** A novice cannot tell whether to keep waiting or retry.
- **P2: product and order controls use 14 px computed font at 375 px.** Signup uses 16 px. On iOS this is an auto-zoom risk; not reproduced on physical Safari. Product form numeric cost columns are cramped but remain within viewport.

## Mobile checks

- Width stayed 375 px on homepage, signup, onboarding, product form and order form; no document overflow observed.
- Visible onboarding action targets 44 px; bottom nav five items each approximately 73 × 72 px at y=740..812.
- Product save after scroll: y=672, height44, ends716, above nav740. Order create after scroll: y614, height46, ends660; second print action also visible above nav. No bottom-nav obstruction of these actions observed.
- Native date type confirmed, no custom picker failure observed in Chrome emulation. Real handset keyboard, viewport resize, iOS zoom and native picker UX remain unverified.
- Input entry and form calculations responded during automation; no meaningful keystroke latency measurement performed. Data loading reliability, rather than narrow layout, stopped the journey.

## Test harness notes

MCP browser profile collision prevented its initial use. A local script `scripts/qa-personas/mobile.mjs` ultimately launched its own Chrome process and fresh context. Automatic review initially rejected a CDP helper because it could reuse contexts; that helper was replaced before any signup/data action. The final harness never reused another browser context. No dependency installation, commits, push or deployment.
