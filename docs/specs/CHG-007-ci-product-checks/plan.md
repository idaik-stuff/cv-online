# Plan: CHG-007 | Make product checks runnable in CI

Status: `in-progress` | Technical owner: Idaika Iglesias | Accepted by / date: Idaika Iglesias, 2026-10-01.
Spec: [spec.md](spec.md) | Verification scope: `broad` (L3) + independent review.

## System inspection

- **`scripts/sdd/verify.py`:**
  - runs each registered `argv` with `shell=False` and `cwd` set to the candidate root;
  - substitutes only `{python}` (with `sys.executable`);
  - inherits the environment;
  - runs checks in profile order, with `focused` before `standard`.
- **`.sdd/verification.json`:** product profiles are `focused: [worker-tests]` and `standard: [typecheck]`; both invoke `node node_modules/...`.
- **`package.json` / `package-lock.json`:** the lockfile is committed. `allowScripts` (npm 11) approves `esbuild` and `workerd` install scripts.
- **Platforms:**
  - on Windows, `npm` resolves to `npm.cmd`, which cannot be started from an argv without a shell;
  - Python's `shutil.which` honours `PATHEXT`, and `subprocess` can start a `.cmd` file given its full path.

## Technical approach

1. **Register the check `product-install`** (kind `product`, timeout 600 s). It is a fixed `{python} -c` program that:
   - prints `node --version` and `npm --version`;
   - runs `npm ci --no-audit --no-fund` through the absolute path from `shutil.which`, and exits with npm's status;
   - fails with a clear message if `npm` or `node` is missing.

   Put it first in `profiles.product.focused`, so it runs before `worker-tests`, and `typecheck` follows in `standard`. No shell string, no secrets, no flags that skip the install-script allowlist.
2. **`.sdd/ci.json`:** add `"scripts/hooks/**"` to `framework_paths`.
3. **`.sdd/risk-rules.json`:** add `"scripts/hooks/**"` to the `ci-governance` paths.
4. **README:** CI status row "Product checks in CI" → configured by CHG-007; first observation pending on the first product PR.

**Rejected:**
- `argv: ["npm", "ci"]`: it fails on Windows without a shell, so local verification would break.
- A new helper script under `scripts/`: it would add a product path to this PR. The run would then be classified as product and fail before the registry change exists on the base.
- Adding `setup-node` to the workflow: out of scope. It changes delivery policy and the workflow's protected file, so it is reserved for a follow-up if the runner's Node proves unsuitable.

## Affected components and contracts

| Area / path | Change | Impact / consumer |
| --- | --- | --- |
| `.sdd/verification.json` | New `product-install` check, first in the product profile | Every product-target verification (CI and local) |
| `.sdd/ci.json` | `scripts/hooks/**` in `framework_paths` | CI target selection |
| `.sdd/risk-rules.json` | `scripts/hooks/**` in `ci-governance` | Level floor |
| `README.md` | CI status row | Owner |

## Risk-proportionate strategy

| Area | Decision, check, or reason for non-applicability |
| --- | --- |
| Verification controls | The install is deterministic (lockfile) and reviewable, with no secrets and no shell. It reaches only the npm registry, and install scripts are limited to the reviewed allowlist. A failed install fails the gate rather than skipping tests. |
| Supply chain | `npm ci` installs exactly the locked versions; any dependency change still arrives through a reviewed PR that changes the lockfile. Not covered: the integrity of the npm registry itself (accepted). |
| Local developer impact | `npm ci` deletes and reinstalls `node_modules` on each product-target local run. This is slower (tens of seconds) but matches CI exactly. Accepted. |
| CI trust | The base registry governs execution; this PR cannot alter its own run. AC-04 is observed on the first product PR and recorded here. |
| Failure | If the runner's Node is unsuitable, AC-04 fails visibly. The fix is a follow-up L3 change (pin Node), never a skipped check. |

## Implementation steps

1. Registry entry and profile order; `.sdd/ci.json` and `.sdd/risk-rules.json` updates. *Check:* `scripts/verify` config validation (any `verify` run validates the registry).
2. **AC-01:** clone the repository into a temporary folder (no `node_modules`) and run product verification there.
3. **AC-02:** `verify broad` in the working checkout.
4. **AC-05:** check classification with the CI policy code (`scripts/check-ci` unit path or a matching-logic check against `scripts/hooks/pre-push`).
5. Independent review → push the branch → PR → AC-03 → merge per `AGENTS.md`.
6. **AC-04:** after merge, observed on the first product PR and recorded here.

## Verification plan and traceability

| AC / risk | Test, check, or manual procedure | Command / location / environment | Expected result |
| --- | --- | --- | --- |
| AC-01 | Clean-clone run | Temp clone, `python scripts/verify focused --base <base> --level L2 --change …` | Install + `worker-tests` pass; versions printed |
| AC-02 | Working checkout | `python scripts/verify broad --base <base> --level L3 --change CHG-007-ci-product-checks` | passed |
| AC-03 | This PR | GitHub `sdd-gate` | passes (framework target) |
| AC-04 | First product PR | GitHub `sdd-gate` | install and product checks pass in CI |
| AC-05 | Path classification | Glob match of `scripts/hooks/pre-push` against both files, using the framework's own matcher | Both match |

## Affected documentation

`README.md` CI status table.

## Deviations and decisions during execution

None recorded yet.

## Completion evidence

| AC / check | Result | Evidence summary / reference |
| --- | --- | --- |
| AC-01 to AC-05 | Not run | Pending. |

Independent review: required (L3). Not started.

Outstanding items / exceptions: AC-04 depends on the first product PR (planned: CHG-005).

Delivery: not merged.
