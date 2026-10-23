# Printing and delivery driver archiving

Approved scope: printing for every user with access to orders; installation of printer helpers is acceptable. Removing a former driver must preserve financial history.

Implementation choices: use existing Next.js/React architecture, RawBT Android intents, QZ Tray desktop integration with explicit user permission, and system printing/AirPrint. Android paired printer selection is handled by RawBT; do not pretend the website can enumerate Bluetooth Classic devices. Hardware printing requires physical validation. No commit, push or deployment in this task.

## Driver archiving

- [x] Write failing service/API tests for an administrator-only, tenant-scoped `PATCH /api/delivery-drivers/[id]` accepting only `is_active`.
- [x] Update the existing driver record rather than deleting it. Missing or other-tenant IDs return 404. Keep historical orders and settlements in all financial calculations.
- [x] Add Active/Archived views and archive/restore actions in Livraisons. Keep settlement recording available for archived drivers and label global totals as including archived drivers.
- [x] Prevent new assignments to archived drivers in both API and SQL. Preserve existing assignments when editing unrelated fields. Row-lock the driver during assignment so archiving and assignment serialize.
- [x] Test real Postgres migration behavior with PGlite: archived assignments rejected, historical records unchanged, final settlement permitted, foreign-tenant assignment rejected.

## Printing

- [x] Test Save and print saving exactly once, navigating only on success and retaining input on failure. Add an optional second action to OrderForm; no administrator gate.
- [x] Add a printer picker on the existing authenticated print page and open it after Save and print. Maintain PDF as a separate download.
- [x] Store device-local printer/format preferences scoped by user and organization. Support system, Android RawBT and installed QZ desktop printer choices; provide setup/help and retry.
- [x] Send an authenticated, browser-fetched PDF to QZ as base64 so private orders are not made public. Use unsigned QZ permission prompts; no unrestricted server-side message signer.
- [x] Rasterize the existing receipt HTML for RawBT ESC/POS graphics to preserve accents and logos. Bound dimensions/payload, strip controls from external intent construction and use a fixed Android package. Android handoff requires a user click after preparing data; report handoff rather than claiming confirmed paper output.
- [x] Test preference validation, raster packing, RawBT intent, QZ transport and failure states; visually check mobile picker and download/system fallbacks.

## Verification

- [x] Run full Vitest, ESLint, TypeScript, production build and document runtime trace check. Review all changed files and document helper setup and physical-device test limitations.

Verified: 169 tests passed; ESLint and TypeScript passed; production build and document runtime trace check passed. Independent read-only review found no important issue. Android 58/80 mm browser raster and system flow checked locally. Physical printing remains unverified; no printer was available. Migration has not been applied remotely.
