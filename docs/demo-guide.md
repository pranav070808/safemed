# SafeMed 90-second demo guide

Use only the three fictional files under `tests/fixtures/`.

1. **0–15 sec — Upload:** upload Hospital A, Hospital B, and Clinic C as records for fictional patient SM001.
2. **15–30 sec — Extract:** show candidate medication statements in date order, each marked unverified and linked to its source.
3. **30–45 sec — Detect:** explain that the older active statement may precede a legitimate change; the two 18 October statements disagree and need review.
4. **45–60 sec — Trace:** open both source excerpts. Show that dose/reason details absent from a source remain unknown.
5. **60–75 sec — Verify:** mark the discrepancy for review or record a reviewer confirmation/correction with a note. Do not claim a clinical resolution without evidence.
6. **75–90 sec — Audit:** show the saved reviewer, timestamp, action, and linked fact/conflict IDs.

If an implementation step is incomplete, say so and show the working part. Never present mock output as live AI extraction, persisted audit data, or clinical validation.
