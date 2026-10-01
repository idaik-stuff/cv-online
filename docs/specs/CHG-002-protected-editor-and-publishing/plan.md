# Plan: CHG-002 | Protected online editor with draft/publish and public CV pages

Status: `in-progress` | Technical owner: Idaika Iglesias | Accepted by / date: Idaika Iglesias, 2026-10-01.
Spec: [spec.md](spec.md) | Verification scope: `broad` (L3) + independent review.

## System inspection

**Repository.** It contains no application code. The only checks are framework checks ([README commands](../../../README.md#commands)). `.sdd/verification.json` registers no product checks.

**Environment** (inspected 2026-10-01):
- Python 3.14 and Git are available.
- Node.js and npm were not installed. Node.js 24.21.0 LTS and npm 11.19.0 were installed with scoop, with the owner's authorization, on 2026-10-01. Wrangler is installed per project in step 1.

**Predecessor editor** (`private/editor-cvs-idaika.html`, local and ignored; inspected 2026-10-01). Confirmed facts that shape this plan:

1. **Each CV is a complete, self-editing HTML document of about 74 KB.** It includes:
   - its own Spanish toolbar (`.toolbar` with Save, HTML, Reset, PDF buttons),
   - `contenteditable="true"` on `#cv`,
   - an inline script that autosaves to `window.storage`, replaces the photo on click, and pastes plain text only,
   - the photo as a base64 data URI,
   - Google Fonts links (Libre Baskerville, Source Sans 3, Caveat),
   - print CSS with `@page { size: A4; margin: 0 }`.
2. **The outer editor** loads a CV into an iframe through `srcdoc`, injects a style that hides the inner toolbar, and applies formatting with `document.execCommand`. On save, it strips its injected style and serializes the iframe document.
3. **"Find" and "Jump to CV text" operate on the source-code textarea** (the view-source panel), not on the rendered CV. The spec drops view source, so both tools lose their target (see *Deviations*).
4. **Photo replacement** (click the photo, choose a file) lives in the CV document's inner script. The spec's tool list does not mention it (see *Deviations*).

**Consequence.** Publishing a predecessor document unchanged would expose a Spanish toolbar, editable content, and scripts on the public page, which violates AC-12 and AC-14. Stored CVs must therefore be **clean documents**. Editing behavior is injected only inside the editor.

## Technical approach

One Cloudflare Worker ([ADR-0001](../../adr/0001-hosting-on-cloudflare-workers.md)) with a binding to a dedicated R2 bucket ([ADR-0002](../../adr/0002-cv-storage-in-dedicated-r2-bucket.md)) and Basic Auth on every editor path ([ADR-0003](../../adr/0003-editor-authentication-with-basic-auth.md)).

**Clean document contract.** A stored CV is a standalone HTML document with no scripts, no `contenteditable`, and no editor toolbar. The editor makes `#cv` editable at load time and strips everything it injected before saving, extending the predecessor's existing `#__ed` stripping. The fictional sample CVs are written in this clean form. CAP-08 will apply the same cleaning when importing the real CVs. This preserves R2 (the public page is the exact saved document) while satisfying AC-12.

**Routing (observable contract):**

| Path | Auth | Behavior |
| --- | --- | --- |
| `/{slug}` | none | Published snapshot → 200; otherwise the "not found" page → 404 |
| `/` | none | "Not found" page → 404 (spec decision) |
| `/admin/` and `/admin/*` (editor UI) | Basic Auth | Editor static assets, served only after authentication |
| `/admin/api/*` | Basic Auth + same-origin check on writes | JSON API: list, read draft, save draft, publish, unpublish, discard |

**Storage layout (R2):**
- per CV: `cvs/{id}/meta.json` (name, slug, timestamps, SHA-256 of the draft and of the published snapshot) and `cvs/{id}/draft.html`;
- public snapshots: `public/{slug}.html`.

Status is derived by comparing hashes (R3), never stored by hand. In this change `id` equals the slug: slugs only become editable in CAP-05, which will revisit this.

**Editor UI.** A vanilla HTML/JS port of the predecessor's outer editor (no framework, no build step for browser code):
- a list page,
- an edit page with the same formatting tools and English labels,
- Save draft, Publish, Unpublish, Discard changes, and Print/PDF.

**Worker code.** TypeScript, bundled by Wrangler. Tests use Vitest with the Workers pool (Miniflare), with a simulated R2 and secrets.

**Rejected:**
- Serving editor assets as public static files: AC-01 requires refusing the editor itself.
- Publish-time HTML sanitizing of arbitrary predecessor documents: more code than enforcing the clean contract at the source.
- A framework UI (React and similar): no requirement justifies it.

## Affected components and contracts

All paths are **proposed**. None exist yet.

| Area / path | Proposed change | Impact / consumer |
| --- | --- | --- |
| `package.json`, `wrangler.jsonc`, `tsconfig.json` | Node project; Worker config with an R2 binding to the dedicated bucket, assets directory, and the editor paths routed through the Worker first | Development and deployment |
| `src/worker.ts` (+ small modules: `auth`, `store`, `routes`) | Request routing, Basic Auth, R2 access, status derivation, security headers | All requests |
| `public/admin/` | Editor list and edit pages, CSS, JS | Owner |
| `public/` 404 page or a Worker-rendered response | "Not found" page | Readers |
| `seed/` | One or two fictional, clean sample CVs + meta, and a seeding script (Wrangler R2 object put, local or remote) | Initial content |
| `test/` | Worker integration tests | Verification |
| `.sdd/verification.json`, `README.md` | Register product checks and commands | Framework gate |
| Public URL contract `/{slug}` | New public contract (R4) | Anyone holding a link |

## Risk-proportionate strategy

| Area | Decision, check, or reason for non-applicability |
| --- | --- |
| Compatibility and consumers | New contract `/{slug}`; no existing consumers. Slugs of published CVs must not change (R4). Covered by AC-08 and AC-10 to AC-12 tests. |
| Data, integrity, and migration | No migration: greenfield, fictional seed. Publish writes `public/{slug}.html` first, then `meta.json`. A failure in between leaves a correct public page and a stale status. Publish is idempotent, so retrying fixes it. Hashes make status derivation deterministic. There is no version history: publish overwrites, which is accepted (MVP exclusion). |
| Permissions, security, and privacy | **Core L3 risk.** One auth gate in front of every `/admin` path, including assets. Default deny: unknown `/admin` paths need auth too. Secrets `ADMIN_USER`/`ADMIN_PASSWORD` are set by the owner with `wrangler secret put`; the agent never handles their values. A `.dev.vars` file with test values is gitignored. Constant-time comparison. Writes require `Origin`/`Sec-Fetch-Site` same-origin (CSRF, because Basic Auth credentials are sent automatically). Public pages: CSP blocking scripts (defense in depth against stored markup), `X-Content-Type-Options`. Editor responses: `Cache-Control: no-store`, `X-Robots-Tag: noindex`. Slugs validated against `^[a-z0-9-]+$`, so `../` cannot traverse into other R2 keys. The R2 binding exists for the dedicated bucket only; no account-wide API token is created. No credentials or real CVs are tracked (pre-commit review + gitignore). Residual risk: brute force against Basic Auth. Mitigated by a long random password; platform rate limiting is optional. |
| Failures, load, and availability | Single-user writes; no concurrency control beyond last-write-wins (accepted; one editor). R2 errors → 5xx with no partial content; the editor shows the failure and keeps unsaved edits in the page. Load is negligible (free tier). |
| Change observability | Workers logs enabled: one line per auth failure (path and time, never credentials), per save, publish, unpublish, and discard (CV id), and per 5xx. No CV content in logs. |
| Rollout and feasible recovery | First deployment to the default `*.workers.dev` address, done only with explicit owner authorization. Code rollback: `wrangler rollback` to the previous version. Data: only fictional seed in this change; the bucket can be emptied and reseeded. Recovery for real CVs (CAP-08) is to be planned in that change. Before then, the predecessor file stays as the owner's fallback. |

## Implementation steps

1. **Toolchain.** Node.js is available (see *System inspection*). Scaffold `package.json`, Wrangler, TypeScript, and Vitest with the Workers pool. Register `test` and `typecheck` as product checks in `.sdd/verification.json` and the README. *Check:* `scripts/verify focused` runs them (empty suite passes).
2. **Auth gate + routing skeleton.** Basic Auth on `/admin*`, the same-origin check on writes, the 404 page, and `/` → 404. *Check:* tests for AC-01, AC-02, AC-03, and AC-11.
3. **Storage and API.** R2 store module, the list/draft/save/publish/unpublish/discard endpoints, hash-based status, and slug validation. *Check:* tests for AC-04 and AC-06 to AC-10.
4. **Public page serving.** `/{slug}` from `public/{slug}.html` with headers (CSP, caching). *Check:* tests for AC-08, AC-10, and AC-12.
5. **Fictional sample CVs + seeding script.** Clean documents with the predecessor's design and no real data, with a placeholder image instead of a photo. *Check:* AC-15 review.
6. **Editor UI port.** List and edit pages, the predecessor's formatting tools with English labels, and clean-document injection and stripping. *Check:* manual procedure for AC-05, AC-13, and AC-14.
7. **Local end-to-end run** with `wrangler dev` (simulated R2). *Check:* manual walkthrough of all AC.
8. **Independent review** (L3) in a fresh read-only session.
9. **First deployment.** Only with the owner's explicit authorization at that moment. The owner runs `wrangler login`, creates the bucket, and sets the secrets herself; then deploy and seed remotely. *Check:* production smoke test of AC-01, AC-03, AC-08, AC-11, and AC-12.

## Verification plan and traceability

The commands in steps 1–4 do not exist yet. Step 1 creates and registers them. Until then they are **pending**, not evidence.

| AC / risk | Test, check, or manual procedure | Command / location / environment | Expected result |
| --- | --- | --- | --- |
| AC-01 | Requests without credentials to `/admin/`, an asset under `/admin/`, and every `/admin/api/*` route | `npm test` (Workers pool, local) | 401 with `WWW-Authenticate`; body contains no draft or list data |
| AC-02 | Wrong user; wrong password; malformed header | `npm test` | 401 as in AC-01 |
| AC-03 | Valid credentials | `npm test`; manual in a browser | 200 list page |
| AC-04 | List API returns name, URL, derived status, and last edit for seeded CVs in each status | `npm test`; manual UI check | Fields present; status matches R3 |
| AC-05 | Each tool: bold, italic, underline, bullets, font size, colors (presets + custom), remove formatting, undo/redo, print/PDF | Manual procedure, local `wrangler dev` + production | Each changes the CV text as in the predecessor |
| AC-06 | Save in browser A, open in a separate browser profile B | Manual (local + production) | Same draft |
| AC-07 | Save draft on a published CV, then fetch `/{slug}` | `npm test` + manual | Public body unchanged; status `Unpublished changes` |
| AC-08 | Publish, then fetch `/{slug}` | `npm test` (byte equality draft ↔ public) + manual visual check | Identical bytes; status `Published` |
| AC-09 | Discard on `Unpublished changes` | `npm test` | Draft equals published; status `Published` |
| AC-10 | Unpublish, then fetch `/{slug}` | `npm test` | 404; CV still listed with status `Draft` |
| AC-11 | Fetch an unknown slug, `/`, and invalid slugs (`../x`, uppercase) | `npm test` | 404 "not found" page |
| AC-12 | Fetch a published CV without credentials | `npm test` (no auth challenge; no `contenteditable`, `<script`, or `.toolbar` in the body) + manual | 200, clean page |
| AC-13 | ~375 px viewport; print preview A4 | Manual (browser device mode and print preview) | NFR-04 and NFR-05 met |
| AC-14 | Review all editor and public UI strings | Manual review of `public/` + the walkthrough | English only |
| AC-15 | Review tracked files; search for the owner's contact data and secrets | `git ls-files` review + text search before each commit | Nothing real or secret tracked |
| CSRF | Write API with a cross-site `Origin`/`Sec-Fetch-Site` and valid credentials | `npm test` | 403, no change |
| Isolation | Wrangler config binds only the dedicated bucket | Config review + independent review | One R2 binding |
| Framework | Docs and change level | `python scripts/verify broad --base <base> --level L3 --change CHG-002-protected-editor-and-publishing` | passed |

**Independent review (L3):** a fresh session using the `sdd-independent-review` agent (read-only tools), with the spec, plan, ADRs, final diff, and test evidence. The plan will record its isolation and limits. It is the same model family, so not equivalent to a human reviewer.

## Affected documentation

- `docs/architecture/overview.md`: describe the implemented Worker, R2, and auth after implementation.
- `docs/adr/0001`–`0003`: accept or revise them with the plan.
- `README.md`: product commands and the deployment procedure (no secrets).
- `docs/product/prd.md`: CAP-01, 02, 03, 04, and 06 delivery status and reference to CHG-002 on completion.
- `.sdd/verification.json`: product checks.

## Deviations and decisions during execution

Found during planning; accepted by the owner on 2026-10-01 and reflected in the spec's AC-05:

1. **"Find" and "Jump to CV text" are dropped with view source.** Both only work on the source-code panel. The browser's own find (Ctrl+F) still works on the rendered CV.
2. **Photo replacement** (click the photo to choose a new one) existed inside the predecessor's CV documents but is not in the spec. Decision: **out of CHG-002.** The sample CVs use a placeholder image. Revisit with CAP-08, where the real photo matters.
3. **Paste as plain text** (the predecessor's inner script) is kept as editor behavior. It protects the design and preserves CON-03. No scope change.

Found during implementation (2026-10-01). None changes scope, contracts, or risk:

4. **Compatibility date `2026-08-22`.** The Workers runtime bundled with the test pool supports dates up to 2026-08-22, so the Worker uses that date for both tests and deployment.
5. **Small-screen layout for CVs.** The predecessor design is a fixed-width A4 sheet, which scrolled horizontally at 375 px and failed AC-13 / NFR-04 in the local walkthrough. Fix: `@media screen and (max-width:820px)` rules in the CV document stylesheet (single column, stacked header). Desktop and A4 print are unchanged (CON-03). **CAP-08 must add the same rules when importing the real CVs.** A seed test guards it.
6. **Seed script removes public snapshots.** Re-seeding first left a public page for a CV whose status said `Draft`. `seed.mjs` now deletes `public/{slug}.html` for each sample.
7. **Editor URL `/admin/edit?id=…`.** The assets layer canonicalizes `edit.html` to `edit` with a redirect; the list now links to the canonical URL.
8. **List page bug fixed during the walkthrough.** A chained `append()` returned `undefined` and the list never rendered. Fixed in `assets/admin/list.js`.
9. **Review corrections (F-01 to F-08).** Recorded under *Completion evidence*. The server-side clean-document guard (422) and the editor CSP are additions within the accepted security approach (ADR-0003, plan risk table). They change no scope or contract.

## Completion evidence

Verified version or diff: working tree on top of `e4b4491` (uncommitted at the time of verification). Environment: Windows 11, Node.js 24.21.0, Wrangler 4.145.0, Vitest 4.1.11 with `@cloudflare/vitest-pool-workers` 0.22.0, Python 3.14.7. Local only: the R2 bucket and secrets were simulated.

| AC / check | Result | Evidence summary / reference |
| --- | --- | --- |
| AC-01 | Passed | `test/auth.test.ts`: 401 + `WWW-Authenticate` on `/admin`, `/admin/`, assets, unknown `/admin` paths, the list API, and every draft read/write; no draft text in the bodies. Browser: `/admin/` shows "Authentication required." |
| AC-02 | Passed | `test/auth.test.ts`: wrong user or password, empty password, wrong scheme, malformed base64, no separator → 401. |
| AC-03 | Passed | `test/auth.test.ts`: list page 200 with `no-store` and `noindex`; `/admin` → 302 `/admin/`. Browser: list rendered after authentication. |
| AC-04 | Passed | `test/publishing.test.ts`: name, URL, derived status (all three), last edit. Browser: list shows both sample CVs. |
| AC-05 | Passed (local browser), print pending | Walkthrough on `wrangler dev`: bold, italic, underline, bullets, size 14, preset and custom colors, clear formatting, undo/redo, and plain-text paste all changed the CV as expected. Print/PDF: the injected editor style is now screen-only and the caret is blurred before printing (review F-01; checked in the browser: `@media screen` rule). **A real print preview from the editor is pending (owner).** |
| AC-06 | Passed (API) | `test/publishing.test.ts`: a saved draft is returned on a fresh read. A two-device check is pending in production. |
| AC-07 | Passed | Test + browser: after an edit and save, the public page is unchanged and the status is `Unpublished changes`. |
| AC-08 | Passed | Test: public body byte-identical to the draft (including non-ASCII). Browser: the published page contains the edit, has no editor markup, and has the CSP. |
| AC-09 | Passed | Test + browser: discard restores the published version; status `Published`. 409 when never published. |
| AC-10 | Passed | Test + browser: unpublish → 404; the CV is kept with status `Draft`. |
| AC-11 | Passed | `test/public.test.ts`: `/`, unknown, uppercase, `_`, nested, encoded `..`, and `/favicon.ico` → 404 page. |
| AC-12 | Passed | Test: 200 without a challenge, `default-src 'none'` with no `script-src`, `no-cache`. Cleanliness: the server refuses drafts that contain scripts or the editor's known markers inside tags (422; tests cover each marker, an unusual separator, and CV text that merely mentions the words). This is a backstop; the CSPs remain the controls against script execution (review F-03, N-02). The CSP blocked `fetch` from a public page during the walkthrough. |
| AC-13 | Passed (mobile); print by CSS only | 375 px: `scrollWidth` 375, no horizontal scroll (after deviation 5). A4 print rules unchanged; a real print preview by the owner is pending. |
| AC-14 | Passed | All strings in `assets/admin/*` and the 404 page reviewed: English only. |
| AC-15 | Passed | Tracked-file review: no secrets, real CV text, or the owner's contact data; `private/` and `.dev.vars` ignored. Seed test asserts fictional, clean samples. |
| CSRF | Passed | `test/auth.test.ts`: all four write routes × cross-site `Sec-Fetch-Site`, foreign `Origin`, no origin data → 403; meta, draft, and public page unchanged (review F-05). |
| Isolation | Passed (config + review) | `wrangler.jsonc` has exactly one R2 binding (`cv-online`); confirmed by the independent review. |
| Fail closed | Passed | `test/auth.test.ts`: missing or empty secrets → 503 on `/admin/` and the API, no editor content (review F-04). |
| Editor CSP | Passed | Test: `script-src 'self'` on editor responses. Browser: a script inserted into the CV preview did not run (review F-02). |
| Broad verification | Passed | `python scripts/verify broad --base e4b4491 --level L3 --change CHG-002-protected-editor-and-publishing` (framework checks + `worker-tests` 62/62 + `typecheck`), rerun after the review corrections. Local report in `.sdd/results/` (not committed). |

Independent review (L3), 2026-10-01:
- **Reviewer:** the `sdd-independent-review` Claude subagent in a fresh context, with read-only tools (Read, Grep, Glob) and no shell. It received the spec, plan, ADRs, the complete patch (28 files, `package-lock.json` excluded), and the verification evidence. It is the same model family as the implementer, so it is not equivalent to a human review and grants no approval.
- **Result:** 1 blocking and 7 non-blocking findings. Resolutions:
  - **F-01 (blocking):** editor print used the injected style, with `padding-top` and focus highlight. Fixed: injected CSS is `@media screen` only and the caret is blurred before `print()`. The real print preview stays pending (owner).
  - **F-02:** the CV preview iframe could run scripts from a draft. Fixed: CSP `script-src 'self'` on editor responses, inherited by the srcdoc preview, plus a server guard that refuses drafts with scripts or editor markup (422).
  - **F-03:** the AC-12 cleanliness claim was not tested. Fixed by the server guard and its tests; evidence wording corrected.
  - **F-04:** no fail-closed test. Added.
  - **F-05:** CSRF covered only publish. Now all four write routes.
  - **F-06:** discard copied the hash instead of hashing the restored content. Fixed, with a partial-publish repair test.
  - **F-07** (question): could Workers Logs record the `Authorization` header? Open; to be checked in the first production log inspection.
  - **F-08:** drag-and-drop could insert rich HTML. `drop` is now converted to plain text, like paste. Custom elements added by browser extensions are not filtered; the server guard covers scripts and editor markup only (accepted).
- **Re-review of the corrections** (same reviewer context, 2026-10-01): no blocking findings within the re-reviewed scope. F-01 to F-06 and F-08 resolved; F-07 open and tracked. Three new non-blocking findings, all fixed:
  - **N-01:** a drop intercepted moves inside the CV and duplicated text. Moves inside the CV now stay native, and external drops insert plain text at the drop point.
  - **N-02:** the guard regex had false positives on CV text and the plan overclaimed. The attribute checks are now anchored inside tags; two tests were added and the wording softened.
  - **N-03:** "Download PDF" overwrote the CV's own `<title>`, which could later be saved and published. Both titles are now restored after printing.

  The reviewer asked only for a spot check of these. No new review is needed unless CSP, auth, CSRF, or the guard changes materially.

Outstanding items / exceptions: production smoke test (AC-01, AC-03, AC-06 on two devices, AC-08, AC-11, AC-12); owner print preview from the editor (AC-05) and of the public page (AC-13); F-07 log inspection after the first deployment.

Delivery: not deployed. Deployment requires explicit owner authorization at that moment.
