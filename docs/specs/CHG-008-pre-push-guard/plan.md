# Plan: CHG-008 | Local guard against pushes to main

Status: `in-progress` | Technical owner: Idaika Iglesias | Accepted by / date: Idaika Iglesias, 2026-10-01.
Spec: [spec.md](spec.md) | Verification scope: `broad` (L3) + independent review.

## System inspection

- **Path policy:** since CHG-007 (merged in `9e9f232`), `.sdd/ci.json` lists `scripts/hooks/**` as a framework path and `.sdd/risk-rules.json` includes it in `ci-governance` (L3). This PR is therefore framework-target, with Python-only checks in CI.
- **The hook already exists:** it was written and tested in CHG-006 before the scope split (5 cases passed), with LF endings and the executable bit. The CHG-006 review F9 notes apply.
- **`README.md`:** the *Change workflow* table has "Start a change" and "Open the pull request".

## Technical approach

1. **`scripts/hooks/pre-push`:** the CHG-006 hook, plus header comments covering the F9 notes. The branch name is fixed to `main` (update it if the default branch is renamed), and it is a guard, not a boundary. Commit it with the executable bit (`git update-index --chmod=+x`).
2. **README:** add an "Install the push guard" row to *Change workflow*, with the limits from the spec.

**Rejected:**
- Reading the default branch from `origin/HEAD`: it is not always set in clones, and failing open would be worse than a fixed name.
- A `pre-commit` guard: out of scope (spec).

## Risk-proportionate strategy

| Area | Decision |
| --- | --- |
| Governance honesty | The README states it is bypassable and opt-in. It is not counted as enforcement anywhere. |
| Side effects | `core.hooksPath` replaces `.git/hooks`. The repository has no other hooks today; documented. |
| Portability | POSIX `sh`, LF line endings (`.gitattributes eol=lf`), executable bit in Git. |
| CI | Framework target. No product checks; AC-04 of CHG-007 is not exercised by this PR. |

## Implementation steps

1. Hook and README. *Check:* AC-01 to AC-03 by feeding git's push-line format; AC-04 with a real dry-run push in this clone.
2. `verify broad --base 9e9f232 --level L3 --change CHG-008-pre-push-guard`.
3. Independent review → PR → gate (AC-06) → owner merge.

## Verification plan and traceability

| AC | Check | Command / location | Expected |
| --- | --- | --- | --- |
| AC-01 | Hook input: push to `refs/heads/main` | `printf '<lref> <lsha> refs/heads/main <rsha>\n' \| sh scripts/hooks/pre-push origin url` | Exit 1 with the rule message |
| AC-02 | Hook input: push to another branch; push of a tag | Same, with `refs/heads/<branch>` and `refs/tags/<tag>` | Exit 0 |
| AC-03 | Hook input: mixed push including main; deletion of main | Same, with two lines, and with `(delete)` as the local ref | Exit 1 |
| AC-04 | Real dry run | `git config core.hooksPath scripts/hooks`, then `git push --dry-run origin HEAD:main` | Refused by the hook |
| AC-05 | Read the README | `README.md` | Documented |
| AC-06 | PR gate | GitHub Actions | Passes |

## Affected documentation

`README.md`.

## Deviations and decisions during execution

None recorded yet.

## Completion evidence

Verified version or diff: branch `chg-008-pre-push-guard` (base `9e9f232`). Environment: Windows 11, Git for Windows `sh`.

| AC / check | Result | Evidence summary / reference |
| --- | --- | --- |
| AC-01 | Passed | Push line to `refs/heads/main` → exit 1 with the rule message. |
| AC-02 | Passed | Branch `refs/heads/chg-008` → exit 0; tag `refs/tags/v1` → exit 0. |
| AC-03 | Passed | Mixed push (a branch plus `main`) → exit 1; deletion of `main` → exit 1. |
| AC-04 | Passed | With `core.hooksPath scripts/hooks`, `git push --dry-run origin HEAD:main` → refused by the hook ("failed to push some refs"), exit 1. Control: a dry-run push of the change branch → allowed, exit 0. |
| AC-05 | Passed | README *Change workflow*: install row with the limits from the spec. |
| AC-06 | Pending | PR gate. |
| File properties | Passed | Git mode `100755`; no CR characters; `.gitattributes` forces LF. |

Independent review (L3), 2026-10-01: the `sdd-independent-review` subagent in a fresh context, read-only, same model family (not a human review). It reviewed 4 files; the packet wrongly said 6, and `git diff --stat` confirms 4.
- **Result:** no blocking findings. The hook's logic and portability were judged sound; the merge flow, CI, and change-branch pushes are unaffected.
- **Non-blocking findings, all fixed with wording only** (hook behavior unchanged):
  - F1: AC-04 wording ('before any remote ref is updated');
  - F2: the relative `core.hooksPath` runs the checkout's copy, so commits that predate it are unprotected (header and README);
  - F3: an authorized exception uses `--no-verify` plus an exception record (header and README);
  - F4: the guard applies to every remote (header and README);
  - F5: outstanding items listed.
- **Limitations noted by the reviewer:** AC-01–AC-03 ran via `sh` (logic only); AC-04 ran on Windows only; no dash/busybox test. All are accepted for a local opt-in guard.

Outstanding items / exceptions: AC-06 (PR gate).

Delivery: not merged. The hook is installed in the owner's working clone.
