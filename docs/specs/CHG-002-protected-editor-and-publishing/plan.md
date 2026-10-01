# Plan: CHG-002 | Protected online editor with draft/publish and public CV pages

Status: `approved` | Technical owner: Idaika Iglesias | Accepted by / date: Idaika Iglesias, 2026-10-01.
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

## Completion evidence

Verified version or diff: pending. Relevant environment: pending.

| AC / check | Result | Evidence summary / reference |
| --- | --- | --- |
| AC-01 to AC-15 | Not run | Pending. |

Independent review: required (L3). Not started.

Outstanding items / exceptions: not evaluated. A blocked check does not count as passed.

Delivery: not deployed. Deployment requires explicit owner authorization at that moment.
