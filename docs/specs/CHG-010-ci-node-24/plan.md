# Plan: CHG-010 | Pin Node.js 24 in the CI verify job

Status: `approved` | Technical owner: Idaika Iglesias | Accepted by / date: Idaika Iglesias, 2026-10-01.
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
| Supply chain | Official action and Node.js distribution; exact versions. |
| Self-test | This PR runs its own workflow, so AC-02 shows the step working. Product checks are exercised by re-running PR #4 after merge (AC-03). |
| Failure | If AC-03 still fails, investigate; never skip `product-install`. |

## Implementation steps

1. Workflow step, CHG-007 AC-04 record, README. *Check:* YAML parses; `verify broad --base <main> --level L3 --change CHG-010-ci-node-24`.
2. Independent review → PR → AC-02 from the job log → owner merge.
3. Re-run PR #4's gate (AC-03); record it here and in the CHG-007 plan.

## Verification plan and traceability

| AC | Check | Command / location | Expected |
| --- | --- | --- | --- |
| AC-01 | Diff inspection | `git diff main -- .github/workflows/sdd.yml` | Exactly the one step |
| AC-02 | PR gate and job log | GitHub Actions on this PR | Gate passes; setup step shows Node.js 24.21.0 |
| AC-03 | PR #4 re-run | GitHub Actions | `v24.21.0`, npm 11.x, product checks run |
| AC-04 | Broad verification | `python scripts/verify broad --base <main> --level L3 --change CHG-010-ci-node-24` | passed |

## Affected documentation

`README.md`, the CHG-007 plan.

## Deviations and decisions during execution

None recorded yet.

## Completion evidence

| AC / check | Result | Evidence summary / reference |
| --- | --- | --- |
| AC-01 to AC-04 | Not run | Pending. |

Independent review: required (L3). Not started.

Outstanding items / exceptions: AC-03 after merge.

Delivery: not merged.
