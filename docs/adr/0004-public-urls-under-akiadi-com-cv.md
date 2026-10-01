# ADR-0004: Public URLs under akiadi.com/cv

Status: `accepted` | Date: 2026-10-01 | Owner: Idaika Iglesias.
Accepted by / date: Idaika Iglesias, 2026-10-01 | Related change or plan: [CHG-004 plan](../specs/CHG-004-custom-domain-cv-path/plan.md).
Supersedes: `N/A` | Superseded by: `N/A`.

## Context and decision drivers

CV links are the product's public contract: once shared with recruiters they must keep working ([PRD R4](../product/prd.md#cross-cutting-functional-rules)). The owner registered `akiadi.com` on Cloudflare and wants CVs under their own section, so that the domain can host other things later. *(Owner, 2026-10-01.)* No CV link has been shared yet, so the format can still change freely.

## Alternatives considered

| Viable alternative | Benefit | Cost / risk | Available evidence |
| --- | --- | --- | --- |
| Path on the apex: `akiadi.com/cv/{slug}` | Short, personal-brand URL; the rest of the domain stays free | The app needs a configurable base path; to share the domain later, the Worker must be narrowed to `/cv` | Owner decision, 2026-10-01 |
| Subdomain: `cv.akiadi.com/{slug}` | No code change; full isolation per hostname | Longer, less personal URL | Proposed first; the owner preferred the path |
| Apex root: `akiadi.com/{slug}` | Shortest | Takes over the whole domain | Rejected by the owner |
| Keep `cv-online.idaika.workers.dev` | No work | Infrastructure-looking URL | Rejected |

## Decision

Public CVs live at **`https://akiadi.com/cv/{slug}`**, and the editor at `https://akiadi.com/cv/admin/`. The `/cv` prefix is configuration (`BASE_PATH`), not code.

The Worker is attached to `akiadi.com` as a Custom Domain, which also manages DNS and the certificate. It returns "not found" outside `/cv`. The `workers.dev` address and the Preview URLs are disabled, so this is the only official address.

## Consequences

- One stable, branded URL format for every shared CV.
- Before another project uses `akiadi.com`, a change must narrow this Worker to `akiadi.com/cv*` (a route) instead of the whole hostname. CV URLs do not change when that happens.
- Every app path depends on the base path. Tests run with the production value.

## Validation and future review

Validated by the CHG-004 checks, including the production check of AC-01 to AC-05. Revisit when another project needs `akiadi.com`, or if the URL format must change after links have been shared; that would need redirects.
