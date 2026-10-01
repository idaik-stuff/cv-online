# Architecture decision records

Create an ADR for a durable decision with significant alternatives and consequences. L3 alone does not require one. A local detail that fits in the plan does not need another file.

Use the [template](../templates/adr.md) and names such as `0001-<slug>.md`, `0002-<slug>.md`, and so on. When working in parallel, resolve numbering collisions before merging. Do not renumber decisions already referenced.

## Lifecycle

`proposed`: awaiting a decision. `accepted`: approved decision. `rejected`: formally rejected alternative. `superseded`: replaced by another ADR, which must be linked.

Acceptance does not imply that the system already implements the decision. The plan describes execution, and the [architecture overview](../architecture/overview.md) describes the existing system.

Do not rewrite an accepted decision to erase its tradeoffs. You may explicitly correct a factual error or add a reference to a superseding ADR. A new choice requires a new record.

## Index

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](0001-hosting-on-cloudflare-workers.md) | Host the application on Cloudflare Workers | `accepted` |
| [0002](0002-cv-storage-in-dedicated-r2-bucket.md) | Store CVs in a dedicated Cloudflare R2 bucket | `accepted` |
| [0003](0003-editor-authentication-with-basic-auth.md) | Protect the editor with HTTP Basic Authentication | `accepted` |
| [0004](0004-public-urls-under-akiadi-com-cv.md) | Public URLs under akiadi.com/cv | `accepted` |
