# Extraction and review API contract (draft)

## Candidate fact

```json
{
  "patient_ref": "SM001",
  "fact_type": "medication_status",
  "normalized_key": "study_med_a",
  "value": { "display": "StudyMed A", "status": "active" },
  "event_date": "2026-10-18",
  "document_id": "<server-assigned-document-uuid>",
  "page_number": null,
  "evidence_excerpt": "StudyMed A — active, recorded 18 October 2026.",
  "verification_status": "unverified",
  "uncertainty": []
}
```

## Rules

- `document_id` is assigned by the server; the model cannot choose or fabricate it.
- `evidence_excerpt` must be an exact substring of the uploaded document text. Reject or flag a fact if the excerpt cannot be found.
- `event_date` is null when absent or ambiguous. Do not substitute upload date for clinical event date.
- `verification_status` begins as `unverified` for extracted facts.
- `uncertainty` can include `missing`, `ambiguous`, `unsupported`, or `conflicting` with a short explanation.
- The conflict engine returns all candidate statements and provenance; it never selects the clinically correct one.
- A review action contains reviewer ID, action, note, timestamp, and the fact/conflict IDs. Corrections create a new reviewed assertion while preserving original evidence.

This is a proposal for frontend/backend alignment and must be versioned with implementation.
