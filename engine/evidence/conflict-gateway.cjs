
"use strict";

// ============================================
// SafeMed — Conflict Validation Gateway
// Person 4: Integration and Testing
// ============================================

const {
  validateConflictEvidence,
  validateMedicationStatusConflict
} = require("./validate-conflicts.cjs");

const {
  validateMedicationRecord
} = require("./validate-records.cjs");

// ============================================
// VALIDATE A CANDIDATE CONFLICT
// ============================================

function validateCandidateConflict(candidate, documents) {

  // STEP 1: Validate source evidence.
  const evidenceResult = validateConflictEvidence(
    candidate,
    documents
  );

  if (!evidenceResult.valid) {
    return {
      accepted: false,
      reason: evidenceResult.reason
    };
  }

  // STEP 2: Only automatically classify
  // medication-status discrepancies.
  if (candidate.type !== "contradictory_status") {
    return {
      accepted: false,
      reason: "unsupported_conflict_type"
    };
  }

  // STEP 3: Require structured medication records.
  if (
    !Array.isArray(candidate.records) ||
    candidate.records.length !== 2
  ) {
    return {
      accepted: false,
      reason: "missing_structured_records"
    };
  }

  // STEP 4: Verify each medication record
  // against its own source excerpt.
  for (const record of candidate.records) {

    const matchingEvidence = candidate.evidence.find(
      item => item.doc === record.source_doc
    );

    if (!matchingEvidence) {
      return {
        accepted: false,
        reason: "record_evidence_missing"
      };
    }

    const consistency = validateMedicationRecord(
      record,
      matchingEvidence.excerpt
    );

    if (!consistency.valid) {
      return {
        accepted: false,
        reason: consistency.reason
      };
    }
  }

  // STEP 5: Validate chronology.
  const chronologyResult =
    validateMedicationStatusConflict(candidate.records);

  if (!chronologyResult.valid) {
    return {
      accepted: false,
      reason: chronologyResult.reason
    };
  }

  // STEP 6: Return a preliminary
  // same-day discrepancy classification.
  return {
    accepted: true,
    reason: null,
    classification: "same_time_disagreement",
    reviewRequired: true
  };
}

// ============================================
// EXPORT
// ============================================

module.exports = {
  validateCandidateConflict
};
