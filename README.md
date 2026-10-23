# SafeMed

**Every medical fact deserves evidence.**

SafeMed is a clinician-support hackathon prototype for bringing fictional records together and helping a reviewer investigate potentially conflicting or incomplete information. It preserves source evidence and reviewer actions. It does not diagnose, prescribe, or decide which contradictory statement is clinically correct.

## MVP scope

The hackathon MVP is limited to these six outcomes:

1. Ingest supported records and extract candidate facts.
2. Identify potentially conflicting facts while preserving chronology.
3. Trace each fact to its source document and supporting passage.
4. Label missing, ambiguous, unsupported, and unresolved information.
5. Let an authorized human confirm, correct, or flag information.
6. Protect access and persist review/audit history.

## Current repository status

This repository is an initial scaffold. The application, extraction pipeline, conflict engine, authentication flow, and storage integration are **not implemented yet**. Do not describe them as working until they are built and demonstrated.

## Demo scenario

Use only fictional patient `SM001` and the text fixtures in [`tests/fixtures`](tests/fixtures):

- Hospital A, 12 October 2026: fictional StudyMed A — active.
- Hospital B, 18 October 2026: fictional StudyMed A — discontinued.
- Clinic C, 18 October 2026: fictional StudyMed A — active.

The earlier Hospital A status may be a legitimate chronological change. The same-date Hospital B and Clinic C statements are a potential discrepancy. SafeMed must show both statements and their evidence without inventing a final answer.

**Signature workflow:** Upload → Extract → Detect → Trace → Verify → Audit.

## Planned stack

- Frontend: React + TypeScript (Lovable export may be used)
- Backend and auth: Supabase
- Data: PostgreSQL; Supabase Storage for documents
- Extraction: xAI/Grok through a server-side Supabase Edge Function
- Conflict rules: TypeScript or Python deterministic logic
- Version control: GitHub

The frontend must never receive the xAI API key or Supabase service-role key. Use synthetic records only.

## Repository map

```text
frontend/                 React application (to be added)
supabase/migrations/      Database schema and RLS policies
supabase/functions/       Server-side AI and API functions (to be added)
engine/extraction/        Extraction contract and implementation (to be added)
engine/conflicts/         Chronology/conflict rules (to be added)
engine/evidence/          Source trace-back logic (to be added)
tests/fixtures/           Fictional plain-text source documents
docs/                     Architecture, API contract, and demo guide
.env.example              Variable names only; no secrets
```

## Setup (planned)

1. Install Node.js LTS and the Supabase CLI.
2. Copy `.env.example` to `.env.local` and fill values from the project settings. Never commit `.env.local`.
3. Apply migrations with the Supabase CLI after reviewing the schema and policies.
4. Start the frontend once its package manifest is added.

Exact commands will be added when the frontend and Supabase project setup are finalized. Never paste secrets into issues, pull requests, screenshots, or chat.

## Validation plan

Before submission, report actual outcomes for: consistent records (no false conflict), same-time contradictory statuses (flag), later discontinuation (chronological change), missing dosage (unknown), ambiguous text (manual review), duplicate document (flag), unsupported extraction (reject/flag), and unauthorized access (deny). Do not claim accuracy or clinical validation without measured evidence.

## Limitations

This is a synthetic-data prototype, not a production EHR integration, certified FHIR implementation, clinical decision system, or validated medical device. AI output is untrusted until a reviewer checks the cited source. Missing information must remain explicitly unknown.

## Contributions

Assign owners and GitHub handles in the team section after the repository collaborators are confirmed.

