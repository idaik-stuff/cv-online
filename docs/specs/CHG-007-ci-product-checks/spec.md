# Spec: CHG-007 | Make product checks runnable in CI

Status: `approved` | Level: `L3` | Level rationale: changes the verification registry (`.sdd/verification.json`) and CI policy (`.sdd/ci.json`, `.sdd/risk-rules.json`). Both are under the risk rules `verification-controls` and `ci-governance`, with an L3 minimum.
Owner: Idaika Iglesias | Scope accepted by / date: Idaika Iglesias, 2026-10-01.

## Problem and goal

`sdd-gate` runs the product checks registered in `.sdd/verification.json` (`worker-tests`, `typecheck`) for any pull request that touches product paths. Those checks need the project's Node dependencies, but the CI checks out a clean tree and sets up Python only. Every product pull request would therefore fail the gate for a reason outside the change ([CHG-006 review F1](../CHG-006-branch-and-pr-guard/plan.md#completion-evidence)).

A related gap: `scripts/hooks/**`, where the local push guard will live (CHG-008), matches neither the framework paths nor any risk rule. A PR that only touches it would run product checks and would get no L3 floor.

Observable outcome:
- product pull requests can pass `sdd-gate` on their own merits;
- governance hooks are classified as governance.

## Context and current behavior

- **`sdd.yml`:**
  - the `verify` job runs `scripts/verify` with the **base** registry and the **candidate** tree (`--root sdd-candidate`);
  - it sets up Python 3.13;
  - its own comment says: "Register product dependency setup as reviewed commands in the check registry. Do not add secrets, persistent runners, caches, or deployment to this job."
- **Registry entries:**
  - `argv` lists, run without a shell;
  - `{python}` is the only placeholder;
  - the product profiles are `focused: [worker-tests]` and `standard: [typecheck]`.
- **CI target:** `framework` only when every changed path matches `.sdd/ci.json` `framework_paths`.
- **Locally,** `npm` is `npm.cmd` on Windows, which cannot be launched from an argv without a shell.
- **The CI runner** (`ubuntu-24.04`) has Node.js and npm preinstalled; the exact version is not pinned by this repository.

## Scope and non-goals

Includes:

- **A registered, reviewed product check** that installs the locked dependencies (`npm ci`, which takes the exact versions from `package-lock.json`). It runs first in the product profile, works on the CI runner and on the owner's Windows machine, and reports the Node and npm versions it used.
- **Governance paths:** add `scripts/hooks/**` to `framework_paths` and to the `ci-governance` risk rule.
- **README:** update the CI status table.

Does not include:

- Changing `.github/workflows/sdd.yml`, for example adding `setup-node`. Pinning the Node version in CI is a candidate follow-up if the runner's version proves unsuitable.
- Caching dependencies (excluded by the workflow's own rule).
- The hook itself (CHG-008).

## Expected behavior

- In CI, a product-target run first installs the dependencies exactly as locked, then runs `worker-tests` and `typecheck`. A failure in the install fails the gate with a clear cause.
- A framework-target run is unchanged: no install, Python-only checks.
- Locally, `scripts/verify` with the product target performs the same install before the tests.
- A PR touching only `scripts/hooks/**` is classified as framework target with an L3 floor.

## Acceptance criteria

| ID | Scenario / precondition | Action | Observable outcome |
| --- | --- | --- | --- |
| AC-01 | A clean checkout without `node_modules`, Windows | `python scripts/verify focused --base <base> --level L2` (product target) | Dependencies are installed from the lockfile; `worker-tests` passes; the Node and npm versions are printed. |
| AC-02 | Existing local checkout | `python scripts/verify broad` | Passes; the install is idempotent (it reinstalls from the lockfile). |
| AC-03 | This PR (framework paths only) | `sdd-gate` | Passes on the framework target. |
| AC-04 | The first product-path PR after merge (planned: CHG-005) | `sdd-gate` | The install runs on the CI runner, the product checks run, and the gate result reflects the change itself. Recorded here as a follow-up. |
| AC-05 | `.sdd/ci.json` and `.sdd/risk-rules.json` | A path `scripts/hooks/pre-push` | Matches `framework_paths` and the `ci-governance` L3 floor. |

## Constraints and compatibility

- **Verification controls (L3).** The registry decides what CI executes. The new check must be a fixed, reviewable command:
  - no network access beyond the npm registry;
  - no secrets;
  - no shell string;
  - no `--ignore-scripts` bypass of the reviewed install-script allowlist.
- **Base-registry trust.** This PR cannot exercise the new check on itself, because CI reads the registry from the base. The proof on CI comes from the first product PR (AC-04).
- **Framework alignment.** This follows the workflow's documented extension point; the workflow file is untouched.

## Uncertainties

| Question / assumption | Owner | Blocks | Resolution or evidence |
| --- | --- | --- | --- |
| The runner's preinstalled Node meets the toolchain's requirements (Vitest 4, Wrangler 4, TypeScript 7). | Idaika Iglesias | AC-04 | Unknown until the first product PR. If unsuitable, a follow-up change pins Node in the workflow (L3). |

## Acceptance and next steps

Scope acceptance: accepted by Idaika Iglesias on 2026-10-01. The runner-Node uncertainty is resolved by observation (AC-04), not before implementation.

Related plan: [plan.md](plan.md). States and completion rules: [specs index](../README.md).

Upon completion, record evidence and delivery status in the plan. If another change replaces this behavior, reference that change without rewriting history.
