
"use strict";

// ============================================
// SafeMed — Evidence Integrity Validator
// Person 4: Integration and Testing
// ============================================

// Normalize whitespace while preserving
// the actual words in the source.
function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

// ============================================
// 1. VALIDATE CONFLICT EVIDENCE
// ============================================

function validateConflictEvidence(conflict, documents) {
  if (
    !conflict ||
    !Array.isArray(conflict.evidence) ||
    conflict.evidence.length < 2 ||
    !Array.isArray(documents)
  ) {
    return {
      valid: false,
      reason: "invalid_structure"
    };
  }

  const documentMap = new Map(
    documents.map(doc => [
      doc.source_doc,
      doc.text
    ])
  );

  for (const item of conflict.evidence) {
    if (
      !item ||
      !Number.isInteger(item.doc) ||
      typeof item.excerpt !== "string" ||
      !item.excerpt.trim()
    ) {
      return {
        valid: false,
        reason: "missing_evidence"
      };
    }

    const sourceText = documentMap.get(item.doc);

    if (typeof sourceText !== "string") {
      return {
        valid: false,
        reason: "unknown_source"
      };
    }

    const normalizedSource = normalizeText(sourceText);
    const normalizedExcerpt = normalizeText(item.excerpt);

    if (!normalizedSource.includes(normalizedExcerpt)) {
      return {
        valid: false,
        reason: "unsupported_evidence"
      };
    }
  }

  return {
    valid: true,
    reason: null
  };
}

// ============================================
// 2. VALIDATE MEDICATION STATUS CHRONOLOGY
// ============================================

function validateMedicationStatusConflict(records) {
  if (!Array.isArray(records) || records.length < 2) {
    return {
      valid: false,
      reason: "insufficient_records"
    };
  }

  // Validate a real ISO date: YYYY-MM-DD
  function validDate(date) {
    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return false;
    }

    const parsed = new Date(date + "T00:00:00Z");

    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === date
    );
  }

  // Check record structure and values.
  for (const record of records) {
    if (
      !record ||
      !validDate(record.date) ||
      typeof record.generic !== "string" ||
      !record.generic.trim() ||
      !["active", "discontinued"].includes(record.status)
    ) {
      return {
        valid: false,
        reason: "invalid_records"
      };
    }
  }

  // All records must refer to the same medicine.
  const medicationKeys = new Set(
    records.map(record =>
      record.generic.trim().toLowerCase()
    )
  );

  if (medicationKeys.size !== 1) {
    return {
      valid: false,
      reason: "different_medications"
    };
  }

  // Different dates are not automatically
  // contradictory medication statuses.
  const dates = new Set(
    records.map(record => record.date)
  );

  if (dates.size !== 1) {
    return {
      valid: false,
      reason: "different_dates"
    };
  }

  // A same-day discrepancy requires both
  // active and discontinued statuses.
  const statuses = new Set(
    records.map(record => record.status)
  );

  if (
    !statuses.has("active") ||
    !statuses.has("discontinued")
  ) {
    return {
      valid: false,
      reason: "no_status_disagreement"
    };
  }

  return {
    valid: true,
    reason: null
  };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  validateConflictEvidence,
  validateMedicationStatusConflict
};
