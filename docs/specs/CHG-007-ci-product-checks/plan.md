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

1. **Register the check `product-install`** (kind `product`, timeout 300 s, final form at `3ff2627`). It is a fixed `{python} -I -c` program that:
   - resolves `node` and `npm` on PATH and refuses either one if it resolves inside the repository;
   - prints `node --version` and `npm --version`;
   - probes `npm install-scripts --help` and fails if npm lacks install-script approvals (`allowScripts`);
   - runs `npm ci --no-audit --no-fund` and exits with npm's status.

   It comes first in `profiles.product.focused`, so it runs before `worker-tests`, and `typecheck` follows in `standard`. No shell string, no secrets, no flags that skip the install-script allowlist. The design changed after the independent review; see deviation 3.
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
| Verification controls | The install is deterministic (lockfile) and reviewable, with no secrets and no shell. Python runs isolated (`-I`), and `node`/`npm` resolved inside the repository are refused. **Install-script gating:** dependency install scripts run only if listed in `package.json` `allowScripts`, which npm 11 enforces by default (it skips unlisted scripts). The check probes `npm install-scripts` and fails on an npm without that capability, so CI never installs with an npm that lacks install-script approvals. The probe proves the capability exists, not that every configuration keeps it in force. The settings that govern installation are candidate-controlled, **reviewed-diff controls**, not base-trusted ones: `allowScripts` and the root lifecycle scripts in `package.json`, and any repository `.npmrc`. A PR that changes them must be reviewed as such. A failed install fails the gate rather than skipping tests. |
| Supply chain | `npm ci` installs exactly the locked versions; any dependency change still arrives through a reviewed PR that changes the lockfile. Not covered: the integrity of the npm registry itself (accepted). |
| Local developer impact | `npm ci` deletes and reinstalls `node_modules` on each product-target local run. This is slower (about 7–17 s observed) and follows the same steps as CI; equality with CI is confirmed only once AC-04 shows the CI versions. Accepted. |
| CI trust | The base registry governs execution; this PR cannot alter its own run. AC-04 is observed on the first product PR and recorded here. |
| Failure | If the runner's Node or npm is unsuitable, AC-04 fails visibly. The fix is a follow-up L3 change (pin Node/npm), never a skipped check. Timeout: 300 s for the install, so broad product verification stays well within the job's 20 minutes (review F6). |

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

1. **AC-05 uses the framework's own matcher.** The check calls `matches()` from `scripts/sdd/changes.py`, which `ci.py` uses, instead of the CI unit path.
2. **Windows file locks** (observation, no scope change). The first AC-02 run failed: `npm ci` got `EPERM` unlinking a native module (`rolldown-binding…node`) that orphaned processes still held. Those were an `npm test`/Vitest/esbuild set left by an earlier hung run in CHG-002. The processes were stopped and the run repeated: passed. CI runners start clean, so this does not apply there. Locally, close running test or dev processes before a product-target verification.
3. **Hardening after the independent review** (`3ff2627`):
   - **npm capability probe (F1):** fail if `npm install-scripts` is unavailable;
   - **isolation (F2):** `python -I`, and node/npm resolved inside the repository are refused;
   - **timeout 300 s (F6).**
   - Negative tests: a planted `npm.cmd` in the repository is refused, and a fake npm 10 without the approval command fails before installing anything.
4. **Reviewed platform adapter (F3).** On Windows the runner refuses `.cmd`/`.bat` as `argv[0]`. This check reaches `npm.cmd` through Python's `subprocess`, which bypasses that guard. This is accepted as the reviewed platform adapter for npm, on the condition that **it only ever passes constant arguments** (no user- or diff-derived values), so batch-argument injection does not apply.
5. **AC-01 command.** Run as `broad --level L3` (the change's real level, a superset of the specified `focused --level L2`).

## Completion evidence

Verified version or diff: branch head `3ff2627` (registry final), plus documentation-only edits after it. Base `8c59abe` (main after PR #1). Environment: Windows 11, Python 3.14.7, Node.js 24.21.0, npm 11.19.0.

| AC / check | Result | Evidence summary / reference |
| --- | --- | --- |
| AC-01 | Passed | Fresh local clone of `3ff2627`, without `node_modules`: `verify broad --base 8c59abe --level L3 --change CHG-007-ci-product-checks` → passed (product-install 6.6 s, worker-tests, typecheck, and all framework checks). Direct run printed `v24.21.0` / `11.19.0` and the approval probe passed. |
| AC-02 | Passed | Working checkout, same command, after the hardening → passed. An earlier run was blocked by stale processes (deviation 2). |
| AC-03 | Passed | [PR #2](https://github.com/idaik-stuff/cv-online/pull/2), head `1505045` ([Actions run 36914809658](https://github.com/idaik-stuff/cv-online/actions/runs/36914809658)): `sdd-policy`, `sdd-verify`, and `sdd-gate` pass on the framework target; merge state `CLEAN`. The owner re-acceptance commit triggers a new run, which must also pass before merge. |
| AC-04 | **Failed (first observation), as designed; resolution in CHG-010** | [PR #4](https://github.com/idaik-stuff/cv-online/pull/4) (CHG-005), [run 36921655998](https://github.com/idaik-stuff/cv-online/actions/runs/36921655998), job log: the runner reported `v22.23.3` / `10.9.9`; `product-install` refused ("this npm does not support allowScripts…") and failed; `worker-tests` and `typecheck` then failed with `MODULE_NOT_FOUND`. The guard failed closed, as intended. Follow-up: [CHG-010](../CHG-010-ci-node-24/plan.md) pins Node.js 24.21.0 (bundled npm 11.19.0, per nodejs.org `index.json`); re-observation is CHG-010 AC-03. |
| AC-05 | Passed | Framework matcher: `scripts/hooks/pre-push` is a framework path with `ci-governance` L3. Control: `src/worker.ts` is not a framework path. |
| Guard negatives | Passed | A planted npm is refused; an npm without approvals fails without installing. |

Independent review: round 1 by the `sdd-independent-review` subagent (fresh context, read-only, same model family; not a human review).
- **Blocking:** F1, the install-script allowlist was claimed for CI without enforcement.
- **Non-blocking:** F2 (isolation), F3 (platform adapter), F4 (evidence identity), F5 (AC-04 tracking), F6 (timeout).
- **Resolved:**
  - F1: npm capability probe plus corrected claims (README, spec, plan);
  - F2: `-I` and refusal of in-repository tools;
  - F3: deviation 4;
  - F4: this table;
  - F6: 300 s timeout.
- **F5:**
  - AC-04 stays an explicit outstanding item;
  - the next product PR must reference it;
  - **proposal:** a minimal probe product PR right after merge, so CI viability does not depend on feature work.
- **Round 2 (re-review, same reviewer context):** no blocking findings; F1–F6 resolved.
  - R1 (approach step 1 and deviation order) and R2 (reviewed-diff controls, softened wording) are fixed.
  - R3 is left to AC-04: the probe's behavior on a real older npm will be seen when the runner's npm version shows in the CI log.
  - R4: the owner re-accepted the tightened AC-04 and the npm uncertainty on 2026-10-01; recorded in the spec.

Outstanding items / exceptions:
- **AC-04:** failed on PR #4 (run 36921655998). Closure depends on CHG-010 AC-03 (a new PR #4 run after CHG-010 merges). The spec stays not `implemented` until then.

Delivery: merged (PR #2). The plan stays `in-progress` until AC-04 passes through CHG-010 AC-03; the spec is then marked `implemented`.
