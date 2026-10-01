# Spec: CHG-010 | Pin Node.js 24 in the CI verify job

Status: `approved` | Level: `L3` | Level rationale: changes `.github/workflows/sdd.yml`, which the `delivery-policy` risk rule puts at L3 minimum.
Owner: Idaika Iglesias | Scope accepted by / date: Idaika Iglesias, 2026-10-01.

## Problem and goal

The first product-target pull request ([PR #4](https://github.com/idaik-stuff/cv-online/pull/4), CHG-005) failed `sdd-gate`. The `ubuntu-24.04` runner provides **Node.js v22.23.3 with npm 10.9.9**, which does not support install-script approvals (`allowScripts`). CHG-007's `product-install` check refused to install, as designed, and the product checks then had no dependencies ([CHG-007 AC-04](../CHG-007-ci-product-checks/plan.md#completion-evidence)). The owner and local development use **Node.js 24.21.0 with npm 11.19.0**.

Observable outcome: product-target CI runs use the same Node.js and npm as local development, so `product-install` installs with install-script approvals enforced, and the product checks run.

## Context and current behavior

- **`sdd.yml` `verify` job:** checks out the trusted base and the candidate, then sets up Python 3.13, then runs `scripts/verify` with the base registry. It never sets up Node.js.
- **Pinned actions:** every action in the workflow is pinned by full commit SHA with a version comment.
- **The job's rule:** "Do not add secrets, persistent runners, caches, or deployment to this job."
- **`actions/setup-node` v7.0.0** (commit `820762786026740c76f36085b0efc47a31fe5020`) supports `node-version` and `package-manager-cache: false`.
- **Workflow source on PRs:** for `pull_request` events, GitHub runs the workflow file from the PR's merge ref. This PR therefore runs its own modified workflow. It touches framework paths only, so its gate does not run product checks.

## Scope and non-goals

Includes:

- A `setup-node` step in the `verify` job, pinned by SHA:
  - Node.js `24.21.0`, matching local development;
  - automatic package-manager caching explicitly disabled;
  - no registry auth and no token inputs beyond the default.
- Recording the CHG-007 AC-04 result (failed, cause, resolution) in the CHG-007 plan.
- README CI status update.

Does not include:

- Pinning Node.js for local development (`engines`, `.nvmrc`). That is a product-path change and can follow separately.
- Changing the `policy` or `gate` jobs.
- Any change to the check registry.

## Acceptance criteria

| ID | Scenario / precondition | Action | Observable outcome |
| --- | --- | --- | --- |
| AC-01 | This PR | Inspect `sdd.yml` | One new step in `verify`, before the checks: `actions/setup-node@<full SHA> # v7.0.0`, `node-version: 24.21.0`, `package-manager-cache: false`. No other job is changed. |
| AC-02 | This PR | `sdd-gate` | Passes (framework target), and the `verify` job log shows the setup step completing with Node.js 24.21.0. |
| AC-03 | After merge, a **new** run on PR #4 (CHG-005): update its branch with the new `main` (synchronize event). Re-running the old run does not pick up the new workflow. | `sdd-gate` | The job log shows `v24.21.0` and npm 11.x; `product-install` passes the approval probe and installs; `worker-tests` and `typecheck` run; the gate result reflects CHG-005 itself. This closes CHG-007 AC-04. |
| AC-04 | Framework checks | `verify broad` on this branch | Passed. |

## Constraints and compatibility

- **Delivery policy (L3).** No secrets, no caches, no new permissions. The action is pinned by full SHA, consistent with the existing actions.
- **Supply chain.** The official `actions/setup-node`, pinned by SHA, resolves Node.js 24.21.0 from the runner tool cache, GitHub's `actions/node-versions` manifest, or nodejs.org. The runtime is **version-pinned, not content-hash-pinned**; that residual risk is accepted. The action receives the default read-only `github.token`.
- **Trust model.** The registry is still read from the base. This change affects only the runtime available to the registered checks.

## Uncertainties

| Question / assumption | Owner | Blocks | Resolution or evidence |
| --- | --- | --- | --- |
| Node.js 24.21.0 bundles npm 11 with install-script approvals, as it does locally (npm 11.19.0). | Idaika Iglesias | AC-03 | **Resolved:** nodejs.org `dist/index.json` lists v24.21.0 with npm 11.19.0. AC-03 confirms it in CI. |

## Acceptance and next steps

Scope acceptance: accepted by Idaika Iglesias on 2026-10-01.

Related plan: [plan.md](plan.md). States and completion rules: [specs index](../README.md).
