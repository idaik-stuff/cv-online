# cv-online

A personal CV editor with a draft/publish workflow and public CV pages. Edit a CV,
duplicate it to tailor it for a job offer, and publish it to a clean, shareable,
printable URL. Drafts never reach the public page until they are explicitly published.

Status: **first product change (CHG-002) live** at https://cv-online.idaika.workers.dev (fictional sample CVs for now). See the [brief](docs/product/brief.md),
[MVP scope](docs/product/mvp.md), and [requirements](docs/product/prd.md).

## How this repository is built

This project is developed with **Lightweight SDD** (framework version `1.0.0`, MIT), a
spec-driven development framework for working with AI coding agents. Every change is
classified by risk (L0–L3); L2/L3 changes get a spec and a plan in
[`docs/specs/`](docs/specs/README.md), durable decisions are recorded as
[ADRs](docs/adr/README.md), checks run through `scripts/verify`, and the riskiest
changes require an independent review.

- Permanent rules and routing: [AGENTS.md](AGENTS.md)
- Gates and verification: [methodology](docs/development/methodology.md)
- Framework manual: [docs/manual](docs/manual/README.md)

Real CV content is never committed. Local personal data lives in the ignored
`private/` folder; the repository will use a fictional sample CV.

## Commands

Run from the repository root. Framework automation requires Python 3.10 or later and
uses only the standard library; Git is required for change checks and product verification.

This README is the human command registry. `.sdd/verification.json` is the machine
source for automated check arguments and profile membership.

### Product commands

Requires Node.js 22+ (developed with 24 LTS). Run `npm install` once.

| Operation | Command | Scope / prerequisites |
| --- | --- | --- |
| Worker tests | `npm test` | Integration tests in the local Workers runtime with a simulated R2 bucket and test-only credentials. Registered as `worker-tests` (product, focused). |
| Typecheck | `npm run typecheck` | TypeScript, no emit. Registered as `typecheck` (product, standard). |
| Local server | `npm run dev` | `http://localhost:8787`. Needs `.dev.vars` (copy `.dev.vars.example`; ignored by Git). |
| Seed sample CVs (local) | `npm run seed:local` | Writes the two fictional `sample-*` CVs as drafts to the local bucket; removes their public snapshots. |
| Seed sample CVs (remote) | `npm run seed:remote` | Same, against the real bucket. Only touches `sample-*` keys. Requires Wrangler login. |
| Import the predecessor CVs (one-off) | `node import/import-cvs.mjs --dry-run [--preview private/import-preview]`, then `--local` or `--remote` | Reads the CVs exported from the predecessor (`private/director.html`, `private/senior-pm.html`), cleans both (self-checked), uploads them as drafts, never overwrites, and removes the `sample-*` CVs. Prints only slugs, sizes, and hashes. `--remote` only with the owner's authorization ([CHG-003](docs/specs/CHG-003-import-existing-cvs/plan.md)). |
| Deploy | `npm run deploy` | Production. Only with the owner's explicit authorization; see *Deployment*. |

### Framework commands

| Operation | Command | Scope / prerequisites |
| --- | --- | --- |
| Check all framework Markdown | `python3 scripts/check-docs` | Links, anchors, and structural conventions; not semantic approval. |
| Focused framework verification | `python3 scripts/verify focused --target framework` | Documentation and generated adapters. |
| Standard framework verification | `python3 scripts/verify standard --target framework` | Focused checks plus adapter and automation tests. |
| Broad framework verification | `python3 scripts/verify broad --target framework` | Inherits standard; no extra broad framework-only checks are configured. |
| Change-level check | `python3 scripts/check-change-level --base BASE --level LEVEL` | Replace placeholders; add `--change ID` for L2/L3. |
| Product verification | `python3 scripts/verify MODE --base BASE --level LEVEL` | Add `--change ID` for L2/L3. Runs registered framework + product checks; blocked until product checks exist. |
| Check local CI ownership setup | `python3 scripts/check-ci-setup` | Exits 3 until real CODEOWNERS are configured; does not audit GitHub. |

All selected checks are required. `standard` inherits `focused`; `broad` inherits both.
Manual, contract, migration, security, or recovery evidence remains change-specific
until a real deterministic command is added.

Reports are written locally to ignored `.sdd/results/`. Keep reviewed evidence
summaries in the plan or change record; do not commit raw reports or logs by default.
Approval, independent review, and deployment are separate decisions.

### Deployment

One-time setup, done by the owner. Secrets are never written to the repository or typed into chat:

1. `npx wrangler login`: authorize Wrangler in the browser.
2. `npx wrangler r2 bucket create cv-online`: the dedicated bucket ([ADR-0002](docs/adr/0002-cv-storage-in-dedicated-r2-bucket.md)).
3. `npx wrangler secret put ADMIN_USER` and `npx wrangler secret put ADMIN_PASSWORD`: the editor credentials ([ADR-0003](docs/adr/0003-editor-authentication-with-basic-auth.md)). Use a long random password. Change it the same way.

Each release: `npm run deploy`. Roll back code with `npx wrangler rollback`. Without the two secrets, the editor answers 503 and stays closed.

### Framework maintenance commands

| Operation | Command | Scope |
| --- | --- | --- |
| Check generated adapters | `python3 .agents/tools/sync_adapters.py --check` | Detect missing or stale generated entrypoints; no writes. |
| Regenerate adapters | `python3 .agents/tools/sync_adapters.py` | Create or update the 20 owned discovery, metadata, reviewer, and bridge files. |
| Inspect adapter inventory | `python3 .agents/tools/sync_adapters.py --inventory` | Read-only JSON file consistency; never live-client certification. |
| Test adapter generator | `python3 -m unittest discover -s .agents/tools -p 'test_*.py' -v` | Isolated maintenance tests. |
| Test automation | `python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v` | Isolated CLI, configuration, Git, documentation, and runner tests. |

The command entrypoints also have executable permissions for POSIX checkouts. The
`python3 scripts/...` form avoids dependence on executable-bit preservation. Substitute
`python` only when it refers to the supported Python 3 interpreter.

## Use with agents

`AGENTS.md` is the shared policy and `CLAUDE.md` is a one-line import. Five canonical
workflow bundles live in `.agents/workflows/`; templates live in `docs/templates/`.

Generated `.agents/skills/sdd-*/` entrypoints serve Codex, Cursor, and Copilot VS Code.
The `.claude/skills/sdd-*/` entrypoints provide Claude's command interface. There are
five procedures, not ten independently maintained workflows. Some clients also scan
Claude's directory: both aliases resolve to the same source and manual policy. Resolve
user/global collisions and verify the repository entrypoint in the actual client before use.

Use `/sdd-investigate`, `/sdd-spec`, `/sdd-plan`, `/sdd-implement`, `/sdd-verify` in
Claude Code, Cursor, or Copilot VS Code local agent mode. Use the same names with `$`
in Codex CLI/IDE. Select `sdd-implement` explicitly and authorize its actual scope.
The [workflow guide](docs/development/workflows.md) shows worked invocations; the
[compatibility guide](docs/development/agent-compatibility.md) specifies discovery,
reviewer controls, supported surfaces, and the required live smoke tests.

Each client gets an adapter to the same independent-review contract. A read-only
sandbox is not a tool allowlist; Cursor/Codex reviews additionally require confirmation
that write-capable external tools are unavailable, or the gate stays blocked.

## First product session

```text
Read AGENTS.md and docs/product/brief.md.
We are defining the product, not implementing it or choosing the stack.
I will provide my vision. Separate facts, hypotheses, and pending decisions.
First, ask about gaps that prevent us from defining the problem, user, and value.
Update only docs/product/brief.md and keep it in draft until I validate it.
Do not fill the PRD, MVP, or architecture with assumptions.
```

## CI activation

The [workflow](.github/workflows/sdd.yml) reads classification and check registration
from a separate checkout of the PR base, verifies the exact test merge, and produces
one final `sdd-gate`. The [PR template](.github/pull_request_template.md) needs a level
and change ID; unknown changed paths require product checks rather than a
framework-only exemption.

Copy `.github/CODEOWNERS.example` to `.github/CODEOWNERS`, assign real owners, and
configure the supplied disabled ruleset template in GitHub. Run a controlled PR and
the negative activation scenarios before calling enforcement active. The
[activation guide](docs/development/ci-enforcement.md#activation-sequence) covers
the ordered steps, the bootstrap boundary, and what to do when your GitHub plan
cannot enforce rules.

The workflow itself must be protected by independent ownership or a separately
administered organization-required workflow. Local code cannot protect itself against
privileged administrators or forged same-name workflows.

For local CI reproduction, use two separate Git checkouts at the event base and test merge:

```bash
python3 -I /path/to/trusted/scripts/check-ci \
  --candidate-root /path/to/candidate \
  --event /path/to/pull-request-event.json \
  --expected-sha FULL_TEST_MERGE_SHA \
  --report /path/to/ci-policy-result.json
```

The expected SHA must be the full event test-merge SHA. This command inspects candidate
data; it never falls back to executing the candidate's CI policy.
`scripts/verify --policy-root /path/to/trusted` uses an external registry only when
invoked through that trusted checkout's runner.

## What is intentionally left out

No user secret, real CV data, or external connector is included in the repository.
Remote CI/ruleset enforcement is not activated yet; deployment is manual. There is
no automatic all-phases command, mandatory third feature artifact, or extra approval
system.
