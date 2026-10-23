
"use strict";

// ============================================
// SafeMed — Medication Record Validator
// Person 4: Integration and Testing
// ============================================

// Normalize text for consistent comparisons.
function normalizeText(value) {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Validate ISO dates (YYYY-MM-DD).
function validISODate(date) {
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

// Recognize ISO and human-readable dates.
function dateVariants(isoDate) {
  const [year, month, day] = isoDate
    .split("-")
    .map(Number);

  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december"
  ];

  return [
    isoDate.toLowerCase(),
    `${day} ${months[month - 1]} ${year}`
  ];
}

// ============================================
// VALIDATE MEDICATION RECORD
// ============================================

function validateMedicationRecord(record, excerpt) {

  // STEP 1: Validate record structure.
  if (
    !record ||
    typeof excerpt !== "string" ||
    !excerpt.trim() ||
    typeof record.generic !== "string" ||
    !validISODate(record.date)
  ) {
    return {
      valid: false,
      reason: "invalid_record"
    };
  }

  // STEP 2: Validate medication status.
  if (
    !["active", "discontinued"].includes(
      record.status
    )
  ) {
    return {
      valid: false,
      reason: "invalid_status"
    };
  }

  const generic = normalizeText(record.generic);
  const text = normalizeText(excerpt);

  // STEP 3: Check medication name.
  if (!generic || !text.includes(generic)) {
    return {
      valid: false,
      reason: "medication_not_supported"
    };
  }

  // STEP 4: Find medication-specific lines.
  const medicationLines = excerpt
    .split(/\r?\n/)
    .map(normalizeText)
    .filter(line => line.includes(generic));

  // STEP 5: Verify the medication date.
  const variants = dateVariants(record.date);

  const supportedLines = medicationLines.filter(
    line =>
      variants.some(date => line.includes(date))
  );

  if (supportedLines.length === 0) {
    return {
      valid: false,
      reason: "date_not_supported"
    };
  }

  // ==========================================
  // STEP 6: REJECT AMBIGUOUS EVIDENCE
  // ==========================================

  const hasActiveEvidence = supportedLines.some(
    line => /\bactive\b/.test(line)
  );

  const hasDiscontinuedEvidence = supportedLines.some(
    line => /\bdiscontinued\b/.test(line)
  );

  // Two opposing statuses for the same medication
  // and date must not be automatically accepted.
  if (
    hasActiveEvidence &&
    hasDiscontinuedEvidence
  ) {
    return {
      valid: false,
      reason: "ambiguous_status"
    };
  }

  // ==========================================
  // STEP 7: VERIFY STATUS AND NEGATION
  // ==========================================

  const matchingLines = supportedLines.filter(
    line => {

      // Reject explicitly negated status claims.
      const hasNegation =
        /\b(?:not|never|no longer)\s+(?:been\s+)?(?:active|discontinued)\b/.test(line) ||
        /\b(?:active|discontinued)\s+(?:status\s+)?(?:denied|ruled out)\b/.test(line);

      if (hasNegation) {
        return false;
      }

      const active = /\bactive\b/.test(line);
      const discontinued =
        /\bdiscontinued\b/.test(line);

      // Reject missing or conflicting statuses.
      if (active === discontinued) {
        return false;
      }

      return (
        (record.status === "active" && active) ||
        (
          record.status === "discontinued" &&
          discontinued
        )
      );
    }
  );

  if (matchingLines.length === 0) {
    return {
      valid: false,
      reason: "status_not_supported"
    };
  }

  // STEP 8: Accept supported record.
  return {
    valid: true,
    reason: null
  };
}

// ============================================
// EXPORT
// ============================================

module.exports = {
  validateMedicationRecord
};
