# Spec: CHG-002 | Protected online editor with draft/publish and public CV pages

Status: `approved` | Level: `L3` | Level rationale: introduces a security boundary (editor sign-in protecting drafts) and a public contract (CV URLs that will be shared with third parties).
Owner: Idaika Iglesias | Scope accepted by / date: Idaika Iglesias, 2026-10-01.

## Problem and goal

The owner can only edit her CVs in a local file tied to one browser, and has no way to share a CV as a link ([brief](../../product/brief.md#problem-and-evidence)). This change delivers the core of the [MVP](../../product/mvp.md): an online editor that only she can enter with a username and password, where she edits drafts and publishes them to public CV pages that anyone can open by URL.

Observable outcome: she signs in from any device, edits a CV, publishes it, and a reader opens its public URL without any credentials.

## Context and current behavior

- No system exists yet ([architecture](../../architecture/overview.md#actual-state)).
- The predecessor editor (local, outside version control) offers: bold, italic, underline, bullet lists, font size, text colors (navy, blue, orange, grey, custom), remove formatting, undo/redo, find, jump to CV text, view source, save, reset to original, download HTML, and print to PDF. Its interface is in Spanish. *(Inspected 2026-10-01.)*
- This change delivers capabilities CAP-01, CAP-02, CAP-03, CAP-04, and CAP-06 of the [PRD](../../product/prd.md#capabilities). CAP-05, CAP-07, and CAP-08 are left to later changes.
- Owner decisions from 2026-10-01: authentication must be a username and password and as simple as possible, because the application is not critical. Hosting is on Cloudflare; the specific mechanism is decided in the plan.

## Scope and non-goals

Includes:

- Sign-in with a single username and password, protecting the editor and all draft data.
- CV list showing every CV with name, public URL, status, and last edit date.
- Editing a CV draft online with the predecessor's formatting tools, and saving it so it is available from any device.
- Publish, unpublish, and discard draft changes.
- Public CV page at `/{slug}` with no editor interface, plus a "not found" page.
- All interface text in English (R8), including the editor tools translated from the predecessor.
- One or two **fictional sample CVs** as initial content, since creating and importing CVs come later.
- First deployment to the owner's Cloudflare account, carried out only with her authorization at that moment.

Does not include:

- Creating, duplicating, renaming, or deleting CVs (CAP-05, a later change).
- Search-engine and link-preview metadata, and the "hide from search engines" setting (CAP-07).
- Importing the owner's real CVs (CAP-08).
- Registration, password recovery, password change from the interface, multiple users, or roles. The owner changes the credentials through the hosting configuration.
- A custom domain. The platform's default address is acceptable for this change.

## Expected behavior

**Access.** Every editor page and every request that reads or changes draft data requires valid credentials. Public CV pages and the "not found" page never ask for credentials.

**CV list.** After signing in, the owner sees all CVs. Status is derived per [R3](../../product/prd.md#cross-cutting-functional-rules).

**Draft editing.** Saving stores the draft durably. The public page does not change ([R1](../../product/prd.md#cross-cutting-functional-rules)).

**Publishing.**
- *Publish* makes the public URL show an exact copy of the current draft ([R2](../../product/prd.md#cross-cutting-functional-rules)).
- *Discard changes* restores the draft to the last published version. It is available only when the CV has been published.
- *Unpublish* makes the public URL return "not found" while keeping the CV and its draft ([R6](../../product/prd.md#cross-cutting-functional-rules)).

**Public page.**
- Shows only the published CV: readable on a phone and printable (NFR-04, NFR-05).
- Unknown and unpublished slugs show a simple "not found" page with HTTP status 404.

## Acceptance criteria

| ID | Scenario / precondition | Action | Observable outcome |
| --- | --- | --- | --- |
| AC-01 | Visitor without credentials | Requests the editor, the CV list, or any draft read/write operation | Access is refused; the response contains no draft content or CV list data. |
| AC-02 | Visitor with a wrong username or password | Attempts to sign in | Access is refused, as in AC-01. |
| AC-03 | Owner with valid credentials | Signs in | She reaches the CV list. |
| AC-04 | Owner signed in; sample CVs exist | Opens the CV list | Each CV shows its name, public URL, status (`Draft`, `Published`, or `Unpublished changes`), and last edit date. |
| AC-05 | Owner editing a CV | Uses each tool: bold, italic, underline, bullet lists, font size, text colors (presets and custom), remove formatting, undo/redo, print/PDF; and pastes text | Each tool works on the CV text as in the predecessor; pasted text is inserted as plain text. |
| AC-06 | Owner saved a draft on device A | Signs in on device or browser B and opens the CV | The saved draft is shown. |
| AC-07 | CV is published; owner edits and saves the draft | A reader opens the public URL | The reader sees the previously published content; the list shows `Unpublished changes`. |
| AC-08 | CV with a saved draft | Owner publishes, then a reader opens the public URL | The page shows the same content and layout as the draft at publish time; the list shows `Published`. |
| AC-09 | CV with `Unpublished changes` | Owner discards changes | The draft equals the published version; the list shows `Published`. |
| AC-10 | CV is published | Owner unpublishes, then a reader opens its URL | "Not found" page with HTTP 404; the CV and its draft remain in the list. |
| AC-11 | Any visitor | Opens an unknown slug | "Not found" page with HTTP 404. |
| AC-12 | Reader without credentials | Opens a published CV | The CV is shown with no credential prompt and no editor interface. |
| AC-13 | Reader on a ~375 px wide screen, or printing from a desktop browser | Opens or prints a published CV | Meets NFR-04 and NFR-05. |
| AC-14 | Owner using the editor; reader on public pages | Reviews interface text | All interface text is in English. |
| AC-15 | Repository at the final commit of this change | Review of tracked files | No credentials, secrets, or real CV content are tracked (NFR-02). Sample CVs are fictional. |

## Constraints and compatibility

- **Security boundary (L3).** Protected assets: draft content, the CV list, and every write operation. Requirement: [NFR-01](../../product/prd.md#non-functional-requirements). Credentials must never be stored in the repository (CON-02). Authentication must be the simplest viable mechanism: one username and password, with no registration, recovery, or roles. *(Owner, 2026-10-01.)*
- **Public contract (L3).** Consumers: anyone holding a shared link. Once a slug is published, its URL format `/{slug}` must stay stable in later changes ([R4](../../product/prd.md#cross-cutting-functional-rules)).
- **Isolation of hosting resources.** This application must have access only to its own storage and resources. It must never have access to other projects in the same hosting account, such as the existing IoT_B backups. *(Agreed 2026-10-01.)*
- **Fidelity.** The predecessor's design and formatting tools are preserved (CON-03, NFR-03).
- **Cost.** Stays within free tiers (NFR-07).

## Uncertainties

| Question / assumption | Owner | Blocks | Resolution or evidence |
| --- | --- | --- | --- |
| Root page `/`: shows the "not found" page in this change, with the landing-page decision left for later. | Idaika Iglesias | AC-11 coverage of `/` | Accepted by owner, 2026-10-01 |
| The predecessor's "view source" (HTML code view) and "reset to original" tools: drop both. Reset is replaced by *Discard changes*. View source is a power tool outside the MVP. | Idaika Iglesias | AC-05 tool list | Accepted by owner, 2026-10-01 |
| The predecessor's "download HTML" button: drop it, because publishing replaces it. Printing to PDF stays. | Idaika Iglesias | AC-05 tool list | Accepted by owner, 2026-10-01 |
| Planning findings: "find" and "jump to CV text" only work on the dropped source view, so both are dropped (browser find still works). Photo replacement (inside the predecessor CV documents) is out of this change and is revisited with CAP-08. Paste-as-plain-text is kept. | Idaika Iglesias | AC-05 tool list | Accepted by owner, 2026-10-01 (AC-05 updated) |
| After *unpublish*, the CV shows status `Draft`. PRD R3 currently defines `Draft` as "never published" and should read "not currently published". | Idaika Iglesias | AC-10 status wording | Accepted by owner, 2026-10-01; PRD R3 wording updated |
| First deployment to production is part of this change, executed only with explicit owner authorization at that moment. | Idaika Iglesias | MVP exit criteria on production | Accepted by owner, 2026-10-01 |

## Acceptance and next steps

Scope acceptance: accepted by Idaika Iglesias on 2026-10-01, including the resolutions of all uncertainties above. Next: `/sdd-plan`.

Related plan: [plan.md](plan.md). States and completion rules: [specs index](../README.md).

Upon completion, record evidence and delivery status in the plan. If another change replaces this behavior, reference that change without rewriting history.
