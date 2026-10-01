# Plan: CHG-006 | Integrate every change through a branch and a pull request

Status: `approved` | Technical owner: Idaika Iglesias | Accepted by / date: Idaika Iglesias, 2026-10-01.
Spec: [spec.md](spec.md) | Verification scope: `broad` (L3) + independent review.

## System inspection

- **`AGENTS.md`:**
  - *Permanent rules* (10 bullets): no branch or PR rule.
  - *Commands*: points to the README.
  - *Completion*: "Summarize the change…", with no PR step.
- **`CLAUDE.md`:** imports `AGENTS.md`, so the new rule reaches Claude Code automatically.
- **`.github/pull_request_template.md`:** a metadata block with `Change-Level` and `Change-ID`.
- **`.github/workflows/sdd.yml`:**
  - triggered on `pull_request` only;
  - it reads policy from a separate checkout of the PR base and runs `check-ci-setup` on both revisions.
- **`.github/CODEOWNERS`:** on `main` since the bootstrap commit `55e2e15`.
- **Hooks:** none installed (`core.hooksPath` unset); `scripts/hooks/` does not exist.

## Technical approach

1. **`AGENTS.md`.** Add one permanent rule, in the spec's wording, and one *Completion* line: push the change branch and open or update the PR with the template metadata; report the `sdd-gate` result.
2. **`scripts/hooks/pre-push`.** A POSIX `sh` script that reads git's push lines from stdin and exits 1 if any remote ref is `refs/heads/main`, with a message pointing to the rule. It has no dependencies and runs in Git for Windows. Install it with `git config core.hooksPath scripts/hooks`, documented in the README.
3. **README.**
   - Add rows to *Product commands*: "Start a change", "Open the PR" (`gh pr create` with the template), and "Install the push guard".
   - Add a short note under *CI activation* about the plan limitation.
4. **Deliver as a PR.**
   - Push the branch and open a PR with `Change-Level: L3` and `Change-ID: CHG-006-branch-and-pr-guard`.
   - Observe `sdd-gate` and record the result.
   - Merge only with a passing gate and the owner's approval.

**Rejected:**
- A server ruleset: not enforced on this plan (spec).
- A blocking check inside `scripts/verify`: that belongs in the framework (`FEEDBACK-branch-and-pr-workflow.md`), so the project does not diverge from the template's scripts.

## Affected components and contracts

| Area / path | Proposed change | Impact / consumer |
| --- | --- | --- |
| `AGENTS.md` | New permanent rule + completion step | Every agent and contributor |
| `scripts/hooks/pre-push` (new) | Local push guard | Owner's machine |
| `README.md` | Workflow, hook install, plan-limitation note | Owner |
| PR #1 | First live `sdd-gate` run | CI evidence |

## Risk-proportionate strategy

| Area | Decision, check, or reason for non-applicability |
| --- | --- |
| Governance | The rule adds a constraint and removes no existing one. It keeps the authorization and deployment rules intact. The independent review checks for contradictions. |
| Enforcement honesty | The hook is a local guard (bypassable, opt-in). Real enforcement needs server rules, which are unavailable now. The docs say so. |
| CI first run | The first live run may expose workflow issues (permissions, base checkout, ownership checks). They are investigated and recorded, never bypassed or weakened in this change. |
| Bootstrap exception | `55e2e15` is recorded here as the owner-authorized bootstrap (ci-enforcement step 3). It is the only direct commit allowed under the new rule. |
| Data / production | None. |

## Implementation steps

1. Edit `AGENTS.md`; write `scripts/hooks/pre-push`; update the README. *Check:* `sync_adapters.py --check`, `check-docs`.
2. Hook behavior. *Check:* simulate a push to `main` (refused) and to a branch (allowed) by feeding git's push-line format to the hook.
3. `scripts/verify broad --level L3 --change CHG-006-branch-and-pr-guard`.
4. Independent review.
5. Push the branch, open the PR, record `sdd-gate`, and merge with the owner's approval.

## Verification plan and traceability

| AC / risk | Test, check, or manual procedure | Command / location / environment | Expected result |
| --- | --- | --- | --- |
| AC-01 | Read the rule in context | `AGENTS.md` | Present, consistent with the existing rules |
| AC-02 | Feed `refs/heads/x <sha> refs/heads/main <sha>` to the hook | `sh scripts/hooks/pre-push origin url` | Exit 1 with the message |
| AC-03 | Feed a branch ref | Same | Exit 0 |
| AC-04 | Read the README | `README.md` | Documented |
| AC-05 | Open the PR | GitHub Actions | `sdd-gate` runs; result recorded |
| AC-06 | Broad verification | `python scripts/verify broad --base 55e2e15 --level L3 --change CHG-006-branch-and-pr-guard` | passed |
| Adapters | Consistency | `python .agents/tools/sync_adapters.py --check` | passed |

## Affected documentation

`AGENTS.md`, `README.md`.

## Deviations and decisions during execution

None recorded yet.

## Completion evidence

Verified version or diff: pending.

| AC / check | Result | Evidence summary / reference |
| --- | --- | --- |
| AC-01 to AC-06 | Not run | Pending. |

Independent review: required (L3). Not started.

Outstanding items / exceptions: bootstrap commit `55e2e15` (authorized by the owner, 2026-10-01; ci-enforcement step 3).

Delivery: not merged.
