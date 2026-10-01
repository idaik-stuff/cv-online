# Plan: CHG-003 | Import the owner's existing CVs

Status: `in-progress` | Technical owner: Idaika Iglesias | Accepted by / date: Idaika Iglesias, 2026-10-01.
Spec: [spec.md](spec.md) | Verification scope: `standard` (L2).

## System inspection

**Source** (`private/editor-cvs-idaika.html`, local and ignored). Structure was inspected on 2026-10-01 without printing content:
- The two CVs are embedded as base64 strings in `ORIGINAL={director:…, senior:…}`.
- Each decoded document has:
  - one `.toolbar` block, with no nested `div`;
  - one inline `<script>`;
  - `contenteditable="true"` on `#cv` and `contenteditable="false"` on the photo box, plus one `spellcheck` attribute;
  - a hidden `#photoInput` inside the toolbar;
  - Spanish `title`/`alt` on the photo;
  - 2 Spanish HTML comments and 7 CSS comments;
  - `body{…padding:70px 0 40px}`, which reserves room for the toolbar;
  - toolbar CSS and `[contenteditable]` hover/focus rules;
  - `cursor:pointer` on `.photo`.
- There are no inline event handlers. "Innovation Director" declares `lang="es"`.

**System** (CHG-002):
- Storage layout: `cvs/{id}/meta.json`, `cvs/{id}/draft.html`, `public/{slug}.html`.
- The server guard `EDITOR_MARKUP` lives in `src/worker.ts`.
- `seed/seed.mjs` already uploads with Wrangler, which is the pattern to reuse.
- The fictional samples were generated from the same CSS by a script that was never committed. Their small-screen block is the reference for this change.

## Technical approach

A **one-off local import** run by the owner's machine, against the bucket, through Wrangler. Personal data never passes through Git, the Worker's API, logs, or chat.

1. **`import/clean.mjs`.** A pure, dependency-free module that turns a predecessor CV into a clean document. It uses string transforms tailored to the inspected structure:
   - remove the toolbar block, scripts, `contenteditable`/`spellcheck` attributes, and HTML/CSS comments;
   - remove the toolbar and `[contenteditable]` CSS rules and `cursor:pointer`; set the body padding to 24 px;
   - translate the photo's `title`/`alt` to English and set `lang="en"`;
   - append the small-screen `@media` block.

   It finishes with **self-checks**, and throws if any fails:
   - the server guard does not match;
   - `#cv` is present;
   - no Spanish UI markers remain;
   - the A4 `@page` rule is intact;
   - the visible text of `#cv` is unchanged (tags stripped, whitespace normalized, before vs after).
2. **`import/import-cvs.mjs`.** A CLI with the flags `--local | --remote` and optionally `--dry-run` and `--preview <dir>`.
   - It reads and decodes the source, cleans both CVs, and runs the self-checks. Its output is only slugs, byte sizes, and check results.
   - **No overwrite:** for each CV it checks whether `cvs/{slug}/meta.json` exists; if so, it skips that CV (AC-06).
   - Otherwise it uploads `draft.html` and `meta.json` with the names and slugs from the spec, `publishedHash: null`.
   - In the same run, it deletes the `sample-*` objects (meta, draft, public) from the target.
   - Temporary files go to the OS temp directory and are removed in `finally`.
   - `--preview` writes the cleaned files to an ignored local folder so the owner can compare them (AC-03).
   - It prints the SHA-256 of the source before and after the run (AC-07).
3. **Single source for the guard.** `EDITOR_MARKUP` moves from `src/worker.ts` to `src/contract.ts`. The Worker and the import self-check share it, so they cannot drift.

**Rejected:**
- Importing through the editor UI or the API: it needs a new upload feature (out of scope) and would put the documents through browser tooling.
- A DOM parser dependency: the structure is regular and verified, and tests pin the transforms.
- Manual cleaning: it cannot be repeated or verified.

No ADR is needed: this is a one-off migration detail within the accepted architecture.

## Affected components and contracts

All paths are **proposed**.

| Area / path | Proposed change | Impact / consumer |
| --- | --- | --- |
| `src/contract.ts` (new), `src/worker.ts` | Move `EDITOR_MARKUP` and export it; the Worker imports it. Behavior unchanged. | Server guard, import self-check |
| `import/clean.mjs` (new) | Cleaning transforms + self-checks | Import CLI, tests |
| `import/import-cvs.mjs` (new) | One-off import CLI | Owner, production bucket |
| `test/fixtures/predecessor-like.html` (new) | **Fictional** fixture with the predecessor's structure (toolbar, script, `contenteditable`, Spanish UI strings, `lang="es"`), built from a sample CV | Tests |
| `test/import-clean.test.ts` (new) | Transform and self-check tests | Verification |
| `.gitignore` | Ignore the preview folder (inside `private/`, already ignored; no change needed if `--preview private/import-preview`) | Privacy |
| `README.md` | Document the import command | Owner |
| Production bucket | Add `director` and `senior-pm` drafts; remove the `sample-*` objects | CV list |

## Risk-proportionate strategy

| Area | Decision, check, or reason for non-applicability |
| --- | --- |
| Data, integrity, and migration | Source is read-only (hashed before and after). The import creates new keys only and skips existing slugs (no overwrite). It aborts before any upload if a self-check fails. Deleting the samples is irreversible but fictional; the repository keeps them. Recovery: delete the two imported CVs with Wrangler and re-run, since the source is untouched. |
| Privacy | The CLI never prints CV content. Temp files are deleted. The preview stays under ignored `private/`. Tests use a fictional fixture only. The agent runs only the checks, never reads or displays the cleaned content, and does not screenshot the real CVs. Visual fidelity (AC-03) is checked by the owner. |
| Compatibility | Imported drafts follow the CHG-002 contract and pass the server guard, which is now shared code. No API or URL change. |
| Permissions and security | No change. Uses the owner's existing Wrangler login and the dedicated bucket only. |
| Failures | A Wrangler failure stops the run with a clear message. A partial run is safe to repeat: already-imported CVs are skipped. |
| Observability | The CLI output (slugs, sizes, check results, hashes) is the record. No Worker change. |
| Rollout | `--dry-run` first, then `--local` with `wrangler dev`, then the owner reviews the preview, then `--remote`, only with the owner's explicit authorization. |

## Implementation steps

1. Move `EDITOR_MARKUP` to `src/contract.ts`. *Check:* the existing 62 tests pass unchanged.
2. `import/clean.mjs`, the fictional fixture, and tests. *Check:* `npm test`.
3. `import/import-cvs.mjs`, including the skip logic and sample removal. *Check:* `--dry-run` on the real source shows all self-checks passing, with no content printed.
4. Local run: `--local`, then `wrangler dev`; the agent checks the list and statuses through the API without opening the documents. *Check:* AC-01 and AC-06 locally (run twice).
5. The owner opens the `--preview` files and the local editor to compare with the predecessor (AC-03, AC-04).
6. Production import (`--remote`) **only with the owner's explicit authorization**, then the owner's checks (AC-01, AC-04, AC-05 after she publishes).

## Verification plan and traceability

| AC / risk | Test, check, or manual procedure | Command / location / environment | Expected result |
| --- | --- | --- | --- |
| AC-01 | Import, then list via the API | `node import/import-cvs.mjs --local` + `wrangler dev`; owner in production | Two `Draft` CVs with the spec names; no `sample-*`; `/director` and `/senior-pm` → 404 |
| AC-02 | Transform tests on the fictional fixture + self-checks on the real source | `npm test`; `--dry-run` output | No script, `contenteditable`, toolbar, file input, or Spanish UI strings; `lang="en"`; mobile block; `@page` A4 intact; guard does not match |
| AC-03 | Text-equality self-check (automatic) + side-by-side visual comparison | Self-check in `clean.mjs`; owner compares the `--preview` files with the predecessor | Same text; same look (owner) |
| AC-04 | Edit and save an imported CV | Owner, local then production | Save accepted; status rules apply |
| AC-05 | After publishing: 375 px view and print | Owner in production | NFR-04, NFR-05 |
| AC-06 | Run the import twice | `--local` twice | Second run reports both CVs skipped; objects unchanged (hash in output) |
| AC-07 | Source hash before and after | CLI output | Equal |
| AC-08 | Tracked-file review and fixture check | `git ls-files` + text search for the owner's name, email, and phone in fixtures/tests (search output limited to file names) | Nothing real tracked |
| Regression | Existing Worker suite | `npm test`, `npm run typecheck` | 62+ passing |
| Framework | Docs and change level | `python scripts/verify standard --base <base> --level L2 --change CHG-003-import-existing-cvs` | passed |

## Affected documentation

- `README.md`: the import command and the warning that it is a one-off.
- `docs/architecture/overview.md`: the real CVs live in the bucket; the "only copy" limitation is updated.
- `docs/product/prd.md`: CAP-08 delivery status on completion.

## Deviations and decisions during execution

Minor, no scope or risk change (2026-10-01):

1. **Node imports the shared guard directly.** `import/clean.mjs` imports `src/contract.ts`, using Node 24's built-in TypeScript type stripping. `src/env.d.ts` declares the module types for the tests.
2. **CSS rule-removal bug, caught by the tests.** A capture-based regex skipped a rule directly after another removed one (`[contenteditable]:hover` then `:focus`). It now uses a lookbehind. The self-check, which had not caught this, now also rejects leftover `.toolbar`, `#saved`, `[contenteditable]`, and `cursor:pointer` CSS.
3. **Windows process spawning.** The CLI runs `npx wrangler` through a shell on Windows, as `seed.mjs` does. Node prints DEP0190 for this; the arguments are fixed values from the script, not user input.
4. **Preview path guard.** `--preview` refuses any folder outside `private/`, so real content cannot be written to a tracked path.
5. **Source switched to the owner's exported files (spec revision accepted 2026-10-01).** The latest CVs were in the browser cache, not in the editor file. The owner exported them to `private/director.html` and `private/senior-pm.html`; the CLI now reads those, with the same cleaning. The embedded-file extractor and its 2 tests were removed as unused. The local drafts from the old source were deleted and re-imported.

## Completion evidence

Verified version or diff: working tree on top of `c87ee8e` (uncommitted at the time of verification). Environment: Windows 11, Node.js 24.21.0, Wrangler 4.145.0, local `wrangler dev` with a simulated R2.

| AC / check | Result | Evidence summary / reference |
| --- | --- | --- |
| AC-01 | Passed (local) | `--local` run from the exported files: both CVs imported as drafts with the spec names; samples removed. Stored draft hashes match the cleaned output (`3b4da779438c…`, `58e2ce61d5b7…`). API (agent, no content returned): the list holds only `director` "Innovation Director" and `senior-pm` "Senior IT Project/Program Manager", both `Draft`; `/director` and `/senior-pm` → 404. **Production, 2026-10-01:** `--remote` imported both CVs. Metadata read back without content shows the spec names, draft hashes `3b4da779438c…`/`58e2ce61d5b7…`, and `publishedHash: null`. `sample-*` are gone; `/director`, `/senior-pm`, and `/sample-*` → 404. |
| AC-02 | Passed | `test/import-clean.test.ts` (fictional predecessor-like fixture): no toolbar, scripts, file input, editing attributes or CSS, Spanish UI strings or comments; `lang="en"`; mobile block; A4 intact; guard does not match. Real source (exported files): all self-checks passed in `--dry-run`; stored drafts checked structurally through the API. |
| AC-03 | Passed | Self-check "visible text unchanged" passed for both real CVs. The owner compared `private/import-preview/*.html` side by side with her latest versions and confirmed them (2026-10-01). |
| AC-04 | Passed (local); production pending (owner) | Re-saving each imported draft through the API → 200 (accepted by the guard). The owner edited and saved in the local editor (2026-10-01). |
| AC-05 | Pending | After the owner publishes in production. |
| AC-06 | Passed (local) | Second `--local` run: both CVs "skipped (already exists; nothing changed)". |
| AC-07 | Passed | Combined SHA-256 of the two exported source files, `2c9ad39c5678…`, is the same before and after every run (the earlier editor-file source, `e136e55c3802…`, was also unchanged). |
| AC-08 | Pending final review | Fixture and tests are fictional; `private/` (source and preview) is ignored. Final tracked-file review before commit. |
| Regression | Passed | `npm run typecheck`; `npm test` 72/72 (62 existing + 10 new). |

Independent review: not required for L2.

Outstanding items / exceptions: owner edits and publishes in production (AC-04 production, AC-05 phone and print); final AC-08 review before commit.

Delivery: production import run on 2026-10-01 with the owner's explicit authorization ("OK, importa a producción"). Both CVs are drafts in production; nothing is published by the import.
