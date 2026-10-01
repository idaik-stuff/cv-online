# ADR-0003: Protect the editor with HTTP Basic Authentication

Status: `accepted` | Date: 2026-10-01 | Owner: Idaika Iglesias.
Accepted by / date: Idaika Iglesias, 2026-10-01 | Related change or plan: [CHG-002 plan](../specs/CHG-002-protected-editor-and-publishing/plan.md).
Supersedes: `N/A` | Superseded by: `N/A`.

## Context and decision drivers

Only the owner may reach the editor and draft data ([NFR-01](../product/prd.md#non-functional-requirements)). The owner requires a username and password, and the simplest viable mechanism, because the application is not critical. There is no registration, recovery, or roles. *(Owner, 2026-10-01.)* Credentials must never be stored in the public repository (CON-02).

## Alternatives considered

| Viable alternative | Benefit | Cost / risk | Available evidence |
| --- | --- | --- | --- |
| HTTP Basic Auth in the Worker, credentials as Worker secrets | Literally a username and password; a few lines of code; no session store; works on every path the Worker handles | Native browser prompt; no real sign-out (closing the browser ends it); credentials sent on every request (safe only over HTTPS, which the platform enforces); browsers attach them automatically, so state-changing requests need CSRF protection | Owner requirement |
| Custom sign-in form with a signed session cookie | Branded page; sign-out | More code: session signing, expiry, cookie flags, CSRF; more to review | — |
| Cloudflare Access (Zero Trust) | No authentication code; email one-time code or SSO | Not a username and password, so it does not meet the owner's requirement | Owner rejected, 2026-10-01 |

## Decision

Use **HTTP Basic Authentication** enforced by the Worker on every editor path and editor API path:
- The username and password are stored as **Worker secrets**, set by the owner and never written to the repository or to logs.
- Credentials are compared in constant time.
- State-changing API requests must also pass a same-origin check, as CSRF protection.

## Consequences

- Minimal code and nothing to store server-side.
- No sign-out button. The owner ends the session by closing the browser. This is accepted for a single-user, non-critical tool.
- Brute-force protection relies on a long random password chosen by the owner. Platform rate limiting is optional and not required by this decision.
- Changing the password means updating the secret. No code change.

## Validation and future review

Validated by CHG-002 negative-access tests (AC-01, AC-02) and the independent review. Reconsider if more users, sign-out, or stronger guarantees become requirements, for example by moving to a session-based login or to Cloudflare Access.
