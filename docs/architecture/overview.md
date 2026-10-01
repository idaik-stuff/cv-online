# System architecture

Status: `active` | Owner: Idaika Iglesias | Validated by / date: `TBD`.

## Actual state

Implemented by [CHG-002](../specs/CHG-002-protected-editor-and-publishing/plan.md) and **deployed** on 2026-10-01 at `https://cv-online.idaika.workers.dev`. One Cloudflare Worker serves both the public CV pages and a protected editor, and stores CVs in a dedicated R2 bucket.

The predecessor single-file editor remains outside version control in the ignored `private/` folder, because it embeds real personal data (PRD CON-02). Its CVs are not imported yet (CAP-08).

## Context and boundaries

- **Readers** (anyone with a link) reach `/{slug}` without credentials.
- **The owner** reaches `/admin/*` with HTTP Basic Auth.
- External dependencies: Cloudflare Workers runtime, R2, and Google Fonts (loaded by the CV documents).

## Components and dependencies

| Existing component | Responsibility | Interfaces / dependencies | Code or contract path |
| --- | --- | --- | --- |
| Worker entry and routing | Splits public and editor traffic; error handling and logging | Workers `fetch` handler | `src/worker.ts` |
| Auth gate | Basic Auth (constant-time) and same-origin check for writes | Secrets `ADMIN_USER`, `ADMIN_PASSWORD` | `src/auth.ts` |
| CV store | Drafts, published snapshots, metadata, derived status, slug validation | R2 binding `CV_BUCKET` → bucket `cv-online` | `src/store.ts` |
| Responses | Public page and 404 with CSP; private headers for the editor | — | `src/responses.ts` |
| Editor UI | CV list and rich-text editor (vanilla JS); served only after authentication | Assets binding `ASSETS`, `/admin/api/*` | `assets/admin/` |
| Sample content | Two fictional, clean CVs and a seeding script | Wrangler R2 commands | `seed/` |

## Main flows

- **Read a CV:** `GET /{slug}` → validate slug → read `public/{slug}.html` → 200, or the 404 page.
- **Edit:** the editor loads the draft into an iframe, injects editing behavior, and strips it on save → `PUT /admin/api/cvs/{id}/draft`.
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

- Every `/admin` path, including the editor's assets, requires credentials.
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

- Production: Worker `cv-online` on `workers.dev`; Preview URLs are currently enabled by the platform default.
- Deployment is manual with Wrangler, after the one-time setup in the [README](../../README.md#deployment).
- Code rollback: `wrangler rollback`.
- Data: for now only the fictional samples, which can be re-seeded. Backup of real CVs is to be planned with CAP-08.

## Relevant decisions

Implemented and deployed by CHG-002: [ADR-0001](../adr/0001-hosting-on-cloudflare-workers.md) (Cloudflare Workers), [ADR-0002](../adr/0002-cv-storage-in-dedicated-r2-bucket.md) (dedicated R2 bucket), [ADR-0003](../adr/0003-editor-authentication-with-basic-auth.md) (Basic Auth). Delivery plan: [CHG-002](../specs/CHG-002-protected-editor-and-publishing/plan.md).

## Systemic limitations and debt

| Known limitation | Impact | Mitigation / owner | Tracking reference |
| --- | --- | --- | --- |
| The real CVs still live only in the predecessor file. | Single point of loss until imported. | CAP-08 import. Owner: Idaika Iglesias. | [MVP](../product/mvp.md) |
| No version history in storage. | A publish overwrites the previous public snapshot. | Accepted MVP exclusion. | [MVP](../product/mvp.md) |
