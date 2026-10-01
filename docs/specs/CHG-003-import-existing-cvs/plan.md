# Plan: CHG-003 | Import the owner's existing CVs

Status: `approved` | Technical owner: Idaika Iglesias | Accepted by / date: Idaika Iglesias, 2026-10-01.
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

None recorded yet.

## Completion evidence

Verified version or diff: pending. Relevant environment: pending.

| AC / check | Result | Evidence summary / reference |
| --- | --- | --- |
| AC-01 to AC-08 | Not run | Pending. |

Independent review: not required for L2.

Outstanding items / exceptions: not evaluated. A blocked check does not count as passed.

Delivery: not run. The production import requires the owner's explicit authorization at that moment.
