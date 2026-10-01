# Spec: CHG-008 | Local guard against pushes to main

Status: `approved` | Level: `L3` | Level rationale: adds a governance control under `scripts/hooks/**`, which the `ci-governance` risk rule puts at L3 minimum (CHG-007).
Owner: Idaika Iglesias | Scope accepted by / date: Idaika Iglesias, 2026-10-01.

## Problem and goal

The branch-and-PR rule ([CHG-006](../CHG-006-branch-and-pr-guard/spec.md)) is written in `AGENTS.md`, but nothing stops a mistaken `git push` to `main`. GitHub cannot enforce it, because the repository is private on GitHub Free. The hook was split out of CHG-006 because the CI could not yet run its checks. Since CHG-007, `scripts/hooks/**` is classified as governance.

Observable outcome: with the hook installed, a push to `main` is refused locally with a message that explains the rule.

## Context and current behavior

- `scripts/hooks/` does not exist, and `core.hooksPath` is unset.
- The design and tests were done in CHG-006 before the split. The CHG-006 review left notes on this hook (F9):
  - the hard-coded branch name;
  - `core.hooksPath` replaces `.git/hooks`;
  - only pushes are guarded.
- Git for Windows runs hooks with its bundled `sh`. `.gitattributes` forces LF line endings.

## Scope and non-goals

Includes:

- **`scripts/hooks/pre-push`:** refuses any push whose remote ref is `refs/heads/main`, including deletion. Pushes to other branches and tags pass.
- **README:** the one-line install (`git config core.hooksPath scripts/hooks`) in *Change workflow*, with its limits:
  - it is a local guard, bypassable with `--no-verify` or by not installing it;
  - it replaces any hooks in `.git/hooks`;
  - it guards pushes, not local commits;
  - the branch name is fixed to `main`.

Does not include:

- Server-side enforcement (not available on the current plan).
- A guard against local commits on `main` (pre-commit). This could be a later addition.
- Automatic installation (for example an npm `prepare` script). It would run on `npm ci` in CI and would be an install-time side effect.

## Acceptance criteria

| ID | Scenario / precondition | Action | Observable outcome |
| --- | --- | --- | --- |
| AC-01 | Hook input for a push to `refs/heads/main` | Run the hook | Exit 1 with a message naming the rule. |
| AC-02 | Hook input for a push to another branch, or a tag | Run the hook | Exit 0. |
| AC-03 | A push that contains main among other refs, and a deletion of main | Run the hook | Exit 1. |
| AC-04 | Hook installed in this clone | A real `git push origin HEAD:main --dry-run` | Refused by the hook before contacting the remote. |
| AC-05 | README | Read *Change workflow* | Install command and its limits documented. |
| AC-06 | This PR | `sdd-gate` | Passes (framework target, L3). |

## Constraints and compatibility

- **Governance (L3).** A guard, not a trust boundary. The docs must not claim enforcement.
- **Portability.** POSIX `sh` only; LF line endings; the executable bit is recorded in Git.

## Uncertainties

None blocking.

## Acceptance and next steps

Scope acceptance: accepted by Idaika Iglesias on 2026-10-01.

Related plan: [plan.md](plan.md). States and completion rules: [specs index](../README.md).
