# ADR-0001: Host the application on Cloudflare Workers

Status: `accepted` | Date: 2026-10-01 | Owner: Idaika Iglesias.
Accepted by / date: Idaika Iglesias, 2026-10-01 | Related change or plan: [CHG-002 plan](../specs/CHG-002-protected-editor-and-publishing/plan.md).
Supersedes: `N/A` | Superseded by: `N/A`.

## Context and decision drivers

The application serves public CV pages, which must stay available because their links are sent to recruiters, and a single-user editor. The brief asks for the simplest viable solution with no recurring cost ([PRD NFR-07](../product/prd.md#non-functional-requirements)). The owner already has a Cloudflare account, with R2 enabled, and a Contabo VPS that runs other projects (IoT_B). *(Owner, 2026-10-01.)*

Drivers: no server maintenance, availability of shared links, free-tier cost, and isolation from the owner's other projects.

## Alternatives considered

| Viable alternative | Benefit | Cost / risk | Available evidence |
| --- | --- | --- | --- |
| Cloudflare Workers (one Worker with static assets) | No servers to patch; automatic HTTPS; global availability; free tier; native bindings to R2 and secrets | Platform lock-in to Workers APIs; local development needs Node.js and Wrangler | Owner's existing account |
| Cloudflare Pages + Functions | Similar to Workers | Cloudflare now steers new projects to Workers with static assets; two concepts instead of one | Cloudflare product direction (to re-check at implementation) |
| Contabo VPS (container behind a reverse proxy) | Full control; no platform lock-in; already paid for | Owner patches the OS, web server, TLS, and backups; a VPS outage breaks shared CV links; shares a host with IoT_B | Owner's existing VPS |
| Static hosting only, with no runtime | Simplest possible hosting | Cannot provide the online editor, draft/publish, or sign-in accepted in the MVP | MVP scope |

## Decision

Host the whole application, meaning the editor and the public pages, as **one Cloudflare Worker with static assets**, in the owner's account and under a project-specific name. The VPS is not used for this project.

The decision rests on two facts: the workload is tiny, and the account already exists. The remaining reasons are preferences: zero maintenance and keeping CV links independent of the VPS.

## Consequences

- No operating system or TLS maintenance. Deployment is a Wrangler command.
- Code depends on the Workers runtime APIs (fetch handler, bindings). Moving away later means rewriting the thin request layer. The stored CV documents themselves are portable HTML.
- The development environment needs Node.js and Wrangler.

## Validation and future review

Validated when the CHG-002 deployment serves the public pages and the protected editor within the free tier. Reconsider if the product needs long-running jobs, a relational database, or a move away from Cloudflare.
