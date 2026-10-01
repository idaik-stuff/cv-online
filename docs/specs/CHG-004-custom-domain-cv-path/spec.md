# Spec: CHG-004 | Serve the application at akiadi.com/cv

Status: `approved` | Level: `L3` | Level rationale: changes the public contract, that is, the URL format of every CV that will be shared with third parties. It moves the protected editor to a new path and retires the current `workers.dev` address.
Owner: Idaika Iglesias | Scope accepted by / date: Idaika Iglesias, 2026-10-01.

## Problem and goal

CVs are served at `https://cv-online.idaika.workers.dev/{slug}`, an address that looks like infrastructure rather than a personal brand. The owner registered `akiadi.com` in her Cloudflare account. She wants the CVs under their own section, `akiadi.com/cv/…`, so that the rest of the domain stays free for other uses. *(Owner, 2026-10-01.)*

Observable outcome:
- published CVs open at `https://akiadi.com/cv/{slug}`;
- the editor at `https://akiadi.com/cv/admin/`;
- the `workers.dev` address no longer serves the application.

## Context and current behavior

- **Deployed by CHG-002:** one Worker, `cv-online`. Wrangler enabled the `workers.dev` address and Preview URLs by default, because the configuration does not set them ([CHG-002 plan](../CHG-002-protected-editor-and-publishing/plan.md#completion-evidence)).
- **Root-relative paths are assumed throughout.** Public CVs are served at `/{slug}`, the editor at `/admin/`. The editor's HTML and JavaScript reference `/admin/...` absolutely. The list's public URLs are built as `<request origin>/<slug>`.
- **Writes require a same-origin request.** This keeps working on any host, as long as the editor and the API share it.
- **No CV link has been shared yet,** so changing the URL format breaks no reader. *(Owner, 2026-10-01.)*
- **Owner decisions (2026-10-01):**
  - CVs live under the path `/cv` on the apex domain `akiadi.com`, so the rest of the domain is free for other uses;
  - the `workers.dev` address is disabled.

## Scope and non-goals

Includes:

- **New URL format:**
  - public CVs at `https://akiadi.com/cv/{slug}`;
  - the editor and its API under `https://akiadi.com/cv/admin/`;
  - `/cv` and `/cv/` show the "not found" page.
- **The prefix is configuration, not hard-coded,** so that a later change can move it.
- **This Worker answers for `akiadi.com`.** Anything outside `/cv` shows "not found" until the owner uses the domain for something else; that later change will narrow the Worker to `/cv`.
- **One official address:** disable the `workers.dev` address and the Preview URLs.
- **Documents:** update PRD R4 to the new URL format, and update the living documents that cite the old address.

Does not include:

- `www.akiadi.com` (see Uncertainties).
- A landing page at `akiadi.com/` or `akiadi.com/cv/`.
- Email, other DNS records, or other projects on the domain.
- Any change to storage, the editor's features, or the authentication mechanism.

## Expected behavior

- `https://akiadi.com/cv/{slug}` serves published CVs exactly as before, with the same headers and the same 404 rules.
- Everything under `https://akiadi.com/cv/admin`, including the editor's files and API, requires the same credentials. The editor works there, including save, publish, unpublish, discard, and print.
- The list's "Public URL" and "Copy link" show `https://akiadi.com/cv/{slug}`.
- Old-style paths (`/director`, `/admin/`) are no longer served: "not found".
- `https://cv-online.idaika.workers.dev/...` no longer serves the application.
- Drafts and published data are unchanged: same bucket, same objects.

## Acceptance criteria

| ID | Scenario / precondition | Action | Observable outcome |
| --- | --- | --- | --- |
| AC-01 | Deployed; a CV is published | A reader opens `https://akiadi.com/cv/{slug}` | The CV is shown over HTTPS with a valid certificate, no credential prompt, and the public CSP. |
| AC-02 | Deployed | Open `akiadi.com/`, `akiadi.com/cv`, `akiadi.com/cv/`, an unknown slug, an unpublished slug, and old-style `akiadi.com/director` | "Not found" page, HTTP 404. |
| AC-03 | Deployed | Request `/cv/admin`, `/cv/admin/`, an editor file under `/cv/admin/`, and the API, without credentials; also old-style `/admin/` | `/cv/admin…` → 401 with a Basic challenge and no data; `/admin/` → 404. |
| AC-04 | Owner with valid credentials | Signs in at `https://akiadi.com/cv/admin/`, edits, saves, publishes, unpublishes, discards, prints | All succeed; the list and "Copy link" show `https://akiadi.com/cv/{slug}`. |
| AC-05 | Deployed | Open `https://cv-online.idaika.workers.dev/` and `/cv/admin/` | The application is no longer served there. |
| AC-06 | Before and after the change | Compare the stored CVs | Same objects and hashes; no data change. |
| AC-07 | Automated tests | Run the Worker suite | All existing behaviors are covered under the `/cv` prefix, with no loss of coverage (auth, CSRF, fail closed, publishing, 404s). |

## Constraints and compatibility

- **Public contract (L3).**
  - Consumers: anyone who receives a CV link from now on.
  - From this change on, `https://akiadi.com/cv/{slug}` is the stable URL format (PRD R4, to be updated).
  - The old URLs are retired before any were shared.
- **Security boundary.** Every path under `/cv/admin` stays protected, with default deny for unknown paths. The editor's files are still served only after authentication. CSRF and fail-closed behavior are unchanged.
- **Isolation.** The Worker keeps exactly one bucket binding (ADR-0002).
- **Future reuse of the domain.** The prefix is configuration. Narrowing the Worker to `/cv` later must not require changing CV URLs.
- **Cost.** No new paid feature (NFR-07).

## Uncertainties

| Question / assumption | Owner | Blocks | Resolution or evidence |
| --- | --- | --- | --- |
| `www.akiadi.com`: proposed out of scope, so it does not resolve. A redirect can be added later. | Idaika Iglesias | Scope | Accepted by owner, 2026-10-01: out of scope. |
| `akiadi.com/` and `akiadi.com/cv/` show "not found" for now. Proposed; a landing page is a later product decision. | Idaika Iglesias | AC-02 | Accepted by owner, 2026-10-01. |
| Assumption: `akiadi.com` is active in the owner's Cloudflare account, with no DNS record on the apex that conflicts with attaching the Worker. To be checked in the plan. | Idaika Iglesias | Deployment | Pending |

## Acceptance and next steps

Scope acceptance: accepted by Idaika Iglesias on 2026-10-01, including the resolutions above. The DNS assumption is verified in the plan. Next: `/sdd-plan`.

Related plan: pending (created in the plan phase). States and completion rules: [specs index](../README.md).

Upon completion, record evidence and delivery status in the plan. If another change replaces this behavior, reference that change without rewriting history.
