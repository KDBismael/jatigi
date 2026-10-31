# Warko launch QA — L’impatient — after one fix pass

Tested 2026-10-30, ending 22:02 UTC, corrected production build at http://localhost:3011. Independent **visible real Chrome**, fresh context, desktop 1280×900. No app code changes during this retest, no API mocks, no database workaround, payment or external message. Only the owned browser/context was closed afterward.

**Launch outcome remains blocked.** A fresh signup succeeds, but the first real product and first order remain unsuccessful. Clearer errors and safer write behavior are verified; these do not constitute a completed onboarding journey.

## Journey

1. Homepage `/` → first prominent header **Essayer** → `/auth/signup`.
2. Fill a new reserved example.com account, strong matching password, shop “QA lancement impatient après”, full name and local phone. Click **Créer ma boutique** once. Reach `/onboarding` and its final unavailable state in **4.374 seconds** from submit.
3. First persona abandonment point is still onboarding. The app now says **“Votre boutique est créée. La configuration est temporairement indisponible.”**, with **Réessayer** and **Contacter le support** (`/support`). The contradictory “Chargement de la configuration...” is absent. One retry completes in approximately **807 ms** and returns the same unavailable state. Onboarding API still HTTP 500, `Impossible de charger la progression`.
4. Diagnostic continuation after abandonment: sidebar **Produits** → `/products`. GET `/api/products` now HTTP **503**, parsed French response `Impossible de charger les produits. Réessayez.`. The same message and **Réessayer** are visible; **“Aucun produit. Ajoutez votre premier produit.” is absent**. One retry returns 503 in **660 ms**. Tabs still show Actifs (0)/Archivés (0), but the healthy heading counts and empty-state invitation are suppressed when the failure settles.
5. Click **+ Ajouter un produit** → `/products/new`. Fill “Sac QA impatient après”, quantity 10, supplier total 10000 FCFA, unit sale price 2000 FCFA. Submit once. POST `/api/products` returns **503 in 533 ms** with `Impossible de créer le produit. Le catalogue est momentanément indisponible. Réessayez plus tard.`. That exact French text appears in the UI. No raw JSON, `Error:` prefix, “Produit créé mais introuvable”, or success claim. Inputs remain populated. No resubmission or order attempt.

Measured journey window from first CTA through final diagnostic product result: **113.392 seconds**, including automation interaction gaps. A terminal input buffering issue occurred before filling/submitting signup; it did not send an additional signup or alter application state.

## Before IDs and current status

| ID | Verification after fixes | Status |
| --- | --- | --- |
| IMP-01 onboarding blocked | Error is explicit, shop creation acknowledged, retry/support visible, false loading absent. Underlying onboarding 500 reproduces initial + retry, 2/2. | Error handling fixed; first-action blocker remains. |
| IMP-02 failed catalogue rendered empty | Initial + retry return 503, 2/2. UI shows retryable load error and suppresses healthy empty state. | Reported misleading empty state fixed; catalogue availability remains blocked. |
| IMP-03 product write followed by unreadable error | Single submit returns friendly 503 in 533 ms; no post-write “créé mais introuvable” or raw error. | Browser confirms safe unavailable response; first product success still blocked. |

The product service regression tests establish that the required related-schema preflight runs before the RPC and prevents it on failure. **Browser-only evidence cannot independently prove database row absence**; no direct database read was used to manufacture that proof. No created product is asserted. The HTTP 202 post-commit recovery branch was covered by automated tests, not exercised against the missing-schema deployment.

Billing also remains HTTP 503 `BILLING_UNAVAILABLE`. Remote missing schema was intentionally unchanged for this retest. Root reported the shared automated suite green (519 tests); this report records the independent browser outcome, which is not green for launch.

## Evidence

- `artifacts/launch-qa/after/impatient/01-onboarding-unavailable.jpg`
- `artifacts/launch-qa/after/impatient/02-catalogue-error-retry.jpg`
- `artifacts/launch-qa/after/impatient/03-product-preflight-unavailable.jpg`
- `artifacts/launch-qa/after/impatient/network-errors.json` — response status/body only, no request headers or credentials.

New account credentials are in `/private/tmp/warko-qa-impatient-after.json`, authenticated state in `/private/tmp/warko-qa-impatient-after-state.json`; original before-account credentials remain untouched. QA account retained for any later authorized retest. Harness: `scripts/qa-personas/impatient-after.mjs`.
