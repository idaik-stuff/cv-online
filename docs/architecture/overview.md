# System architecture

Status: `active` | Owner: Idaika Iglesias | Validated by / date: `TBD`.

## Actual state

No system has been implemented in this repository yet. The product is defined in the [brief](../product/brief.md), the [MVP](../product/mvp.md), and the [PRD](../product/prd.md). The proposed architecture belongs in the plan of the first product change and, where justified, in ADRs.

What exists today is a **predecessor tool kept outside version control**: a single-file HTML CV editor, stored locally under the ignored `private/` folder because it embeds real personal data (constraint CON-02 in the PRD). It is described below only as input for the first product change. It is not part of the system.

## Context and boundaries

The predecessor runs entirely in one browser. There is no server, no shared storage, and no public URL.

## Components and dependencies

| Existing component | Responsibility | Interfaces / dependencies | Code or contract path |
| --- | --- | --- | --- |
| Predecessor CV editor (outside the repository) | Rich-text editing of two fixed CVs inside an iframe; save to the browser; export HTML and PDF. | Browser `localStorage`, `contenteditable`, browser print dialog. No external libraries. | `private/editor-cvs-idaika.html` (ignored, local only) |

## Main flows

Predecessor only: open file → choose a CV tab → edit → save to `localStorage` → download HTML or print to PDF. Clearing browser data loses unsaved and saved edits; the embedded originals remain as a fallback.

## Data and invariants

Predecessor only: CV content is embedded in the file as the original version, with edits stored per CV in the browser's `localStorage`. There is no other copy. Domain terms are defined in the [PRD](../product/prd.md#vocabulary-and-minimum-domain-model).

## Security and privacy

The repository must never contain real CV content, contact data, or secrets (PRD CON-02, NFR-02). The `private/` folder is ignored by Git for that reason. No authentication or trust boundary exists yet.

## Quality and testing strategy

No product checks exist yet. Framework checks are registered in the [README](../../README.md#commands).

## Observability and operations

None yet.

## Deployment and recovery

No deployment exists.

## Relevant decisions

No ADRs accepted yet. Technology preferences awaiting decision are listed in the [PRD](../product/prd.md#technology-preferences-not-yet-decided).

## Systemic limitations and debt

| Known limitation | Impact | Mitigation / owner | Tracking reference |
| --- | --- | --- | --- |
| The only CV data lives in one local file and one browser's storage. | Single point of loss; no multi-device editing. | Addressed by the MVP. Owner: Idaika Iglesias. | [MVP](../product/mvp.md) |
