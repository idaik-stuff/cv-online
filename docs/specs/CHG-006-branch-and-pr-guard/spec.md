# Spec: CHG-006 | Integrate every change through a branch and a pull request

Status: `approved` | Level: `L3` | Level rationale: changes `AGENTS.md` and the integration workflow, which the risk rule `ci-governance` (`.sdd/risk-rules.json`) puts at L3 minimum, with independent review required.
Owner: Idaika Iglesias | Scope accepted by / date: Idaika Iglesias, 2026-10-01.

## Problem and goal

CHG-001 to CHG-004 were all committed straight to `main`. The `sdd-gate` workflow runs only on pull requests, so it never ran, and the repository has no PR record of its changes. *(Found by the owner, 2026-10-01.)* Nothing in the repository instructions or the local checks prevented or detected this. The general fix belongs in the framework (reported to `lightweight-sdd` as `FEEDBACK-branch-and-pr-workflow.md`). This change applies it to this project now.

Observable outcome:
- the repository rules require a branch and a pull request per change;
- an accidental push to `main` is refused locally;
- this change itself is the first pull request in which `sdd-gate` runs.

## Context and current behavior

- **No rule:** `AGENTS.md` has no branch or pull-request rule, and the PR template exists but was never used.
- **Bootstrap done:** real `CODEOWNERS` were committed to `main` as an owner-authorized bootstrap exception (`55e2e15`), as `docs/development/ci-enforcement.md` step 3 requires. `scripts/check-ci-setup` reports `local-files-ready`.
- **No server-side enforcement:** the repository is private on GitHub Free, so rulesets and required checks are not enforced and CODEOWNERS review requests do not apply (the API returns 404). Respecting the gate depends on the workflow until the repository is public or on a paid plan.

## Scope and non-goals

Includes:

- **A permanent rule in `AGENTS.md`:**
  - one branch per change, named after the change id;
  - integration through a pull request with the template's metadata;
  - merge only after `sdd-gate` passes and the owner approves;
  - "commit and push" means the change branch;
  - the default branch never receives direct commits, except a recorded, owner-authorized bootstrap.
- **A `pre-push` hook in the repository** that refuses pushes to `main`, with a one-line install documented in the README.
- **README:** the branch/PR workflow in *Commands* and the hook install.
- **This change delivered as the first pull request,** with the `sdd-gate` result recorded.

Does not include:

- Server-side rulesets or required checks. They are not available on the current plan, and activation follows `ci-enforcement.md` step 5 when it is.
- Continuous deployment (planned as CHG-007).
- Changes to the framework itself (handled in `lightweight-sdd`).

## Expected behavior

- An agent or person reading `AGENTS.md` learns the rule before the first edit.
- With the hook installed, `git push origin main` (or any push whose target is `refs/heads/main`) is refused with a message that explains the rule. Pushes to other branches are unaffected.
- The pull request for this change triggers `sdd-gate`. Its result, whether pass or a recorded failure with cause, is evidence in the plan.

## Acceptance criteria

| ID | Scenario / precondition | Action | Observable outcome |
| --- | --- | --- | --- |
| AC-01 | Fresh reader | Reads `AGENTS.md` | The branch-and-PR rule is among the permanent rules, including the meaning of "commit and push" and the bootstrap exception. |
| AC-02 | Hook installed | Push to `main` | Refused, with an explanatory message; nothing is pushed. |
| AC-03 | Hook installed | Push to a change branch | Allowed. |
| AC-04 | README | Reads *Commands* | Branch/PR workflow and the hook install command are documented. |
| AC-05 | This change | Opened as a pull request with level `L3` and change id | `sdd-gate` runs; its outcome and any limitation are recorded in the plan. |
| AC-06 | Framework checks | `scripts/verify broad` on the branch | Passed. |

## Constraints and compatibility

- **Governance (L3).** `AGENTS.md` is the shared agent policy. The new rule must not contradict existing rules: authorization is still required, and deployment is still separate.
- **Adapters.** Generated agent entrypoints must stay consistent (`sync_adapters.py --check`).
- **The hook is a local guard, not a trust boundary.** It can be bypassed (`--no-verify`, or simply not installed), so the plan must not claim it as enforcement.

## Uncertainties

| Question / assumption | Owner | Blocks | Resolution or evidence |
| --- | --- | --- | --- |
| `sdd-gate` may fail on this first run for reasons unrelated to the change (first live run of the workflow). Any such failure is investigated and recorded, not bypassed. | Idaika Iglesias | AC-05 | Pending |

## Acceptance and next steps

Scope acceptance: accepted by Idaika Iglesias on 2026-10-01. The open uncertainty (first live `sdd-gate` run) is handled during delivery, not before it.

Related plan: [plan.md](plan.md). States and completion rules: [specs index](../README.md).

Upon completion, record evidence and delivery status in the plan. If another change replaces this behavior, reference that change without rewriting history.
