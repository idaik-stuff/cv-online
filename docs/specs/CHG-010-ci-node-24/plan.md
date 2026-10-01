# Plan: CHG-010 | Pin Node.js 24 in the CI verify job

Status: `in-progress` | Technical owner: Idaika Iglesias | Accepted by / date: Idaika Iglesias, 2026-10-01.
Spec: [spec.md](spec.md) | Verification scope: `broad` (L3) + independent review.

## System inspection

- **`.github/workflows/sdd.yml`, `verify` job:**
  - `checkout` ×2 (trusted base, then candidate merge ref);
  - `setup-python@5fda3b9… # v7.0.0` with Python 3.13;
  - "Execute checks selected by the base registry";
  - "Retain verification evidence" (upload-artifact).
  - Permissions: `contents: read`.
- **PR #4 CI log, run 36921655998:**
  - `v22.23.3` / `10.9.9`;
  - "this npm does not support allowScripts…";
  - `worker-tests` and `typecheck` then failed with `MODULE_NOT_FOUND`.
- **Action release:** `actions/setup-node` latest release `v7.0.0`, tag commit `820762786026740c76f36085b0efc47a31fe5020`. Its inputs include `node-version` and `package-manager-cache` (default `true`, which caches automatically when `packageManager` is declared; this repository does not declare it, but the input is set explicitly anyway).

## Technical approach

Insert after "Set up the framework interpreter" in `verify`:

```yaml
      - name: Set up the product runtime
        uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: '24.21.0'
          package-manager-cache: false
```

Record CHG-007 AC-04 as **failed, cause identified, resolved by CHG-010 pending re-observation** in the CHG-007 plan. Update the README CI status row.

**Rejected:**
- Running `npm exec npm@11` inside `product-install`: it downloads npm at run time from outside the lockfile, and the registry change is equally L3.
- `node-version: 24` (floating): drift from local; the exact version gives parity.

## Affected components and contracts

| Area / path | Change | Impact |
| --- | --- | --- |
| `.github/workflows/sdd.yml` | One pinned `setup-node` step in `verify` | Runtime for registered product checks |
| `docs/specs/CHG-007-ci-product-checks/plan.md` | AC-04 result | Evidence |
| `README.md` | CI status row | Owner |

## Risk-proportionate strategy

| Area | Decision |
| --- | --- |
| Delivery policy | No secrets, caches, or permission changes. The action is pinned by full SHA; the `policy` and `gate` jobs are untouched. |
| Supply chain | Official `actions/setup-node`, pinned by SHA. Node.js 24.21.0 comes from the runner tool cache, GitHub's node-versions manifest, or nodejs.org: version-pinned, not hash-pinned (accepted). nodejs.org `index.json` confirms that v24.21.0 bundles npm 11.19.0. |
| Self-test | This PR runs its own workflow, so AC-02 is **self-attesting**: it shows that the proposed step installs Node.js on a framework target, not that the workflow is safe. Safety rests on the independent review and the owner's review of the diff (CODEOWNERS and rulesets are not enforced on this plan). Product behavior is shown by a **new** PR #4 run after merge (AC-03). |
| Availability | The step runs for every PR, including framework-only ones, so each gate now depends on a Node.js download. A download failure fails the gate closed (accepted). If made conditional later, use a step-level `if` on the policy target. |
| Caching | No cache inputs, `package-manager-cache: false`, and no `packageManager` field. AC-02 also checks the job log for the absence of "Cache restored" and "Cache saved" (including the post step). Follow-up candidate: a workflow policy test asserting these settings (review F7). |
| Failure | If AC-03 still fails, investigate; never skip `product-install`. |

## Implementation steps

1. Workflow step, CHG-007 AC-04 record, README. *Check:* YAML parses; `verify broad --base <main> --level L3 --change CHG-010-ci-node-24`.
2. Independent review → PR → AC-02 from the job log (Node.js version; no cache lines) → owner merge.
3. Update the PR #4 branch with the new `main` to trigger a **new** run (AC-03). Record the run ID and merge SHA here and in the CHG-007 plan.

## Verification plan and traceability

| AC | Check | Command / location | Expected |
| --- | --- | --- | --- |
| AC-01 | Diff inspection | `git diff main -- .github/workflows/sdd.yml` | Exactly the one step |
| AC-02 | PR gate and job log | GitHub Actions on this PR | Gate passes; setup step shows Node.js 24.21.0 |
| AC-03 | New PR #4 run after merging `main` into its branch | GitHub Actions | `v24.21.0`, npm 11.19.0, product checks run |
| AC-04 | Broad verification | `python scripts/verify broad --base <main> --level L3 --change CHG-010-ci-node-24` | passed |

## Affected documentation

`README.md`, the CHG-007 plan.

## Deviations and decisions during execution

None recorded yet.

## Completion evidence

Verified version or diff: branch `chg-010-ci-node-24` (base `b36c737`).

| AC / check | Result | Evidence summary / reference |
| --- | --- | --- |
| AC-01 | Passed | `git diff` of `sdd.yml`: one step added to `verify` only, after `setup-python`: `actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0`, `node-version: '24.21.0'`, `package-manager-cache: false`. The `policy` and `gate` jobs are unchanged. |
| AC-02 | Pending | PR gate and job log. |
| AC-03 | Pending | Re-run of PR #4 after merge. |
| AC-04 | Passed | `verify broad --base b36c737 --level L3 --change CHG-010-ci-node-24` passed, including `automation-tests` (which contain the workflow policy tests in `scripts/tests/test_ci_workflow.py`). |

Independent review (L3), 2026-10-01: the `sdd-independent-review` subagent in a fresh context, read-only, same model family (not a human review).
- **Result:** no blocking findings. Confirmed within scope: the step is in `verify` only, `policy` and `gate` are unchanged, no permissions, secrets, or registry inputs were added, the action is pinned by SHA, the new runtime path satisfies `product-install`'s refusal of in-repository tools, and the PR is framework-target.
- **Fixed:**
  - F1: AC-03 needs a new run, not a re-run of the old one;
  - F2: the CHG-007 AC-04 table row;
  - F3: CHG-007 outstanding items and delivery;
  - F4: `ci-enforcement.md` names the setup-node pin and the Node runtime;
  - F5: version-pinned, not hash-pinned;
  - F6: availability risk row;
  - Q1: cache observation added to AC-02;
  - Q2: bundled npm confirmed from nodejs.org.
- **Deferred:** F7, a policy test for the cache settings, as a follow-up candidate.

Outstanding items / exceptions: AC-02, AC-03.

Delivery: not merged.
