# Plan: CHG-005 | View and edit a CV's HTML in the editor

Status: `in-progress` | Technical owner: Idaika Iglesias | Accepted by / date: Idaika Iglesias, 2026-10-01.
Spec: [spec.md](spec.md) | Verification scope: `standard` (L2).

## System inspection

- **`assets/admin/editor.js`:**
  - `render(html)` (line ~88) sets `frame.srcdoc` and, on load, injects the editing style and attributes;
  - the preview's `input` listener (~106) and `run()` (~212) mark the CV dirty;
  - `save()` (~151) sends `currentHtml()`, which is the preview serialized with the injected markup stripped;
  - `discard()` (~165) re-renders from the server;
  - errors already show the server's message through `guarded()`, for example "Draft contains scripts or editor markup." on 422.
- **`assets/admin/edit.html`:** header buttons; `main.editor` holds only `#previewWrap`.
- **`assets/admin/admin.css`:** editor layout. A small-screen media query exists at 700 px.
- **Predecessor:** a `#codeWrap` panel at 40% width with a dark `textarea`. Input re-rendered the preview after 600 ms and preserved scroll.
- **Server:** no change is needed. `PUT …/draft` already validates any HTML against the shared guard.

## Technical approach

All changes are in the editor UI (vanilla JS, no new dependency).

1. **Markup.**
   - An "HTML" toggle button in the header (`aria-pressed`).
   - A `#codeWrap` panel with a `textarea#code` (`spellcheck=false`, `aria-label="CV HTML"`), placed before the preview inside `main.editor`, hidden by default.
2. **One source of truth while the panel is open.**
   - **Opening** fills the panel with `currentHtml()`, the same document "Save draft" would store.
   - **Panel → preview:** typing in the panel re-renders the preview from `code.value` after a 600 ms pause, keeps the preview's scroll position, and marks the CV dirty.
   - **Preview → panel:** formatting tools and typing in the preview refresh `code.value` from `currentHtml()` when the panel is open, so both always agree (AC-06).
   - **Save** sends `code.value` when the panel is open, otherwise `currentHtml()`. When the panel is open, "Download PDF" prints the preview as today.
   - **Discard** reloads the draft into both.
3. **Errors.** A 422 shows the server's message in the status line (existing `guarded()`), keeps the dirty state, and leaves the panel text untouched (AC-05).
4. **Layout.**
   - Panel at 40% width beside the preview, with the predecessor's dark style.
   - Below 700 px, the panel goes full width above the preview, with a fixed height.

**Rejected:**
- A code-editor library (CodeMirror and similar): adds a dependency and a CSP review, and the spec excludes highlighting.
- Saving from the panel only on blur: hides changes in progress, worse than a live preview.

## Affected components and contracts

| Area / path | Proposed change | Impact / consumer |
| --- | --- | --- |
| `assets/admin/edit.html` | Toggle button + panel markup | Owner |
| `assets/admin/editor.js` | Panel state, two-way sync, save source, scroll-preserving render | Owner |
| `assets/admin/admin.css` | Panel and responsive layout | Owner |
| Server, storage, auth, public pages | None | — |

## Risk-proportionate strategy

| Area | Decision, check, or reason for non-applicability |
| --- | --- |
| Security | No server change. Script typed into the panel cannot run in the preview, because the editor CSP `script-src 'self'` is inherited by srcdoc, and it is refused on save (422). Both are already tested in CHG-002. A manual check confirms the behavior through the UI (AC-05). |
| Data integrity | Each save stores exactly one source: the panel when open, the preview otherwise. The two-way sync keeps them identical, so no edit is silently lost. Unsaved-changes warnings are unchanged. |
| Compatibility | With the panel closed, the code paths are the current ones (AC-07). |
| Privacy | Walkthroughs use the fictional samples seeded locally. The agent does not open the owner's real CVs. |
| Rollout | Deploy with the owner's authorization. Editor-only and reversible by redeploying the previous commit. |

## Implementation steps

1. Markup and CSS for the toggle and panel. *Check:* the panel opens and closes; layout at desktop width and 375 px.
2. Sync logic, save source, and scroll-preserving render. *Check:* AC-01, AC-02, AC-06 in a local walkthrough with the fictional samples.
3. Save, reload, publish (AC-03, AC-04), and the 422 path (AC-05). *Check:* local walkthrough.
4. Regression: `npm test`, typecheck, and `verify standard`.
5. Push the branch and open the PR. This is the **first product-target PR**, so its gate exercises CHG-007's `product-install` in CI. Record the result there as CHG-007 AC-04 (CI job log: Node/npm versions, approval probe). If the gate fails because of the runner, stop: that is a CHG-007 follow-up, not a reason to skip the check.
6. Merge by the owner after a passing gate. Then deploy, with the owner's explicit authorization (the last manual deploy before CHG-009). Then the owner fixes the LinkedIn link in production.

## Verification plan and traceability

| AC / risk | Test, check, or manual procedure | Command / location / environment | Expected result |
| --- | --- | --- | --- |
| AC-01 | Open the panel; inspect the text programmatically | Local `wrangler dev`, fictional sample | No `contenteditable`, `data-ed`, `__ed` |
| AC-02 | Change an `href` in the panel, wait | Local | Preview link target updated; "Unsaved changes" |
| AC-03 | Save, reload, read the draft | Local; API read | New `href` persisted |
| AC-04 | Publish, fetch the public page | Local | New `href` on the public page |
| AC-05 | Insert `<script>`, save | Local | Status shows the 422 message; panel text kept; draft unchanged |
| AC-06 | Apply bold in the preview with the panel open; also reopen the panel | Local | The panel shows the formatting |
| AC-07 | Regression | `npm test` (101), `npm run typecheck`, `python scripts/verify standard --base b36c737 --level L2 --change CHG-005-html-source-editing` | All pass |
| CI | PR gate (product target) | GitHub `sdd-gate` | Passes; it also provides CHG-007 AC-04 evidence |
| Owner | Fix the LinkedIn link in production | `https://akiadi.com/cv/admin/` | The link is correct on the public page |

No automated browser tests exist in this project. UI behavior is verified manually, as in CHG-002, and recorded here.

## Affected documentation

- `docs/architecture/overview.md`: mention the HTML panel in the editor UI component.
- CHG-002's dropped "view source" is now delivered by this change (cross-reference only; CHG-002 is not rewritten).

## Deviations and decisions during execution

1. **Panel-to-preview sync is debounced at 300 ms** (preview to panel) and 600 ms (panel to preview). Before saving, any pending preview edit is flushed into the panel, so the saved text always contains it.
2. **Verification base** `b36c737` (main after PR #3). The walkthrough used the fictional `sample-director`, re-seeded locally; the owner's real CVs were not opened.

## Completion evidence

Verified version or diff: branch `chg-005-html-source-editing` (base `b36c737`). Environment: Windows 11, local `wrangler dev`, Node.js 24.21.0, npm 11.19.0.

| AC / check | Result | Evidence summary / reference |
| --- | --- | --- |
| AC-01 | Passed | Panel open (`aria-pressed=true`); the text starts with `<!DOCTYPE html>` and has no `contenteditable`, `data-ed`, or `__ed`. |
| AC-02 | Passed | Changing an `href` in the panel updated the preview link (`https://example.com` → `…/linkedin-fixed`) after the pause; status "Unsaved changes", button "Save draft •". |
| AC-03 | Passed | Save → "Draft saved ✓"; the draft read back through the API contains the new `href` and the formatting from AC-06. |
| AC-04 | Passed | Publish → `Published`; the public page has the new `href` and no editor markup. |
| AC-05 | Passed | A `<script>` typed into the panel: the save was refused with the server's message ("Draft contains scripts or editor markup…"), the text was kept, and the draft was unchanged. The script did not run in the preview (editor CSP). |
| AC-06 | Passed | Underline applied in the preview with the panel open appears in the panel; the panel stays clean and keeps the earlier edit. |
| AC-07 | Passed | Panel closed: formatting and save work as before. `verify standard --base b36c737 --level L2 --change CHG-005-html-source-editing` passed (framework checks, product-install, worker-tests 101/101, typecheck). |
| Layout | Passed | Desktop: the panel is beside the preview. 375 px: the panel is full width above the preview, with no horizontal scroll. Discard refreshes the panel from the server. |
| CI | Pending | PR gate (first product-target PR; CHG-007 AC-04). |

Independent review: not required (L2).

Outstanding items / exceptions: PR gate; manual deploy with the owner's authorization; owner fixes the LinkedIn link in production.

Delivery: not merged.
