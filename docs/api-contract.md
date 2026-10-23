# SafeMed API Contract (Draft v1)

This contract connects Person 3's Evidence Trust Engine to Person 2's Supabase backend. It is a draft for teammate review; update it when the implementation is agreed.

## Ownership

- **Person 3 (engine):** Extract candidate facts, validate source excerpts, normalize values, classify uncertainty, and detect potential conflicts. The engine does not write to Supabase.
- **Person 2 (backend):** Authenticate and authorize requests, assign IDs, provide source text, call the engine server-side, persist results, and write review/audit events.
- **Person 1 (frontend):** Use the backend operations and display their returned data. The browser never calls xAI directly.

## Processing input

The backend provides the engine with one document at a time. The backend assigns `patientId` and `documentId`; the model must never invent either.

```json
{
  "patientId": "server-assigned-patient-uuid",
  "patientRef": "SM001",
  "documentId": "server-assigned-document-uuid",
  "sourceName": "Hospital B",
  "documentDate": "2026-10-18",
  "pages": [
    {
      "pageNumber": 1,
      "text": "Medication Review: StudyMed A was discontinued on 2026-10-18."
    }
  ]
}
```

For TXT input, use one page with `pageNumber: 1`. Preserve document boundaries and page numbers. Reject empty text. TXT is the guaranteed MVP format; claim PDF support only after it works end to end.

## Engine result

The engine returns candidate facts and potential conflicts. The backend validates this result before saving it.

```json
{
  "facts": [
    {
      "factType": "medication_status",
      "normalizedKey": "study_med_a",
      "value": {
        "display": "StudyMed A",
        "status": "discontinued"
      },
      "eventDate": "2026-10-18",
      "pageNumber": 1,
      "evidenceExcerpt": "StudyMed A was discontinued on 2026-10-18.",
      "extractionStatus": "supported",
      "uncertainty": []
    }
  ],
  "conflicts": []
}
```

### Field rules

- `factType`: stable category such as `medication_status`, `medication_dosage`, `allergy`, `diagnosis`, or `lab_result`.
- `normalizedKey`: comparison key within a category, e.g. `study_med_a`; do not merge uncertainly similar drug names.
- `value`: JSON object suitable for the fact. For medication status use `{ "display": "StudyMed A", "status": "active" | "discontinued" | "unknown" }`. Keep a missing dosage as `{ "display": null }` and report it as unknown; do not invent a value.
- `eventDate`: ISO date or `null`. Do not substitute upload/document date when the event date is absent or unclear.
- `pageNumber`: positive integer or `null`.
- `evidenceExcerpt`: exact source passage, or empty only for an explicit missing-information result. The backend validates non-empty excerpts against the identified source page after whitespace normalization.
- `extractionStatus`: `supported`, `ambiguous`, or `unsupported`. Supported means source text supports the statement, not that a clinician has verified it.
- `uncertainty`: array of `{ "code": "missing" | "ambiguous" | "unsupported", "explanation": "..." }`. Missing information remains unknown; “no allergy information documented” is not “no allergies.”
- The engine must not return database IDs, reviewer identity, timestamps, or `verificationStatus`. The backend assigns those. New facts start with `verification_status = 'unverified'`.

## Conflict result

```json
{
  "conflicts": [
    {
      "normalizedKey": "study_med_a",
      "conflictType": "same_time_disagreement",
      "factRefs": [
        { "documentId": "hospital-b-document-uuid", "normalizedKey": "study_med_a", "eventDate": "2026-10-18" },
        { "documentId": "clinic-c-document-uuid", "normalizedKey": "study_med_a", "eventDate": "2026-10-18" }
      ],
      "explanation": "Two source records describe different statuses for the same medication on the same date.",
      "status": "needs_review"
    }
  ]
}
```

Supported `conflictType` values for the current database schema: `same_time_disagreement`, `chronology_candidate`, `duplicate_candidate`, and `ambiguous`. Conflict references must resolve to facts for the same patient. The engine reports a potential discrepancy; it never chooses which statement is clinically correct. Different dates may be a chronological change and must not automatically become a same-date conflict.

## Backend operation: process document

The authenticated frontend requests processing for an already uploaded document:

```json
{ "documentId": "server-assigned-document-uuid" }
```

The backend verifies patient access, retrieves the private source, calls the engine, validates the schema and evidence, assigns/preserves IDs, stores facts and conflicts, then returns:

```json
{
  "documentId": "server-assigned-document-uuid",
  "processingStatus": "processed",
  "facts": [],
  "conflicts": []
}
```

For failures, return `{ "error": { "code": "invalid_request | unauthorized | unsupported_file | processing_failed", "message": "Safe user-facing explanation" } }`. Do not return secrets or raw document content in errors/logs.

## Review operation

Request:

```json
{
  "factId": "fact-uuid",
  "conflictId": null,
  "action": "confirm | correct | flag_for_review | mark_not_a_conflict",
  "decisionNote": "Optional reviewer note",
  "correction": null
}
```

The backend derives `reviewer_id` from the authenticated session and generates the timestamp. A correction is a new reviewed assertion; preserve the original extracted value and evidence. Save the review and audit event atomically. Audit history is append-only for ordinary users.

## Database mapping

The current migration uses snake_case columns. Map engine JSON fields as follows:

| Engine field | Database column |
| --- | --- |
| `factType` | `medical_facts.fact_type` |
| `normalizedKey` | `medical_facts.normalized_key` |
| `value` | `medical_facts.value` (JSONB) |
| `eventDate` | `medical_facts.event_date` |
| `pageNumber` | `medical_facts.page_number` |
| `evidenceExcerpt` | `medical_facts.evidence_excerpt` |
| backend verification state | `medical_facts.verification_status` |
| `uncertainty` | `medical_facts.uncertainty` (JSONB) |

The backend stores conflicts in `conflicts` and links facts using `conflict_facts`. Use the patient UUID internally; `patientRef` is a demo-facing reference, not an authorization credential.

## Security and limitations

- Keep `XAI_API_KEY` and service-role credentials in Supabase server-side secrets only.
- Enforce authorization in the backend and RLS; hidden UI controls are not access control.
- Keep document storage private and use synthetic data only.
- Treat model output as untrusted input. Validate shape, lengths, dates, enums, source references, and evidence before persistence.
- This contract supports a hackathon prototype, not clinical verification or production healthcare claims.


## Storage contract (MVP)

- Bucket: `medical-records`, private.
- Supported upload: `text/plain`, maximum 5 MiB for this migration.
- Object path: `patients/<patient-uuid>/documents/<document-uuid>.txt`.
- Storage policies allow an authenticated patient owner to read/upload only within their own patient path. No client update/delete policy is provided.
- Upload the object before inserting its `documents` metadata row. The backend must verify both the authenticated owner and the stored object before processing.

## Calling the atomic review operation

Use the authenticated Supabase client to invoke the Postgres RPC; never send a reviewer ID from the browser:

```ts
const { data, error } = await supabase.rpc("submit_review", {
  p_fact_id: factId ?? null,
  p_conflict_id: conflictId ?? null,
  p_action: action,
  p_decision_note: decisionNote ?? null,
  p_correction: correction ?? null
});
```

The RPC accepts exactly one of `p_fact_id` or `p_conflict_id`, derives the reviewer from `auth.uid()`, checks patient ownership, inserts the review, updates the target status, and appends an audit event in one database transaction. It returns review and target identifiers with the database-generated timestamp. Direct browser inserts into reviews or audit events are not allowed by the migration.
