# Spec: CHG-005 | View and edit a CV's HTML in the editor

Status: `approved` | Level: `L2` | Level rationale: new editor capability. The auth boundary, the public contract, and the stored-document contract are unchanged: the server guard and both CSPs still apply.
Owner: Idaika Iglesias | Scope accepted by / date: Idaika Iglesias, 2026-10-01.

## Problem and goal

The editor only offers text-formatting tools. Some fixes need the HTML itself. For example, the LinkedIn link in a real CV points to the wrong address, and a link's target (`href`) cannot be changed with the formatting tools. *(Owner, 2026-10-01.)* The predecessor had a source view ("Ver código") that CHG-002 dropped as out of MVP scope ([CHG-002 spec](../CHG-002-protected-editor-and-publishing/spec.md#uncertainties)).

Observable outcome: while editing a CV, the owner can open its HTML, change it, see the result in the preview, and save it as the draft.

## Context and current behavior

- **The edit page** (`assets/admin/edit.html`, `editor.js`) loads the draft into an iframe preview, injects editing behavior, and strips it when saving (clean-document contract, CHG-002).
- **The server refuses drafts** that contain scripts or editor markup with 422 (`src/contract.ts`).
- **CSPs:** the editor's CSP (`script-src 'self'`) is inherited by the preview, and the public CSP has no `script-src`. Script cannot run in either place.
- **The predecessor's source view** was a panel beside the preview. Edits there re-rendered the preview after a short pause, and it had "find" and "jump to CV text" helpers.

## Scope and non-goals

Includes:

- An **"HTML" toggle** on the edit page. It opens a panel with the current CV document as plain text: the clean document, without the editor's injected markup.
- **Editing in the panel** updates the preview after a short pause and marks the CV as having unsaved changes. Saving stores the panel's content as the draft.
- **Formatting tools still work** on the preview, and the panel reflects those edits when opened, or reopened, after them.
- **Save errors are visible.** If the server refuses the HTML, for example because it contains a script, the editor shows the reason and keeps the edits on the page.
- **Find in the panel** with Ctrl+F, using the browser's own find in the text area. No custom find tool.

Does not include:

- Syntax highlighting, autocomplete, or HTML validation beyond the existing server guard.
- A dedicated "edit link" tool. This could be a later convenience.
- Any change to publishing, storage, or authentication.

## Expected behavior

- With the panel closed, the editor behaves exactly as today.
- Opening the panel shows the same document that "Save draft" would store.
- Typing in the panel changes the preview within about a second, while keeping scroll position when possible. The status shows unsaved changes.
- Saving with the panel open stores the panel's text. With the panel closed, it stores the preview as today.
- HTML that the server refuses (422) is not saved. The message names the reason, and the text stays in the panel for correction.
- The interface is in English (R8).

## Acceptance criteria

| ID | Scenario / precondition | Action | Observable outcome |
| --- | --- | --- | --- |
| AC-01 | Owner editing a CV | Opens the HTML panel | The panel shows the clean document: no `contenteditable`, `data-ed`, or `#__ed`. |
| AC-02 | Panel open | Changes a link's `href` (for example the LinkedIn URL) and waits | The preview shows the new link target; the CV shows unsaved changes. |
| AC-03 | After AC-02 | Saves, reloads the page | The draft keeps the new `href`; the status follows R3. |
| AC-04 | After AC-03 | Publishes and opens the public page | The public page has the new `href` (R2). |
| AC-05 | Panel open | Inserts `<script>` and saves | Save refused (422); the message explains why; the text is kept; nothing is stored. |
| AC-06 | Owner applied formatting in the preview | Opens the panel | The panel reflects that formatting. |
| AC-07 | Panel closed | Uses the editor as in CHG-002 | No behavior change; existing tests pass. |

## Constraints and compatibility

- **Clean document contract.** Unchanged and still enforced by the server. The panel must never show or save the editor's injected markup.
- **Security.** No new endpoint and no change to auth or CSRF. Script in edited HTML cannot run in the preview (editor CSP) and is refused on save.
- **Fidelity.** CON-03 and NFR-03 are unchanged: the panel edits the same document the public page serves.

## Uncertainties

| Question / assumption | Owner | Blocks | Resolution or evidence |
| --- | --- | --- | --- |
| Layout: panel beside the preview, as in the predecessor (about 40% width), and full width on small screens. Proposed. | Idaika Iglesias | AC-01 layout | Accepted by owner, 2026-10-01. |

## Acceptance and next steps

Scope acceptance: accepted by Idaika Iglesias on 2026-10-01. Next: `/sdd-plan`.

Related plan: pending (created in the plan phase). States and completion rules: [specs index](../README.md).

Upon completion, record evidence and delivery status in the plan. If another change replaces this behavior, reference that change without rewriting history.
