
# SafeMed — Integration Test Matrix

Team: QuadCode
Owner: Person 4 — Integration and Testing

## Test Environment
- Patient: SM001 (synthetic)
- Documents: Hospital A, Hospital B, Clinic C
- Medication: StudyMed A (fictional)
- No real patient data

## Test Cases

| ID | Scenario | Expected Result | Status |
|---|---|---|---|
| INT-01 | Upload Hospital B | Private storage, authorized access | Not run |
| INT-02 | Extract medication status | Discontinued + source evidence | Not run |
| INT-03 | Compare B and C | Potential discrepancy flagged | Not run |
| INT-04 | Missing dosage | Unknown | Not run |
| INT-05 | Evidence TraceBack | Original passage displayed | Not run |
| INT-06 | Clinician review | Review persists after refresh | Not run |
| SEC-01 | Unauthorized access | Denied | Not run |
| SEC-02 | Unsupported AI claim | Rejected or flagged | Not run |

## Fixture Validation
- Five local fixture tests: Passed
- GitHub Actions workflow: Passed (reported)
- Integration tests: Not yet executed
- Clinical validation: Not performed

## Notes
Use only synthetic data.
Record actual test evidence before changing a status to Pass.
