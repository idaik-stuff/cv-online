# Plan: CHG-004 | Serve the application at akiadi.com/cv

Status: `in-progress` | Technical owner: Idaika Iglesias | Accepted by / date: Idaika Iglesias, 2026-10-01.
Spec: [spec.md](spec.md) | Verification scope: `broad` (L3) + independent review.

## System inspection

**DNS** (checked 2026-10-01 through `1.1.1.1`): `akiadi.com` uses Cloudflare nameservers (`lee.ns.cloudflare.com`, `ulla.ns.cloudflare.com`). There are no A, AAAA, or CNAME records on the apex, so nothing conflicts with attaching the Worker as a Custom Domain.

**Code that assumes the site root:**
- `src/worker.ts`:
  - `isAdminPath` checks for `/admin`;
  - `handleAdmin` redirects `/admin` → `/admin/` and passes the original request to `env.ASSETS`;
  - `handlePublic` matches `/^\/([^/]+)$/`.
- `src/store.ts`: `summary()` builds `url` as `${origin}/${slug}`.
- `assets/admin/*`:
  - absolute `/admin/...` links in `index.html` and `edit.html`;
  - `fetch('/admin/api/...')` in `list.js` and `editor.js`;
  - edit links `/admin/edit?id=`.
- **Assets redirects:** the static assets layer canonicalizes paths with redirects (for example `edit.html` → `edit`). Its `Location` headers are root-relative, so they must be re-prefixed once requests are rewritten.
- **Tests:** every path in `test/*.test.ts` is root-relative.

**Configuration** (`wrangler.jsonc`): no `routes`, `workers_dev`, or `preview_urls`, so Wrangler's defaults applied (workers.dev and Preview URLs on).

**Working tree:** it holds the uncommitted CHG-003 implementation (production import done, owner checks pending), which also touches `src/worker.ts`.

## Technical approach

Decision recorded in [ADR-0004](../../adr/0004-public-urls-under-akiadi-com-cv.md).

1. **`BASE_PATH` var** (`"/cv"`) in `wrangler.jsonc` `vars`, read by the Worker.
   - **Routing:**
     - a path equal to `BASE_PATH` or `BASE_PATH + "/"` → "not found";
     - a path that does not start with `BASE_PATH + "/"` → "not found";
     - otherwise strip the prefix and run the existing routing unchanged.
   - **Admin assets:** fetched with a rewritten URL (the stripped path). A redirect `Location` from the assets layer is re-prefixed.
   - **`/cv/admin`** → 302 to `/cv/admin/`.
   - **`summary()`** receives the public base (`origin + BASE_PATH`), so list URLs become `https://akiadi.com/cv/{slug}`.
   - **An unset `BASE_PATH`** means root (empty), so the code stays usable without a prefix.
2. **Editor UI uses relative URLs** (`admin.css`, `api/cvs`, `edit?id=…`, `./`). They resolve under whatever prefix serves `/…/admin/`, so the UI never hard-codes `/cv`.
3. **`wrangler.jsonc`:**
   - `routes: [{ "pattern": "akiadi.com", "custom_domain": true }]`;
   - `workers_dev: false`;
   - `preview_urls: false`.
4. **Tests** move to the `/cv` prefix through one helper constant, and add cases for:
   - `/`, `/cv`, `/cv/`, old-style `/director` and `/admin/` → 404;
   - re-prefixed asset redirects;
   - list URLs containing `/cv/`.

**Rejected:**
- A hard-coded `/cv` in code and UI: it would make moving the prefix a code change (spec constraint).
- A route `akiadi.com/cv*` now: it needs a placeholder DNS record and an origin for the rest of the domain, which do not exist yet. Deferred to the change that first reuses the domain (ADR-0004 consequence).

## Affected components and contracts

| Area / path | Proposed change | Impact / consumer |
| --- | --- | --- |
| `wrangler.jsonc` | `vars.BASE_PATH`, custom-domain route, `workers_dev: false`, `preview_urls: false` | Production address |
| `src/worker.ts`, `src/env.d.ts` | Base-path routing, assets rewrite and redirect re-prefix | All requests |
| `src/store.ts` | `summary()` takes the public base URL | Editor list URLs |
| `assets/admin/*` | Relative URLs | Editor |
| `test/*` | `/cv` prefix through a constant; new 404 and redirect cases | Verification |
| PRD R4, README, architecture overview, ADR index | New URL format and address | Living documents |
| Public contract | `https://akiadi.com/cv/{slug}` | Anyone holding a link |

## Risk-proportionate strategy

| Area | Decision, check, or reason for non-applicability |
| --- | --- |
| Compatibility and consumers | No link has been shared yet, so retiring the old URLs breaks no reader. From now on `/cv/{slug}` is stable (R4); a later move needs redirects (ADR-0004). |
| Data | None: the same bucket and objects. AC-06 is checked by comparing metadata hashes before and after. |
| Security | The auth gate still applies to everything whose stripped path is under `/admin`, including assets and unknown paths. The prefix strip runs before routing, so `/cv/admin…` is the only way in. Old `/admin/` becomes 404, not an open path. The same-origin check is unchanged. `workers_dev: false` and `preview_urls: false` remove alternative addresses, which shrinks the attack surface. Tests cover auth, CSRF, and fail closed under the prefix. |
| Failures | Custom Domain provisioning (DNS + certificate) can take minutes; the smoke test retries before concluding. If the attach fails, the old configuration is redeployed from the previous commit (`wrangler deploy` at `6c91c70`'s config). |
| Observability | Unchanged; log lines carry the stripped path. |
| Rollout and recovery | Deploy only with the owner's explicit authorization. `wrangler rollback` restores a previous version (code, vars, bindings) but not triggers: the Custom Domain stays attached and `workers.dev` stays off. A full revert also needs `akiadi.com` detached from the Worker in the dashboard, plus a redeploy of the previous commit. Attaching the domain and disabling `workers.dev` in one deploy can cause a short gap while the certificate is issued; acceptable, because no link has been shared. (Corrected after review F2/R1.) |

## Implementation steps

0. **Dependency (done):** the CHG-003 implementation was committed first, with the owner's authorization, so the two changes stay separable in history. CHG-003 stays open only for the owner's production checks.
1. Base-path routing + `summary()` base + assets rewrite/redirect re-prefix. *Check:* the existing tests, moved under `/cv`, pass.
2. Relative editor URLs. *Check:* local browser walkthrough at `http://localhost:8787/cv/admin/`, structural checks only, with no real CV content shown.
3. New tests (prefix 404s, redirects, list URLs). *Check:* `npm test`, typecheck.
4. `wrangler.jsonc` triggers. *Check:* `wrangler deploy --dry-run`.
5. `verify broad` + independent review.
6. Deploy (owner authorization), then the smoke tests and the owner's checks.

## Verification plan and traceability

| AC / risk | Test, check, or manual procedure | Command / location / environment | Expected result |
| --- | --- | --- | --- |
| AC-01 | Public CV under the prefix | `npm test`; production `curl` + owner in a browser | 200, public CSP, no challenge, valid HTTPS |
| AC-02 | `/`, `/cv`, `/cv/`, unknown, unpublished, old `/director` | `npm test`; production `curl` | 404 page |
| AC-03 | `/cv/admin`, `/cv/admin/`, assets, API without credentials; old `/admin/` | `npm test`; production `curl` | 401 + challenge, no data; `/admin/` → 404 |
| AC-04 | Editor flows under the prefix | Tests for the API; local walkthrough (structure only); owner in production | All succeed; list URLs `https://akiadi.com/cv/{slug}` |
| AC-05 | `workers.dev` retired | Production `curl` of `cv-online.idaika.workers.dev` | Not served by the app |
| AC-06 | Data unchanged | Production metadata read-back (no content), before and after | Same draft and published hashes |
| AC-07 | Coverage kept | `npm test` | Every existing case still present under `/cv`, plus the new cases |
| Framework | Docs and level | `python scripts/verify broad --base <base> --level L3 --change CHG-004-custom-domain-cv-path` | passed |

**Independent review (L3):** a fresh `sdd-independent-review` subagent, with the spec, plan, ADR-0004, the full diff, and the evidence.

## Affected documentation

- PRD R4: URL format `https://akiadi.com/cv/{slug}`.
- README: status line, product commands (local URLs), deployment.
- `docs/architecture/overview.md`: address, routing, and triggers.
- ADR index: add ADR-0004.

## Deviations and decisions during execution

None material. Observations (2026-10-01):

1. **`wrangler dev` rewrites the request host** to the configured route (`http://akiadi.com`), so the local list shows `http://akiadi.com/cv/{slug}`. Production serves `https://`; checked in the smoke test.
2. **Tests run with the production value** of `BASE_PATH` (`/cv`), read from `wrangler.jsonc`, through one helper constant (`APP`).
3. **Review corrections** (see *Independent review*):
   - `basePath()` treats a blank or all-slash value as the site root;
   - 15 tests cover the prefix modes, boundary shapes, and query-string preservation;
   - documentation fixes (status wording, rollback accuracy, ADR-0004 shared-domain trigger, `/cv/{slug}` in the PRD).

## Completion evidence

Verified version or diff: working tree on top of `aeca4cc` (uncommitted at the time of verification). Environment: Windows 11, Node.js 24.21.0, Wrangler 4.145.0, Vitest 4.1.11 + Workers pool, local `wrangler dev`.

| AC / check | Result | Evidence summary / reference |
| --- | --- | --- |
| AC-01 | Passed (local); production pending | Tests: public CV at `/cv/{slug}` with the public CSP and no challenge. Local: publish → `/cv/senior-pm` 200 with CSP, then unpublished again. |
| AC-02 | Passed (local); production pending | `test/base-path.test.ts`: `/`, `/cv`, `/cv/`, `/cvx/…`, `/other/page`, `/favicon.ico`, and a published CV at the old root URL → 404. |
| AC-03 | Passed (local); production pending | `/cv/admin…` gets the same 401 coverage as before (the auth suite moved under the prefix). Old `/admin`, `/admin/`, `/admin/editor.js`, and `/admin/api/cvs` → 404 even with valid credentials. |
| AC-04 | Passed (local); production pending (owner) | API suite under the prefix (save, publish, unpublish, discard, CSRF). Local browser: list and editor load under `/cv/admin/` with relative URLs; list links `/cv/admin/edit?id=…`; back link `/cv/admin/`; public URLs carry `/cv/`; asset redirect re-prefixed (test). Structural checks only, with no real CV content shown. |
| AC-05 | Pending | After deployment. Config: `workers_dev: false`, `preview_urls: false`. |
| AC-06 | Pending | Production metadata hashes before (`3b4da779438c…`, `58e2ce61d5b7…`, both unpublished) and after deployment. |
| AC-07 | Passed | `npm test` 101/101: all 72 earlier cases under `/cv`, plus 29 base-path cases (14 initial, 15 after review). `npm run typecheck` clean. |
| Dry run | Passed | `wrangler deploy --dry-run`: bindings `CV_BUCKET` (cv-online), `ASSETS`, `BASE_PATH="/cv"`. |

Independent review (L3), 2026-10-01:
- **Reviewer:** the `sdd-independent-review` Claude subagent in a fresh context, with read-only tools and no shell. It received the spec, plan, ADR-0004, the complete patch (16 files), and the evidence. It is the same model family as the implementer, so it is not a human review and grants no approval.
- **Round 1:** no blocking findings. Confirmed sound:
  - prefix boundary cases, including encoded and dot-segment paths;
  - the auth boundary after stripping, with old `/admin` paths returning 404;
  - Location rewrite on the same origin only;
  - CSRF unchanged;
  - relative URLs resolve correctly;
  - the configuration keys and the single R2 binding.

  Five non-blocking findings, all fixed:
  - **F1:** docs claimed the deployment had happened, and the README linked to the 404 root.
  - **F2:** the rollback text was inaccurate.
  - **F3:** no tests for `basePath()` modes, boundary shapes, or query preservation. Code and tests updated.
  - **F4:** ADR-0004 needed a trigger to re-evaluate same-origin trust when the domain is shared.
  - **F5:** the PRD still used `/{slug}`.
- **Round 2** (same reviewer context, focused on the corrections): F1–F5 resolved, no blocking findings. Two wording leftovers, both fixed:
  - **R1:** the plan's rollback row still had the old wording.
  - **R2:** the README pointed to a plan that does not state the current address.
- **No further re-review needed** unless routing code changes again.

Outstanding items / exceptions: deployment (owner authorization); production checks AC-01 to AC-06.

Delivery: not deployed. Deployment requires the owner's explicit authorization at that moment.
