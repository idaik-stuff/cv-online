# Spec: CHG-003 | Import the owner's existing CVs

Status: `approved` | Level: `L2` | Level rationale: new behavior (a one-off import of real CVs into the running system as drafts). No auth, permission, or public-contract change; it only creates new objects and never modifies or deletes the source. Personal data is handled under the existing constraints (CON-02, NFR-02).
Owner: Idaika Iglesias | Scope accepted by / date: Idaika Iglesias, 2026-10-01.

## Problem and goal

The tool is live, but it only holds fictional samples. The owner's real CVs, "Innovation Director" and "Senior IT Project/Program Manager", still live in the predecessor single-file editor, and that file is the only copy ([architecture](../../architecture/overview.md#systemic-limitations-and-debt)). This change delivers [CAP-08](../../product/prd.md#capabilities): both CVs appear in the CV list as drafts, look the same as in the predecessor, and can then be edited and published with the existing CHG-002 flows.

## Context and current behavior

Facts from inspecting `private/editor-cvs-idaika.html` (local and ignored; structure only, 2026-10-01):

- **Two complete HTML documents of about 74 KB each** are embedded in the predecessor editor. Each one contains:
  - the predecessor's toolbar (`.toolbar`) with Spanish labels;
  - one inline script (autosave, photo replacement, plain-text paste);
  - six `contenteditable` attributes;
  - a hidden file input;
  - Spanish UI strings inside the CV, such as the photo's `title` and `alt`;
  - the photo as an embedded JPEG of about 38 KB.
- **Language:** the CV text and section titles are in English. "Innovation Director" declares `lang="es"`; "Senior IT Project Manager" declares `lang="en"`.
- **Predecessor edits** were saved in the browser's `localStorage` under `cv-editor-<id>`, not in the file. The file holds the original version only. The latest version may therefore exist only in the browser where the owner edited, or in a downloaded HTML export.
- **The running system** (CHG-002) accepts only clean documents. Drafts with scripts, `contenteditable`, or editor markers are refused with 422.
- **The design** needs small-screen rules to pass NFR-04 (CHG-002 plan, deviation 5). The predecessor CVs do not have them.
- **Photo replacement** was deferred from CHG-002 to this change (CHG-002 plan, deviation 2).
- **Production** holds two fictional sample CVs (`sample-director`, `sample-pm`), seeded as drafts.

## Scope and non-goals

Includes:

- Importing both CVs from the version embedded in `private/editor-cvs-idaika.html`, which the owner confirmed is the latest (2026-10-01).
- Converting each one into a clean document:
  - no toolbar, scripts, file inputs, or `contenteditable`;
  - English UI strings (photo `title`/`alt`) and `lang="en"`;
  - the same small-screen rules as the samples.

  Content, design, photo, and A4 print layout stay unchanged.
- Creating them as **drafts** with the names "Innovation Director" and "Senior IT Project/Program Manager" and the slugs `director` and `senior-pm`. Nothing is published by the import.
- Removing the fictional samples (`sample-director`, `sample-pm`) from production. They stay in the repository for local development.
- Refusing to overwrite: if a CV with the same slug already exists, the import stops for that CV and changes nothing.
- Leaving the source files untouched.

Does not include:

- Publishing. The owner publishes from the editor when she is ready.
- Photo replacement in the editor (see Uncertainties).
- Creating, duplicating, renaming, or deleting CVs from the editor (CAP-05).
- Search and link-preview metadata (CAP-07).
- A general "import" feature in the UI. This is a one-off migration run by the owner.

## Expected behavior

- After the import, the CV list shows both CVs with status `Draft`, their names, and their URLs. Their public URLs return "not found" until the owner publishes them.
- Opened in the editor, each CV shows the same content, design, and photo as in the predecessor, and every CHG-002 tool works on it.
- Saving an imported CV is accepted, because it is a clean document.
- Once published, the page meets AC-12 and AC-13 of CHG-002: clean, readable on a phone, A4 print.
- The CV content, photo, and contact data never appear in tracked repository files, test fixtures, logs, or the chat transcript.

## Acceptance criteria

| ID | Scenario / precondition | Action | Observable outcome |
| --- | --- | --- | --- |
| AC-01 | Source file in `private/`; production has no `director` or `senior-pm` | Run the import against production | The CV list shows "Innovation Director" (`director`) and "Senior IT Project/Program Manager" (`senior-pm`) with status `Draft`, and no `sample-*` CVs. `/director` and `/senior-pm` return 404. |
| AC-02 | Imported drafts | Inspect the stored documents | No `<script`, `contenteditable`, toolbar, file input, or Spanish UI strings; `lang="en"`; small-screen rules present; A4 print rules unchanged. |
| AC-03 | Imported draft and predecessor version side by side | Owner compares them on a desktop screen | Same text, formatting, layout, and photo (MVP exit criterion "same appearance"). |
| AC-04 | Imported CV open in the editor | Owner edits and saves | Save is accepted (no 422) and the status rules of CHG-002 apply. |
| AC-05 | An imported CV, published by the owner | Opened at ~375 px width and printed | Meets NFR-04 and NFR-05. |
| AC-06 | A CV with slug `director` or `senior-pm` already exists | Import is run again | That CV is left unchanged and the import reports it as skipped. |
| AC-07 | Import finished | Inspect the source files | They are unchanged. |
| AC-08 | Repository at the final commit of this change | Review tracked files and test fixtures | No real CV content, photo, or contact data; tests use fictional fixtures only (NFR-02, CON-02). |

## Constraints and compatibility

- **Privacy.** The real CVs go only to the production bucket. They never go to Git, test fixtures, logs, or chat (CON-02, NFR-02). The agent must not print CV content while working.
- **Clean document contract.** The documents must pass the existing server guard (CHG-002) without weakening it.
- **Fidelity.** The owner's design is preserved (CON-03, NFR-03).
- **No overwrite.** Existing CVs are never replaced by the import (R6 spirit: no silent data loss).
- **Slugs.** `director` and `senior-pm` satisfy R4. Once published they become stable public URLs.

## Uncertainties

| Question / assumption | Owner | Blocks | Resolution or evidence |
| --- | --- | --- | --- |
| Source version: the file or newer browser edits? | Idaika Iglesias | AC-01, AC-03 | Resolved 2026-10-01: the version embedded in the file is the latest. |
| Photo replacement | Idaika Iglesias | Scope | Resolved 2026-10-01: out of scope; the current photo is imported unchanged. |
| Fictional samples in production | Idaika Iglesias | Scope | Resolved 2026-10-01: remove them from production as part of this change. |
| CV names | Idaika Iglesias | AC-01 | Resolved 2026-10-01: "Innovation Director" and "Senior IT Project/Program Manager". |

## Acceptance and next steps

Scope acceptance: accepted by Idaika Iglesias on 2026-10-01, with the resolutions above. Next: `/sdd-plan`.

Related plan: [plan.md](plan.md). States and completion rules: [specs index](../README.md).

Upon completion, record evidence and delivery status in the plan. If another change replaces this behavior, reference that change without rewriting history.
