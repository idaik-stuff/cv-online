# Spec: CHG-006 | Integrate every change through a branch and a pull request

Status: `implemented` | Level: `L3` | Level rationale: changes `AGENTS.md` and the integration workflow, which the risk rule `ci-governance` (`.sdd/risk-rules.json`) puts at L3 minimum, with independent review required.
Owner: Idaika Iglesias | Scope accepted by / date: Idaika Iglesias, 2026-10-01.

## Problem and goal

CHG-001 to CHG-004 were all committed straight to `main`. The `sdd-gate` workflow runs only on pull requests, so it never ran, and the repository has no PR record of its changes. *(Found by the owner, 2026-10-01.)* Nothing in the repository instructions or the local checks prevented or detected this. The general fix belongs in the framework (reported to `lightweight-sdd` as `FEEDBACK-branch-and-pr-workflow.md`). This change applies it to this project now.

Observable outcome:
- the repository rules require a branch and a pull request per change, with an explicit merge condition;
- this change itself is the first pull request in which `sdd-gate` runs.

## Context and current behavior

- **No rule:** `AGENTS.md` has no branch or pull-request rule, and the PR template exists but was never used.
- **Bootstrap done:** real `CODEOWNERS` were committed to `main` as an owner-authorized bootstrap exception (`55e2e15`), as `docs/development/ci-enforcement.md` step 3 requires. `scripts/check-ci-setup` reports `local-files-ready`.
- **No server-side enforcement:** the repository is private on GitHub Free, so rulesets and required checks are not enforced and CODEOWNERS review requests do not apply (the API returns 404). Respecting the gate depends on the workflow until the repository is public or on a paid plan.

## Scope and non-goals

Includes:

- **A permanent branch rule in `AGENTS.md`:** never commit or push directly to the default branch; one branch per change named after its change ID in lowercase; integration through a pull request with the template metadata; "commit and push" means the change branch.
- **A merge rule:** merge only when `sdd-gate` passes and the owner approves, or under an authorized exception recorded per methodology section 9. The direct-commit exception is limited to establishing CI trust (ci-enforcement step 3), with the same record.
- **README:** the branch/PR workflow in *Commands* and an honest CI status table.
- **This change delivered as the first pull request,** with the `sdd-gate` result recorded.

Does not include:

- Server-side rulesets or required checks. They are not available on the current plan, and activation follows `ci-enforcement.md` step 5 when it is.
- The local `pre-push` hook (moved to CHG-008) and running product checks in CI (CHG-007). See *Scope revision*.
- Continuous deployment (CHG-009).
- Changes to the framework itself (handled in `lightweight-sdd`).

## Expected behavior

- An agent or person reading `AGENTS.md` learns the rule before the first edit.
- The pull request for this change triggers `sdd-gate`. Its result, whether pass or a recorded failure with cause, is evidence in the plan.

## Acceptance criteria

| ID | Scenario / precondition | Action | Observable outcome |
| --- | --- | --- | --- |
| AC-01 | Fresh reader | Reads `AGENTS.md` | The branch-and-PR rule is among the permanent rules, including the meaning of "commit and push" and the bootstrap exception. |
| AC-02 | Fresh reader | Reads `AGENTS.md` | The merge condition (passing gate + owner approval, or a section 9 authorized exception) and the narrow direct-commit exception are explicit. |
| AC-04 | README | Reads *Commands* and *CI activation* | Branch/PR workflow documented; CI status states what is configured, observed, and not enforced. |
| AC-05 | This change | Opened as a pull request with level `L3` and change id | `sdd-gate` runs. It is merged only if the gate passes and the owner approves, or under a recorded section 9 exception. The outcome is recorded in the plan. |
| AC-06 | Framework checks | `scripts/verify broad` on the branch | Passed. |

AC-03 (hook allows branch pushes) was retired by the scope revision; the hook criteria move to CHG-008.

## Constraints and compatibility

- **Governance (L3).** `AGENTS.md` is the shared agent policy. The new rule must not contradict existing rules: authorization is still required, and deployment is still separate.
- **Adapters.** Generated agent entrypoints must stay consistent (`sync_adapters.py --check`).

## Uncertainties

| Question / assumption | Owner | Blocks | Resolution or evidence |
| --- | --- | --- | --- |
| `sdd-gate` may fail on this first run for reasons unrelated to the change. Known cause, removed by the scope revision: product checks need Node dependencies that the CI does not install (independent review F1). Any other failure is investigated and recorded, never bypassed. | Idaika Iglesias | AC-05 | Scope revised 2026-10-01 so this change touches only framework paths. |

## Acceptance and next steps

Scope acceptance: accepted by Idaika Iglesias on 2026-10-01.

**Scope revision** (accepted by the owner, 2026-10-01, after the independent review):
- **The local `pre-push` hook moves to CHG-008.** `scripts/hooks/**` is not a framework path, so the PR would run product checks, and those cannot pass in CI yet (review F1).
- **CHG-007 prepares the CI to run product checks.** It registers a dependency install and adds `scripts/hooks/**` to the framework and governance paths.
- **AC-02 now covers the merge rule** instead of the hook, AC-03 is retired, and AC-05 defines the merge condition (review F2).

Related plan: [plan.md](plan.md). States and completion rules: [specs index](../README.md).

Upon completion, record evidence and delivery status in the plan. If another change replaces this behavior, reference that change without rewriting history.
