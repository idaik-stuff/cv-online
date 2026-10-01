# Plan: CHG-006 | Integrate every change through a branch and a pull request

Status: `in-progress` | Technical owner: Idaika Iglesias | Accepted by / date: Idaika Iglesias, 2026-10-01 (scope revision accepted the same day).
Spec: [spec.md](spec.md) | Verification scope: `broad` (L3) + independent review.

## System inspection

State before this change:

- **`AGENTS.md`:**
  - *Permanent rules* had no branch, pull-request, or merge rule;
  - *Completion* had no pull-request step;
  - `CLAUDE.md` imports it.
- **`.github/pull_request_template.md`:** a metadata block with `Change-Level` and `Change-ID`.
- **`.github/workflows/sdd.yml`:**
  - triggered on `pull_request` only;
  - it reads policy and the check registry from a separate checkout of the PR base;
  - it sets up **Python only**, so product checks (`node node_modules/...`) cannot run because the CI does not install dependencies (independent review F1);
  - `scripts/sdd/ci.py` selects target `framework` only when every changed path matches `.sdd/ci.json` `framework_paths`, and `product` otherwise.
- **Local `scripts/verify`** defaults to `--target product`. The CI target comes from path classification, so a local `target=product` result does not predict the CI target.
- **`.github/CODEOWNERS`:** on `main` since the bootstrap commit `55e2e15`.

## Technical approach

1. **`AGENTS.md`, two permanent rules:**
   - **Branch rule:** never commit or push directly to the default branch; one lowercase change-ID branch per change; a pull request with the template metadata; "commit and push" means the change branch.
   - **Merge rule:**
     - merge only when `sdd-gate` passes and the owner approves;
     - otherwise only under an authorized exception per [methodology section 9](../../development/methodology.md#9-exceptions-and-urgent-work);
     - a direct commit to the default branch is allowed only to establish CI trust ([ci-enforcement step 3](../../development/ci-enforcement.md#3-establish-the-initial-trusted-version)), with the same record.

   One *Completion* line, conditional on authorization: push, open or update the PR, report the gate result or its absence.
2. **README.**
   - A *Change workflow* subsection under *Commands*: start a change, open the PR.
   - A CI status table under *CI activation*, stating what is configured, what is observed, and what is not enforced.
3. **Deliver as a pull request** touching framework paths only (`AGENTS.md`, `README.md`, `docs/**`), so `sdd-gate` runs the framework checks, which need only Python.

**Approval policy for a solo maintainer** (review F5; explicit alternative policy per ci-enforcement step 5): the owner is also the author. The human approval is the owner's. Independence for L3 comes from the `sdd-independent-review` subagent in a fresh context, recorded in each plan. This is not equivalent to a second human reviewer; the limitation is accepted.

**Rejected:**
- Keeping the hook in this change: its path is not a framework path, so the PR would run product checks that cannot pass in CI yet (review F1). Moved to CHG-008.
- Adding `setup-node` to the workflow here: that changes delivery policy (L3, `.github/workflows/**`). How the CI installs dependencies is decided in CHG-007.

## Affected components and contracts

| Area / path | Change | Impact / consumer |
| --- | --- | --- |
| `AGENTS.md` | Branch rule, merge rule, conditional completion step | Every agent and contributor |
| `README.md` | Change workflow; CI status table | Owner |
| First pull request | First live `sdd-gate` run | CI evidence |

## Risk-proportionate strategy

| Area | Decision, check, or reason for non-applicability |
| --- | --- |
| Governance | The rules add constraints and remove none. Authorization and deployment rules are unchanged. The direct-commit exception is limited to establishing CI trust and requires a section 9 record (review F3). |
| Enforcement honesty | Nothing here is enforced by GitHub on this plan. The README table says so. The local hook (CHG-008) will also be a guard, not a boundary. |
| CI first run | Framework-only paths, so no product checks run. Any other failure is investigated and recorded; the gate is never weakened. A merge without a passing gate requires a section 9 exception (AC-05). |
| Bootstrap exception | `55e2e15` (real `CODEOWNERS` on `main`). Section 9 record: authorized by Idaika Iglesias on 2026-10-01. Rationale: `sdd-gate` checks ownership on the PR base. Risk: an unreviewed direct change to `main`. Compensating measure: the change is a single file copied from the template with only the owner placeholder replaced, and `check-ci-setup` reports `local-files-ready`. Owner: Idaika Iglesias. Independent inspection: the CHG-006 re-review read the resulting `.github/CODEOWNERS` (single owner `@idaik-stuff`, protected block last) and found it structurally plausible. It could not verify the account's access or the placeholder-only edit. **Outstanding:** GitHub's own owner validation is unavailable on this plan (API 404). Owner: Idaika Iglesias. Due: when the repository becomes public or moves to a paid plan, before CI enforcement is activated. |
| Data / production | None. |

## Implementation steps

1. Edit `AGENTS.md` and the README. *Check:* `sync_adapters.py --check`, `check-docs`.
2. `scripts/verify broad --base 55e2e15 --level L3 --change CHG-006-branch-and-pr-guard`.
3. Independent review, then a re-review of corrections.
4. Push the branch, open the PR (`Change-Level: L3`, `Change-ID: CHG-006-branch-and-pr-guard`), and record the `sdd-gate` result.
5. Merge only per AC-05.

## Verification plan and traceability

| AC / risk | Test, check, or manual procedure | Command / location / environment | Expected result |
| --- | --- | --- | --- |
| AC-01, AC-02 | Read the rules in context | `AGENTS.md` | Present and consistent with the existing rules |
| AC-04 | Read the README | `README.md` | Workflow and an honest CI status |
| AC-05 | Open the PR | GitHub Actions `sdd-gate` | Runs; result recorded; merge per the rule |
| AC-06 | Broad verification | `python scripts/verify broad --base 55e2e15 --level L3 --change CHG-006-branch-and-pr-guard` | passed |
| Adapters | Consistency | `python .agents/tools/sync_adapters.py --check` | passed |

## Affected documentation

`AGENTS.md`, `README.md`.

## Deviations and decisions during execution

1. **Scope revision after the independent review** (accepted by the owner, 2026-10-01):
   - the `pre-push` hook moves to CHG-008;
   - CHG-007 prepares the CI for product checks;
   - the continuous deployment planned as CHG-007 is now CHG-009.
2. **README structure.** The workflow went into a new *Change workflow* subsection instead of rows in *Product commands*, because it is not a product command.

## Completion evidence

Verified version or diff: working tree on top of the branch commit `0fc576c` (base `55e2e15`); the PR head SHA that the gate runs on is recorded under AC-05. Environment: Windows 11, Python 3.14.7, Node.js 24.21.0.

| AC / check | Result | Evidence summary / reference |
| --- | --- | --- |
| AC-01, AC-02, AC-04 | Passed | Text in `AGENTS.md` and `README.md`, confirmed by the round 2 re-review. |
| AC-05 | Pending | After the PR is opened. |
| AC-06 | Passed | `verify broad` after the revision: framework checks, worker-tests 101/101, typecheck. Local `--target` defaults to `product`, a superset of the framework checks that CI selects for these paths; this is not the same run as CI. |
| Adapters | Passed | `sync_adapters.py --check`: 0 stale. |

Independent review: round 1 by the `sdd-independent-review` subagent (fresh context, read-only, same model family; not a human review).
- **Blocking:** F1, the product checks cannot run in CI; F2, there was no merge path for a failed gate.
- **Non-blocking:** F3 to F9.
- **Resolved by the scope revision and the edits above:** F1 (scope revision), F2 (AC-05 and the merge rule), F3 (narrow exception), F4 (conditional completion), F5 (approval policy), F6 (wording), F7 (CI status table), F8 (plan accuracy).
- **Moved with the hook to CHG-008:** F9 (hook notes).
- **Round 2 (re-review, same reviewer context):** no blocking findings. F1–F8 resolved; F9 deferred with the hook.
  - N1 to N4 (wording) fixed: spec scope bullet, the section 9 record for `55e2e15` with its outstanding item, evidence wording, README absolute.
  - N5 recorded under *Outstanding items*.

Outstanding items / exceptions:
- Bootstrap `55e2e15` (section 9 record above, with its outstanding owner validation).
- **Sequencing (review N5):** deliver CHG-007 before any product-path change, such as CHG-005. Until then, a product PR's gate fails for a reason outside the change and would need a section 9 exception; exceptions must not become routine.

Delivery: not merged.
