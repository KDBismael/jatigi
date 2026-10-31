# Product QA fixes

The initial real-browser failure is documented in `impatient-before.md`. This fix pass changes only the product client/service/API flow; no remote schema or data changes were made.

- Failed catalogue reads now retain cached products, show a French error with a retry action, and suppress the misleading healthy empty state. Stale displayed data is labeled.
- Product mutations parse API errors rather than displaying serialized JSON. The new-product page displays `Error.message` without an `Error:` prefix.
- Before the atomic product/initial-lot RPC, the service verifies the exact enriched product read schema using a tenant-scoped zero-row query. Missing variant/offer/image relations prevent the write.
- A successful RPC followed by a failed read is acknowledged through HTTP 202 with the committed ID and a typed `ProductCreationAcknowledgedError`. No fake Product is added to the store. The hook blocks repeat creation until a successful refresh confirms that ID, and the new-product page replaces its submission form with a catalogue recovery link. Existing inventory/history is never deleted or rolled back.
- The FIFO RPC, tenant filters, relations, and non-admin cost masking are preserved.

Validation: six initial regression tests were observed failing before implementation. Final scoped run: **18 tests passed across seven files**, `--maxWorkers=2`, including catalogue UI, new-product recovery UI, API responses, service write safety, hook cache/error/duplicate guard, existing archive helpers and pricing. Scoped ESLint passed. The runtime emits the existing Node `module.register()` deprecation warning.

`tsc --noEmit` at 21:52 UTC reported no product-file errors but did fail on concurrently edited auth-form tests (`exact` option in getByRole) and not-yet-created legal-page imports; these were reported to root for owner follow-up. Full suite/build and all-persona browser retests are coordinated by root after the shared fix batch. No new production-browser success is asserted yet. The absent remote schema still requires deployment work; these changes surface that failure safely rather than pretending it is repaired.
