# System architecture

Status: `active` | Owner: Idaika Iglesias | Validated by / date: `TBD`.

## Actual state

Implemented by [CHG-002](../specs/CHG-002-protected-editor-and-publishing/plan.md) and moving to `https://akiadi.com/cv/{slug}` with [CHG-004](../specs/CHG-004-custom-domain-cv-path/plan.md) ([ADR-0004](../adr/0004-public-urls-under-akiadi-com-cv.md)). This document describes the state after that deployment, which is pending until its smoke test is recorded. One Cloudflare Worker serves both the public CV pages and a protected editor, and stores CVs in a dedicated R2 bucket.

The predecessor single-file editor remains outside version control in the ignored `private/` folder, because it embeds real personal data (PRD CON-02). Its CVs are not imported yet (CAP-08).

## Context and boundaries

- **Readers** (anyone with a link) reach `https://akiadi.com/cv/{slug}` without credentials.
- **The owner** reaches `/cv/admin/*` with HTTP Basic Auth.
- **Everything else** on `akiadi.com`, including `/` and `/cv/`, gets the "not found" page. The Worker is attached to the whole hostname until another project needs the domain (ADR-0004).
- External dependencies: Cloudflare Workers runtime, R2, and Google Fonts (loaded by the CV documents).

## Components and dependencies

| Existing component | Responsibility | Interfaces / dependencies | Code or contract path |
| --- | --- | --- | --- |
| Worker entry and routing | Strips `BASE_PATH` (`/cv`), then splits public and editor traffic; error handling and logging | Workers `fetch` handler, var `BASE_PATH` | `src/worker.ts` |
| Auth gate | Basic Auth (constant-time) and same-origin check for writes | Secrets `ADMIN_USER`, `ADMIN_PASSWORD` | `src/auth.ts` |
| CV store | Drafts, published snapshots, metadata, derived status, slug validation | R2 binding `CV_BUCKET` → bucket `cv-online` | `src/store.ts` |
| Responses | Public page and 404 with CSP; private headers for the editor | — | `src/responses.ts` |
| Editor UI | CV list and rich-text editor (vanilla JS); served only after authentication | Assets binding `ASSETS`, `/admin/api/*` | `assets/admin/` |
| Sample content | Two fictional, clean CVs and a seeding script | Wrangler R2 commands | `seed/` |

## Main flows

- **Prefix:** any path outside `BASE_PATH/` → 404. Inside it, the prefix is stripped, and editor asset redirects are re-prefixed.
- **Read a CV:** `GET /cv/{slug}` → validate slug → read `public/{slug}.html` → 200, or the 404 page.
- **Edit:** the editor loads the draft into an iframe, injects editing behavior, and strips it on save → `PUT /cv/admin/api/cvs/{id}/draft` (the editor uses relative URLs).
- **Publish:** copy the draft to `public/{slug}.html`, then update the metadata. If a failure leaves the metadata stale, publishing again repairs it.
- **Unpublish** deletes the public object. **Discard** copies the public object back to the draft.

## Data and invariants

R2 layout:
- `cvs/{id}/meta.json`: name, slug, timestamps, and the SHA-256 of the draft and of the published snapshot;
- `cvs/{id}/draft.html`;
- `public/{slug}.html`.

Invariants:
- status is derived from the hashes (PRD R3);
- stored CVs are clean documents, with no scripts and no `contenteditable`;
- slugs match `^[a-z0-9-]+$`, and `admin` is reserved;
- `id` equals `slug` until CAP-05.

There is no version history: publishing overwrites the previous snapshot.

## Security and privacy

- Every `/cv/admin` path, including the editor's assets, requires credentials. The old root `/admin` paths are not found.
- If the secrets are missing, the editor answers 503 and stays closed.
- Writes require a same-origin request, which protects against CSRF.
- Public pages carry a CSP that blocks scripts.
- Editor responses use `no-store` and `noindex`.
- Logs record events and ids only, never credentials or CV content.
- The Worker is bound to its own bucket only, so it cannot reach the IoT_B backups.
- Known limit: no rate limiting against brute force. This is accepted in [ADR-0003](../adr/0003-editor-authentication-with-basic-auth.md).

## Quality and testing strategy

- Integration tests run the Worker in the local Workers runtime with a simulated R2 (`test/`).
- A typecheck covers the TypeScript code.
- Both are registered as product checks in [the README](../../README.md#commands).
- Editor UI behavior is verified manually; there are no browser automation tests.

## Observability and operations

Workers observability logs are enabled. They record one structured line per authentication failure, CSRF rejection, save, publish, unpublish, discard, and server error.

## Deployment and recovery

- Production: Worker `cv-online` on the Custom Domain `akiadi.com`; `workers_dev` and `preview_urls` are off.
- Deployment is manual with Wrangler, after the one-time setup in the [README](../../README.md#deployment).
- Rollback: `wrangler rollback` restores a version (code, vars, bindings) but not triggers. A full revert also needs the Custom Domain detached in the dashboard and a redeploy of a previous commit (see README *Deployment*).
- Data: for now only the fictional samples, which can be re-seeded. Backup of real CVs is to be planned with CAP-08.

## Relevant decisions

Implemented and deployed by CHG-002: [ADR-0001](../adr/0001-hosting-on-cloudflare-workers.md) (Cloudflare Workers), [ADR-0002](../adr/0002-cv-storage-in-dedicated-r2-bucket.md) (dedicated R2 bucket), [ADR-0003](../adr/0003-editor-authentication-with-basic-auth.md) (Basic Auth). Delivery plan: [CHG-002](../specs/CHG-002-protected-editor-and-publishing/plan.md). Public URL structure: [ADR-0004](../adr/0004-public-urls-under-akiadi-com-cv.md), delivered by [CHG-004](../specs/CHG-004-custom-domain-cv-path/plan.md).

## Systemic limitations and debt

| Known limitation | Impact | Mitigation / owner | Tracking reference |
| --- | --- | --- | --- |
| The real CVs still live only in the predecessor file. | Single point of loss until imported. | CAP-08 import. Owner: Idaika Iglesias. | [MVP](../product/mvp.md) |
| No version history in storage. | A publish overwrites the previous public snapshot. | Accepted MVP exclusion. | [MVP](../product/mvp.md) |
