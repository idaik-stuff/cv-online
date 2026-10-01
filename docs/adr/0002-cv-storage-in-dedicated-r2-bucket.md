# ADR-0002: Store CVs in a dedicated Cloudflare R2 bucket

Status: `accepted` | Date: 2026-10-01 | Owner: Idaika Iglesias.
Accepted by / date: Idaika Iglesias, 2026-10-01 | Related change or plan: [CHG-002 plan](../specs/CHG-002-protected-editor-and-publishing/plan.md).
Supersedes: `N/A` | Superseded by: `N/A`.

## Context and decision drivers

Public CV pages are static for readers, but their content changes at runtime: the online editor saves drafts and publishes snapshots ([PRD R1, R2](../product/prd.md#cross-cutting-functional-rules)). Static assets of a Worker change only on deployment, so the application needs runtime storage.

Drivers:
- publish must be visible promptly ([NFR-06](../product/prd.md#non-functional-requirements));
- real CV data must never enter the repository (CON-02);
- simplicity and free tier;
- isolation from the owner's existing R2 bucket, which holds IoT_B backups. *(Owner, 2026-10-01.)*

## Alternatives considered

| Viable alternative | Benefit | Cost / risk | Available evidence |
| --- | --- | --- | --- |
| R2, dedicated bucket `cv-online` | Object storage that fits "an HTML document per CV"; strongly consistent reads after writes; R2 already enabled in the account; generous free tier | One more bucket to manage | Owner's account has R2 enabled |
| Workers KV | Simplest key–value API | Eventually consistent: an update can take up to about 60 s to appear everywhere, which conflicts with immediate publishing | Cloudflare KV documentation (to re-check) |
| D1 (SQLite) | Queries, which would help history or analytics later | Schema and migrations for data that is essentially documents; more moving parts | Not needed by the MVP |
| Publish by committing HTML to Git and redeploying | Truly static pages | Puts real CVs in a repository (conflicts with CON-02, or needs a second private repo); 1–2 min per publish; drafts still need storage | CON-02 |
| Reuse the existing R2 bucket | No new bucket | Any defect in this app could read or delete the IoT_B backups | Owner, 2026-10-01 |

## Decision

Use **R2 with a new bucket dedicated to this application**. The Worker gets a binding to that bucket only. No account-wide R2 credentials are created for this project. The object layout is a plan-level detail.

## Consequences

- Publish is visible on the next request, with no propagation delay from the storage layer.
- The CV application cannot reach the IoT_B backup bucket.
- No version history: publishing overwrites the previous snapshot. This is accepted, because history is out of the MVP.
- The free tier is shared across all buckets in the account. Monitoring overall usage is the owner's responsibility.

## Validation and future review

Validated by the CHG-002 checks for draft isolation and publishing (AC-06 to AC-10). Reconsider if history, search, or analytics require queries (D1), or if R2 free-tier limits change.
