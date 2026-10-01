# Product Brief

Status: `active` | Owner: Idaika Iglesias | Validated by / date: Idaika Iglesias, 2026-10-01.

This document brings together vision, problem, and value. It does not define the stack or detail every feature. Replace the guidance with supplied or validated information; do not turn hypotheses into facts.

## Vision

A personal tool that lets a job seeker keep one living source for each CV version, edit it from anywhere, tailor a copy for a specific job offer in minutes, and share it as a clean public web page instead of an attached file that goes stale.

The first and only intended user is the owner. The tool should stay as simple as possible: it exists to save her time during a job search, not to become a CV-builder product.

## Problem and evidence

**Facts:**

- The owner maintains her CVs in a single-file HTML editor (`editor-cvs-idaika.html`) with two fixed CV versions: "Innovation Director" and "Senior IT Project Manager". *(Observed in the file, 2026-10-01.)*
- That editor saves changes only in the browser's `localStorage` and exports HTML or PDF. Changes are tied to one browser on one device, and there is no shareable link. *(Observed in the file, 2026-10-01.)*
- The owner wants to host the editor online and publish the final CV pages to share them. *(Owner, 2026-10-01.)*
- She wants to tailor a CV for a specific job offer by duplicating an existing one. *(Owner, 2026-10-01.)*
- She wants to edit without affecting what others already see until she explicitly publishes. *(Owner, 2026-10-01.)*

**Missing evidence:**

- How many tailored variants she creates per week or month.
- Whether recruiters actually open web links rather than asking for a PDF attachment.

## Users and context

| User / actor | Primary need | Context and current alternative |
| --- | --- | --- |
| Owner (CV author) | Edit, tailor, and publish her CVs quickly from any device. | Job search in progress. Current alternative: local HTML editor + downloaded PDF/HTML files. |
| Recruiters and hiring companies (readers) | Read an up-to-date CV quickly, on desktop or mobile, and print/save it if needed. | Currently receive a PDF attachment or view LinkedIn. |
| Headhunters / professional network (readers) | **(hypothesis)** Reach a stable, current CV link. | Not validated. |

Other people using the editor is **out of scope** (see boundaries).

## Value proposition

**Expected benefits (not demonstrated):**

- One source per CV, available from any device, instead of files spread across folders.
- Tailoring for an offer becomes duplicate → adjust → publish, without starting from scratch.
- A shared link always shows the latest published version; no outdated attachments.
- Safe editing: drafts never leak to the public page until published.

**Demonstrated benefits:** none yet.

## Goals and success

| Goal | Observable indicator | Known baseline | Proposed success criterion |
| --- | --- | --- | --- |
| Tailor a CV for an offer quickly | The whole flow (duplicate → edit → publish → copy link) happens inside the tool | Today it requires local files and manual export | Tailoring and sharing a CV for an offer is done entirely within the tool, without handling local files (checked through MVP journey J1) |
| Share an always-current CV | A published link reflects the latest published version | Not possible today (no links) | Every shared link shows the latest published version |
| Edit from any device | The owner can open and edit her drafts from a second device | Not possible today (`localStorage`) | Drafts available on any device after sign-in |
| Never expose unfinished edits | Public page unchanged while a draft is being edited | N/A | Public content changes only on explicit publish |

Do not invent percentages, users, dates, or thresholds to fill the table.

## High-level boundaries

**In scope:** Managing the owner's CVs (create, edit, duplicate, publish, unpublish, delete) and serving the published versions as public web pages.

**Agreed principles:**

- Simplest viable solution: a personal tool with a single user. *(Owner, 2026-10-01.)*
- The application interface is in English. *(Owner, 2026-10-01.)*
- CV content is in English only for now. *(Owner, 2026-10-01.)*
- Drafts and published versions are separate. The public page changes only on explicit publish. *(Owner, 2026-10-01.)*
- Published pages are an exact snapshot of the draft at publish time. *(Owner, 2026-10-01.)*
- Published pages are public and may be indexed by search engines. Each CV can optionally be hidden from search engines (off by default). *(Owner, 2026-10-01.)*
- Personal CV data never enters the source repository. *(Agreed 2026-10-01.)*
- Serving as a public portfolio piece that demonstrates spec-driven development is a goal of the **repository**, not of the product. It shapes the README and process artifacts, not product scope. *(Owner, 2026-10-01.)*

**Out of scope for now:**

- Multiple users, accounts, or a multi-tenant CV builder.
- Recruiter-side features such as comments, tracking, or applicant management.

The first-release scope is defined in [mvp.md](mvp.md), without duplicating it here.

## Hypotheses and questions

| Hypothesis / question | Evidence needed | Owner | Decision blocked |
| --- | --- | --- | --- |
| Recruiters accept a web link instead of (or in addition to) a PDF. | Observe responses to the first shared links. | Idaika Iglesias | Whether server-side PDF matters (currently out of scope) |

## Related documents

[MVP](mvp.md): first release. [PRD](prd.md): capabilities, constraints, and cross-cutting requirements. This brief does not prove that any capability is implemented.
