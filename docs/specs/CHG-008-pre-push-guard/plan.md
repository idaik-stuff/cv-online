# Plan: CHG-008 | Local guard against pushes to main

Status: `approved` | Technical owner: Idaika Iglesias | Accepted by / date: Idaika Iglesias, 2026-10-01.
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
| AC-01–AC-03 | Hook input simulation | `printf '<lref> <lsha> <rref> <rsha>\n' \| sh scripts/hooks/pre-push origin url` | Exit codes per the spec |
| AC-04 | Real dry run | `git config core.hooksPath scripts/hooks`, then `git push --dry-run origin HEAD:main` | Refused by the hook |
| AC-05 | Read the README | `README.md` | Documented |
| AC-06 | PR gate | GitHub Actions | Passes |

## Affected documentation

`README.md`.

## Deviations and decisions during execution

None recorded yet.

## Completion evidence

| AC / check | Result | Evidence summary / reference |
| --- | --- | --- |
| AC-01 to AC-06 | Not run | Pending. |

Independent review: required (L3). Not started.

Outstanding items / exceptions: none.

Delivery: not merged.
