# Product requirements

Status: `active` | Owner: Idaika Iglesias | Validated by / date: Idaika Iglesias, 2026-10-01.

Sources: [brief](brief.md) and [MVP](mvp.md). This PRD retains capabilities and cross-cutting requirements. The detailed behavior of a change belongs in its spec; its implementation belongs in its plan.

## Capabilities

| ID | Capability and expected outcome | Delivery status | Change / evidence reference |
| --- | --- | --- | --- |
| CAP-01 | **Private editor access**: only the owner can reach the editor and drafts. | planned | TBD |
| CAP-02 | **CV list**: see every CV with name, slug/URL, status, and last edit. | planned | TBD |
| CAP-03 | **Draft editing**: edit with the existing rich-text tools and save the draft, available from any device. | planned | TBD |
| CAP-04 | **Publishing**: publish (draft → public snapshot), unpublish, and discard draft changes. | planned | TBD |
| CAP-05 | **CV lifecycle**: create, duplicate, rename, and delete CVs. | planned | TBD |
| CAP-06 | **Public CV page**: clean, responsive, printable page at `/{slug}`, plus a "not found" page. | planned | TBD |
| CAP-07 | **Discoverability control**: title, description, and link-preview metadata; per-CV "hide from search engines". | planned | TBD |
| CAP-08 | **Initial import**: bring in the two existing CVs from the current editor. | planned | TBD |

Possible statuses when completing the document: `planned`, `partial`, `implemented`, `retired`. An accepted requirement may be `planned`; do not present it as an available capability. There is no need to break down every future feature here.

## Cross-cutting functional rules

- **R1 Draft isolation.** Saving a draft never changes what the public sees. Public content changes only through an explicit publish or unpublish.
- **R2 Snapshot publishing.** Publishing stores an exact copy of the draft at that moment. Later draft edits do not affect it.
- **R3 Status is derived.** A CV is `Draft` (not currently published), `Published` (public equals draft), or `Unpublished changes` (published, and the draft differs).
- **R4 Stable public URLs.** A slug is unique. It contains only lowercase letters, digits, and hyphens. It can be changed only while the CV has never been published, so links already shared never break silently.
- **R5 Duplicate copies the draft.** A duplicate starts as a new `Draft`, with a new name and slug and nothing published.
- **R6 Unpublish is reversible; delete is not.** Unpublish keeps the CV and its draft. Delete requires explicit confirmation and removes the CV permanently.
- **R7 Indexing default.** All CVs are equal, whether created new or duplicated. Every published CV is indexable by default. Each CV has an optional "hide from search engines" setting, off by default. *(Owner, 2026-10-01.)*
- **R8 Interface language.** All editor and public-page interface text is in English. CV content is in English only for now. *(Owner, 2026-10-01.)*

## Non-functional requirements

| ID | Property | Scenario and conditions | Threshold / criterion | Planned verification | Status / evidence |
| --- | --- | --- | --- | --- | --- |
| NFR-01 | Security: access control | Any request to the editor or to draft data without the owner's authenticated identity | Denied in 100% of cases; no draft content in the response | Automated tests + manual check from a private window | planned |
| NFR-02 | Privacy: no personal data in source | Every commit and push to the public repository | No real CV content, contact data, or secrets in tracked files | Pre-push review of tracked files; `.gitignore` for local data | planned |
| NFR-03 | Fidelity | A published CV compared with the editor preview | Same content and visual layout | Side-by-side check on publish (MVP exit criterion) | planned |
| NFR-04 | Responsiveness of public pages | A reader opens a public CV on a phone (~375 px wide) | Readable with no horizontal scrolling | Manual check on a mobile viewport | planned |
| NFR-05 | Print quality | Printing or saving a public CV as PDF from a desktop browser | Fits A4 cleanly with no editor UI | Manual print check | planned |
| NFR-06 | Publish propagation | After publishing, a reader opens the link | TBD, pending the storage choice (some options have up to ~60 s propagation) | Manual timing check | planned |
| NFR-07 | Cost | Normal personal use | Runs on free tiers; no recurring cost beyond an optional domain | Billing check after the first month | planned |
| NFR-08 | Accessibility of public pages | Reader using a screen reader or keyboard | Semantic headings and sufficient contrast; threshold TBD | Automated audit + manual check | planned |

Consider only what is relevant: reliability, performance, security, privacy, accessibility, recovery, or cost. "Fast" and "secure" are not verifiable criteria. If a necessary value is missing, leave a question with an owner, not an invented number.

## Constraints

| ID | Constraint | Source / evidence | Consequence |
| --- | --- | --- | --- |
| CON-01 | Single user: the owner. | Owner, 2026-10-01 | No account management or roles. |
| CON-02 | Personal CV data must not enter the source repository, which is intended to become public. | Owner, 2026-10-01 | Real CVs live only in the running system and in local ignored files. The repo uses a fictional sample CV. |
| CON-03 | The existing editor's design and formatting tools must be preserved. | Owner's existing tool (2026-10-01) | Changes to the editor are kept to a minimum. |
| CON-04 | Development follows the Lightweight SDD framework. | Owner, 2026-10-01 | Changes are classified L0–L3 with specs, plans, and verification as required. |

Distinguish an external constraint from a preference or hypothesis. A technology choice that has not yet been made is not a constraint. Record technology preferences separately and confirm or discard each one through an [ADR](../adr/README.md) when it needs to be decided.

### Technology preferences (not yet decided)

Each of these will be confirmed or discarded through an ADR in the first product change's plan:

- Hosting on Cloudflare (owner's existing account), serving both the editor and the public pages.
- Cloudflare KV for CV storage (simplest option); D1 only if history or analytics are added later.
- Cloudflare Access to protect the editor, instead of building a custom login.
- Publishing as a stored HTML snapshot rather than structured data rendered through a template.

## Vocabulary and minimum domain model

| Term / entity | Business meaning | Relevant relationship or invariant |
| --- | --- | --- |
| CV | One version of the owner's résumé (e.g. "Innovation Director", "Director – Acme"), typically one per application. | Has exactly one draft and at most one published snapshot. A duplicated CV is a CV like any other. |
| Name | Internal label shown only in the editor. | Not unique; free text. |
| Slug | The public URL segment, `/{slug}`. | Unique; format and change rules in R4. |
| Draft | The working content being edited. | Never public (R1). |
| Published snapshot | The exact content shown publicly. | Copied from the draft on publish (R2). |
| Status | `Draft`, `Published`, or `Unpublished changes`. | Derived, never stored by hand (R3). |
| Owner | The only person who can edit. | All editor access requires her identity (NFR-01). |
| Reader | Anyone opening a public link. | Read-only access to published snapshots. |
