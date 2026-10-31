# Mobile novice QA — corrected compiled build

Retested `http://localhost:3011` on 2026-10-30 in a fresh, exclusively owned real Chrome context. Same conditions as [before](mobile-before.md): 375 × 812 CSS px, mobile/touch, CDP latency 400 ms, download 64,000 bytes/sec (500 Ki bits/sec), upload 32,000 bytes/sec (250 Ki bits/sec), offline false; no CPU throttling. This approximates slow 3G. No mocks, database access, payments or email sending.

**Result: the error-handling and mobile-font fixes are verified; first-use business success is still blocked by the unchanged backend.** One new disposable signup completed. Onboarding still returns 500, product requests now fail clearly with 503, and billing remains 503. No real product/order success is claimed.

The original mobile report had issue titles rather than numeric IDs; the table preserves those exact issue references.

| Original issue reference | Retest status | Evidence |
|---|---|---|
| P0: new-shop onboarding backend failure | **Still blocked.** Fresh signup reaches `/onboarding`; actual `/api/onboarding` 500. One retry repeats 500. | [Onboarding](../../../artifacts/launch-qa/after/mobile/02-onboarding.jpg), [retry](../../../artifacts/launch-qa/after/mobile/03-onboarding-retry.jpg) |
| P0: product creation cannot be confirmed | **Underlying capability still blocked; safe failure verified.** One save with valid product/stock/prices returns 503 and stays on the form. Human-readable “Impossible de créer le produit. Le catalogue est momentanément indisponible. Réessayez plus tard.” No raw JSON or “created” claim. Entered values and calculations remain. This UI observation alone does not independently prove the backend preflight made zero writes. | [Safe product error](../../../artifacts/launch-qa/after/mobile/06-product-safe-error.jpg) |
| P1: failed catalogue reads render a success-looking empty state | **Fixed.** `/products` shows “Impossible de charger les produits. Réessayez.” and Retry, instead of the former “Aucun produit. Ajoutez votre premier produit.” Some zero-count tabs remain, but the main state explicitly identifies failure. | [Catalogue error](../../../artifacts/launch-qa/after/mobile/04-catalogue-error.jpg) |
| P1: contradictory onboarding error/loading text | **Fixed.** Failure state says the shop is created and configuration temporarily unavailable. Retry and Contact support are visible; no “Chargement de la configuration...” alongside the failure. | [Onboarding](../../../artifacts/launch-qa/after/mobile/02-onboarding.jpg) |
| P2: product and order controls use 14 px computed font at 375 px | **Fixed in Chrome emulation.** All seven product inputs/selects and all fifteen order inputs/selects measured 16 px, including native date and payment/product selectors. Physical iOS zoom remains unverified. | [Product form](../../../artifacts/launch-qa/after/mobile/05-product-form.jpg), [order form](../../../artifacts/launch-qa/after/mobile/07-order-form.jpg) |

## Journey and additional checks

1. Homepage loaded to DOMContentLoaded in **1,768 ms** (before 1,803 ms; single samples, not a performance benchmark). First free CTA → signup and first input ready took 3,212 ms including screenshot/action overhead. [Homepage](../../../artifacts/launch-qa/after/mobile/01-home.jpg).
2. Created one new QA shop, “QA lancement mobile après”. Credentials written only to `/private/tmp/warko-qa-mobile-after.json` with 0600 and exclusive-create mode; previous cohort credentials were not overwritten. Signup submit → `/onboarding` took **4,774 ms**; onboarding Retry was visible within **6,106 ms** of starting the submit action (including screenshot overhead). Authenticated shell and shop name appeared correctly.
3. Retried onboarding once. Same backend 500, clear failure/support state. Navigated through visible Produits bottom nav; catalogue request 503 and explicit load error.
4. Opened Add product. The label is now **“Total emballage (FCFA)”**. Entered quantity10, purchase10000, transport1000, packaging500, sale2500. Cost1150, margin1350, estimated total13500 FCFA remained consistent. Submitted once only; safe error 503. Did not retry or claim product persistence.
5. Opened Commandes → New order. Form renders with 16px inputs/selects; native `type=date` retained. Product selector has only “Sélectionner un produit”. No order submitted because required real product is unavailable.
6. Product and order form document widths both measured **375px**, matching viewport; no horizontal overflow. At the bottom of the order form, create button y614, height46, ends660, clear of the bottom nav at y740. Print action also visibly above nav. [Bottom actions](../../../artifacts/launch-qa/after/mobile/08-order-bottom.jpg).

Actual failed browser requests observed during this journey: `/api/onboarding`500 (initial + retry), `/api/products`503 (catalogue/read and single save path), `/api/billing`503. Request credentials and response internals were not recorded. Product-save safety is demonstrated as a controlled UI failure rather than partial-success wording; database side-effect absence requires the separate code/test/backend readiness evidence.

Screenshots are JPEG quality60. Product-error and onboarding captures were visually inspected. The exclusively owned context and Chrome browser were explicitly closed; the harness printed closure confirmation. No app files changed and no commits made. The coordinating agent reports 519 automated tests green; this retest did not rerun them and does not substitute that result for actual business-flow validation.
