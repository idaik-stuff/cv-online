# MVP scope

Status: `active` | Owner: Idaika Iglesias | Validated by / date: Idaika Iglesias, 2026-10-01.

The [brief](brief.md) explains the problem. This document defines the first useful release and how we will recognize that it fulfills its purpose.

## First-release outcome

The owner can manage all her CVs online in one place, tailor a copy for a job offer, and share a public link that always shows the version she last published. Her two existing CVs are available in the new tool from day one.

What we need to learn: whether a web link plus on-demand PDF printing is enough to replace PDF attachments in her job search, and how often she actually creates offer-specific variants.

## Scope

| Included | Observable outcome for the user | PRD reference, if available |
| --- | --- | --- |
| Private editor access | Only the owner can open the editor; anyone else is denied. | CAP-01 |
| CV list | She sees all her CVs with name, public URL, status, and last edit date. | CAP-02 |
| Edit and save draft | She edits a CV with the current formatting tools and saves it; the draft is available from any device. | CAP-03 |
| Publish / unpublish | Publishing makes the draft visible at its public URL; unpublishing removes it from public view without deleting it. | CAP-04 |
| Discard changes | She can drop draft changes and return to the last published version. | CAP-04 |
| Duplicate | She creates a new CV from an existing one, with its own name and URL. | CAP-05 |
| Delete | She permanently removes a CV after confirming. | CAP-05 |
| Public CV page | A reader opens the URL and sees a clean, mobile-friendly, printable CV. | CAP-06 |
| Search and sharing metadata | Published pages have a proper title, description, and link preview; she can hide a CV from search engines. | CAP-07 |
| Print / PDF from the browser | She (or a reader) can print or save the CV as PDF, as today. | CAP-06 |
| Import of the two existing CVs | "Innovation Director" and "Senior IT PM" appear in the list. | CAP-08 |

| Excluded from this release | Rationale / condition for reconsideration |
| --- | --- |
| Version history | Publish and discard cover the main risk. Reconsider if she loses work. |
| Visit statistics per link | Nice to know, not needed to share a CV. Reconsider after the first weeks of use. |
| Server-generated PDF download | Browser printing already works. Reconsider if recruiters insist on attachments. |
| Multiple design templates | The current design is the one she uses. |
| Multi-language CVs | CVs are in English only for now (owner, 2026-10-01). Reconsider if she applies to Spanish-language roles. |
| Multiple users | Personal tool by principle. |

Exclusions are not commitments for a future version or a mandatory backlog.

## Essential journeys

| Journey | Actor and precondition | Main flow | Outcome / relevant failure |
| --- | --- | --- | --- |
| J1 Tailor a CV for an offer | Owner, signed in; a base CV exists. | Duplicate base CV → name it and choose URL → edit → save draft → publish → copy link. | A new public link with the tailored CV. Failure: chosen URL already in use → she is asked for another. |
| J2 Update a CV safely | Owner, signed in; CV already published. | Edit → save draft (public page unchanged) → review → publish. | Public page updated only after publish. Failure: she changes her mind → discard changes. |
| J3 Read a shared CV | Reader with a link. | Open link on any device → read → optionally print/save as PDF. | Sees the latest published version. Failure: unpublished or unknown URL → a simple "not found" page. |
| J4 Retire a CV | Owner, signed in. | Unpublish (keeps the CV) or delete (after confirmation). | Link stops working. Failure: an accidental delete is prevented by the confirmation step. |
| J5 Edit from another device | Owner on a second device. | Sign in → open the CV list → continue editing. | Same drafts as on the first device. |

Describe the experience, not screens, components, or services that have not yet been decided.

## Exit criteria

| Observable condition | How it will be checked | Evidence / status |
| --- | --- | --- |
| Journeys J1–J5 work end to end in production | Manual run of each journey by the owner | Pending |
| A non-signed-in visitor cannot reach the editor or drafts | Manual check from a private window + automated test | Pending |
| Drafts never appear on public pages before publish | Automated test + manual check during J2 | Pending |
| The two existing CVs render on their public pages with the same appearance as in the current editor | Side-by-side visual comparison | Pending |
| No personal CV data in the source repository | Review of tracked files before each push | Pending |
| The owner uses the tool to share at least one real application (owner, 2026-10-01) | Owner confirmation | Pending |

Reference the applicable quality requirements in the [PRD](prd.md). Do not copy their thresholds here. Distinguish "works for a demonstration" from "ready for its intended use".

## Dependencies and critical assumptions

- **Hosting account and domain.** A Cloudflare account is available (owner, 2026-10-01). Domain still to be decided. Owner: Idaika Iglesias. Blocks: the final public URL format.
- **Original CV files** stay local and out of the repository. Owner: Idaika Iglesias. Blocks: CAP-08 import.
- **Root page `/`.** Options: a landing page with links to selected CVs, a redirect to a main CV, or "not found". Owner: Idaika Iglesias. Blocks: CAP-06 detail; to be settled in the first product change's spec.
- **Slugs for the two existing CVs.** Proposed: `director` and `senior-pm`. Owner: Idaika Iglesias. Blocks: CAP-08 import.

## MVP completion

Pending. Upon delivery, record the date, evidence for the exit criteria, and accepted limitations. Use `completed` only after validation; do not expand this same MVP indefinitely with new phases.
