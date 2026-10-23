"use strict";

const assert = require("node:assert/strict");

const {
  validateMedicationRecord
} = require("../../engine/evidence/validate-records.cjs");

const excerpt = [
  "StudyMed A — active, recorded 18 October 2026.",
  "StudyMed A — discontinued, recorded 18 October 2026."
].join("\n");

for (const status of ["active", "discontinued"]) {
  const result = validateMedicationRecord(
    {
      generic: "StudyMed A",
      date: "2026-10-18",
      status
    },
    excerpt
  );

  assert.equal(
    result.valid,
    false,
    `Ambiguous evidence must not support status: ${status}`
  );
}

console.log("PASS: Conflicting medication evidence rejected.");
